import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs-extra";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import OpenAI from "openai";
import { z } from "zod";
import { DatabaseSchema, makeId } from "@explorevalley/shared";
import { mutateData, readData, writeData } from "../services/jsondb";
import { applyOperationalRules } from "../services/operationalRules";
import { ensureInvoiceForCompletedTransaction } from "../services/invoice";
import { getAuthClaims, requireAuth } from "../middleware/auth";
import { getAdminAllowedEmail, getJwtSecret } from "../services/runtimeConfig";
import { deriveMenuItemMrp, parseMoney as parseMenuMoney } from "../services/foodPricing";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});
const FOOD_VENDOR_TABLE = "ev_food_vendors";
const LEGACY_FOOD_VENDOR_TABLE = "ev_restaurants";
const FOOD_MENU_ITEM_TABLE = "ev_food_menu_items";
const LEGACY_FOOD_MENU_ITEM_TABLE = "ev_menu_items";
const FOOD_VENDOR_MENU_TABLE = "ev_food_vendor_menus";
const LEGACY_FOOD_VENDOR_MENU_TABLE = "ev_vendor_menus";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

const MART_PRODUCT_NAME_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bcofee\b/gi, "coffee"],
  [/\bcoffe\b/gi, "coffee"],
  [/\bchoclate\b/gi, "chocolate"],
  [/\bchoclates\b/gi, "chocolates"],
  [/\bbiscut\b/gi, "biscuit"],
  [/\bbiscuts\b/gi, "biscuits"],
  [/\bmasla\b/gi, "masala"],
  [/\bgaram masla\b/gi, "garam masala"],
  [/\bcoriender\b/gi, "coriander"],
  [/\bvegitable\b/gi, "vegetable"],
  [/\bmushrom\b/gi, "mushroom"],
  [/\bnudles\b/gi, "noodles"],
  [/\btoothpast\b/gi, "toothpaste"],
  [/\bdeodrant\b/gi, "deodorant"],
  [/\bmayonise\b/gi, "mayonnaise"],
  [/\bketchap\b/gi, "ketchup"],
  [/\bstrawbery\b/gi, "strawberry"],
  [/\bmangoo\b/gi, "mango"],
  [/\btomatoe\b/gi, "tomato"],
  [/\bpotatoe\b/gi, "potato"],
];

function formatMartProductNameWord(word: string) {
  const clean = safeText(word);
  if (!clean) return "";
  const lower = clean.toLowerCase();
  if (["kg", "g", "gm", "mg", "ml", "cm", "mm", "pcs", "pc", "pk", "ltr"].includes(lower)) return lower;
  if (lower === "l") return "L";
  if (/^\d+[a-z]+$/i.test(clean)) {
    const parts = clean.match(/^(\d+)([a-z]+)$/i);
    if (parts) return `${parts[1]}${formatMartProductNameWord(parts[2])}`;
  }
  if (/^[A-Z0-9&+-]{2,6}$/.test(clean)) return clean.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function normalizeMartProductName(raw: any) {
  let text = safeText(raw).replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  MART_PRODUCT_NAME_REPLACEMENTS.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  return text
    .split(" ")
    .map((word) => formatMartProductNameWord(word))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+([()/,-])/g, "$1")
    .replace(/([(/-])\s+/g, "$1")
    .trim();
}

function toMoney(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : fallback;
}

function toInt(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function parseJsonArray(raw: any) {
  if (Array.isArray(raw)) return raw;
  const text = safeText(raw);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasOwn(row: any, key: string) {
  return !!row && typeof row === "object" && Object.prototype.hasOwnProperty.call(row, key);
}

/**
 * A menu row's MRP as it must be STORED. The dish's MRP is the figure the
 * customer is shown and charged, so a row that reaches the table with no MRP
 * (or one below the vendor price) makes the app fall back to the vendor's own
 * price - which is exactly the "MRP shows the vendor price" bug on the menu.
 * Every dashboard write funnels through here, so the derived MRP the desk
 * displays is the one that actually lands in the database.
 * Returns null when the row carries no money at all (a partial patch, e.g. an
 * image-only update), so the stored MRP is left alone.
 */
/**
 * The MRP to write, or null to leave the stored one alone.
 *
 * Only a caller that actually supplied `mrp` gets this column written. It used
 * to fire on `price` alone, so any write that happened to carry a price -
 * setting a category icon, saving an unrelated field - re-derived MRP from the
 * markup and overwrote whatever the vendor had priced the dish at. An
 * operation must not change a column it was never asked to change.
 */
function resolveMenuItemMrpForWrite(rawRow: any): number | null {
  if (!hasOwn(rawRow, "mrp")) return null;
  const price = parseMenuMoney(rawRow?.price);
  const mrp = parseMenuMoney(rawRow?.mrp);
  if (mrp > 0) return Math.max(mrp, price);
  // An explicit blank/zero MRP still means "fill it in from the price".
  return deriveMenuItemMrp(price);
}

function normalizeMartProductQuantityOptions(row: any) {
  const rawOptions = parseJsonArray(row?.quantity_options ?? row?.quantityOptions ?? row?.variants);
  if (!rawOptions.length) return row?.quantity_options ?? row?.quantityOptions ?? row?.variants ?? [];
  const defaultIndex = Math.max(0, rawOptions.findIndex((option: any) => option?.is_default === true || option?.isDefault === true));
  const hasUnit = hasOwn(row, "unit") || hasOwn(row, "capacity") || hasOwn(row, "size");
  const hasVendorPrice = hasOwn(row, "price") || hasOwn(row, "vendor_price") || hasOwn(row, "vendorPrice");
  const hasCustomerPrice = hasOwn(row, "customer_price") || hasOwn(row, "customerPrice") || hasOwn(row, "selling_price") || hasOwn(row, "sellingPrice");
  const hasMrp = hasOwn(row, "mrp");
  const hasStock = hasOwn(row, "stock");
  return rawOptions.map((option: any, index: number) => {
    if (!option || typeof option !== "object") return option;
    if (index !== defaultIndex) return option;
    const nextLabel = safeText(row?.unit || row?.capacity || row?.size || option?.label || option?.unit || option?.name || "");
    return {
      ...option,
      ...(nextLabel ? { label: nextLabel, unit: nextLabel } : {}),
      ...(hasVendorPrice ? { vendor_price: toMoney(row?.price ?? row?.vendor_price ?? row?.vendorPrice, toMoney(option?.vendor_price ?? option?.vendorPrice, 0)) } : {}),
      ...(hasCustomerPrice ? { price: toMoney(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice, toMoney(option?.price, 0)) } : {}),
      ...(hasMrp ? { mrp: toMoney(row?.mrp, toMoney(option?.mrp, 0)) } : {}),
      ...(hasStock ? { stock: toInt(row?.stock, toInt(option?.stock, 0)) } : {}),
      is_default: true
    };
  });
}

function normalizeMartProductRow(row: any) {
  if (!row || typeof row !== "object") return row;
  const normalizedVendorId = safeText(row?.mart_partner_id || row?.martPartnerId || row?.mart_id || row?.martId || "");
  const { martId, martPartnerId, mart_id, ...rest } = row;
  const quantityOptions = normalizeMartProductQuantityOptions(row);
  const defaultQuantityOption = Array.isArray(quantityOptions)
    ? (quantityOptions.find((option: any) => option?.is_default === true || option?.isDefault === true) || quantityOptions[0] || null)
    : null;
  return {
    ...rest,
    ...(normalizedVendorId ? { mart_partner_id: normalizedVendorId } : {}),
    name: normalizeMartProductName(row?.name),
    ...(defaultQuantityOption ? {
      unit: safeText(defaultQuantityOption?.label || defaultQuantityOption?.unit || row?.unit || ""),
      price: toMoney(defaultQuantityOption?.vendor_price ?? defaultQuantityOption?.vendorPrice ?? row?.price, toMoney(row?.price, 0)),
      customer_price: toMoney(defaultQuantityOption?.price ?? row?.customer_price ?? row?.customerPrice, toMoney(row?.customer_price ?? row?.customerPrice, 0)),
      mrp: toMoney(defaultQuantityOption?.mrp ?? row?.mrp, toMoney(row?.mrp, 0)),
      stock: toInt(defaultQuantityOption?.stock ?? row?.stock, toInt(row?.stock, 0)),
      quantity_options: quantityOptions
    } : {})
  };
}

function normalizeMenuLookupKey(name: any, category: any) {
  const itemName = safeText(name).toLowerCase();
  const itemCategory = safeText(category || "General").toLowerCase();
  return `${itemCategory}::${itemName}`;
}

function slugToken(v: any, fallback = "item", maxLen = 32) {
  const s = safeText(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const clipped = s.slice(0, maxLen);
  return clipped || fallback;
}

function makeMenuItemId(vendorName: string, itemName: string) {
  const vendor = slugToken(vendorName, "vendor", 24);
  const item = slugToken(itemName, "item", 24);
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `menu_${vendor}_${item}_${ts}_${rand}`;
}

function normalizeMenuItemUpsertRows(
  rows: any[],
  options?: {
    defaultRestaurantId?: string;
    vendorNameByRestaurantId?: Map<string, string>;
  }
) {
  const defaultRestaurantId = safeText(options?.defaultRestaurantId || "");
  const vendorNameByRestaurantId = options?.vendorNameByRestaurantId || new Map<string, string>();
  const dedupedRows: any[] = [];
  const indexByKey = new Map<string, number>();
  let generatedIds = 0;
  let deduped = 0;

  (Array.isArray(rows) ? rows : []).forEach((rawRow: any, idx: number) => {
    if (!rawRow || typeof rawRow !== "object") return;
    const restaurantId = safeText(rawRow?.restaurant_id || rawRow?.restaurantId || defaultRestaurantId);
    const itemName = safeText(rawRow?.name || "");
    const category = safeText(rawRow?.category || "General") || "General";
    let id = safeText(rawRow?.id || "");

    if (!id && restaurantId && itemName) {
      const vendorName = safeText(vendorNameByRestaurantId.get(restaurantId) || restaurantId || "vendor");
      do {
        id = makeMenuItemId(vendorName, itemName);
      } while (indexByKey.has(`id:${id}`));
      generatedIds += 1;
    }

    const resolvedMrp = resolveMenuItemMrpForWrite(rawRow);
    const normalizedRow = {
      ...rawRow,
      ...(id ? { id } : {}),
      ...(restaurantId ? { restaurant_id: restaurantId } : {}),
      ...(resolvedMrp === null ? {} : { mrp: resolvedMrp })
    };
    const key = id
      ? `id:${id}`
      : restaurantId && itemName
        ? `restaurant:${restaurantId}::${category.toLowerCase()}::${itemName.toLowerCase()}`
        : `row:${idx}`;
    const existingIdx = indexByKey.get(key);
    if (existingIdx === undefined) {
      indexByKey.set(key, dedupedRows.length);
      dedupedRows.push(normalizedRow);
      return;
    }
    deduped += 1;
    dedupedRows[existingIdx] = {
      ...dedupedRows[existingIdx],
      ...normalizedRow,
      id: safeText(normalizedRow?.id || dedupedRows[existingIdx]?.id || "")
    };
  });

  return { rows: dedupedRows, generatedIds, deduped };
}

function canonicalMenuItemRow(rawRow: any, restaurantIdFallback = "") {
  const restaurantId = safeText(rawRow?.restaurant_id || rawRow?.restaurantId || restaurantIdFallback);
  const image = safeText(rawRow?.image || rawRow?.hero_image || "");
  return {
    id: safeText(rawRow?.id || ""),
    restaurant_id: restaurantId,
    category: safeText(rawRow?.category || "General") || "General",
    name: safeText(rawRow?.name || ""),
    description: safeText(rawRow?.description || ""),
    offer: safeText(rawRow?.offer || ""),
    price: Number(rawRow?.price || 0),
    ...(hasOwn(rawRow, "mrp") ? { mrp: resolveMenuItemMrpForWrite(rawRow) ?? 0 } : {}),
    image,
    hero_image: image,
    available: rawRow?.available !== false,
    is_veg: rawRow?.is_veg === true || rawRow?.isVeg === true,
    stock: Math.max(0, Number(rawRow?.stock || 0) || 0)
  };
}

async function supabaseAdminUpsertRowsIndividually(table: string, rows: any[], onConflict = "id") {
  const { url } = assertSupabaseAdminConfigured();
  for (const row of Array.isArray(rows) ? rows : []) {
    const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflict)}`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: supabaseAdminHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify([row])
    });
    if (!r.ok) {
      throw new Error(await r.text());
    }
  }
}

// Keep the vendor-level menu blobs in sync after a direct menu-item table write.
// writeSupabaseDatabase() rebuilds ev_food_menu_items from these blobs on every
// mutateData() (vendor menu blob > ev_food_vendors.menu > item table), so a direct
// item edit (e.g. the dashboard inline price autosave) is otherwise reverted on the
// next mutation. Rebuild each affected vendor's blob from the current item rows.
async function syncVendorMenuBlobsFromItems(restaurantIds: string[]) {
  const ids = Array.from(new Set((restaurantIds || []).map((x) => safeText(x)).filter(Boolean)));
  if (!ids.length) return;
  const { url } = assertSupabaseAdminConfigured();
  for (const restaurantId of ids) {
    let itemRows: any[] = [];
    try {
      itemRows = await supabaseAdminFetchJson(
        `/rest/v1/${encodeURIComponent(FOOD_MENU_ITEM_TABLE)}?select=*&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=2000`
      );
    } catch {
      try {
        itemRows = await supabaseAdminFetchJson(
          `/rest/v1/${encodeURIComponent(LEGACY_FOOD_MENU_ITEM_TABLE)}?select=*&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=2000`
        );
      } catch {
        itemRows = [];
      }
    }
    const menu = (Array.isArray(itemRows) ? itemRows : [])
      .map((row: any) => {
        const image = safeText(row?.image || row?.hero_image || "");
        return {
          id: safeText(row?.id || ""),
          category: safeText(row?.category || "General") || "General",
          name: safeText(row?.name || ""),
          description: safeText(row?.description || ""),
          offer: safeText(row?.offer || ""),
          image,
          hero_image: image,
          price: Number(row?.price || 0),
          mrp: Math.max(0, Number(row?.mrp || 0) || 0),
          stock: Math.max(0, Number(row?.stock || 0) || 0),
          available: row?.available !== false,
          isVeg: row?.is_veg === true || row?.isVeg === true,
          is_veg: row?.is_veg === true || row?.isVeg === true
        };
      })
      .filter((m: any) => m.name);

    // Patch the ev_food_vendors.menu column (second read precedence).
    for (const tableName of [FOOD_VENDOR_TABLE, LEGACY_FOOD_VENDOR_TABLE]) {
      try {
        const r = await fetch(
          `${url}/rest/v1/${encodeURIComponent(tableName)}?id=eq.${encodeURIComponent(restaurantId)}`,
          {
            method: "PATCH",
            headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
            body: JSON.stringify({ menu })
          }
        );
        if (r.ok) break;
      } catch {
        // best-effort: fall through to the legacy table
      }
    }

    // Replace the vendor-level menu blob rows (highest read precedence).
    const vendorMenuRow = [{
      restaurant_id: restaurantId,
      menu,
      updated_at: new Date().toISOString()
    }];
    for (const tableName of [FOOD_VENDOR_MENU_TABLE, LEGACY_FOOD_VENDOR_MENU_TABLE]) {
      try {
        await supabaseAdminDeleteWhere(tableName, { restaurant_id: restaurantId }, "restaurant_id");
        await fetch(`${url}/rest/v1/${encodeURIComponent(tableName)}`, {
          method: "POST",
          headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
          body: JSON.stringify(vendorMenuRow)
        });
      } catch {
        // best-effort: missing tables are skipped
      }
    }
  }
}

function encodePath(value: string) {
  return String(value || "")
    .split("/")
    .map((x) => encodeURIComponent(x))
    .join("/");
}

function normalizeEmail(email: string) {
  return safeText(email).toLowerCase();
}

function normalizePhone(phone: string) {
  const raw = safeText(phone);
  const digits = raw.replace(/\D+/g, "");
  return digits || raw.toLowerCase();
}

function normalizePhoneDigits(v: any) {
  return safeText(v).replace(/\D+/g, "");
}

function normalizeDriverPhone(phone: string) {
  const raw = safeText(phone).replace(/\s+/g, "");
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

function normalizeDriverUsername(v: any) {
  return safeText(v).toLowerCase().replace(/[^a-z0-9._-]/g, "").trim();
}

function normalizeDashboardUsername(v: any) {
  return safeText(v).toLowerCase().replace(/[^a-z0-9._-]/g, "").trim();
}

function comparePlain(a: string, b: string) {
  const aa = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (aa.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function verifyDashboardPassword(password: string, storedHash: string) {
  const text = safeText(storedHash);
  if (!text) return false;
  if (text.startsWith("sha256$")) {
    const expectedHex = text.slice("sha256$".length);
    const digest = crypto.createHash("sha256").update(password).digest("hex");
    return comparePlain(digest, expectedHex);
  }
  if (text.startsWith("scrypt$")) {
    const parts = text.split("$");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expected = parts[2];
    const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
    return comparePlain(candidate, expected);
  }
  return comparePlain(password, text);
}

function hashDriverPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL || "";
}

function supabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
}

function jwtSecret() {
  return getJwtSecret();
}

function allowedAdminEmail() {
  return normalizeEmail(getAdminAllowedEmail());
}

const ADMIN_SESSION_COOKIE = "ev_admin_session";
const ADMIN_PREAUTH_COOKIE = "ev_admin_google_preauth";
const DASHBOARD_SCOPES = ["admin", "travel", "food", "support"] as const;
type DashboardScope = typeof DASHBOARD_SCOPES[number];
type DashboardCredentials = { username: string; password: string };
// Deliberately empty. These are credentials; they come from .llo and
// nowhere else. A literal here is a working login committed to the repo.
const DEFAULT_DASHBOARD_USERNAME = "";
const DEFAULT_DASHBOARD_PASSWORD = "";
const ENV_DEFAULT_DASHBOARD_USERNAME = safeText(process.env.DASHBOARD_DEFAULT_USERNAME || DEFAULT_DASHBOARD_USERNAME).toLowerCase();
const ENV_DEFAULT_DASHBOARD_PASSWORD = safeText(process.env.DASHBOARD_DEFAULT_PASSWORD || DEFAULT_DASHBOARD_PASSWORD);

function normalizeDashboardScope(v: any): DashboardScope {
  const raw = safeText(v).toLowerCase();
  if (raw === "admin" || raw === "all") return "admin";
  if (raw === "food") return "food";
  if (raw === "support" || raw === "customer_support" || raw === "customer-support") return "support";
  return "travel";
}

function rawDashboardScopeFromReq(req: any): string {
  const headerScope = safeText(req?.headers?.["x-ev-dashboard"] || req?.headers?.["X-EV-Dashboard"]);
  const bodyScope = safeText(req?.body?.dashboard || "");
  const queryScope = safeText(req?.query?.dashboard || "");
  return headerScope || bodyScope || queryScope;
}

function dashboardScopeFromReq(req: any): DashboardScope {
  return normalizeDashboardScope(rawDashboardScopeFromReq(req));
}

/**
 * The scope the request actually named, or null when it named none.
 *
 * dashboardScopeFromReq() cannot express "unspecified" — it normalises an
 * empty value to "travel", the same as any unrecognised string. That is
 * harmless when choosing which dashboard's data to serve, and wrong when
 * deciding whether the caller is allowed in at all: a request that names no
 * dashboard is not a request for the travel one.
 */
function declaredDashboardScope(req: any): DashboardScope | null {
  const raw = rawDashboardScopeFromReq(req);
  return raw ? normalizeDashboardScope(raw) : null;
}

function expectedDashboardKey(scope: DashboardScope) {
  const adminKey = safeText(process.env.ADMIN_DASHBOARD_KEY || "");
  if (scope === "admin") return adminKey;
  if (scope === "food") return safeText(process.env.FOOD_DASHBOARD_KEY || adminKey);
  if (scope === "support") return safeText(process.env.CUSTOMER_SUPPORT_DASHBOARD_KEY || adminKey);
  return safeText(process.env.TRAVEL_DASHBOARD_KEY || adminKey);
}

function matchesDefaultDashboardCredentials(username: string, password: string) {
  // Both sides come from configuration now, so either can be unset. Without
  // this guard an unconfigured deployment would accept an empty username and
  // an empty password as a valid login.
  if (!ENV_DEFAULT_DASHBOARD_USERNAME || !ENV_DEFAULT_DASHBOARD_PASSWORD) return false;
  if (!safeText(username) || !safeText(password)) return false;
  return normalizeDashboardUsername(username) === ENV_DEFAULT_DASHBOARD_USERNAME
    && comparePlain(password, ENV_DEFAULT_DASHBOARD_PASSWORD);
}

function dashboardCredentialColumns(scope: DashboardScope) {
  if (scope === "admin") return { user: "ev_admin_user", password: "ev_admin_password" };
  if (scope === "food") return { user: "ev_food_user", password: "ev_food_password" };
  if (scope === "support") return { user: "ev_support_user", password: "ev_support_password" };
  return { user: "ev_tours_user", password: "ev_tours_password" };
}

async function fetchDashboardCredentials(scope: DashboardScope): Promise<DashboardCredentials | null> {
  const url = safeText(supabaseUrl()).replace(/\/+$/, "");
  const key = safeText(supabaseServiceRoleKey());
  if (!url || !key) return null;
  try {
    const cols = dashboardCredentialColumns(scope);
    const endpoint =
      `${url}/rest/v1/ev_dashboards` +
      `?id=eq.main&select=${encodeURIComponent(`${cols.user},${cols.password}`)}&limit=1`;
    const r = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });
    if (!r.ok) return null;
    const rows = await r.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    const username = safeText(row?.[cols.user]).toLowerCase();
    const password = safeText(row?.[cols.password]);
    if (!username || !password) return null;
    return { username, password };
  } catch {
    return null;
  }
}

function normalizeUiPath(p: string) {
  const v = safeText(p);
  if (!v) return "/";
  return v.startsWith("/") ? v : `/${v}`;
}

function requestOrigin(req: any) {
  const protoRaw = safeText(req?.headers?.["x-forwarded-proto"] || req?.protocol || "http");
  const proto = protoRaw.split(",")[0].trim() || "http";
  const host = safeText(req?.headers?.["x-forwarded-host"] || req?.headers?.host || "");
  return host ? `${proto}://${host}` : "";
}

function defaultDashboardControls() {
  return {
    platformEnabled: true,
    forceOpsPage: false,
    opsPageOnError: true,
    opsMessage: "Ops! Service temporarily unavailable. Please try again shortly.",
    appTabs: {
      travel: true,
      taxi: true,
      bike: true,
      food: true,
      mart: true,
      services: true
    },
    vendorDashboards: {
      admin: true,
      travel: true,
      food: true,
      support: true,
      mart_vendor: true
    }
  };
}

function normalizeDashboardControls(raw: any) {
  const d = defaultDashboardControls();
  const src = raw && typeof raw === "object" ? raw : {};
  const appTabs = src.appTabs && typeof src.appTabs === "object" ? src.appTabs : {};
  const vendorDashboards = src.vendorDashboards && typeof src.vendorDashboards === "object" ? src.vendorDashboards : {};
  return {
    platformEnabled: src.platformEnabled !== false,
    forceOpsPage: src.forceOpsPage === true,
    opsPageOnError: src.opsPageOnError !== false,
    opsMessage: safeText(src.opsMessage) || d.opsMessage,
    appTabs: {
      travel: appTabs.travel !== false,
      taxi: appTabs.taxi !== false,
      bike: appTabs.bike !== false,
      food: appTabs.food !== false,
      mart: appTabs.mart !== false,
      services: appTabs.services !== false
    },
    vendorDashboards: {
      admin: vendorDashboards.admin !== false,
      travel: vendorDashboards.travel !== false,
      food: vendorDashboards.food !== false,
      support: vendorDashboards.support !== false,
      mart_vendor: vendorDashboards.mart_vendor !== false
    }
  };
}

function scopeToggleKey(scope: DashboardScope) {
  if (scope === "admin") return "admin";
  if (scope === "food") return "food";
  if (scope === "support") return "support";
  return "travel";
}

async function fetchDashboardControls() {
  const fallback = defaultDashboardControls();
  const url = safeText(supabaseUrl()).replace(/\/+$/, "");
  const key = supabaseServiceRoleKey();
  if (!url || !key) return fallback;
  try {
    const endpoint = `${url}/rest/v1/ev_settings?id=eq.main&select=tax_rules&limit=1`;
    const r = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });
    if (!r.ok) return fallback;
    const rows = await r.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    const taxRules = row?.tax_rules && typeof row.tax_rules === "object" ? row.tax_rules : {};
    const raw = (taxRules as any).dashboardControls || (taxRules as any).dashboard_controls || {};
    return normalizeDashboardControls(raw);
  } catch {
    return fallback;
  }
}

async function assertDashboardEnabled(scope: DashboardScope) {
  const controls = await fetchDashboardControls();
  if (controls.platformEnabled === false) {
    return { ok: false, code: "PLATFORM_DISABLED", controls };
  }
  const key = scopeToggleKey(scope);
  const enabled = (controls?.vendorDashboards && typeof controls.vendorDashboards === "object")
    ? controls.vendorDashboards[key] !== false
    : true;
  if (!enabled) return { ok: false, code: "DASHBOARD_DISABLED", controls };
  return { ok: true, controls };
}

function parseCookies(cookieHeader: string) {
  const out: Record<string, string> = {};
  const raw = safeText(cookieHeader);
  if (!raw) return out;
  raw.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) return;
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function getBearerToken(req: any) {
  const auth = safeText(req?.headers?.authorization || req?.headers?.Authorization || "");
  if (!auth) return "";
  const m = auth.match(/^\s*Bearer\s+(.+)\s*$/i);
  return m ? safeText(m[1]) : "";
}

function getAdminSessionToken(req: any) {
  const bearer = getBearerToken(req);
  if (bearer) return bearer;
  const cookies = parseCookies(String(req?.headers?.cookie || ""));
  return safeText(cookies[ADMIN_SESSION_COOKIE] || "");
}

function verifyAdminSession(req: any) {
  const token = getAdminSessionToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as any;
    if (!payload || payload.role !== "admin") return null;
    const authMode = safeText(payload.authMode || "");
    if (authMode === "dashboard_credentials") {
      const username = normalizeDashboardUsername(payload.username || payload.sub || "");
      if (!username) return null;
      payload.username = username;
    } else {
      const email = normalizeEmail(payload.email || "");
      if (!email || email !== allowedAdminEmail()) return null;
    }
    if (payload.keyOk !== true) return null;
    const scopesRaw = Array.isArray(payload.scopes) ? payload.scopes : [];
    const scopes = scopesRaw
      .map((x: any) => normalizeDashboardScope(x))
      .filter((x: any, i: number, arr: any[]) => arr.indexOf(x) === i);
    if (!scopes.length) scopes.push("travel");
    payload.scopes = scopes;
    return payload;
  } catch {
    return null;
  }
}

async function fetchDashboardCredential(scope: DashboardScope, username: string) {
  const normalizedUsername = normalizeDashboardUsername(username);
  if (!normalizedUsername) return null;
  try {
    const rows = await supabaseAdminFetchJson(
      `/rest/v1/ev_dashboard_credentials?select=id,username,password_hash,password,scope,dashboard,active,is_active&username=eq.${encodeURIComponent(normalizedUsername)}&limit=20`
    );
    const list = Array.isArray(rows) ? rows : [];
    const hit = list.find((row: any) => {
      const rowScope = normalizeDashboardScope(row?.dashboard || row?.scope || "travel");
      const rowUsername = normalizeDashboardUsername(row?.username || "");
      const active = row?.is_active !== false && row?.active !== false;
      return active && rowScope === scope && rowUsername === normalizedUsername;
    });
    return hit || null;
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    if (msg.includes("ev_dashboard_credentials") || msg.includes("SUPABASE_REQUEST_FAILED:404")) {
      throw new Error("DASHBOARD_CREDENTIALS_TABLE_MISSING");
    }
    throw err;
  }
}

function verifyGooglePreauth(req: any) {
  const cookies = parseCookies(String(req?.headers?.cookie || ""));
  const token = safeText(cookies[ADMIN_PREAUTH_COOKIE] || "");
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as any;
    if (!payload || payload.role !== "admin_google_preauth") return null;
    const email = normalizeEmail(payload.email || "");
    if (!email || email !== allowedAdminEmail()) return null;
    if (payload.googleOk !== true) return null;
    return payload;
  } catch {
    return null;
  }
}

function verifyDashboardPreauth(req: any) {
  const cookies = parseCookies(String(req?.headers?.cookie || ""));
  const token = safeText(cookies[ADMIN_PREAUTH_COOKIE] || "");
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as any;
    if (!payload) return null;
    if (!["admin_google_preauth", "admin_email_preauth"].includes(safeText(payload.role))) return null;
    const email = normalizeEmail(payload.email || "");
    if (!email || email !== allowedAdminEmail()) return null;
    const emailOk = payload.emailOk === true;
    const googleOk = payload.googleOk === true;
    if (!emailOk && !googleOk) return null;
    return payload;
  } catch {
    return null;
  }
}

function isHttpsRequest(req: any) {
  if (req?.secure) return true;
  const xfProto = safeText(req?.headers?.["x-forwarded-proto"] || req?.headers?.["X-Forwarded-Proto"] || "").toLowerCase();
  if (!xfProto) return false;
  return xfProto.split(",").map((x) => x.trim()).includes("https");
}

async function getSupabaseUser(accessToken: string) {
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  if (!url || !anon) throw new Error("SUPABASE_NOT_CONFIGURED");
  const r = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function isGoogleUser(user: any) {
  const appProvider = safeText(user?.app_metadata?.provider || "").toLowerCase();
  if (appProvider === "google") return true;
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  return identities.some((x: any) => safeText(x?.provider || "").toLowerCase() === "google");
}

async function adminAuth(req: any, res: any, next: any) {
  const ok = verifyAdminSession(req);
  if (!ok) return res.status(401).json({ error: "ADMIN_AUTH_REQUIRED" });
  const scopes = Array.isArray(ok?.scopes) ? ok.scopes.map((x: any) => normalizeDashboardScope(x)) : ["travel"];

  // A request that names no dashboard used to be read as a request for the
  // travel one, and then refused for any session without travel access. That
  // is not a hypothetical: window.open cannot set the X-EV-Dashboard header,
  // so every invoice download and print refused every non-travel account with
  // DASHBOARD_ACCESS_DENIED.
  //
  // When the request does name a dashboard the check below is unchanged. When
  // it names none, fall back to a scope this session already holds, which
  // grants nothing it was not already entitled to.
  const declared = declaredDashboardScope(req);
  const requestedScope: DashboardScope =
    declared || (scopes.includes("admin") ? "admin" : (scopes[0] || "travel"));

  if (!scopes.includes(requestedScope)) {
    return res.status(403).json({ error: "DASHBOARD_ACCESS_DENIED", dashboard: requestedScope });
  }
  const gate = await assertDashboardEnabled(requestedScope);
  if (!gate.ok) {
    return res.status(503).json({
      error: gate.code,
      dashboard: requestedScope,
      controls: gate.controls
    });
  }
  (req as any).dashboard = requestedScope;
  (req as any).admin = ok;
  (req as any).dashboardControls = gate.controls;
  next();
}

function requireAdminDashboardScope(req: any, res: any) {
  const requestedScope = dashboardScopeFromReq(req);
  if (requestedScope !== "admin") {
    res.status(403).json({ error: "ADMIN_SCOPE_REQUIRED" });
    return false;
  }
  return true;
}

function hashDashboardPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function readDashboardCredentialRows(scope?: DashboardScope) {
  const whereScope = scope ? `&scope=eq.${encodeURIComponent(scope)}` : "";
  const rows = await supabaseAdminFetchJson(
    `/rest/v1/ev_dashboard_credentials?select=id,scope,dashboard,username,is_active,active,created_at,updated_at${whereScope}&order=updated_at.desc.nullslast&limit=500`
  );
  return Array.isArray(rows) ? rows : [];
}

export const adminRouter = Router();

// Public config for Google OAuth start (safe to expose anon key/url).
adminRouter.get("/google/config", (_req, res) => {
  const url = supabaseUrl().replace(/\/+$/, "");
  const anon = supabaseAnonKey();
  if (!url || !anon) return res.status(500).json({ error: "SUPABASE_NOT_CONFIGURED" });
  return res.json({ supabaseUrl: url, supabaseAnonKey: anon });
});

// Step 1: Google (Supabase) verification only -> short-lived preauth cookie.
adminRouter.post("/google/verify", async (req, res) => {
  const accessToken = safeText(req?.body?.supabaseAccessToken || "");
  if (!accessToken) return res.status(400).json({ error: "SUPABASE_ACCESS_TOKEN_REQUIRED" });

  try {
    const secureCookie = isHttpsRequest(req);
    const user: any = await getSupabaseUser(accessToken);
    const email = normalizeEmail(user?.email || "");
    if (!email || email !== allowedAdminEmail()) {
      return res.status(403).json({ error: "ADMIN_EMAIL_NOT_ALLOWED" });
    }
    if (!isGoogleUser(user)) {
      return res.status(403).json({ error: "GOOGLE_SIGNIN_REQUIRED" });
    }
    const preauthToken = jwt.sign(
      { sub: safeText(user?.id || email), role: "admin_google_preauth", email, googleOk: true },
      jwtSecret(),
      { expiresIn: "10m" }
    );
    res.cookie(ADMIN_PREAUTH_COOKIE, preauthToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
      maxAge: 10 * 60 * 1000
    });
    return res.json({ ok: true, email, googleVerified: true });
  } catch (e: any) {
    return res.status(401).json({ error: "SUPABASE_SESSION_INVALID", message: String(e?.message || e) });
  }
});

adminRouter.post("/email/verify", async (req, res) => {
  const email = normalizeEmail(req?.body?.email || "");
  if (!email) return res.status(400).json({ error: "EMAIL_REQUIRED" });
  if (email !== allowedAdminEmail()) {
    return res.status(403).json({ error: "ADMIN_EMAIL_NOT_ALLOWED" });
  }
  const secureCookie = isHttpsRequest(req);
  const preauthToken = jwt.sign(
    { sub: email, role: "admin_email_preauth", email, emailOk: true },
    jwtSecret(),
    { expiresIn: "10m" }
  );
  res.cookie(ADMIN_PREAUTH_COOKIE, preauthToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 10 * 60 * 1000
  });
  return res.json({ ok: true, email, emailVerified: true });
});

// Step 2: dashboard login -> admin session cookie.
adminRouter.post("/login", async (req, res) => {
  const scope = dashboardScopeFromReq(req);
  const adminKey = safeText(req?.body?.adminKey || "");
  const username = safeText(req?.body?.username || "").toLowerCase();
  const password = safeText(req?.body?.password || "");
  let principal: any = null;

  if (username && password && matchesDefaultDashboardCredentials(username, password)) {
    principal = {
      sub: `dashboard:${scope}:${ENV_DEFAULT_DASHBOARD_USERNAME}`,
      email: allowedAdminEmail(),
      username: ENV_DEFAULT_DASHBOARD_USERNAME,
      authMode: "dashboard_credentials"
    };
  }

  const tableCredentials = await fetchDashboardCredentials(scope);
  if (!principal && tableCredentials) {
    if (username && password && username === tableCredentials.username && password === tableCredentials.password) {
      principal = {
        sub: `dashboard:${scope}:${username}`,
        email: allowedAdminEmail(),
        username,
        authMode: "dashboard_credentials"
      };
    }
  }
  if (!principal && username && password) {
    let account: any = null;
    try {
      account = await fetchDashboardCredential(scope, username);
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      if (msg.includes("DASHBOARD_CREDENTIALS_TABLE_MISSING")) {
        account = null;
      } else {
        return res.status(500).json({ error: "CREDENTIAL_LOOKUP_FAILED", dashboard: scope, message: msg });
      }
    }
    const storedHash = safeText(account?.password_hash || account?.password || "");
    if (account && verifyDashboardPassword(password, storedHash)) {
      principal = {
        sub: `${scope}:${normalizeDashboardUsername(account?.username || username)}`,
        email: allowedAdminEmail(),
        username: normalizeDashboardUsername(account?.username || username),
        authMode: "dashboard_credentials"
      };
    }
  }
  if (!principal) {
    if (scope === "food") {
      return res.status(401).json({ error: "PASSWORD_LOGIN_REQUIRED" });
    }
    const expected = expectedDashboardKey(scope);
    if (!expected && !ENV_DEFAULT_DASHBOARD_PASSWORD) {
      return res.status(500).json({ error: "DASHBOARD_KEY_NOT_CONFIGURED", dashboard: scope });
    }
    const supplied = password || adminKey;
    const secretOk = (!!expected && comparePlain(supplied, expected))
      || comparePlain(supplied, ENV_DEFAULT_DASHBOARD_PASSWORD);
    if (!supplied || !secretOk) return res.status(401).json({ error: "INVALID_SECRET_KEY" });
    principal = {
      sub: `dashboard:${scope}:${username || ENV_DEFAULT_DASHBOARD_USERNAME}`,
      email: allowedAdminEmail(),
      username: username || ENV_DEFAULT_DASHBOARD_USERNAME,
      authMode: "dashboard_credentials"
    };
  }
  const existing = verifyAdminSession(req);
  const gate = await assertDashboardEnabled(scope);
  if (!gate.ok) {
    return res.status(503).json({
      error: gate.code,
      dashboard: scope,
      controls: gate.controls
    });
  }
  const prevScopes = Array.isArray(existing?.scopes) ? existing.scopes.map((x: any) => normalizeDashboardScope(x)) : [];
  const scopes = Array.from(new Set([...prevScopes, scope]));

  const token = jwt.sign(
    {
      sub: safeText(principal.sub || principal.email),
      role: "admin",
      email: normalizeEmail(principal.email || ""),
      username: safeText(principal.username || ""),
      authMode: safeText(principal.authMode || ""),
      keyOk: true,
      googleOk: principal.googleOk === true,
      emailOk: principal.emailOk === true,
      scopes
    },
    jwtSecret(),
    { expiresIn: "12h" }
  );
  const secureCookie = isHttpsRequest(req);
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 12 * 60 * 60 * 1000
  });
  res.cookie(ADMIN_PREAUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: 0 });
  return res.json({ ok: true, email: normalizeEmail(principal.email || ""), dashboard: scope, scopes, username: safeText(principal.username || "") });
});

adminRouter.get("/whoami", async (req, res) => {
  const s = verifyAdminSession(req);
  if (!s) return res.status(401).json({ ok: false });
  const requestedScope = dashboardScopeFromReq(req);
  const scopes = Array.isArray(s?.scopes) ? s.scopes.map((x: any) => normalizeDashboardScope(x)) : ["travel"];
  if (requestedScope && !scopes.includes(requestedScope)) {
    return res.status(403).json({ ok: false, error: "DASHBOARD_ACCESS_DENIED", dashboard: requestedScope, scopes });
  }
  try {
    const gate = await assertDashboardEnabled(requestedScope || "travel");
    if (!gate.ok) {
      return res.status(503).json({
        ok: false,
        error: gate.code,
        dashboard: requestedScope || "travel",
        controls: gate.controls,
        scopes
      });
    }
    return res.json({
      ok: true,
      email: normalizeEmail(s.email || ""),
      username: safeText(s.username || ""),
      sub: safeText(s.sub || ""),
      scopes,
      controls: gate.controls
    });
  } catch {
    return res.json({
      ok: true,
      email: normalizeEmail(s.email || ""),
      username: safeText(s.username || ""),
      sub: safeText(s.sub || ""),
      scopes
    });
  }
});

adminRouter.post("/logout", (req, res) => {
  const secureCookie = isHttpsRequest(req);
  res.cookie(ADMIN_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: 0 });
  res.cookie(ADMIN_PREAUTH_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: secureCookie, path: "/", maxAge: 0 });
  return res.json({ ok: true });
});

// Customer-authenticated invoice PDF download.
adminRouter.get("/invoices/customer/transaction/:table/:transactionId/pdf", requireAuth, async (req, res) => {
  try {
    const table = normalizeInvoiceTransactionTable(req.params.table);
    const transactionId = safeText(req.params.transactionId);
    const download = safeText(req.query.download || "").toLowerCase();
    if (!INVOICE_TRANSACTION_TABLES.has(table)) {
      return res.status(400).json({ error: "INVALID_TRANSACTION_TABLE" });
    }
    if (!transactionId) return res.status(400).json({ error: "TRANSACTION_ID_REQUIRED" });

    const transaction = await fetchTransactionRow(table, transactionId);
    if (!transaction) return res.status(404).json({ error: "TRANSACTION_NOT_FOUND" });

    const claims = getAuthClaims(req);
    const claimSub = safeText(claims?.sub);
    const claimEmail = normalizeEmail(claims?.email || "");
    const claimPhone = normalizePhoneDigits(claims?.phone || "");

    const rowUserId = safeText(transaction?.user_id || transaction?.userId || "");
    const rowEmail = normalizeEmail(transaction?.email || "");
    const rowPhone = normalizePhoneDigits(transaction?.phone || "");
    const ownerOk =
      (claimSub && rowUserId && claimSub === rowUserId) ||
      (claimEmail && rowEmail && claimEmail === rowEmail) ||
      (claimPhone && rowPhone && claimPhone === rowPhone);
    if (!ownerOk) return res.status(403).json({ error: "INVOICE_ACCESS_DENIED" });

    // An invoice is a record of money received, and this endpoint *creates* one
    // on first request. A taxi ride can now sit unpaid for a long time — quoted
    // by the desk and waiting on the rider — so generating an invoice for it
    // would put a tax document against a fare nobody has paid.
    //
    // Scoped to cab rides deliberately: other services settle on delivery and
    // legitimately invoice before their payment row says "paid".
    if (table === "ev_cab_bookings") {
      const paid = safeText(transaction?.payment_status || transaction?.paymentStatus).toLowerCase() === "paid";
      if (!paid) return res.status(409).json({ error: "INVOICE_NOT_AVAILABLE_UNPAID" });
    }

    // A cancelled journey is not a sale, so it gets no invoice — for any
    // service, not just taxis. This has to refuse before the fetch-or-create
    // below: when no invoice row exists that path falls through to
    // `fallbackInvoiceFromTransaction`, which builds a PDF out of the raw
    // transaction, so a cancelled order still produced a tax document.
    if (isCancelledTransaction(transaction)) {
      return res.status(409).json({ error: "INVOICE_NOT_AVAILABLE_CANCELLED" });
    }

    const serviceKey = serviceKeyForTable(table, transaction);
    let invoiceProfile = defaultInvoiceProfile();
    try {
      invoiceProfile = await fetchInvoiceProfileConfig();
    } catch {
      invoiceProfile = defaultInvoiceProfile();
    }
    const vendorDetails = await fetchVendorDetailsForTransaction(table, transaction, invoiceProfile);
    const sellerProfile = mergeSellerProfile(invoiceProfile, serviceKey, vendorDetails);
    const serviceName = transactionServiceName(table, transaction);
    const gstPercent = parseAmount(
      sellerProfile?.gstPercent ??
      sellerProfile?.defaultGstPercent ??
      invoiceProfile?.defaultGstPercent ??
      5
    );
    const defaultHsn = safeText(
      sellerProfile?.defaultHsnOrSac ||
      invoiceProfile?.defaultHsnOrSac ||
      "9964"
    );
    const items = normalizeInvoiceItems(table, transaction, serviceName, defaultHsn, gstPercent);

    let invoice: any = null;
    try {
      invoice = await fetchInvoiceByTransaction(table, transactionId);
    } catch (err: any) {
      if (!isMissingInvoicesTableError(err)) throw err;
    }
    if (!invoice) {
      try {
        await ensureInvoiceForCompletedTransaction({
          table,
          row: transaction,
          source: "customer_invoice_pdf"
        });
      } catch {
        // If invoice creation fails (e.g. non-completed transaction), continue with fallback.
      }
      try {
        invoice = await fetchInvoiceByTransaction(table, transactionId);
      } catch (err: any) {
        if (!isMissingInvoicesTableError(err)) throw err;
      }
    }
    if (!invoice) {
      invoice = fallbackInvoiceFromTransaction(table, transaction);
    }

    const pdf = await buildInvoicePdfBuffer(invoice, transaction, {
      sellerProfile,
      serviceName,
      items,
      placeOfSupply: safeText(sellerProfile?.placeOfSupply || "")
    });
    const invoiceNo = safeText(invoice?.invoice_no || invoice?.id || "invoice");
    const filename = `${invoiceNo}.pdf`.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const disposition = download === "1" || download === "true" ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdf.length));
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    return res.send(pdf);
  } catch (err: any) {
    return res.status(500).json({
      error: "INVOICE_PDF_FAILED",
      message: String(err?.message || err)
    });
  }
});

// Everything below requires admin session.
adminRouter.use(adminAuth);

adminRouter.post("/push-notifications/send", async (req, res) => {
  const dashboardScope = normalizeDashboardScope((req as any)?.dashboard || "");
  if (!(dashboardScope === "admin" || dashboardScope === "support")) {
    return res.status(403).json({ error: "PUSH_SEND_SCOPE_REQUIRED" });
  }

  const parsed = z.object({
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(500),
    type: z.string().trim().max(40).optional(),
    target: z.enum(["all", "users", "phones", "emails"]).default("all"),
    userIds: z.array(z.string().trim().min(1)).max(1000).optional(),
    phones: z.array(z.string().trim().min(6)).max(1000).optional(),
    emails: z.array(z.string().trim().email()).max(1000).optional()
  }).safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const payload = parsed.data;
  const normalizedUserIds = new Set((payload.userIds || []).map((x) => safeText(x)).filter(Boolean));
  const normalizedPhones = new Set((payload.phones || []).map((x) => normalizePhone(x)).filter(Boolean));
  const normalizedEmails = new Set((payload.emails || []).map((x) => normalizeEmail(x)).filter(Boolean));

  if (payload.target === "users" && !normalizedUserIds.size) {
    return res.status(400).json({ error: "USER_IDS_REQUIRED" });
  }
  if (payload.target === "phones" && !normalizedPhones.size) {
    return res.status(400).json({ error: "PHONES_REQUIRED" });
  }
  if (payload.target === "emails" && !normalizedEmails.size) {
    return res.status(400).json({ error: "EMAILS_REQUIRED" });
  }

  const nowIso = new Date().toISOString();
  let sentCount = 0;
  let totalUsers = 0;
  await mutateData((draft) => {
    if (!Array.isArray((draft as any).userProfiles)) (draft as any).userProfiles = [];
    const profiles = (draft as any).userProfiles as any[];
    totalUsers = profiles.length;
    profiles.forEach((profile: any) => {
      const id = safeText(profile?.id || "");
      const phone = normalizePhone(safeText(profile?.phone || ""));
      const email = normalizeEmail(safeText(profile?.email || ""));
      let matched = false;
      if (payload.target === "all") matched = true;
      else if (payload.target === "users") matched = !!id && normalizedUserIds.has(id);
      else if (payload.target === "phones") matched = !!phone && normalizedPhones.has(phone);
      else if (payload.target === "emails") matched = !!email && normalizedEmails.has(email);
      if (!matched) return;

      const current = Array.isArray((profile as any).pushNotifications) ? (profile as any).pushNotifications : [];
      const nextEntry = {
        id: makeId("push"),
        title: payload.title,
        message: payload.message,
        type: safeText(payload.type || "general") || "general",
        createdAt: nowIso,
        from: safeText((req as any)?.admin?.email || "") || "admin"
      };
      (profile as any).pushNotifications = [nextEntry, ...current].slice(0, 200);
      (profile as any).updatedAt = nowIso;
      sentCount += 1;
    });
  }, "admin_send_push_notifications");

  return res.json({
    ok: true,
    sentCount,
    totalUsers,
    target: payload.target
  });
});

// Admin dashboard users for travel-dashboard credential login.
adminRouter.get("/dashboard-users", async (req, res) => {
  if (!requireAdminDashboardScope(req, res)) return;
  const scope = normalizeDashboardScope(req.query?.scope || "travel");
  try {
    const rows = await readDashboardCredentialRows(scope);
    const users = rows
      .map((row: any) => ({
        id: safeText(row?.id || ""),
        scope: normalizeDashboardScope(row?.dashboard || row?.scope || "travel"),
        username: normalizeDashboardUsername(row?.username || ""),
        active: row?.is_active !== false && row?.active !== false,
        createdAt: safeText(row?.created_at || ""),
        updatedAt: safeText(row?.updated_at || "")
      }))
      .filter((x: any) => x.id && x.username);
    return res.json({ ok: true, users });
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    if (msg.includes("ev_dashboard_credentials") || msg.includes("SUPABASE_REQUEST_FAILED:404")) {
      return res.status(500).json({ error: "DASHBOARD_CREDENTIALS_TABLE_MISSING" });
    }
    return res.status(500).json({ error: "DASHBOARD_USERS_FETCH_FAILED", message: msg });
  }
});

adminRouter.post("/dashboard-users", async (req, res) => {
  if (!requireAdminDashboardScope(req, res)) return;
  const scope = normalizeDashboardScope(req.body?.scope || "travel");
  const username = normalizeDashboardUsername(req.body?.username || "");
  const password = safeText(req.body?.password || "");
  const active = req.body?.active !== false;

  if (!username) return res.status(400).json({ error: "USERNAME_REQUIRED" });
  if (!password) return res.status(400).json({ error: "PASSWORD_REQUIRED" });
  if (password.length < 8) return res.status(400).json({ error: "PASSWORD_TOO_SHORT" });

  const passwordHash = hashDashboardPassword(password);
  try {
    const existingRows = await supabaseAdminFetchJson(
      `/rest/v1/ev_dashboard_credentials?select=id,scope,dashboard,username&scope=eq.${encodeURIComponent(scope)}&username=eq.${encodeURIComponent(username)}&limit=1`
    );
    const existing = Array.isArray(existingRows) && existingRows[0] ? existingRows[0] : null;
    const { url } = assertSupabaseAdminConfigured();
    if (existing?.id) {
      const endpoint = `${url}/rest/v1/ev_dashboard_credentials?id=eq.${encodeURIComponent(safeText(existing.id))}`;
      const r = await fetch(endpoint, {
        method: "PATCH",
        headers: supabaseAdminHeaders({ Prefer: "return=representation" }),
        body: JSON.stringify({
          scope,
          dashboard: scope,
          username,
          password_hash: passwordHash,
          is_active: !!active,
          active: !!active
        })
      });
      if (!r.ok) return res.status(500).json({ error: "DASHBOARD_USER_UPDATE_FAILED", message: await r.text() });
      const out = await r.json().catch(() => []);
      const row = Array.isArray(out) ? out[0] : out;
      return res.json({
        ok: true,
        user: {
          id: safeText(row?.id || existing.id),
          scope,
          username,
          active: row?.is_active !== false && row?.active !== false
        }
      });
    }

    const endpoint = `${url}/rest/v1/ev_dashboard_credentials`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: supabaseAdminHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify([{
        scope,
        dashboard: scope,
        username,
        password_hash: passwordHash,
        is_active: !!active,
        active: !!active
      }])
    });
    if (!r.ok) return res.status(500).json({ error: "DASHBOARD_USER_CREATE_FAILED", message: await r.text() });
    const out = await r.json().catch(() => []);
    const row = Array.isArray(out) ? out[0] : out;
    return res.json({
      ok: true,
      user: {
        id: safeText(row?.id || ""),
        scope,
        username,
        active: row?.is_active !== false && row?.active !== false
      }
    });
  } catch (err: any) {
    const msg = String(err?.message || err || "");
    if (msg.includes("ev_dashboard_credentials") || msg.includes("SUPABASE_REQUEST_FAILED:404")) {
      return res.status(500).json({ error: "DASHBOARD_CREDENTIALS_TABLE_MISSING" });
    }
    return res.status(500).json({ error: "DASHBOARD_USER_SAVE_FAILED", message: msg });
  }
});

// Admin-only bot/agent status for dashboard visibility.
adminRouter.get("/bots/status", (_req, res) => {
  const rawMode = String(process.env.TELEGRAM_MODE || "").trim().toLowerCase();
  const mode = rawMode === "on" || rawMode === "true" || rawMode === "1"
    ? "polling"
    : (rawMode || "off");
  const webhookBase = (process.env.TELEGRAM_WEBHOOK_BASE_URL || "").trim();
  const webhookSecretSet = Boolean((process.env.TELEGRAM_WEBHOOK_SECRET || "").trim());
  const botSuffix = webhookSecretSet ? "/<secret>" : "";

  const bots = {
    admin: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    support: Boolean(process.env.TELEGRAM_SUPPORT_BOT_TOKEN),
    sales: Boolean(process.env.TELEGRAM_SALES_BOT_TOKEN),
    ops: Boolean(process.env.TELEGRAM_OPS_BOT_TOKEN),
    finance: Boolean(process.env.TELEGRAM_FINANCE_BOT_TOKEN),
  };

  const agentModel = (process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini").trim();
  const transcribeModel = (process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1").trim();

  return res.json({
    mode,
    webhookBase,
    webhookSecretSet,
    bots,
    agentModel,
    transcribeModel,
    webhookPaths: {
      admin: `/telegram/admin${botSuffix}`,
      support: `/telegram/support${botSuffix}`,
      sales: `/telegram/sales${botSuffix}`,
      ops: `/telegram/ops${botSuffix}`,
      finance: `/telegram/finance${botSuffix}`,
    },
  });
});

adminRouter.get("/ui/paths", (req, res) => {
  const adminPath = normalizeUiPath(
    process.env.ADMIN_UI_PATH || "/_ev_console_x9k2p7_9b3f21a7c4d8e0f6a1b5c7d9e2f4a6b8c0d1e3f5a7b9c2d4e6f8a0b1c3d5e7f9"
  );
  const travelPath = normalizeUiPath(process.env.TRAVEL_UI_PATH || `${adminPath}/travel`);
  const foodPath = normalizeUiPath(process.env.MART_UI_PATH || process.env.FOOD_UI_PATH || `${adminPath}/food`);
  const supportPath = normalizeUiPath(process.env.SUPPORT_UI_PATH || `${adminPath}/support`);
  const martVendorPath = normalizeUiPath(
    process.env.MARTVENDOR_UI_PATH ||
    process.env.MART_VENDOR_UI_PATH ||
    process.env.EXPO_PUBLIC_MARTVENDOR_UI_PATH ||
    `${adminPath}/mart-vendor`
  );
  const driverPath = normalizeUiPath(process.env.DRIVER_UI_PATH || "/driver");
  const foodVendorPath = normalizeUiPath(process.env.FOOD_VENDOR_UI_PATH || "/restaurant-vendor");
  const origin = requestOrigin(req);
  const absolute = {
    admin: origin ? `${origin}${adminPath}` : adminPath,
    travel: origin ? `${origin}${travelPath}` : travelPath,
    food: origin ? `${origin}${foodPath}` : foodPath,
    support: origin ? `${origin}${supportPath}` : supportPath,
    mart_vendor: origin ? `${origin}${martVendorPath}` : martVendorPath,
    driver: origin ? `${origin}${driverPath}` : driverPath,
    food_vendor: origin ? `${origin}${foodVendorPath}` : foodVendorPath,
  };
  return res.json({
    origin,
    relative: {
      admin: adminPath,
      travel: travelPath,
      food: foodPath,
      support: supportPath,
      mart_vendor: martVendorPath,
      driver: driverPath,
      food_vendor: foodVendorPath,
    },
    absolute
  });
});

function supabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

function getAiClient() {
  const openAiKey = safeText(process.env.OPENAI_API_KEY || "");
  const openRouterKey = safeText(process.env.OpenRouter_key || process.env.OPENROUTER_KEY || "");
  if (openRouterKey) {
    return new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1"
    });
  }
  if (openAiKey) return new OpenAI({ apiKey: openAiKey });
  return null;
}

function sanitizeAiPatch(raw: any, template: Record<string, any>) {
  const out: Record<string, any> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const allowed = new Set(Object.keys(template || {}));
  Object.keys(raw).forEach((k) => {
    if (!allowed.has(k)) return;
    out[k] = raw[k];
  });
  return out;
}

function assertSupabaseAdminConfigured() {
  const url = supabaseUrl().replace(/\/+$/, "");
  const key = supabaseServiceRoleKey();
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  return { url, key };
}

function supabaseAdminHeaders(extra?: Record<string, string>) {
  const { key } = assertSupabaseAdminConfigured();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(extra || {})
  };
}

function isMissingRelationErrorMessage(message: any, table: string) {
  const text = safeText(message).toLowerCase();
  const tableName = safeText(table).toLowerCase();
  return !!text && !!tableName && (
    (text.includes("does not exist") || text.includes("could not find the table")) &&
    text.includes(tableName)
  );
}

function fallbackTableForRequestedTable(table: string) {
  if (table === FOOD_VENDOR_TABLE) return LEGACY_FOOD_VENDOR_TABLE;
  if (table === FOOD_MENU_ITEM_TABLE) return LEGACY_FOOD_MENU_ITEM_TABLE;
  if (table === FOOD_VENDOR_MENU_TABLE) return LEGACY_FOOD_VENDOR_MENU_TABLE;
  return "";
}

function normalizeUploadFolder(raw: any, fallback = "admin") {
  const folder = String(raw || fallback).replace(/[^a-zA-Z0-9/_-]/g, "");
  return folder || fallback;
}

function sanitizeFileBaseName(rawName: any) {
  const input = safeText(rawName);
  const noExt = input.replace(/\.[a-z0-9]+$/i, "");
  const cleaned = noExt
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_\-.]+|[_\-.]+$/g, "");
  return cleaned || `upload_${Date.now()}`;
}

function makeUploadFileName(mimeType: string, originalName?: string) {
  const baseName = sanitizeFileBaseName(originalName);
  const isPng = safeText(mimeType).toLowerCase() === "image/png";
  const ext = isPng ? "png" : "jpg";
  return { baseName, isPng, ext, filename: `${baseName}.${ext}` };
}

async function normalizeUploadImage(buffer: Buffer, mimeType: string) {
  const { isPng } = makeUploadFileName(mimeType);
  if (isPng) {
    return {
      contentType: "image/png",
      body: await sharp(buffer).rotate().png({ compressionLevel: 9 }).toBuffer()
    };
  }
  return {
    contentType: "image/jpeg",
    body: await sharp(buffer).rotate().jpeg({ quality: 85 }).toBuffer()
  };
}

function getSupabaseStorageConfig() {
  const supabaseUrlRaw = safeText(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const supabaseKey = safeText(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "");
  const supabaseBucket = safeText(process.env.SUPABASE_STORAGE_BUCKET || "");
  if (!supabaseUrlRaw || !supabaseKey || !supabaseBucket) {
    throw new Error("SUPABASE_STORAGE_NOT_CONFIGURED");
  }
  return { supabaseUrlRaw, supabaseKey, supabaseBucket };
}

async function uploadImageBufferToSupabase(buffer: Buffer, mimeType: string, folderRaw: any, originalName?: string) {
  const folder = normalizeUploadFolder(folderRaw, "admin");
  const { baseName, ext } = makeUploadFileName(mimeType, originalName);
  const { contentType, body } = await normalizeUploadImage(buffer, mimeType);
  const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig();
  let objectPath = "";
  let uploaded = false;
  let lastErr = "";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const filename = `${baseName}${suffix}.${ext}`;
    objectPath = path.join(folder, filename).replace(/\\/g, "/");
    const uploadUrl = `${supabaseUrlRaw}/storage/v1/object/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
    const uploadResp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": contentType
      },
      body: body as any
    });
    if (uploadResp.ok) {
      uploaded = true;
      break;
    }
    const text = await uploadResp.text();
    lastErr = text;
    if (uploadResp.status === 409 || /already exists|duplicate/i.test(text)) {
      continue;
    }
    throw new Error(`SUPABASE_UPLOAD_FAILED:${text}`);
  }
  if (!uploaded || !objectPath) {
    throw new Error(`SUPABASE_UPLOAD_FAILED:${lastErr || "UNABLE_TO_RESOLVE_FILENAME"}`);
  }
  const publicUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
  return {
    path: objectPath,
    url: publicUrl,
    storage: "supabase",
    bucket: supabaseBucket,
    objectPath,
    contentType
  };
}

async function supabaseAdminFetchJson(routePath: string, init?: RequestInit) {
  const { url } = assertSupabaseAdminConfigured();
  const joinedPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
  const r = await fetch(`${url}${joinedPath}`, {
    ...(init || {}),
    headers: {
      ...supabaseAdminHeaders(),
      ...((init?.headers || {}) as Record<string, string>)
    }
  });
  if (!r.ok) {
    throw new Error(`SUPABASE_REQUEST_FAILED:${r.status}:${await r.text()}`);
  }
  return r.json();
}

async function supabaseSelectAllRaw(table: string, pageSize = 1000) {
  const out: any[] = [];
  let offset = 0;
  for (;;) {
    const query = `select=*&limit=${pageSize}&offset=${offset}`;
    const rows = await supabaseAdminFetchJson(`/rest/v1/${encodeURIComponent(table)}?${query}`);
    const arr = Array.isArray(rows) ? rows : [];
    out.push(...arr);
    if (arr.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

function defaultConflictColumnForTable(table: string) {
  if (table === "ev_coupons") return "code";
  if (table === "ev_site_pages") return "slug";
  if (table === FOOD_VENDOR_MENU_TABLE || table === LEGACY_FOOD_VENDOR_MENU_TABLE || table === "ev_vendor_menus") return "restaurant_id";
  return "id";
}

const INVOICE_TRANSACTION_TABLES = new Set([
  "ev_bookings",
  "ev_cab_bookings",
  "ev_bus_bookings",
  "ev_rental_bookings",
  "ev_food_orders",
  "ev_mart_orders"
]);

function normalizeInvoiceTransactionTable(raw: any) {
  const t = safeText(raw).toLowerCase();
  if (t === "bookings" || t === "travelbookings") return "ev_bookings";
  if (t === "cabbookings" || t === "cab-bookings") return "ev_cab_bookings";
  if (t === "busbookings" || t === "bus-bookings") return "ev_bus_bookings";
  if (t === "bikebookings" || t === "bike-bookings" || t === "rentalbookings" || t === "rental-bookings") return "ev_rental_bookings";
  if (t === "foodorders" || t === "food-orders") return "ev_food_orders";
  if (t === "martorders" || t === "mart-orders") return "ev_mart_orders";
  return t;
}

function parseInvoiceAmount(invoice: any) {
  const n = Number(invoice?.amount || 0);
  return Number.isFinite(n) ? n : 0;
}

function parseAmount(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatINR(value: any) {
  const n = Number(value || 0);
  const v = Number.isFinite(n) ? n : 0;
  return `INR ${v.toFixed(2)}`;
}

function invoiceDateLabel(invoice: any) {
  const raw = safeText(invoice?.issued_at || invoice?.created_at || "");
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-IN", { hour12: true, timeZone: "Asia/Kolkata" });
}

async function fetchInvoiceByTransaction(table: string, transactionId: string) {
  const paymentId = `${table}:${transactionId}`;
  const endpoint =
    `/rest/v1/ev_invoices` +
    `?select=*` +
    `&payment_id=eq.${encodeURIComponent(paymentId)}` +
    `&order=created_at.desc.nullslast` +
    `&limit=1`;
  const rows = await supabaseAdminFetchJson(endpoint);
  const list = Array.isArray(rows) ? rows : [];
  return list[0] || null;
}

async function fetchTransactionRow(table: string, transactionId: string) {
  const endpoint = `/rest/v1/${encodeURIComponent(table)}?select=*&id=eq.${encodeURIComponent(transactionId)}&limit=1`;
  const rows = await supabaseAdminFetchJson(endpoint);
  const list = Array.isArray(rows) ? rows : [];
  return list[0] || null;
}

function isMissingInvoicesTableError(err: any) {
  const msg = safeText(err?.message || err).toLowerCase();
  return msg.includes("pgrst205") && msg.includes("ev_invoices");
}

function transactionServiceName(table: string, row: any) {
  if (table === "ev_bookings") return safeText(row?.type).toLowerCase() === "tour" ? "Tour Booking" : "Stay Booking";
  if (table === "ev_cab_bookings") return "Cab Booking";
  if (table === "ev_bus_bookings") return "Bus Booking";
  if (table === "ev_rental_bookings") return "Bike Booking";
  if (table === "ev_food_orders") return "Food Order";
  if (table === "ev_mart_orders") return "Mart Order";
  return "Transaction";
}

function transactionAmount(row: any) {
  const amountCandidates = [
    row?.amount,
    row?.paid_amount,
    row?.paidAmount,
    row?.total_price,
    row?.totalPrice,
    row?.total_amount,
    row?.totalAmount,
    row?.total_fare,
    row?.totalFare,
    row?.estimated_fare,
    row?.estimatedFare,
    row?.pricing?.totalAmount,
    row?.pricing?.total_amount,
    row?.pricing?.estimatedAmount
  ];
  for (const c of amountCandidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function fallbackInvoiceFromTransaction(table: string, transaction: any) {
  const now = new Date();
  const ts = now.getTime().toString().slice(-6);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const invoiceNo = `EV-INV-${y}${m}${d}-${ts}`;
  const txnId = safeText(transaction?.id || "");
  return {
    id: `inv_fallback_${table}_${txnId}`.replace(/[^a-z0-9_]+/gi, "_").toLowerCase(),
    invoice_no: invoiceNo,
    service_name: transactionServiceName(table, transaction),
    user_name: safeText(transaction?.user_name || transaction?.userName || transaction?.name || "Customer"),
    email: safeText(transaction?.email || ""),
    phone: safeText(transaction?.phone || ""),
    amount: transactionAmount(transaction),
    payment_method: safeText(transaction?.payment_method || transaction?.paymentMethod || "system"),
    payment_status: "paid",
    issued_at: safeText(
      transaction?.completed_at ||
      transaction?.completedAt ||
      transaction?.updated_at ||
      transaction?.updatedAt ||
      transaction?.created_at ||
      transaction?.createdAt ||
      now.toISOString()
    )
  };
}

function defaultInvoiceProfile() {
  return {
    brandName: "ExploreValley",
    logoUrl: "",
    sellerName: "ExploreValley Pvt Ltd",
    sellerAddress: "",
    gstin: "",
    fssai: "",
    cin: "",
    pan: "",
    placeOfSupply: "",
    supportEmail: "",
    supportPhone: "",
    authorizedSignatory: "Authorised Signatory",
    defaultHsnOrSac: "9964",
    defaultGstPercent: 5,
    terms: [],
    serviceProfiles: {}
  };
}

async function fetchImageBufferFromUrl(url: string) {
  const u = safeText(url);
  if (!u || !/^https?:\/\//i.test(u)) return null;
  try {
    const r = await fetch(u);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    const b = Buffer.from(ab);
    return b.length ? b : null;
  } catch {
    return null;
  }
}

function safeObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function serviceKeyForTable(table: string, transaction: any) {
  if (table === "ev_food_orders") return "food";
  if (table === "ev_mart_orders") return "mart";
  if (table === "ev_cab_bookings") return "cab";
  if (table === "ev_bus_bookings") return "bus";
  if (table === "ev_rental_bookings") return "bike";
  if (table === "ev_bookings") {
    const t = safeText(transaction?.type).toLowerCase();
    if (t === "tour") return "tour";
    if (t === "stay") return "hotel";
    if (t === "hotel") return "hotel";
    if (t === "cottage") return "cottage";
    return "stay";
  }
  return "default";
}

async function fetchInvoiceProfileConfig() {
  const rows = await supabaseAdminFetchJson("/rest/v1/ev_settings?id=eq.main&select=tax_rules&limit=1");
  const row = Array.isArray(rows) ? rows[0] : null;
  const taxRules = safeObject(row?.tax_rules);
  const invoiceRaw = safeObject((taxRules as any).invoice || (taxRules as any).invoice_profile || {});
  const defaults = defaultInvoiceProfile();
  const serviceProfiles = safeObject(invoiceRaw.serviceProfiles || invoiceRaw.service_profiles || {});
  return {
    ...defaults,
    ...invoiceRaw,
    serviceProfiles
  };
}

function mergeSellerProfile(baseProfile: any, serviceKey: string, vendorDetails: any) {
  const base = { ...defaultInvoiceProfile(), ...safeObject(baseProfile) };
  const byService = safeObject(base.serviceProfiles?.[serviceKey] || {});
  const vendor = safeObject(vendorDetails);
  const seller = {
    ...base,
    ...byService
  };
  if (safeText(vendor?.name)) seller.sellerName = safeText(vendor.name);
  if (safeText(vendor?.address)) seller.sellerAddress = safeText(vendor.address);
  if (safeText(vendor?.gstin)) seller.gstin = safeText(vendor.gstin);
  if (safeText(vendor?.fssai)) seller.fssai = safeText(vendor.fssai);
  if (safeText(vendor?.cin)) seller.cin = safeText(vendor.cin);
  if (safeText(vendor?.pan)) seller.pan = safeText(vendor.pan);
  if (safeText(vendor?.supportEmail)) seller.supportEmail = safeText(vendor.supportEmail);
  if (safeText(vendor?.supportPhone)) seller.supportPhone = safeText(vendor.supportPhone);
  if (safeText(vendor?.placeOfSupply)) seller.placeOfSupply = safeText(vendor.placeOfSupply);
  if (safeText(vendor?.brandName)) seller.brandName = safeText(vendor.brandName);
  if (safeText(vendor?.logoUrl)) seller.logoUrl = safeText(vendor.logoUrl);
  if (safeText(vendor?.defaultHsnOrSac)) seller.defaultHsnOrSac = safeText(vendor.defaultHsnOrSac);
  if (safeText(vendor?.defaultGstPercent)) seller.defaultGstPercent = Number(vendor.defaultGstPercent);
  return seller;
}

function firstNonEmpty(...values: any[]) {
  for (const v of values) {
    const s = safeText(v);
    if (s) return s;
  }
  return "";
}

function compactObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (safeText(v)) out[k] = safeText(v);
  }
  return out as Partial<T>;
}

function invoiceProfileToVendorDetails(raw: any) {
  const p = safeObject(raw);
  return compactObject({
    name: firstNonEmpty(p?.sellerName, p?.name),
    address: firstNonEmpty(p?.sellerAddress, p?.address),
    gstin: firstNonEmpty(p?.gstin),
    fssai: firstNonEmpty(p?.fssai),
    cin: firstNonEmpty(p?.cin),
    pan: firstNonEmpty(p?.pan),
    supportEmail: firstNonEmpty(p?.supportEmail),
    supportPhone: firstNonEmpty(p?.supportPhone),
    placeOfSupply: firstNonEmpty(p?.placeOfSupply),
    brandName: firstNonEmpty(p?.brandName),
    logoUrl: firstNonEmpty(p?.logoUrl),
    defaultHsnOrSac: firstNonEmpty(p?.defaultHsnOrSac),
    defaultGstPercent: firstNonEmpty(p?.defaultGstPercent)
  });
}

function vendorProfileFromRow(row: any, options?: { allowGenericName?: boolean }) {
  const r = safeObject(row);
  const allowGenericName = options?.allowGenericName !== false;
  return compactObject({
    brandName: firstNonEmpty(r?.brandName, r?.brand_name),
    logoUrl: firstNonEmpty(r?.logoUrl, r?.logo_url),
    name: firstNonEmpty(
      r?.sellerName,
      r?.seller_name,
      r?.legal_name,
      r?.legalName,
      r?.vendor_name,
      r?.vendorName,
      r?.provider_name,
      r?.providerName,
      r?.store_name,
      r?.storeName,
      r?.hotel_name,
      r?.hotelName,
      r?.tour_name,
      r?.tourName,
      allowGenericName ? r?.name : ""
    ),
    address: firstNonEmpty(
      r?.sellerAddress,
      r?.seller_address,
      r?.address,
      r?.location,
      r?.full_address,
      r?.fullAddress,
      r?.office_address,
      r?.officeAddress
    ),
    gstin: firstNonEmpty(r?.gstin, r?.gst_no, r?.gst_number, r?.gstNumber),
    fssai: firstNonEmpty(r?.fssai, r?.fssai_license, r?.fssaiLicense),
    cin: firstNonEmpty(r?.cin),
    pan: firstNonEmpty(r?.pan),
    supportEmail: firstNonEmpty(r?.support_email, r?.supportEmail, r?.email, r?.contact_email, r?.contactEmail),
    supportPhone: firstNonEmpty(r?.support_phone, r?.supportPhone, r?.phone, r?.contact_phone, r?.contactPhone, r?.mobile),
    placeOfSupply: firstNonEmpty(r?.place_of_supply, r?.placeOfSupply, r?.state, r?.city)
  });
}

async function fetchTableRowIfExists(table: string, id: string) {
  const rowId = safeText(id);
  if (!rowId) return null;
  try {
    const rows = await supabaseAdminFetchJson(`/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(rowId)}&select=*&limit=1`);
    const list = Array.isArray(rows) ? rows : [];
    return list[0] || null;
  } catch {
    return null;
  }
}

async function fetchVendorDetailsForTransaction(table: string, transaction: any, invoiceProfile?: any) {
  const fromTxn = vendorProfileFromRow(transaction, { allowGenericName: false });
  try {
    if (table === "ev_food_orders") {
      const restaurantId = safeText(transaction?.restaurant_id || transaction?.restaurantId);
      const row = restaurantId
        ? (await fetchTableRowIfExists(FOOD_VENDOR_TABLE, restaurantId)) || (await fetchTableRowIfExists(LEGACY_FOOD_VENDOR_TABLE, restaurantId))
        : null;
      const profileMap = safeObject((invoiceProfile as any)?.foodVendorProfiles || (invoiceProfile as any)?.food_vendor_profiles || {});
      const profile = invoiceProfileToVendorDetails(profileMap?.[restaurantId]);
      return { ...vendorProfileFromRow(row), ...profile, ...fromTxn };
    }
    if (table === "ev_mart_orders") {
      const martId = safeText(transaction?.mart_partner_id || transaction?.martPartnerId || transaction?.mart_id || transaction?.martId);
      const row = martId ? await fetchTableRowIfExists("ev_mart_partners", martId) : null;
      return { ...vendorProfileFromRow(row), ...fromTxn };
    }
    if (table === "ev_bookings") {
      const type = safeText(transaction?.type).toLowerCase();
      const itemId = safeText(transaction?.item_id || transaction?.itemId || transaction?.hotel_id || transaction?.hotelId || transaction?.tour_id || transaction?.tourId || "");
      if (type === "tour") {
        const row = itemId ? await fetchTableRowIfExists("ev_tours", itemId) : null;
        return { ...vendorProfileFromRow(row), ...fromTxn };
      }
      const row = itemId ? await fetchTableRowIfExists("ev_hotels", itemId) : null;
      return { ...vendorProfileFromRow(row), ...fromTxn };
    }
    if (table === "ev_cab_bookings") {
      const rateId = safeText(transaction?.rate_id || transaction?.rateId || transaction?.cab_rate_id || transaction?.cabRateId || transaction?.service_area_id || transaction?.serviceAreaId);
      const providerId = safeText(transaction?.provider_id || transaction?.providerId || transaction?.cab_provider_id || transaction?.cabProviderId);
      const rateRow = rateId ? await fetchTableRowIfExists("ev_cab_rates", rateId) : null;
      const providerRow = providerId ? await fetchTableRowIfExists("ev_cab_providers", providerId) : null;
      const inferredProviderId = safeText(rateRow?.provider_id || rateRow?.providerId || rateRow?.cab_provider_id || rateRow?.cabProviderId);
      const inferredProviderRow = !providerRow && inferredProviderId ? await fetchTableRowIfExists("ev_cab_providers", inferredProviderId) : null;
      return { ...vendorProfileFromRow(rateRow), ...vendorProfileFromRow(providerRow), ...vendorProfileFromRow(inferredProviderRow), ...fromTxn };
    }
    if (table === "ev_rental_bookings") {
      const vehicleId = safeText(transaction?.bike_rental_id || transaction?.bikeRentalId || transaction?.vehicle_id || transaction?.vehicleId);
      const vendorId = safeText(transaction?.vendor_id || transaction?.vendorId || transaction?.provider_id || transaction?.providerId);
      const vehicleRow = vehicleId ? await fetchTableRowIfExists("ev_rental_vehicles", vehicleId) : null;
      const vendorRow = vendorId ? await fetchTableRowIfExists("ev_bike_rentals", vendorId) : null;
      const inferredVendorId = safeText(vehicleRow?.vendor_id || vehicleRow?.vendorId || vehicleRow?.provider_id || vehicleRow?.providerId);
      const inferredVendorRow = !vendorRow && inferredVendorId ? await fetchTableRowIfExists("ev_bike_rentals", inferredVendorId) : null;
      return { ...vendorProfileFromRow(vehicleRow), ...vendorProfileFromRow(vendorRow), ...vendorProfileFromRow(inferredVendorRow), ...fromTxn };
    }
    return fromTxn;
  } catch {
    return fromTxn;
  }
}

function splitTax(total: number, gstPercent: number) {
  const gstRate = Math.max(0, Number(gstPercent || 0)) / 100;
  const gross = Math.max(0, Number(total || 0));
  if (!gstRate) {
    return { taxable: gross, gstAmount: 0, cgstPct: 0, sgstPct: 0, cgstInr: 0, sgstInr: 0 };
  }
  const taxable = gross / (1 + gstRate);
  const gstAmount = gross - taxable;
  const cgstInr = gstAmount / 2;
  const sgstInr = gstAmount - cgstInr;
  const halfPct = gstPercent / 2;
  return {
    taxable,
    gstAmount,
    cgstPct: halfPct,
    sgstPct: halfPct,
    cgstInr,
    sgstInr
  };
}

function normalizeInvoiceItems(table: string, transaction: any, serviceName: string, hsn: string, gstPercent: number) {
  const listRaw = Array.isArray(transaction?.items) ? transaction.items : [];
  if (listRaw.length) {
    return listRaw.map((it: any, idx: number) => {
      const qty = Math.max(1, Math.floor(parseAmount(it?.quantity || it?.qty || 1)));
      const mrp = parseAmount(it?.mrp || it?.listPrice || it?.price || it?.unitPrice || it?.unit_price);
      const discount = parseAmount(it?.discount || 0);
      const lineGross = Math.max(0, (mrp * qty) - discount);
      const t = splitTax(lineGross, gstPercent);
      return {
        sr: idx + 1,
        upc: safeText(it?.upc || it?.hsn || hsn),
        description: safeText(it?.name || it?.title || serviceName),
        mrp,
        discount,
        qty,
        taxableValue: t.taxable,
        cgstPct: t.cgstPct,
        cgstInr: t.cgstInr,
        sgstPct: t.sgstPct,
        sgstInr: t.sgstInr,
        cessPct: 0,
        additionalCess: 0,
        total: lineGross
      };
    });
  }

  const total = transactionAmount(transaction);
  const qty = Math.max(1, Math.floor(parseAmount(transaction?.qty || transaction?.quantity || transaction?.passengers || 1)));
  const mrp = qty > 0 ? total / qty : total;
  const t = splitTax(total, gstPercent);
  return [{
    sr: 1,
    upc: hsn,
    description: serviceName,
    mrp,
    discount: 0,
    qty,
    taxableValue: t.taxable,
    cgstPct: t.cgstPct,
    cgstInr: t.cgstInr,
    sgstPct: t.sgstPct,
    sgstInr: t.sgstInr,
    cessPct: 0,
    additionalCess: 0,
    total
  }];
}

function numberToWordsUnder1000(n: number) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
  return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${numberToWordsUnder1000(n % 100)}` : ""}`;
}

function numberToIndianWords(value: number) {
  let n = Math.max(0, Math.floor(Number(value || 0)));
  if (!n) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  if (crore) {
    parts.push(`${numberToWordsUnder1000(crore)} Crore`);
    n %= 10000000;
  }
  const lakh = Math.floor(n / 100000);
  if (lakh) {
    parts.push(`${numberToWordsUnder1000(lakh)} Lakh`);
    n %= 100000;
  }
  const thousand = Math.floor(n / 1000);
  if (thousand) {
    parts.push(`${numberToWordsUnder1000(thousand)} Thousand`);
    n %= 1000;
  }
  if (n) parts.push(numberToWordsUnder1000(n));
  return parts.join(" ").trim();
}

function amountInWordsINR(total: number) {
  const v = Math.max(0, Number(total || 0));
  const rupees = Math.floor(v);
  const paise = Math.round((v - rupees) * 100);
  const rupeeWords = `${numberToIndianWords(rupees)} Rupees`;
  if (!paise) return `${rupeeWords} And Zero Paisa Only`;
  return `${rupeeWords} And ${numberToIndianWords(paise)} Paisa Only`;
}

async function buildInvoicePdfBuffer(invoice: any, transaction: any, options?: {
  sellerProfile?: any;
  serviceName?: string;
  items?: any[];
  placeOfSupply?: string;
}) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));

  const finished = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const invoiceNo = safeText(invoice?.invoice_no || invoice?.id || "");
  const txnId = safeText(transaction?.id || "");
  const customer = safeText(invoice?.user_name || transaction?.user_name || transaction?.userName || "Customer");
  const email = safeText(invoice?.email || transaction?.email || "");
  const phone = safeText(invoice?.phone || transaction?.phone || "");
  const serviceName = safeText(options?.serviceName || invoice?.service_name || "Transaction");
  const paymentMethod = safeText(invoice?.payment_method || "system");
  const paymentStatus = safeText(invoice?.payment_status || "paid");
  const issuedAt = invoiceDateLabel(invoice);
  const amount = parseInvoiceAmount(invoice);
  const seller = { ...defaultInvoiceProfile(), ...safeObject(options?.sellerProfile) };
  const items = Array.isArray(options?.items) ? options?.items : [];
  const placeOfSupply = safeText(options?.placeOfSupply || seller.placeOfSupply || "");
  const amountWords = amountInWordsINR(amount);
  const hardWrap = (value: any, chunk = 14) => {
    const raw = safeText(value);
    if (!raw) return "";
    // Insert soft breaks for long token-like strings so they don't overflow.
    return raw.replace(new RegExp(`([^\\s]{${chunk}})`, "g"), "$1 ");
  };
  const truncate = (value: any, max = 24) => {
    const s = safeText(value);
    if (s.length <= max) return s;
    return `${s.slice(0, Math.max(1, max - 1))}…`;
  };

  doc.rect(28, 28, 540, 760).lineWidth(1).stroke("#1e1e1e");
  const logoUrl = safeText((seller as any)?.logoUrl || "");
  let drewLogo = false;
  if (logoUrl) {
    const logoBuf = await fetchImageBufferFromUrl(logoUrl);
    if (logoBuf) {
      try {
        doc.image(logoBuf, 36, 42, { fit: [170, 56], align: "left", valign: "center" });
        drewLogo = true;
      } catch {
        drewLogo = false;
      }
    }
  }
  if (!drewLogo) {
    doc.fontSize(26).fillColor("#111").text(safeText(seller.brandName || "ExploreValley"), 36, 50, { width: 260 });
  }
  doc.fillColor("#111");
  doc.fontSize(32).text("Tax Invoice", 330, 56, { width: 220, align: "left" });

  const headY = 112;
  doc.moveTo(28, headY).lineTo(568, headY).stroke("#1e1e1e");
  const leftX = 34;
  const leftW = 340;
  let leftY = headY + 10;
  doc.font("Helvetica").fontSize(11).text("Sold By / Seller", leftX, leftY, { width: leftW });
  leftY += 16;
  doc.font("Helvetica-Bold").fontSize(13).text(safeText(seller.sellerName || "Seller"), leftX, leftY, { width: leftW });
  leftY += 18;
  doc.font("Helvetica").fontSize(10).text(safeText(seller.sellerAddress || "-"), leftX, leftY, { width: leftW });
  leftY += Math.max(24, doc.heightOfString(safeText(seller.sellerAddress || "-"), { width: leftW, align: "left" })) + 6;
  doc.text(`GSTIN: ${safeText(seller.gstin || "-")}`, leftX, leftY, { width: leftW });
  leftY += 14;
  doc.text(`FSSAI License Number: ${safeText(seller.fssai || "-")}`, leftX, leftY, { width: leftW });
  leftY += 14;
  doc.text(`CIN: ${safeText(seller.cin || "-")}`, leftX, leftY, { width: leftW });
  leftY += 14;
  doc.text(`PAN: ${safeText(seller.pan || "-")}`, leftX, leftY, { width: leftW });
  leftY += 6;

  const rightX = 384;
  const labelW = 76;
  const valueW = 100;
  let rightY = headY + 18;
  const drawRightRow = (label: string, value: string) => {
    doc.font("Helvetica").fontSize(9).text(label, rightX, rightY, { width: labelW, lineBreak: false });
    const wrapped = hardWrap(value, 12);
    doc.font("Helvetica-Bold").fontSize(9).text(wrapped, rightX + labelW, rightY, { width: valueW });
    const h = doc.heightOfString(wrapped, { width: valueW });
    rightY += Math.max(13, h + 2);
  };
  drawRightRow("Invoice Number:", invoiceNo);
  drawRightRow("Transaction ID:", txnId);
  drawRightRow("Payment:", paymentMethod);
  drawRightRow("Status:", paymentStatus);
  drawRightRow("Date:", issuedAt || "-");

  let splitY = Math.max(leftY, rightY) + 8;
  doc.moveTo(28, splitY).lineTo(568, splitY).stroke("#1e1e1e");
  splitY += 8;
  doc.font("Helvetica-Bold").fontSize(13).text("Invoice To", 34, splitY);
  doc.font("Helvetica").fontSize(11);
  splitY += 20;
  doc.text(`Name: ${customer || "-"}`, 34, splitY, { width: 520 });
  splitY += 15;
  const addr = safeText(transaction?.delivery_address || transaction?.deliveryAddress || transaction?.pickup_location || transaction?.pickupLocation || "-");
  doc.text(`Address: ${addr}`, 34, splitY, { width: 520 });
  splitY += Math.max(18, doc.heightOfString(`Address: ${addr}`, { width: 520 })) + 2;
  doc.text(`Phone: ${phone || "-"}`, 34, splitY, { width: 520 });
  splitY += 15;
  doc.text(`Email: ${hardWrap(email || "-", 24)}`, 34, splitY, { width: 520 });
  splitY += Math.max(15, doc.heightOfString(`Email: ${hardWrap(email || "-", 24)}`, { width: 520 })) + 2;
  doc.text(`Place of Supply: ${placeOfSupply || "-"}`, 34, splitY, { width: 520 });

  let tableTop = splitY + 14;
  doc.moveTo(28, tableTop).lineTo(568, tableTop).stroke("#1e1e1e");
  tableTop += 4;
  const cols = [
    { key: "sr", label: "Sr", w: 20 },
    { key: "upc", label: "UPC/HSN", w: 42 },
    { key: "description", label: "Item Description", w: 110 },
    { key: "mrp", label: "MRP", w: 42 },
    { key: "discount", label: "Discount", w: 42 },
    { key: "qty", label: "Qty", w: 26 },
    { key: "taxableValue", label: "Taxable", w: 50 },
    { key: "cgstPct", label: "CGST%", w: 34 },
    { key: "cgstInr", label: "CGST", w: 38 },
    { key: "sgstPct", label: "SGST%", w: 34 },
    { key: "sgstInr", label: "SGST", w: 38 },
    { key: "total", label: "Total", w: 50 }
  ];
  let x = 32;
  doc.font("Helvetica-Bold").fontSize(8);
  cols.forEach((c) => {
    doc.text(c.label, x, tableTop, { width: c.w, align: "left" });
    x += c.w;
  });
  doc.font("Helvetica").fontSize(8);
  let rowY = tableTop + 13;
  const list = items.length ? items : [{ sr: 1, description: serviceName, upc: safeText(seller.defaultHsnOrSac || ""), mrp: amount, discount: 0, qty: 1, taxableValue: amount, cgstPct: 0, cgstInr: 0, sgstPct: 0, sgstInr: 0, total: amount }];
  list.forEach((it: any) => {
    let cx = 32;
    const values: Record<string, any> = {
      sr: it.sr,
      upc: safeText(it.upc),
      description: safeText(it.description),
      mrp: parseAmount(it.mrp).toFixed(2),
      discount: parseAmount(it.discount).toFixed(2),
      qty: parseAmount(it.qty).toFixed(0),
      taxableValue: parseAmount(it.taxableValue).toFixed(2),
      cgstPct: parseAmount(it.cgstPct).toFixed(2),
      cgstInr: parseAmount(it.cgstInr).toFixed(2),
      sgstPct: parseAmount(it.sgstPct).toFixed(2),
      sgstInr: parseAmount(it.sgstInr).toFixed(2),
      total: parseAmount(it.total).toFixed(2)
    };
    cols.forEach((c) => {
      const raw = safeText(values[c.key]);
      const cell = c.key === "description" ? truncate(raw, 30) : truncate(raw, 12);
      doc.text(cell, cx + 1, rowY, { width: c.w - 2, align: "left", lineBreak: false });
      cx += c.w;
    });
    rowY += 13;
  });

  doc.moveTo(28, rowY + 2).lineTo(568, rowY + 2).stroke("#1e1e1e");
  doc.font("Helvetica-Bold").fontSize(10).text(`Total: ${formatINR(amount)}`, 34, rowY + 8, { width: 260, align: "left" });
  doc.font("Helvetica").fontSize(10).text(`Amount in Words: ${amountWords}`, 34, rowY + 22, { width: 520, align: "left" });

  let footerY = rowY + 52;
  doc.moveTo(28, footerY).lineTo(568, footerY).stroke("#1e1e1e");
  footerY += 10;
  doc.font("Helvetica-Bold").fontSize(11).text("Seller Contact", 34, footerY);
  doc.font("Helvetica").fontSize(10);
  footerY += 15;
  doc.text(`Support Email: ${safeText(seller.supportEmail || "-")}`, 34, footerY);
  footerY += 14;
  doc.text(`Support Phone: ${safeText(seller.supportPhone || "-")}`, 34, footerY);
  footerY += 20;
  const defaultTerms = [
    "This is a system-generated invoice.",
    "For invoice corrections, contact support within 48 hours."
  ];
  const terms = (Array.isArray(seller.terms) ? seller.terms : [])
    .map((x: any) => safeText(x))
    .filter(Boolean);
  const showTerms = !(
    terms.length === 2 &&
    terms[0] === defaultTerms[0] &&
    terms[1] === defaultTerms[1]
  );
  let termsY = footerY;
  if (showTerms && terms.length) {
    doc.font("Helvetica-Bold").fontSize(11).text("Terms & Conditions", 34, footerY);
    doc.font("Helvetica").fontSize(9);
    termsY = footerY + 14;
    terms.slice(0, 5).forEach((line: any, idx: number) => {
      doc.text(`${idx + 1}. ${safeText(line)}`, 34, termsY, { width: 420 });
      termsY += 12;
    });
  }
  const signatoryRaw = safeText(seller.authorizedSignatory || "Authorised Signatory");
  const isGenericSignatory =
    signatoryRaw.toLowerCase() === "authorised signatory" ||
    signatoryRaw.toLowerCase() === "authorized signatory";
  const signatoryText = isGenericSignatory ? "Authorised Signatory" : `Authorised Signatory: ${signatoryRaw}`;
  doc.font("Helvetica-Bold").fontSize(10).text(signatoryText, 34, (showTerms && terms.length) ? (termsY + 14) : (footerY + 14), { width: 520, align: "left" });
  doc.font("Helvetica");
  doc.end();
  return finished;
}

/**
 * Whether an order was called off, whatever the service names that state.
 *
 * Also treats a completed refund as cancelled: the money went back, so there is
 * nothing left to invoice. A refund still in flight (requested/processing) is
 * not counted — the sale stands until it is actually reversed.
 */
function isCancelledTransaction(row: any) {
  const status = safeText(row?.status || row?.order_status || row?.orderStatus).toLowerCase();
  if (["cancelled", "canceled", "rejected", "failed", "expired", "refunded"].includes(status)) return true;
  const refundStatus = safeText(row?.refund_status || row?.refundStatus).toLowerCase();
  return ["completed", "processed", "refunded"].includes(refundStatus);
}

const REFUND_ORDER_TABLES = [
  "ev_bookings",
  "ev_cab_bookings",
  "ev_rental_bookings",
  "ev_mart_orders",
  "ev_bus_bookings",
  "ev_food_orders",
] as const;

function normalizeRefundStatus(raw: any) {
  const s = safeText(raw).toLowerCase();
  if (s === "approved") return "processing";
  if (s === "processed") return "completed";
  if (s === "process") return "processing";
  if (s === "complete") return "completed";
  if (s === "pending" || s === "processing" || s === "completed" || s === "rejected") return s;
  return "pending";
}

function refundAuditAction(status: string) {
  if (status === "pending") return "REFUND_REQUESTED";
  if (status === "processing") return "REFUND_APPROVED";
  if (status === "rejected") return "REFUND_REJECTED";
  if (status === "completed") return "REFUND_PROCESSED";
  return "";
}

function inferRefundOrderTable(orderId: string, orderType: string) {
  const t = safeText(orderType).toLowerCase();
  if (t === "cab") return "ev_cab_bookings";
  if (t === "food") return "ev_food_orders";
  if (t === "bike") return "ev_rental_bookings";
  if (t === "mart") return "ev_mart_orders";
  if (t === "bus") return "ev_bus_bookings";
  const id = safeText(orderId).toLowerCase();
  if (id.startsWith("cab_")) return "ev_cab_bookings";
  if (id.startsWith("food_")) return "ev_food_orders";
  if (id.startsWith("bike_")) return "ev_rental_bookings";
  if (id.startsWith("mart_")) return "ev_mart_orders";
  if (id.startsWith("bus_")) return "ev_bus_bookings";
  return "ev_bookings";
}

async function patchOrderRefundStatus(table: string, orderId: string, status: string) {
  const { url } = assertSupabaseAdminConfigured();
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    refund_flag: status !== "rejected",
    refund_status: status,
    refund_updated_at: now
  };
  if (status === "completed") payload.status = "cancelled";
  const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?id=eq.${encodeURIComponent(orderId)}&select=id,status,refund_status,refund_updated_at`;
  const r = await fetch(endpoint, {
    method: "PATCH",
    headers: supabaseAdminHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    throw new Error(`REFUND_STATUS_PATCH_FAILED:${table}:${orderId}:${r.status}:${await r.text()}`);
  }
  const rows = await r.json().catch(() => []);
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error(`ORDER_NOT_FOUND:${table}:${orderId}`);
  }
  return rows[0];
}

function getOpenApiSchemas(openApi: any) {
  if (openApi?.definitions && typeof openApi.definitions === "object") {
    return openApi.definitions;
  }
  return (openApi?.components?.schemas && typeof openApi.components.schemas === "object")
    ? openApi.components.schemas
    : {};
}

async function localFallbackRowsForTable(name: string) {
  const table = safeText(name);
  if (table !== "ev_queries") return [];
  try {
    const db = await readData();
    const rows = Array.isArray((db as any)?.queries) ? (db as any).queries : [];
    return rows.map((x: any) => ({
      id: safeText(x?.id),
      user_name: safeText(x?.userName),
      email: safeText(x?.email),
      phone: safeText(x?.phone),
      subject: safeText(x?.subject),
      message: safeText(x?.message),
      // Carried through so the dashboard's per-order support column still works
      // when this fallback is serving instead of Supabase.
      order_id: safeText(x?.orderId),
      order_type: safeText(x?.orderType),
      source: safeText(x?.source) || "contact_page",
      status: safeText(x?.status || "pending"),
      submitted_at: safeText(x?.submittedAt) || null,
      responded_at: safeText(x?.respondedAt) || null,
      response: safeText(x?.response) || null
    }));
  } catch {
    return [];
  }
}

adminRouter.get("/supabase/snapshot", async (req, res) => {
  try {
    const openApi = await supabaseAdminFetchJson("/rest/v1/", {
      headers: { Accept: "application/openapi+json" }
    });
    const schemas = getOpenApiSchemas(openApi);
    const requestedTables = String(req.query.tables || "")
      .split(",")
      .map((x) => safeText(x))
      .filter(Boolean);

    const schemaTableNames = Object.keys(schemas)
      .filter((name) => name.startsWith("ev_"))
      .sort((a, b) => a.localeCompare(b));

    const requestedSafeTables = requestedTables
      .filter((name) => /^ev_[a-z0-9_]+$/i.test(name))
      .sort((a, b) => a.localeCompare(b));

    const tableNames = Array.from(new Set(
      requestedSafeTables.length
        ? [...schemaTableNames.filter((name) => requestedSafeTables.includes(name)), ...requestedSafeTables]
        : schemaTableNames
    ));

    const tables = await Promise.all(tableNames.map(async (name) => {
      const schema = schemas[name] || {};
      const required = Array.isArray(schema.required) ? schema.required.map((x: any) => String(x)) : [];
      const props = (schema.properties && typeof schema.properties === "object") ? schema.properties : {};
      let rows: any[] = [];
      try {
        rows = await supabaseSelectAllRaw(name);
      } catch (err: any) {
        const msg = String(err?.message || err || "");
        // Some tables may not appear in OpenAPI schema cache immediately.
        // For requested tables, keep snapshot response resilient.
        if (requestedSafeTables.includes(name)) {
          const fallbackTable = fallbackTableForRequestedTable(name);
          if (fallbackTable && fallbackTable !== name) {
            try {
              rows = await supabaseSelectAllRaw(fallbackTable);
            } catch (fallbackErr: any) {
              const fallbackMsg = String(fallbackErr?.message || fallbackErr || "");
              if (!isMissingRelationErrorMessage(fallbackMsg, fallbackTable)) {
                throw fallbackErr;
              }
              rows = [];
            }
          } else {
            rows = [];
          }
        } else {
          throw err;
        }
      }
      if (!rows.length) {
        const fallbackRows = await localFallbackRowsForTable(name);
        if (fallbackRows.length) rows = fallbackRows;
      }
      if (name === "ev_mart_products") {
        rows = rows.map((row: any) => normalizeMartProductRow(row));
      }

      const schemaColumns = Object.entries(props).map(([colName, meta]: any) => ({
        name: String(colName),
        type: String(meta?.type || meta?.format || "unknown"),
        nullable: meta?.nullable === true,
        required: required.includes(String(colName))
      }));

      const inferredColumns = rows[0]
        ? Object.keys(rows[0]).map((colName) => ({
            name: String(colName),
            type: typeof rows[0][colName],
            nullable: rows[0][colName] === null,
            required: false
          }))
        : [];

      const columns = schemaColumns.length ? schemaColumns : inferredColumns;
      return {
        name,
        columns,
        rowCount: rows.length,
        rows
      };
    }));

    return res.json({
      source: "supabase",
      generatedAt: new Date().toISOString(),
      tables
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "SUPABASE_SNAPSHOT_FAILED",
      message: String(err?.message || err)
    });
  }
});

adminRouter.post("/supabase/upsert", async (req, res) => {
  try {
    const table = safeText(req.body?.table || "");
    const rawIncomingRows = Array.isArray(req.body?.rows)
      ? req.body.rows
      : (req.body?.rows && typeof req.body.rows === "object" && !Array.isArray(req.body.rows))
        ? [req.body.rows]
        : (req.body?.row && typeof req.body.row === "object" && !Array.isArray(req.body.row))
          ? [req.body.row]
          : [];
    const onConflict = safeText(req.body?.onConflict || defaultConflictColumnForTable(table));

    if (!table || !/^ev_[a-z0-9_]+$/i.test(table)) {
      return res.status(400).json({ error: "INVALID_TABLE_NAME" });
    }
    if (!/^[a-z0-9_]+$/i.test(onConflict)) {
      return res.status(400).json({ error: "INVALID_ON_CONFLICT_COLUMN" });
    }
    if (!rawIncomingRows.length) {
      return res.json({ ok: true, table, affected: 0 });
    }

    let incomingRows = rawIncomingRows;
    let menuRowStats = { generatedIds: 0, deduped: 0 };
    if (table === FOOD_MENU_ITEM_TABLE || table === LEGACY_FOOD_MENU_ITEM_TABLE) {
      const restaurantIds = Array.from(new Set(
        rawIncomingRows
          .map((row: any) => safeText(row?.restaurant_id || row?.restaurantId || ""))
          .filter(Boolean)
      ));
      const vendorNameByRestaurantId = new Map<string, string>();
      if (restaurantIds.length) {
        try {
          const vendorRows = await supabaseAdminFetchJson(
            `/rest/v1/${encodeURIComponent(FOOD_VENDOR_TABLE)}?select=id,name&id=in.(${restaurantIds.map((id) => encodeURIComponent(String(id))).join(",")})`
          );
          (Array.isArray(vendorRows) ? vendorRows : []).forEach((row: any) => {
            const id = safeText(row?.id || "");
            if (!id) return;
            vendorNameByRestaurantId.set(id, safeText(row?.name || id) || id);
          });
        } catch {
          try {
            const vendorRows = await supabaseAdminFetchJson(
              `/rest/v1/${encodeURIComponent(LEGACY_FOOD_VENDOR_TABLE)}?select=id,name&id=in.(${restaurantIds.map((id) => encodeURIComponent(String(id))).join(",")})`
            );
            (Array.isArray(vendorRows) ? vendorRows : []).forEach((row: any) => {
              const id = safeText(row?.id || "");
              if (!id) return;
              vendorNameByRestaurantId.set(id, safeText(row?.name || id) || id);
            });
          } catch {
            // best-effort lookup only
          }
        }
      }
      const normalizedMenuRows = normalizeMenuItemUpsertRows(rawIncomingRows, { vendorNameByRestaurantId });
      incomingRows = normalizedMenuRows.rows;
      menuRowStats = {
        generatedIds: normalizedMenuRows.generatedIds,
        deduped: normalizedMenuRows.deduped
      };
    } else if (table === "ev_mart_products") {
      incomingRows = rawIncomingRows.map((row: any) => normalizeMartProductRow(row));
    }

    // Supabase/PostgREST upsert fails when a single payload contains duplicate
    // values for the on_conflict key. Keep only the latest row per key.
    const dedupedRows: any[] = [];
    const indexByConflict = new Map<string, number>();
    const duplicateConflictKeys = new Set<string>();
    incomingRows.forEach((row: any) => {
      const hasConflictKey = row && Object.prototype.hasOwnProperty.call(row, onConflict);
      const key = hasConflictKey ? safeText(row?.[onConflict]) : "";
      if (!hasConflictKey) {
        dedupedRows.push(row);
        return;
      }
      const existingIdx = indexByConflict.get(key);
      if (existingIdx === undefined) {
        indexByConflict.set(key, dedupedRows.length);
        dedupedRows.push(row);
        return;
      }
      duplicateConflictKeys.add(key);
      dedupedRows[existingIdx] = row;
    });

    let payload: any[] = [];
    if (table === FOOD_MENU_ITEM_TABLE || table === LEGACY_FOOD_MENU_ITEM_TABLE) {
      try {
        await supabaseAdminUpsertRowsIndividually(table, dedupedRows, onConflict);
      } catch (err: any) {
        const msg = String(err?.message || err || "");
        const fallbackTable = fallbackTableForRequestedTable(table);
        if (!fallbackTable || fallbackTable === table || !isMissingRelationErrorMessage(msg, table)) {
          return res.status(500).json({
            error: "SUPABASE_UPSERT_FAILED",
            table,
            message: msg
          });
        }
        try {
          await supabaseAdminUpsertRowsIndividually(fallbackTable, dedupedRows, onConflict);
        } catch (fallbackErr: any) {
          return res.status(500).json({
            error: "SUPABASE_UPSERT_FAILED",
            table: fallbackTable,
            message: String(fallbackErr?.message || fallbackErr)
          });
        }
      }
    } else {
      const { url } = assertSupabaseAdminConfigured();
      const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflict)}`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: supabaseAdminHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(dedupedRows)
      });
      if (!r.ok) {
        const msg = await r.text();
        const fallbackTable = fallbackTableForRequestedTable(table);
        if (!fallbackTable || fallbackTable === table || !isMissingRelationErrorMessage(msg, table)) {
          return res.status(500).json({
            error: "SUPABASE_UPSERT_FAILED",
            table,
            message: msg
          });
        }
        const fallbackEndpoint = `${url}/rest/v1/${encodeURIComponent(fallbackTable)}?on_conflict=${encodeURIComponent(onConflict)}`;
        const fallbackResp = await fetch(fallbackEndpoint, {
          method: "POST",
          headers: supabaseAdminHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
          body: JSON.stringify(dedupedRows)
        });
        if (!fallbackResp.ok) {
          return res.status(500).json({
            error: "SUPABASE_UPSERT_FAILED",
            table: fallbackTable,
            message: await fallbackResp.text()
          });
        }
        payload = await fallbackResp.json().catch(() => []);
      } else {
        payload = await r.json().catch(() => []);
      }
    }
    if (table === FOOD_MENU_ITEM_TABLE || table === LEGACY_FOOD_MENU_ITEM_TABLE) {
      const affectedRestaurantIds = Array.from(new Set(
        dedupedRows
          .map((row: any) => safeText(row?.restaurant_id || row?.restaurantId || ""))
          .filter(Boolean)
      ));
      try {
        await syncVendorMenuBlobsFromItems(affectedRestaurantIds);
      } catch (err: any) {
        // Direct item write already succeeded; blob sync is best-effort.
        console.error("[admin.supabase.upsert] vendor menu blob sync failed", {
          table,
          affectedRestaurantIds,
          message: String(err?.message || err)
        });
      }
    }
    if (table === "ev_refunds") {
      const statusToAction = (statusRaw: any) => {
        const s = safeText(statusRaw).toLowerCase();
        if (s === "approved") return "REFUND_APPROVED";
        if (s === "rejected") return "REFUND_REJECTED";
        if (s === "processed") return "REFUND_PROCESSED";
        if (s === "pending") return "REFUND_REQUESTED";
        return "";
      };
      try {
        await mutateData((db) => {
          if (!Array.isArray((db as any).auditLog)) (db as any).auditLog = [];
          const now = new Date().toISOString();
          const sourceRows = Array.isArray(payload) && payload.length ? payload : dedupedRows;
          sourceRows.forEach((row: any) => {
            const action = statusToAction(row?.status);
            const orderId = safeText(row?.order_id || row?.orderId);
            if (!action || !orderId) return;
            (db as any).auditLog.push({
              id: makeId("audit"),
              at: now,
              action,
              entity: "refund",
              entityId: safeText(row?.id || ""),
              meta: {
                refundId: safeText(row?.id || ""),
                orderId,
                status: safeText(row?.status || ""),
                reason: safeText(row?.reason || ""),
                amount: Number(row?.amount || 0)
              }
            } as any);
          });
        }, "admin_refund_status_upsert");
      } catch {
        // keep upsert successful even if audit log append fails
      }
      const sourceRows = Array.isArray(payload) && payload.length ? payload : dedupedRows;
      for (const row of sourceRows) {
        const orderId = safeText(row?.order_id || row?.orderId);
        if (!orderId) continue;
        const orderTable = inferRefundOrderTable(orderId, safeText(row?.order_type || row?.orderType));
        if (!REFUND_ORDER_TABLES.includes(orderTable as any)) continue;
        try {
          await patchOrderRefundStatus(orderTable, orderId, normalizeRefundStatus(row?.status));
        } catch {
          // keep legacy upsert compatible even if mapped order row cannot be patched
        }
      }
    }
    const sourceRows = Array.isArray(payload) && payload.length ? payload : dedupedRows;
    await Promise.allSettled(
      sourceRows.map((row: any) =>
        ensureInvoiceForCompletedTransaction({
          table,
          row,
          source: "admin_supabase_upsert"
        })
      )
    );
    return res.json({
      ok: true,
      table,
      affected: Array.isArray(payload) ? payload.length : dedupedRows.length,
      rows: payload,
      deduped: duplicateConflictKeys.size + ((table === FOOD_MENU_ITEM_TABLE || table === LEGACY_FOOD_MENU_ITEM_TABLE) ? menuRowStats.deduped : 0),
      generatedIds: (table === FOOD_MENU_ITEM_TABLE || table === LEGACY_FOOD_MENU_ITEM_TABLE) ? menuRowStats.generatedIds : 0,
      dedupedKeys: Array.from(duplicateConflictKeys)
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "SUPABASE_UPSERT_FAILED",
      message: String(err?.message || err)
    });
  }
});

adminRouter.post("/drivers/:id/update", async (req, res) => {
  const driverId = safeText(req.params.id || "");
  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (!driverId) return res.status(400).json({ error: "DRIVER_ID_REQUIRED" });

  const nameInput = safeText(body?.name);
  const usernameInput = normalizeDriverUsername(body?.username);
  const phoneInput = safeText(body?.phone);
  const emailInput = safeText(body?.email).toLowerCase();
  const statusInput = safeText(body?.status).toLowerCase();
  const passwordInput = safeText(body?.password);
  const vehicleTypeInput = safeText(body?.vehicleType);
  const carNameInput = safeText(body?.carName);
  const vehicleNumberInput = safeText(body?.vehicleNumber);
  const licenseNumberInput = safeText(body?.licenseNumber);
  const notesInput = safeText(body?.notes);
  const hasActive = typeof body?.active === "boolean";

  if (!nameInput || !usernameInput || !phoneInput) {
    return res.status(400).json({ error: "NAME_USERNAME_PHONE_REQUIRED" });
  }
  if (!["pending", "approved", "rejected", "disabled"].includes(statusInput || "")) {
    return res.status(400).json({ error: "INVALID_STATUS" });
  }
  const nextPhone = normalizeDriverPhone(phoneInput);
  if (!nextPhone) return res.status(400).json({ error: "PHONE_REQUIRED" });

  try {
    const now = new Date().toISOString();
    let result: any = null;

    await mutateData((db) => {
      const anyDb = db as any;
      const drivers = Array.isArray(anyDb.drivers) ? anyDb.drivers : [];
      const vehicles = Array.isArray(anyDb.driverVehicles) ? anyDb.driverVehicles : (anyDb.driverVehicles = []);
      const requests = Array.isArray(anyDb.driverRegistrationRequests) ? anyDb.driverRegistrationRequests : [];

      const driver = drivers.find((x: any) => safeText(x?.id) === driverId);
      if (!driver) throw new Error("DRIVER_NOT_FOUND");

      const dupUsername = drivers.find((x: any) =>
        safeText(x?.id) !== driverId && normalizeDriverUsername(x?.username) === usernameInput
      );
      if (dupUsername) throw new Error("USERNAME_ALREADY_IN_USE");
      const dupPhone = drivers.find((x: any) =>
        safeText(x?.id) !== driverId && normalizeDriverPhone(safeText(x?.phone)) === nextPhone
      );
      if (dupPhone) throw new Error("PHONE_ALREADY_IN_USE");

      driver.name = nameInput;
      driver.username = usernameInput;
      driver.phone = nextPhone;
      driver.email = emailInput;
      driver.status = statusInput;
      if (hasActive) driver.active = body.active === true;
      if (passwordInput) driver.passwordHash = hashDriverPassword(passwordInput);
      driver.updatedAt = now;

      const vehicle = vehicles.find((x: any) => safeText(x?.driverId) === driverId);
      if (vehicle) {
        vehicle.vehicleType = vehicleTypeInput || vehicle.vehicleType || "";
        vehicle.viechle_cat = vehicleTypeInput || vehicle.viechle_cat || vehicle.vehicleType || "";
        vehicle.model = carNameInput;
        vehicle.carName = carNameInput;
        vehicle.vehicleNumber = vehicleNumberInput;
        vehicle.updatedAt = now;
      } else {
        vehicles.unshift({
          id: makeId("veh"),
          driverId,
          vehicleType: vehicleTypeInput || "ordinary",
          viechle_cat: vehicleTypeInput || "ordinary",
          vehicleNumber: vehicleNumberInput,
          color: "",
          model: carNameInput,
          carName: carNameInput,
          seats: safeText(vehicleTypeInput).toLowerCase().includes("suv") ? 6 : 4,
          createdAt: now,
          updatedAt: now
        });
      }

      const reqId = safeText(driver?.registrationRequestId || "");
      const reqRow = requests.find((x: any) => safeText(x?.id) === reqId);
      if (reqRow) {
        reqRow.name = nameInput;
        reqRow.phone = nextPhone;
        reqRow.email = emailInput;
        reqRow.vehicleType = vehicleTypeInput || reqRow.vehicleType || "";
        reqRow.vehicleNumber = vehicleNumberInput;
        reqRow.licenseNumber = licenseNumberInput || reqRow.licenseNumber || "";
        reqRow.notes = notesInput;
        reqRow.updatedAt = now;
      }

      db.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "DRIVER_UPDATED_BY_ADMIN",
        entity: "driver",
        entityId: driverId,
        meta: {
          username: usernameInput,
          phone: nextPhone,
          status: statusInput
        }
      });

      const finalVehicle = vehicles.find((x: any) => safeText(x?.driverId) === driverId) || null;
      result = {
        id: safeText(driver.id),
        name: safeText(driver.name),
        username: safeText(driver.username),
        phone: safeText(driver.phone),
        email: safeText(driver.email),
        status: safeText(driver.status),
        active: driver.active !== false,
        vehicleType: safeText(finalVehicle?.vehicleType || finalVehicle?.viechle_cat || ""),
        carName: safeText(finalVehicle?.model || finalVehicle?.carName || ""),
        vehicleNumber: safeText(finalVehicle?.vehicleNumber || "")
      };
    }, "admin_driver_update");

    return res.json({ ok: true, driver: result });
  } catch (err: any) {
    return res.status(400).json({ error: safeText(err?.message || err) || "DRIVER_UPDATE_FAILED" });
  }
});

/**
 * Send the customer a fare for a taxi ride that has no rate card.
 *
 * These are the rides booked from a typed pickup point or "use my current
 * location": no stand matched, so no rate list applied and `estimated_fare` was
 * never computed. The desk reads the pickup and drop off the Customer Orders
 * table and prices the trip by hand.
 *
 * The quote is written to `quoted_fare`, not to `estimated_fare` — the ride is
 * not worth that until the customer agrees to it. Acceptance moves it across,
 * in POST /api/cab-bookings/:id/quote/accept.
 */
adminRouter.post("/cab-bookings/:id/quote", async (req, res) => {
  try {
    const rideId = safeText(req.params.id);
    const fare = Number(req.body?.fare);
    if (!rideId) return res.status(400).json({ error: "RIDE_ID_REQUIRED" });
    if (!Number.isFinite(fare) || fare <= 0) return res.status(400).json({ error: "INVALID_FARE" });

    const now = new Date().toISOString();
    const quotedBy = safeText((req as any)?.adminUser?.username || req.header("X-EV-Dashboard") || "admin");
    let out: any = null;

    await mutateData((db) => {
      const anyDb = db as any;
      const rides = Array.isArray(anyDb.cabBookings) ? anyDb.cabBookings : [];
      const ride = rides.find((x: any) => safeText(x?.id) === rideId);
      if (!ride) throw new Error("RIDE_NOT_FOUND");
      // A ride the customer already paid for is settled; re-pricing it here
      // would show them a new figure they have no way to act on.
      if (safeText(ride?.paymentStatus).toLowerCase() === "paid") throw new Error("RIDE_ALREADY_PAID");
      const rideStatus = safeText(ride?.status).toLowerCase();
      if (["cancelled", "completed"].includes(rideStatus)) throw new Error("RIDE_NOT_QUOTABLE");

      ride.bookingMode = "quotes";
      ride.quotedFare = fare;
      ride.quotedAt = now;
      ride.quotedBy = quotedBy;
      // Re-quoting after a decline reopens the negotiation rather than being
      // blocked by the customer's previous answer.
      ride.quoteStatus = "quoted";
      ride.updatedAt = now;

      if (!Array.isArray(anyDb.auditLog)) anyDb.auditLog = [];
      anyDb.auditLog.push({
        id: makeId("audit"),
        at: now,
        action: "CAB_QUOTE_SENT",
        entity: "cab_booking",
        entityId: rideId,
        meta: { rideId, fare, quotedBy }
      });

      // Tell the rider. Without this the quote sits in My Orders until they
      // happen to look — the app polls this queue every 25s and raises it as a
      // notification, which is how they learn a price is waiting.
      const ridePhone = normalizePhone(safeText(ride?.phone || ""));
      const rideEmail = normalizeEmail(safeText(ride?.email || ""));
      const rideUserId = safeText(ride?.userId || "");
      if (!Array.isArray(anyDb.userProfiles)) anyDb.userProfiles = [];
      const profile = (anyDb.userProfiles as any[]).find((u: any) =>
        (!!rideUserId && safeText(u?.id) === rideUserId) ||
        (!!ridePhone && normalizePhone(safeText(u?.phone || "")) === ridePhone) ||
        (!!rideEmail && normalizeEmail(safeText(u?.email || "")) === rideEmail)
      );
      if (profile) {
        const route = [safeText(ride?.pickupLocation), safeText(ride?.dropLocation)].filter(Boolean).join(" to ");
        const current = Array.isArray(profile.pushNotifications) ? profile.pushNotifications : [];
        profile.pushNotifications = [{
          id: makeId("push"),
          title: "Fare quote ready",
          message: `Our travel desk quoted Rs ${fare} for your ride${route ? ` ${route}` : ""}. Open My Orders to accept and pay.`,
          type: "order_update",
          createdAt: now,
          from: quotedBy
        }, ...current].slice(0, 200);
        profile.updatedAt = now;
      }

      out = { rideId, quotedFare: fare, quotedAt: now, quotedBy, quoteStatus: "quoted" };
    }, "admin_cab_quote");

    return res.json({ ok: true, quote: out });
  } catch (err: any) {
    const code = safeText(err?.message) || "CAB_QUOTE_FAILED";
    const status = code === "RIDE_NOT_FOUND" ? 404 : 400;
    return res.status(status).json({ error: code });
  }
});

adminRouter.post("/refunds/status", async (req, res) => {
  try {
    const table = safeText(req.body?.table || "");
    const orderId = safeText(req.body?.orderId || "");
    const newStatus = normalizeRefundStatus(req.body?.status);
    const reason = safeText(req.body?.reason || "");
    if (!REFUND_ORDER_TABLES.includes(table as any)) {
      return res.status(400).json({ error: "INVALID_REFUND_TABLE" });
    }
    if (!orderId) return res.status(400).json({ error: "ORDER_ID_REQUIRED" });

    const row = await patchOrderRefundStatus(table, orderId, newStatus);
    const action = refundAuditAction(newStatus);
    if (action) {
      try {
        await mutateData((db) => {
          if (!Array.isArray((db as any).auditLog)) (db as any).auditLog = [];
          (db as any).auditLog.push({
            id: makeId("audit"),
            at: new Date().toISOString(),
            action,
            entity: "refund",
            entityId: orderId,
            meta: { table, orderId, status: newStatus, reason }
          } as any);
        }, "admin_refund_status_patch");
      } catch {
        // keep endpoint successful even if local audit append fails
      }
    }
    return res.json({ ok: true, table, orderId, status: newStatus, row });
  } catch (err: any) {
    return res.status(500).json({
      error: "REFUND_STATUS_UPDATE_FAILED",
      message: String(err?.message || err)
    });
  }
});

/**
 * Column-scoped update: writes ONLY the fields in `patch`, for one row.
 *
 * /supabase/upsert cannot do this. It POSTs the row, so PostgREST has to build
 * a complete INSERT tuple before the ON CONFLICT clause runs, and the menu /
 * product tables declare name, price and category NOT NULL with no default -
 * a partial payload is rejected outright. Callers worked around that by
 * spreading the whole snapshot row back into the write, which turns "mark this
 * order delivered" or "set this category's icon" into a rewrite of every
 * column from data that may already be stale. PATCH touches the named columns
 * and nothing else.
 */
adminRouter.post("/supabase/update", async (req, res) => {
  try {
    const table = safeText(req.body?.table || "");
    const id = safeText(req.body?.id || "");
    const keyColumn = safeText(req.body?.keyColumn || defaultConflictColumnForTable(table));
    const rawPatch = req.body?.patch && typeof req.body.patch === "object" && !Array.isArray(req.body.patch)
      ? req.body.patch
      : null;

    if (!table || !/^ev_[a-z0-9_]+$/i.test(table)) {
      return res.status(400).json({ error: "INVALID_TABLE_NAME" });
    }
    if (!/^[a-z0-9_]+$/i.test(keyColumn)) {
      return res.status(400).json({ error: "INVALID_KEY_COLUMN" });
    }
    if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
    if (!rawPatch) return res.status(400).json({ error: "PATCH_REQUIRED" });

    // Never let the patch move the row it is addressing, and reject column
    // names that are not plain identifiers.
    const patch: Record<string, any> = {};
    for (const [column, value] of Object.entries(rawPatch)) {
      if (column === keyColumn) continue;
      if (!/^[a-z0-9_]+$/i.test(column)) {
        return res.status(400).json({ error: "INVALID_PATCH_COLUMN", column });
      }
      patch[column] = value;
    }
    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "PATCH_REQUIRED", message: "The patch contained no updatable columns." });
    }

    const { url } = assertSupabaseAdminConfigured();
    const filter = `${encodeURIComponent(keyColumn)}=eq.${encodeURIComponent(id)}`;
    // Count first, then patch. A PATCH that matches nothing is answered the
    // same way as one that matched, so without the read this endpoint could
    // not tell the dashboard that the row it targeted does not exist.
    const patchTable = async (targetTable: string) => {
      const countEndpoint = `${url}/rest/v1/${encodeURIComponent(targetTable)}?select=${encodeURIComponent(keyColumn)}&${filter}`;
      const before = await fetch(countEndpoint, { headers: supabaseAdminHeaders() });
      if (!before.ok) return { ok: false, updated: 0, message: await before.text() };
      const existing = await before.json().catch(() => []);
      const matched = Array.isArray(existing) ? existing.length : 0;
      if (!matched) return { ok: true, updated: 0, message: "" };
      const r = await fetch(`${url}/rest/v1/${encodeURIComponent(targetTable)}?${filter}`, {
        method: "PATCH",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify(patch)
      });
      if (!r.ok) return { ok: false, updated: 0, message: await r.text() };
      return { ok: true, updated: matched, message: "" };
    };

    const fallbackTable = fallbackTableForRequestedTable(table);
    const canFallBack = !!fallbackTable && fallbackTable !== table;
    const primary = await patchTable(table);
    if (!primary.ok && !(canFallBack && isMissingRelationErrorMessage(primary.message, table))) {
      return res.status(500).json({ error: "SUPABASE_UPDATE_FAILED", table, message: primary.message });
    }
    if (primary.updated > 0) {
      if (table === FOOD_MENU_ITEM_TABLE || table === LEGACY_FOOD_MENU_ITEM_TABLE) {
        const restaurantId = safeText(req.body?.restaurantId || "");
        if (restaurantId) {
          try {
            await syncVendorMenuBlobsFromItems([restaurantId]);
          } catch (err: any) {
            console.error("[admin.supabase.update] vendor menu blob sync failed", {
              table,
              restaurantId,
              message: String(err?.message || err)
            });
          }
        }
      }
      return res.json({ ok: true, table, updated: primary.updated, columns: Object.keys(patch) });
    }

    if (canFallBack) {
      const legacy = await patchTable(fallbackTable);
      if (!legacy.ok) {
        if (!primary.ok) {
          return res.status(500).json({ error: "SUPABASE_UPDATE_FAILED", table: fallbackTable, message: legacy.message });
        }
      } else if (legacy.updated > 0) {
        return res.json({ ok: true, table: fallbackTable, updated: legacy.updated, columns: Object.keys(patch) });
      }
    }

    return res.status(404).json({
      error: "ROW_NOT_FOUND",
      table,
      id,
      keyColumn,
      message: `No ${table} row has ${keyColumn} = "${id}", so nothing was updated.`
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "SUPABASE_UPDATE_FAILED",
      message: String(err?.message || err)
    });
  }
});

adminRouter.post("/supabase/delete", async (req, res) => {
  try {
    const table = safeText(req.body?.table || "");
    const id = safeText(req.body?.id || "");
    const keyColumn = safeText(req.body?.keyColumn || defaultConflictColumnForTable(table));
    const confirmText = safeText(req.body?.confirmText || "");

    if (!table || !/^ev_[a-z0-9_]+$/i.test(table)) {
      return res.status(400).json({ error: "INVALID_TABLE_NAME" });
    }
    if (!/^[a-z0-9_]+$/i.test(keyColumn)) {
      return res.status(400).json({ error: "INVALID_KEY_COLUMN" });
    }
    if (!id) {
      return res.status(400).json({ error: "ID_REQUIRED" });
    }
    if (confirmText !== "DELETE") {
      return res.status(400).json({
        error: "DELETE_CONFIRMATION_REQUIRED",
        message: "Deletion requires explicit confirmation text."
      });
    }

    const { url } = assertSupabaseAdminConfigured();
    const filter = `${encodeURIComponent(keyColumn)}=eq.${encodeURIComponent(id)}`;

    // Counting the matching rows either side of the DELETE is what makes this
    // endpoint honest. PostgREST answers a delete with 204 and an empty body,
    // so the old code reported `deleted: 1` for every request that did not
    // hard-error - including one whose filter matched nothing, and one whose
    // rows a policy quietly refused to remove. Both cases looked like a
    // successful delete to the dashboard, which then redrew the row it had
    // just told the admin was gone.
    const countMatching = async (targetTable: string) => {
      const endpoint = `${url}/rest/v1/${encodeURIComponent(targetTable)}?select=${encodeURIComponent(keyColumn)}&${filter}`;
      const r = await fetch(endpoint, { headers: supabaseAdminHeaders() });
      if (!r.ok) return { ok: false, count: 0, message: await r.text() };
      const rows = await r.json().catch(() => []);
      return { ok: true, count: Array.isArray(rows) ? rows.length : 0, message: "" };
    };

    const deleteFrom = async (targetTable: string) => {
      const before = await countMatching(targetTable);
      if (!before.ok) return { ok: false, deleted: 0, blocked: false, message: before.message };
      if (!before.count) return { ok: true, deleted: 0, blocked: false, message: "" };
      const endpoint = `${url}/rest/v1/${encodeURIComponent(targetTable)}?${filter}`;
      const r = await fetch(endpoint, {
        method: "DELETE",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" })
      });
      if (!r.ok) return { ok: false, deleted: 0, blocked: false, message: await r.text() };
      const after = await countMatching(targetTable);
      const remaining = after.ok ? after.count : 0;
      const deleted = Math.max(0, before.count - remaining);
      return { ok: true, deleted, blocked: deleted === 0, message: "" };
    };

    const fallbackTable = fallbackTableForRequestedTable(table);
    const canFallBack = !!fallbackTable && fallbackTable !== table;
    const primary = await deleteFrom(table);
    if (!primary.ok && !(canFallBack && isMissingRelationErrorMessage(primary.message, table))) {
      return res.status(500).json({
        error: "SUPABASE_DELETE_FAILED",
        table,
        message: primary.message
      });
    }
    if (primary.deleted > 0) {
      return res.json({ ok: true, table, deleted: primary.deleted });
    }
    if (primary.blocked) {
      return res.status(500).json({
        error: "SUPABASE_DELETE_BLOCKED",
        table,
        id,
        keyColumn,
        message: `Supabase accepted the delete but ${table} still holds ${keyColumn} = "${id}". Check the table's row-level security policies for the service role.`
      });
    }

    // Either the primary table is missing entirely, or it holds no row with
    // this key. In both cases the record can still be sitting in the legacy
    // table this alias falls back to, so try there before giving up.
    if (canFallBack) {
      const legacy = await deleteFrom(fallbackTable);
      if (!legacy.ok) {
        if (!primary.ok) {
          return res.status(500).json({
            error: "SUPABASE_DELETE_FAILED",
            table: fallbackTable,
            message: legacy.message
          });
        }
      } else if (legacy.deleted > 0) {
        return res.json({ ok: true, table: fallbackTable, deleted: legacy.deleted });
      } else if (legacy.blocked) {
        return res.status(500).json({
          error: "SUPABASE_DELETE_BLOCKED",
          table: fallbackTable,
          id,
          keyColumn,
          message: `Supabase accepted the delete but ${fallbackTable} still holds ${keyColumn} = "${id}". Check the table's row-level security policies for the service role.`
        });
      }
    }

    // Nothing matched anywhere. Say so rather than claiming a delete: a false
    // success here is exactly what makes the dashboard look like it cannot
    // delete anything.
    return res.status(404).json({
      error: "ROW_NOT_FOUND",
      table,
      id,
      keyColumn,
      message: `No ${table} row has ${keyColumn} = "${id}", so nothing was deleted.`
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "SUPABASE_DELETE_FAILED",
      message: String(err?.message || err)
    });
  }
});

adminRouter.get("/invoices/transaction/:table/:transactionId/pdf", async (req, res) => {
  try {
    const table = normalizeInvoiceTransactionTable(req.params.table);
    const transactionId = safeText(req.params.transactionId);
    const download = safeText(req.query.download || "").toLowerCase();
    if (!INVOICE_TRANSACTION_TABLES.has(table)) {
      return res.status(400).json({ error: "INVALID_TRANSACTION_TABLE" });
    }
    if (!transactionId) return res.status(400).json({ error: "TRANSACTION_ID_REQUIRED" });

    const transaction = await fetchTransactionRow(table, transactionId);
    if (!transaction) return res.status(404).json({ error: "TRANSACTION_NOT_FOUND" });
    // Same rule as the customer-facing endpoint: a cancelled journey is not a
    // sale. Gated here too, or the dashboard's own Invoice button would mint
    // the document the customer's side refuses to.
    if (isCancelledTransaction(transaction)) {
      return res.status(409).json({ error: "INVOICE_NOT_AVAILABLE_CANCELLED" });
    }
    const serviceKey = serviceKeyForTable(table, transaction);
    let invoiceProfile = defaultInvoiceProfile();
    try {
      invoiceProfile = await fetchInvoiceProfileConfig();
    } catch {
      invoiceProfile = defaultInvoiceProfile();
    }
    const vendorDetails = await fetchVendorDetailsForTransaction(table, transaction, invoiceProfile);
    const sellerProfile = mergeSellerProfile(invoiceProfile, serviceKey, vendorDetails);
    const serviceName = transactionServiceName(table, transaction);
    const gstPercent = parseAmount(
      sellerProfile?.gstPercent ??
      sellerProfile?.defaultGstPercent ??
      invoiceProfile?.defaultGstPercent ??
      5
    );
    const defaultHsn = safeText(
      sellerProfile?.defaultHsnOrSac ||
      invoiceProfile?.defaultHsnOrSac ||
      "9964"
    );
    const items = normalizeInvoiceItems(table, transaction, serviceName, defaultHsn, gstPercent);

    let invoice: any = null;
    try {
      invoice = await fetchInvoiceByTransaction(table, transactionId);
    } catch (err: any) {
      if (!isMissingInvoicesTableError(err)) throw err;
    }
    if (!invoice) {
      try {
        await ensureInvoiceForCompletedTransaction({
          table,
          row: transaction,
          source: "admin_invoice_pdf"
        });
      } catch {
        // If invoice creation fails (e.g. non-completed transaction), return current state below.
      }
      try {
        invoice = await fetchInvoiceByTransaction(table, transactionId);
      } catch (err: any) {
        if (!isMissingInvoicesTableError(err)) throw err;
      }
    }
    if (!invoice) {
      // Fallback for projects where ev_invoices table is absent/unavailable.
      invoice = fallbackInvoiceFromTransaction(table, transaction);
    }

    const pdf = await buildInvoicePdfBuffer(invoice, transaction, {
      sellerProfile,
      serviceName,
      items,
      placeOfSupply: safeText(sellerProfile?.placeOfSupply || "")
    });
    const invoiceNo = safeText(invoice?.invoice_no || invoice?.id || "invoice");
    const filename = `${invoiceNo}.pdf`.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const disposition = download === "1" || download === "true" ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdf.length));
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    return res.send(pdf);
  } catch (err: any) {
    return res.status(500).json({
      error: "INVOICE_PDF_FAILED",
      message: String(err?.message || err)
    });
  }
});

adminRouter.post("/ai/form-json", async (req, res) => {
  try {
    const contextKey = safeText(req.body?.contextKey || "explorevalley").toLowerCase();
    const prompt = safeText(req.body?.prompt || "");
    const template = (req.body?.template && typeof req.body.template === "object" && !Array.isArray(req.body.template))
      ? req.body.template
      : {};
    const currentForm = (req.body?.currentForm && typeof req.body.currentForm === "object" && !Array.isArray(req.body.currentForm))
      ? req.body.currentForm
      : {};

    if (!prompt || prompt.length < 5) {
      return res.status(400).json({ error: "PROMPT_REQUIRED", message: "Please provide more details for generation." });
    }
    if (!Object.keys(template).length) {
      return res.status(400).json({ error: "TEMPLATE_REQUIRED", message: "Template JSON object is required." });
    }

    const client = getAiClient();
    if (!client) {
      return res.status(500).json({
        error: "AI_NOT_CONFIGURED",
        message: "Set OPENAI_API_KEY or OpenRouter_key for AI generation."
      });
    }

    const primaryModel = safeText(
      process.env.OPENROUTER_AGENT_MODEL ||
      process.env.OPENAI_AGENT_MODEL ||
      process.env.OPENAI_MODEL ||
      process.env.OPENAI_CHAT_MODEL ||
      "openai/gpt-4o-mini"
    );
    const fallbackModel = safeText(
      process.env.OPENAI_FALLBACK_MODEL ||
      process.env.OPENAI_SECONDARY_MODEL ||
      "gpt-4.1-mini"
    );
    const system = [
      "You generate strict JSON objects for admin data entry.",
      "Return only a JSON object and nothing else.",
      "Do not include keys that are not in TEMPLATE.",
      "Use values that are realistic and concise.",
      "Keep arrays/objects valid JSON."
    ].join(" ");
    const user = [
      `Context: ${contextKey}`,
      `TEMPLATE: ${JSON.stringify(template)}`,
      `CURRENT_FORM: ${JSON.stringify(currentForm)}`,
      `USER_INSTRUCTIONS: ${prompt}`,
      "Return JSON only."
    ].join("\n");

    let resp: any;
    let usedModel = primaryModel;
    try {
      resp = await client.chat.completions.create({
        model: primaryModel,
        temperature: 0.2,
        response_format: { type: "json_object" } as any,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      } as any);
    } catch (firstErr: any) {
      const msg = String(firstErr?.message || "");
      const shouldRetry = fallbackModel && fallbackModel !== primaryModel && /does not have access to model|model/i.test(msg);
      if (!shouldRetry) throw firstErr;
      usedModel = fallbackModel;
      resp = await client.chat.completions.create({
        model: fallbackModel,
        temperature: 0.2,
        response_format: { type: "json_object" } as any,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      } as any);
    }

    const text = safeText(resp?.choices?.[0]?.message?.content || "");
    if (!text) return res.status(500).json({ error: "AI_EMPTY_RESPONSE", message: "AI returned empty output." });
    const parsed = JSON.parse(text);
    const json = sanitizeAiPatch(parsed, template);
    return res.json({ ok: true, contextKey, model: usedModel, json });
  } catch (err: any) {
    return res.status(500).json({ error: "AI_FORM_JSON_FAILED", message: String(err?.message || err) });
  }
});

adminRouter.post("/mart/generate-image", async (req, res) => {
  try {
    const productName = safeText(req.body?.productName || "");
    const category = safeText(req.body?.category || "");
    const folder = safeText(req.body?.folder || "products");

    if (!productName) {
      return res.status(400).json({ error: "PRODUCT_NAME_REQUIRED", message: "Product name is required." });
    }

    const openAiKey = safeText(process.env.OPENAI_API_KEY || "");
    if (!openAiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY_NOT_CONFIGURED",
        message: "Set OPENAI_API_KEY to generate product images."
      });
    }

    const primaryImageModel = safeText(process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
    const fallbackModels = safeText(process.env.OPENAI_IMAGE_FALLBACK_MODELS || "dall-e-3,dall-e-2")
      .split(",")
      .map((x) => safeText(x))
      .filter(Boolean);
    const candidateModels = Array.from(new Set([primaryImageModel, ...fallbackModels]));
    const client = new OpenAI({ apiKey: openAiKey });

    const prompt = [
      `Create a clean studio product photo for: ${productName}.`,
      category ? `Category: ${category}.` : "",
      "The product must look realistic and clearly identifiable.",
      "Single product centered, no people, no hands, no watermark, no text overlay, no logo text.",
      "Plain light background, ecommerce listing style."
    ]
      .filter(Boolean)
      .join(" ");

    let generated: any = null;
    let usedModel = "";
    const attempts: string[] = [];
    for (const model of candidateModels) {
      try {
        generated = await client.images.generate({
          model,
          prompt,
          size: "1024x1024",
        } as any);
        usedModel = model;
        break;
      } catch (modelErr: any) {
        attempts.push(`${model}: ${String(modelErr?.message || modelErr)}`);
      }
    }

    if (!generated || !usedModel) {
      return res.status(500).json({
        error: "AI_IMAGE_MODEL_UNAVAILABLE",
        message: attempts.join(" | ") || "No image model could be used."
      });
    }

    const b64 = safeText(generated?.data?.[0]?.b64_json || "");
    let sourceBuffer: Buffer | null = null;
    if (b64) {
      sourceBuffer = Buffer.from(b64, "base64");
    } else {
      const remoteUrl = safeText(generated?.data?.[0]?.url || "");
      if (!remoteUrl) {
        return res.status(500).json({ error: "AI_IMAGE_EMPTY", message: "AI did not return image data." });
      }
      const remoteResp = await fetch(remoteUrl);
      if (!remoteResp.ok) {
        return res.status(500).json({
          error: "AI_IMAGE_DOWNLOAD_FAILED",
          message: `Failed to download generated image: ${remoteResp.status}`
        });
      }
      const arr = await remoteResp.arrayBuffer();
      sourceBuffer = Buffer.from(arr);
    }

    const finalBuffer = await sharp(sourceBuffer)
      .rotate()
      .resize(200, 200, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 9 })
      .toBuffer();

    const uploaded = await uploadImageBufferToSupabase(
      finalBuffer,
      "image/png",
      folder || "products",
      `${sanitizeFileBaseName(productName)}_ai.png`
    );

    return res.json({
      ok: true,
      model: usedModel,
      productName,
      ...uploaded
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "MART_AI_IMAGE_GENERATION_FAILED",
      message: String(err?.message || err)
    });
  }
});

async function readJsonArraySafe(filePath: string) {
  try {
    if (!(await fs.pathExists(filePath))) return [];
    const raw = await fs.readJson(filePath).catch(() => []);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function patchCatalogRecord(type: string, id: string, patch: any) {
  let found = false;
  await mutateData((db) => {
    const findAndPatch = (arr: any[], key: "id" = "id") => {
      const idx = arr.findIndex((x) => String(x?.[key] || "") === id);
      if (idx < 0) return false;
      arr[idx] = { ...arr[idx], ...patch };
      return true;
    };

    if (type === "tour") found = findAndPatch(db.tours);
    else if (type === "festival") found = findAndPatch(db.festivals as any[]);
    else if (type === "hotel" || type === "cottage") found = findAndPatch(db.hotels);
    else if (type === "restaurant") {
      found = findAndPatch(db.restaurants);
      if (!found) {
        // Upsert behavior for vendor menu editor: create vendor if missing.
        const next = {
          id,
          name: String(patch?.name || id),
          description: String(patch?.description || ""),
          cuisine: Array.isArray(patch?.cuisine) ? patch.cuisine : [],
          rating: Number(patch?.rating || 0),
          reviewCount: Number(patch?.reviewCount || 0),
          deliveryTime: String(patch?.deliveryTime || ""),
          minimumOrder: Number(patch?.minimumOrder || 0),
          priceDropped: patch?.priceDropped === true,
          priceDropPercent: Number(patch?.priceDropPercent || 0),
          heroImage: String(patch?.heroImage || ""),
          images: Array.isArray(patch?.images) ? patch.images : [],
          imageTitles: Array.isArray(patch?.imageTitles) ? patch.imageTitles : [],
          imageDescriptions: Array.isArray(patch?.imageDescriptions) ? patch.imageDescriptions : [],
          imageMeta: Array.isArray(patch?.imageMeta) ? patch.imageMeta : [],
          available: patch?.available !== false,
          isVeg: patch?.isVeg === true,
          tags: Array.isArray(patch?.tags) ? patch.tags : [],
          location: String(patch?.location || ""),
          serviceRadiusKm: Number(patch?.serviceRadiusKm || 0),
          deliveryZones: Array.isArray(patch?.deliveryZones) ? patch.deliveryZones : [],
          openHours: String(patch?.openHours || "09:00"),
          closingHours: String(patch?.closingHours || "22:00"),
          menu: Array.isArray(patch?.menu) ? patch.menu : []
        };
        db.restaurants.push(next as any);
        found = true;
      }
    }
    else if (type === "food_item") found = findAndPatch(db.menuItems);
    else if (type === "cab") found = findAndPatch(db.cabProviders);
  }, `admin_patch_${type}_${id}`);
  return found;
}

adminRouter.get("/data", async (_req, res) => {
  const db = await readData();
  res.json(db);
});

// Admin-only auth metadata summary for UI (never includes passwords/tokens).
// Note: This data is sourced from local server logs, not Supabase.
adminRouter.get("/auth-summary", async (_req, res) => {
  const passwordProfilesPath = path.join(process.cwd(), "..", "data", "auth-password-profiles.json");
  const authLogPath = path.join(process.cwd(), "..", "data", "auth-logins.json");

  const passwordProfiles = await readJsonArraySafe(passwordProfilesPath);
  const authEvents = await readJsonArraySafe(authLogPath);

  type Summary = {
    userId?: string;
    email?: string;
    phone?: string;
    passwordSet?: boolean;
    passwordUpdatedAt?: string;
    lastAuthAt?: string;
    lastAuthProvider?: string;
    providers?: string[];
    lastOkEvent?: string;
  };

  const byUserId = new Map<string, Summary>();
  const byEmail = new Map<string, Summary>();
  const byPhone = new Map<string, Summary>();

  const touch = (target: Map<string, Summary>, key: string, patch: Partial<Summary>) => {
    const k = safeText(key);
    if (!k) return;
    const curr = target.get(k) || { ...patch };
    const next = { ...curr, ...patch };
    target.set(k, next);
  };

  for (const row of passwordProfiles) {
    const userId = safeText((row as any)?.userId);
    const email = normalizeEmail((row as any)?.email || "");
    const passwordSet = (row as any)?.passwordSet === true;
    const updatedAt = safeText((row as any)?.updatedAt);
    if (userId) touch(byUserId, userId, { userId, email: email || undefined, passwordSet, passwordUpdatedAt: updatedAt || undefined });
    if (email) touch(byEmail, email, { userId: userId || undefined, email, passwordSet, passwordUpdatedAt: updatedAt || undefined });
  }

  // Best-effort: compute last successful auth by userId/phone.
  const okEvents = new Set(["session_sync", "password_login", "otp_verify"]);
  for (const e of authEvents) {
    const ok = (e as any)?.ok === true;
    const ev = safeText((e as any)?.event);
    if (!ok || !okEvents.has(ev)) continue;
    const at = safeText((e as any)?.at);
    const provider = safeText((e as any)?.provider);
    const userId = safeText((e as any)?.userId);
    const phone = normalizePhone((e as any)?.phone || "");

    const patch: Partial<Summary> = {
      lastAuthAt: at || undefined,
      lastAuthProvider: provider || undefined,
      lastOkEvent: ev || undefined
    };

    const applyProvider = (m: Map<string, Summary>, k: string) => {
      const curr = m.get(k) || {};
      const providers = Array.isArray(curr.providers) ? curr.providers.slice() : [];
      if (provider && !providers.includes(provider)) providers.push(provider);
      // Keep lastAuthAt as max timestamp.
      const currAt = new Date(curr.lastAuthAt || 0).getTime();
      const nextAt = new Date(at || 0).getTime();
      const newer = Number.isFinite(nextAt) && nextAt >= currAt;
      m.set(k, {
        ...curr,
        ...(newer ? patch : {}),
        providers
      });
    };

    if (userId) applyProvider(byUserId, userId);
    if (phone) applyProvider(byPhone, phone);
  }

  const toObj = (m: Map<string, Summary>) => Object.fromEntries(Array.from(m.entries()));
  res.json({
    updatedAt: new Date().toISOString(),
    byUserId: toObj(byUserId),
    byEmail: toObj(byEmail),
    byPhone: toObj(byPhone)
  });
});

adminRouter.put("/data", async (req, res) => {
  const body = req.body;
  const allowEmpty = String(req.headers["x-allow-empty-catalog"] || "").toLowerCase() === "true";
  const catalogLooksEmpty =
    Array.isArray(body?.tours) && body.tours.length === 0 &&
    Array.isArray(body?.hotels) && body.hotels.length === 0 &&
    Array.isArray(body?.restaurants) && body.restaurants.length === 0 &&
    Array.isArray(body?.menuItems) && body.menuItems.length === 0;
  if (catalogLooksEmpty && !allowEmpty) {
    return res.status(400).json({
      error: "EMPTY_CATALOG_BLOCKED",
      message: "Catalog payload is empty. To intentionally clear it, send header x-allow-empty-catalog: true"
    });
  }
  const parsed = DatabaseSchema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_DATASET" });
  }
  const prev = await readData();
  const candidate = parsed.data;
  applyOperationalRules(prev, candidate);
  const saved = await writeData(candidate);
  res.json({
    ok: true,
    counts: {
      tours: saved.tours.length,
      festivals: (saved.festivals || []).length,
      hotels: saved.hotels.length,
      restaurants: saved.restaurants.length,
      menuItems: saved.menuItems.length
    }
  });
});

adminRouter.patch("/catalog/:type/:id", async (req, res) => {
  const type = String(req.params.type || "");
  const id = String(req.params.id || "");
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
  const saved = await patchCatalogRecord(type, id, patch);
  if (!saved) return res.status(404).json({ error: "RECORD_NOT_FOUND", type, id });
  res.json({ ok: true, type, id, saved: true });
});

// compatibility fallback where PATCH may be blocked by proxies/older setups
adminRouter.post("/catalog/:type/:id", async (req, res) => {
  const type = String(req.params.type || "");
  const id = String(req.params.id || "");
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
  const saved = await patchCatalogRecord(type, id, patch);
  if (!saved) return res.status(404).json({ error: "RECORD_NOT_FOUND", type, id });
  res.json({ ok: true, type, id, saved: true });
});

adminRouter.put("/catalog/:type/:id", async (req, res) => {
  const type = String(req.params.type || "");
  const id = String(req.params.id || "");
  const patch = req.body || {};
  if (!id) return res.status(400).json({ error: "ID_REQUIRED" });
  const saved = await patchCatalogRecord(type, id, patch);
  if (!saved) return res.status(404).json({ error: "RECORD_NOT_FOUND", type, id });
  res.json({ ok: true, type, id, saved: true });
});

adminRouter.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "IMAGE_FILE_REQUIRED" });
    const uploaded = await uploadImageBufferToSupabase(req.file.buffer, req.file.mimetype, req.body?.folder, (req.file as any).originalname);
    return res.json({
      ok: true,
      ...uploaded
    });
  } catch (err: any) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Image uploads require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    if (String(err?.message || "").startsWith("SUPABASE_UPLOAD_FAILED:")) {
      return res.status(500).json({ error: "SUPABASE_UPLOAD_FAILED", message: String(err?.message || "").replace(/^SUPABASE_UPLOAD_FAILED:/, "") });
    }
    return res.status(500).json({ error: "UPLOAD_FAILED", message: String(err?.message || err) });
  }
});

adminRouter.post("/upload-images", upload.array("images", 200), async (req, res) => {
  try {
    const files = Array.isArray((req as any).files) ? ((req as any).files as any[]) : [];
    if (!files.length) return res.status(400).json({ error: "IMAGE_FILES_REQUIRED" });
    const folder = normalizeUploadFolder(req.body?.folder, "admin");
    const uploaded: any[] = [];
    for (const f of files) {
      const out = await uploadImageBufferToSupabase(f.buffer, f.mimetype, folder, safeText((f as any).originalname || ""));
      uploaded.push({
        originalName: safeText((f as any).originalname || ""),
        ...out
      });
    }
    return res.json({ ok: true, count: uploaded.length, files: uploaded });
  } catch (err: any) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Image uploads require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    if (String(err?.message || "").startsWith("SUPABASE_UPLOAD_FAILED:")) {
      return res.status(500).json({ error: "SUPABASE_UPLOAD_FAILED", message: String(err?.message || "").replace(/^SUPABASE_UPLOAD_FAILED:/, "") });
    }
    return res.status(500).json({ error: "UPLOAD_FAILED", message: String(err?.message || err) });
  }
});

// Multer can throw before route handlers; convert to clear HTTP errors.
adminRouter.use((err: any, _req: any, res: any, next: any) => {
  if (!(err instanceof multer.MulterError)) return next(err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "FILE_TOO_LARGE",
      message: "Image exceeds upload limit (100MB per file)."
    });
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(413).json({
      error: "TOO_MANY_FILES",
      message: "Too many files in one request."
    });
  }
  return res.status(400).json({
    error: "UPLOAD_INVALID",
    message: String(err.message || "Invalid upload payload.")
  });
});

adminRouter.get("/storage/list", async (req, res) => {
  try {
    const prefix = safeText(req.query?.prefix || "images/");
    const limit = Math.min(500, Math.max(1, Number(req.query?.limit || 200)));
    const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig();
    const listUrl = `${supabaseUrlRaw}/storage/v1/object/list/${encodePath(supabaseBucket)}`;
    const r = await fetch(listUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prefix,
        limit,
        offset: 0,
        sortBy: { column: "updated_at", order: "desc" }
      })
    });
    if (!r.ok) {
      return res.status(500).json({ error: "SUPABASE_STORAGE_LIST_FAILED", message: await r.text() });
    }
    const rows = (await r.json().catch(() => [])) as any[];
    const isLikelyImageName = (name: string, mimeType: string) => {
      const n = safeText(name).toLowerCase();
      const m = safeText(mimeType).toLowerCase();
      if (m.startsWith("image/")) return true;
      return /\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif)$/i.test(n);
    };

    const files = (Array.isArray(rows) ? rows : [])
      .filter((x) => {
        const n = safeText(x?.name || "");
        if (!n || n.endsWith("/")) return false;
        return isLikelyImageName(n, safeText(x?.metadata?.mimetype || x?.metadata?.contentType || ""));
      })
      .map((x) => {
        const name = safeText(x?.name || "");
        const objectPath = `${safeText(prefix).replace(/\/+$/, "")}/${name}`.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
        const publicUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
        const meta = (x?.metadata && typeof x.metadata === "object") ? x.metadata : {};
        const sizeCandidates = [
          x?.size,
          meta?.size,
          meta?.fileSize,
          meta?.contentLength,
          meta?.length
        ];
        const sizeBytes = sizeCandidates
          .map((v: any) => Number(v))
          .find((n) => Number.isFinite(n) && n >= 0) || 0;
        return {
          name,
          objectPath,
          url: publicUrl,
          updatedAt: safeText(x?.updated_at || x?.last_accessed_at || ""),
          sizeBytes,
          metadata: meta
        };
      });
    return res.json({ ok: true, bucket: supabaseBucket, prefix, files });
  } catch (err: any) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Storage listing requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    return res.status(500).json({ error: "SUPABASE_STORAGE_LIST_FAILED", message: String(err?.message || err) });
  }
});

adminRouter.post("/storage/delete", async (req, res) => {
  try {
    const rawList = Array.isArray(req.body?.objectPaths) ? req.body.objectPaths : [];
    const single = safeText(req.body?.objectPath || "");
    const objectPaths = (rawList.length ? rawList : (single ? [single] : []))
      .map((x: any) => safeText(x).replace(/\\/g, "/").replace(/^\/+/, ""))
      .filter(Boolean);

    if (!objectPaths.length) {
      return res.status(400).json({ error: "OBJECT_PATH_REQUIRED" });
    }

    const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig();
    const deleted: string[] = [];
    const missing: string[] = [];
    for (const objectPath of objectPaths) {
      const delUrl = `${supabaseUrlRaw}/storage/v1/object/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
      const r = await fetch(delUrl, {
        method: "DELETE",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      if (!r.ok) {
        const body = await r.text();
        if (r.status === 404 && String(body || "").toLowerCase().includes("not_found")) {
          // Treat "already gone" as success for idempotent cleanup.
          missing.push(objectPath);
          continue;
        }
        return res.status(500).json({
          error: "SUPABASE_STORAGE_DELETE_FAILED",
          objectPath,
          message: body
        });
      }
      deleted.push(objectPath);
    }

    return res.json({
      ok: true,
      bucket: supabaseBucket,
      deletedCount: deleted.length,
      missingCount: missing.length,
      deleted,
      missing
    });
  } catch (err: any) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Storage delete requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    return res.status(500).json({ error: "SUPABASE_STORAGE_DELETE_FAILED", message: String(err?.message || err) });
  }
});

adminRouter.post("/storage/rename", async (req, res) => {
  try {
    const objectPath = safeText(req.body?.objectPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const newNameRaw = safeText(req.body?.newName || "");
    if (!objectPath) return res.status(400).json({ error: "OBJECT_PATH_REQUIRED" });
    if (!newNameRaw) return res.status(400).json({ error: "NEW_NAME_REQUIRED" });

    const slashAt = objectPath.lastIndexOf("/");
    const dir = slashAt >= 0 ? objectPath.slice(0, slashAt + 1) : "";
    const oldFile = slashAt >= 0 ? objectPath.slice(slashAt + 1) : objectPath;
    const oldExtMatch = oldFile.match(/\.([a-zA-Z0-9]+)$/);
    const oldExt = oldExtMatch ? `.${oldExtMatch[1]}` : "";

    const cleaned = newNameRaw
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[_\-.]+|[_\-.]+$/g, "");
    if (!cleaned) return res.status(400).json({ error: "INVALID_NEW_NAME" });
    const hasExt = /\.[a-zA-Z0-9]+$/.test(cleaned);
    const finalName = hasExt ? cleaned : `${cleaned}${oldExt}`;
    const destinationKey = `${dir}${finalName}`.replace(/\/{2,}/g, "/");

    const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig();
    if (destinationKey === objectPath) {
      const sameUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
      return res.json({ ok: true, bucket: supabaseBucket, objectPath, newObjectPath: objectPath, url: sameUrl });
    }

    const moveUrl = `${supabaseUrlRaw}/storage/v1/object/move`;
    const moveResp = await fetch(moveUrl, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        bucketId: supabaseBucket,
        sourceKey: objectPath,
        destinationKey
      })
    });
    if (!moveResp.ok) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_RENAME_FAILED",
        objectPath,
        destinationKey,
        message: await moveResp.text()
      });
    }

    const publicUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(destinationKey)}`;
    return res.json({
      ok: true,
      bucket: supabaseBucket,
      objectPath,
      newObjectPath: destinationKey,
      url: publicUrl
    });
  } catch (err: any) {
    if (String(err?.message || "").startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
      return res.status(500).json({
        error: "SUPABASE_STORAGE_NOT_CONFIGURED",
        message: "Storage rename requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
      });
    }
    return res.status(500).json({ error: "SUPABASE_STORAGE_RENAME_FAILED", message: String(err?.message || err) });
  }
});

async function supabaseAdminDeleteWhere(table: string, where: Record<string, string>, keyColumn = "id") {
  const { url } = assertSupabaseAdminConfigured();
  const parts = Object.entries(where).map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(String(v))}`);
  if (!parts.length) throw new Error("DELETE_WHERE_REQUIRED");
  const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?${parts.join("&")}`;
  const r = await fetch(endpoint, {
    method: "DELETE",
    headers: supabaseAdminHeaders({ Prefer: "return=minimal" })
  });
  if (!r.ok) throw new Error(`${table}_DELETE_FAILED:${r.status}:${await r.text()}`);
  return { ok: true, table, keyColumn };
}

// Purpose-built endpoints for Food Vendors workspace.
adminRouter.post("/food-vendors/delete-vendor", async (req, res) => {
  try {
    const restaurantId = safeText(req.body?.restaurantId || "");
    const confirmText = safeText(req.body?.confirmText || "");
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
    if (confirmText !== "DELETE_VENDOR") {
      return res.status(400).json({
        error: "DELETE_CONFIRMATION_REQUIRED",
        message: "Vendor deletion requires explicit confirmation text."
      });
    }

    // Cascade delete menu items + vendor menus, then vendor row itself.
    try { await supabaseAdminDeleteWhere(FOOD_MENU_ITEM_TABLE, { restaurant_id: restaurantId }, "id"); } catch { /* optional table */ }
    await supabaseAdminDeleteWhere(LEGACY_FOOD_MENU_ITEM_TABLE, { restaurant_id: restaurantId }, "id");
    try { await supabaseAdminDeleteWhere("ev_vendor_menu", { restaurant_id: restaurantId }, "restaurant_id"); } catch { /* optional table */ }
    try { await supabaseAdminDeleteWhere(FOOD_VENDOR_MENU_TABLE, { restaurant_id: restaurantId }, "restaurant_id"); } catch { /* optional table */ }
    try { await supabaseAdminDeleteWhere(LEGACY_FOOD_VENDOR_MENU_TABLE, { restaurant_id: restaurantId }, "restaurant_id"); } catch { /* optional table */ }
    try { await supabaseAdminDeleteWhere(FOOD_VENDOR_TABLE, { id: restaurantId }, "id"); } catch { /* optional table */ }
    await supabaseAdminDeleteWhere(LEGACY_FOOD_VENDOR_TABLE, { id: restaurantId }, "id");
    return res.json({ ok: true, deleted: { restaurantId } });
  } catch (err: any) {
    return res.status(500).json({ error: "DELETE_VENDOR_FAILED", message: String(err?.message || err) });
  }
});

adminRouter.post("/food-vendors/:id/credentials", async (req, res) => {
  try {
    const restaurantId = safeText(req.params.id || "");
    const username = normalizeDriverUsername(req.body?.username);
    const password = safeText(req.body?.password);
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
    if (!username) return res.status(400).json({ error: "USERNAME_REQUIRED" });

    const db = await readData();
    const restaurants = Array.isArray((db as any).restaurants) ? (db as any).restaurants : [];
    const current = restaurants.find((x: any) => safeText(x?.id) === restaurantId);
    if (!current) return res.status(404).json({ error: "RESTAURANT_NOT_FOUND" });
    const currentHash = safeText((current as any).passwordHash);
    if (!password && !currentHash) return res.status(400).json({ error: "PASSWORD_REQUIRED" });

    const duplicate = restaurants.find((x: any) =>
      safeText(x?.id) !== restaurantId && normalizeDriverUsername((x as any)?.username) === username
    );
    if (duplicate) return res.status(409).json({ error: "USERNAME_ALREADY_IN_USE" });

    const now = new Date().toISOString();
    await mutateData((data) => {
      const anyDb = data as any;
      if (!Array.isArray(anyDb.restaurants)) anyDb.restaurants = [];
      const row = (anyDb.restaurants as any[]).find((x: any) => safeText(x?.id) === restaurantId);
      if (!row) throw new Error("RESTAURANT_NOT_FOUND");
      row.username = username;
      if (password) row.passwordHash = hashDriverPassword(password);
      row.updatedAt = now;
      if (!Array.isArray(anyDb.auditLog)) anyDb.auditLog = [];
      anyDb.auditLog.unshift({
        id: makeId("audit"),
        at: now,
        action: "FOOD_VENDOR_CREDENTIALS_UPDATED",
        entity: "restaurant",
        entityId: restaurantId,
        meta: { username, passwordUpdated: !!password }
      });
    }, "food_vendor_credentials_update");

    return res.json({ ok: true, restaurantId, username, passwordUpdated: !!password });
  } catch (err: any) {
    return res.status(500).json({ error: "FOOD_VENDOR_CREDENTIALS_UPDATE_FAILED", message: String(err?.message || err) });
  }
});

/**
 * Removes ONE menu item and leaves every other row untouched.
 *
 * The dashboard used to delete an item by rebuilding the vendor's whole menu
 * and posting it to /replace-menu, which drops every row for the restaurant
 * and re-inserts the survivors. That made a one-row delete a full rewrite of
 * the menu: rows with no stored MRP came back with a derived one, anything the
 * rebuild payload did not carry was flattened, and ids could be regenerated —
 * so deleting a single dish silently re-priced the rest of the menu.
 */
adminRouter.post("/food-vendors/delete-menu-item", async (req, res) => {
  const restaurantId = safeText(req.body?.restaurantId || "");
  const itemId = safeText(req.body?.itemId || req.body?.id || "");
  const itemName = safeText(req.body?.name || "");
  const itemCategory = safeText(req.body?.category || "");
  try {
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });
    if (!itemId && !itemName) return res.status(400).json({ error: "ITEM_ID_REQUIRED" });

    const { url } = assertSupabaseAdminConfigured();
    const lookupKey = normalizeMenuLookupKey(itemName, itemCategory);
    // An item is "this one" if the id matches. Rows that predate stable ids are
    // matched on name+category instead, and only when a name was supplied.
    const isTarget = (row: any) => {
      const rowId = safeText(row?.id || "");
      if (itemId && rowId) return rowId === itemId;
      if (itemId && !rowId) return false;
      return !!itemName && normalizeMenuLookupKey(row?.name, row?.category) === lookupKey;
    };

    let rowsDeleted = 0;
    let itemTableTouched = false;
    const deleteItemRow = async (tableName: string) => {
      if (!itemId) return { ok: true, deleted: 0, message: "" };
      const endpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}`
        + `?id=eq.${encodeURIComponent(itemId)}`
        + `&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;
      const before = await fetch(`${endpoint}&select=id`, { headers: supabaseAdminHeaders() });
      if (!before.ok) return { ok: false, deleted: 0, message: await before.text() };
      const existing = await before.json().catch(() => []);
      if (!Array.isArray(existing) || !existing.length) return { ok: true, deleted: 0, message: "" };
      const r = await fetch(endpoint, {
        method: "DELETE",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" })
      });
      if (!r.ok) return { ok: false, deleted: 0, message: await r.text() };
      return { ok: true, deleted: existing.length, message: "" };
    };

    for (const tableName of [FOOD_MENU_ITEM_TABLE, LEGACY_FOOD_MENU_ITEM_TABLE]) {
      const result = await deleteItemRow(tableName);
      if (!result.ok) {
        if (isMissingRelationErrorMessage(result.message, tableName)) continue;
        return res.status(500).json({ error: "DELETE_MENU_ITEM_FAILED", table: tableName, message: result.message });
      }
      itemTableTouched = true;
      rowsDeleted += result.deleted;
    }

    // The vendor's menu blobs are derived from the items table, so rebuild
    // them from what is left rather than editing them by hand. This is the
    // same primitive the upsert path uses, which keeps the two in step.
    let blobsUpdated = 0;
    if (rowsDeleted) {
      try {
        await syncVendorMenuBlobsFromItems([restaurantId]);
        blobsUpdated = 1;
      } catch (err: any) {
        console.error("[admin.delete-menu-item] vendor menu blob sync failed", {
          restaurantId,
          itemId,
          message: String(err?.message || err)
        });
      }
    } else {
      // No row in the items table matched. The dish may exist only inside the
      // menu blobs (older vendors were stored that way), so prune it there.
      const pruneBlob = async (tableName: string, keyColumn: string, keyValue: string) => {
        const listEndpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}`
          + `?select=${encodeURIComponent(keyColumn)},menu&${encodeURIComponent(keyColumn)}=eq.${encodeURIComponent(keyValue)}&limit=1`;
        const r = await fetch(listEndpoint, { headers: supabaseAdminHeaders() });
        if (!r.ok) {
          const msg = await r.text();
          if (isMissingRelationErrorMessage(msg, tableName)) return;
          throw new Error(msg);
        }
        const rows = await r.json().catch(() => []);
        const current = Array.isArray(rows) && rows[0] ? rows[0]?.menu : null;
        if (!Array.isArray(current)) return;
        const next = current.filter((row: any) => !isTarget(row));
        if (next.length === current.length) return;
        const patch = await fetch(
          `${url}/rest/v1/${encodeURIComponent(tableName)}?${encodeURIComponent(keyColumn)}=eq.${encodeURIComponent(keyValue)}`,
          {
            method: "PATCH",
            headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
            body: JSON.stringify({ menu: next })
          }
        );
        if (!patch.ok) throw new Error(await patch.text());
        blobsUpdated += 1;
      };
      const blobTargets: Array<[string, string]> = [
        ["ev_vendor_menu", "restaurant_id"],
        [FOOD_VENDOR_MENU_TABLE, "restaurant_id"],
        [LEGACY_FOOD_VENDOR_MENU_TABLE, "restaurant_id"],
        [FOOD_VENDOR_TABLE, "id"],
        [LEGACY_FOOD_VENDOR_TABLE, "id"]
      ];
      for (const [tableName, keyColumn] of blobTargets) {
        try {
          await pruneBlob(tableName, keyColumn, restaurantId);
        } catch (err: any) {
          return res.status(500).json({
            error: "DELETE_MENU_ITEM_FAILED",
            table: tableName,
            message: String(err?.message || err)
          });
        }
      }
    }

    if (!rowsDeleted && !blobsUpdated) {
      return res.status(404).json({
        error: "MENU_ITEM_NOT_FOUND",
        restaurantId,
        itemId,
        message: `No menu item matched${itemId ? ` id "${itemId}"` : ` "${itemName}"`} for this vendor, so nothing was deleted.`
      });
    }

    return res.json({
      ok: true,
      restaurantId,
      itemId,
      deleted: rowsDeleted,
      menusUpdated: blobsUpdated,
      itemTableTouched
    });
  } catch (err: any) {
    console.error("[admin.delete-menu-item]", {
      restaurantId,
      itemId,
      message: String(err?.message || err),
      stack: err?.stack || null
    });
    return res.status(500).json({ error: "DELETE_MENU_ITEM_FAILED", message: String(err?.message || err) });
  }
});

adminRouter.post("/food-vendors/replace-menu", async (req, res) => {
  let restaurantId = "";
  let vendorName = "";
  try {
    const items = Array.isArray(req.body?.items)
      ? req.body.items
      : Array.isArray(req.body?.payload?.items)
        ? req.body.payload.items
        : [];
    const allowEmpty = req.body?.allowEmpty === true;
    const restaurantIdFromItems = safeText(items.find((x: any) => safeText(x?.restaurant_id))?.restaurant_id || "");
    restaurantId = safeText(req.body?.restaurantId || restaurantIdFromItems);
    if (!restaurantId) return res.status(400).json({ error: "RESTAURANT_ID_REQUIRED" });

    vendorName = restaurantId;
    try {
      const vendorRows = await supabaseAdminFetchJson(
        `/rest/v1/${encodeURIComponent(FOOD_VENDOR_TABLE)}?select=id,name&id=eq.${encodeURIComponent(restaurantId)}&limit=1`
      );
      if (Array.isArray(vendorRows) && vendorRows[0]) {
        vendorName = safeText(vendorRows[0]?.name || restaurantId) || restaurantId;
      }
    } catch {
      try {
        const vendorRows = await supabaseAdminFetchJson(
          `/rest/v1/${encodeURIComponent(LEGACY_FOOD_VENDOR_TABLE)}?select=id,name&id=eq.${encodeURIComponent(restaurantId)}&limit=1`
        );
        if (Array.isArray(vendorRows) && vendorRows[0]) {
          vendorName = safeText(vendorRows[0]?.name || restaurantId) || restaurantId;
        }
      } catch {
        // best-effort only
      }
    }

    // Replace semantics: rebuild this vendor's menu from the submitted JSON.
    // Normalize ids and collapse duplicate menu rows within the same save payload.
    const existingImageById = new Map<string, string>();
    const existingImageByKey = new Map<string, string>();
    const rememberExistingImage = (row: any) => {
      const image = safeText(row?.image || row?.hero_image || "");
      if (!image) return;
      const id = safeText(row?.id || "");
      const key = normalizeMenuLookupKey(row?.name, row?.category);
      if (id && !existingImageById.has(id)) existingImageById.set(id, image);
      if (key && !existingImageByKey.has(key)) existingImageByKey.set(key, image);
    };

    try {
      const vendorMenuRows = await supabaseAdminFetchJson(
        `/rest/v1/${encodeURIComponent(FOOD_VENDOR_MENU_TABLE)}?select=menu&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=1`
      );
      const vendorMenu = Array.isArray(vendorMenuRows) && vendorMenuRows[0]
        ? vendorMenuRows[0]?.menu
        : [];
      (Array.isArray(vendorMenu) ? vendorMenu : []).forEach(rememberExistingImage);
    } catch {
      try {
        const vendorMenuRows = await supabaseAdminFetchJson(
          `/rest/v1/${encodeURIComponent(LEGACY_FOOD_VENDOR_MENU_TABLE)}?select=menu&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=1`
        );
        const vendorMenu = Array.isArray(vendorMenuRows) && vendorMenuRows[0]
          ? vendorMenuRows[0]?.menu
          : [];
        (Array.isArray(vendorMenu) ? vendorMenu : []).forEach(rememberExistingImage);
      } catch {
        // best-effort only
      }
    }

    try {
      const menuItemRows = await supabaseAdminFetchJson(
        `/rest/v1/${encodeURIComponent(FOOD_MENU_ITEM_TABLE)}?select=id,name,category,image,hero_image&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=2000`
      );
      (Array.isArray(menuItemRows) ? menuItemRows : []).forEach(rememberExistingImage);
    } catch {
      try {
        const menuItemRows = await supabaseAdminFetchJson(
          `/rest/v1/${encodeURIComponent(LEGACY_FOOD_MENU_ITEM_TABLE)}?select=id,name,category,image,hero_image&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=2000`
        );
        (Array.isArray(menuItemRows) ? menuItemRows : []).forEach(rememberExistingImage);
      } catch {
        // best-effort only
      }
    }

    const normalizedMenuRows = normalizeMenuItemUpsertRows(items, {
      defaultRestaurantId: restaurantId,
      vendorNameByRestaurantId: new Map([[restaurantId, vendorName]])
    });
    const normalized = normalizedMenuRows.rows
      .map((row: any) => {
        const id = safeText(row?.id || "");
        const image = safeText(row?.image || row?.hero_image || "");
        const preservedImage = image
          || existingImageById.get(id)
          || existingImageByKey.get(normalizeMenuLookupKey(row?.name, row?.category))
          || "";
        return canonicalMenuItemRow({
          ...row,
          restaurant_id: restaurantId,
          image: preservedImage,
          hero_image: preservedImage
        }, restaurantId);
      })
      .filter((row: any) => safeText(row?.name || ""));

    if (!normalized.length && !allowEmpty) {
      return res.status(400).json({
        error: "MENU_ITEMS_REQUIRED",
        message: items.length
          ? "No valid menu items were found. Each item must include a non-empty name."
          : "At least one menu item is required."
      });
    }

    const normalizedRestaurantMenu = normalized.map((row: any) => ({
      id: safeText(row?.id || ""),
      category: safeText(row?.category || "General"),
      name: safeText(row?.name || ""),
      description: safeText(row?.description || ""),
      offer: safeText(row?.offer || ""),
      image: safeText(row?.image || row?.hero_image || ""),
      price: Number(row?.price || 0),
      mrp: Math.max(0, Number(row?.mrp || 0) || 0),
      stock: Math.max(0, Number(row?.stock || 0) || 0),
      available: row?.available !== false,
      isVeg: row?.is_veg === true || row?.isVeg === true,
      is_veg: row?.is_veg === true || row?.isVeg === true
    }));

    const { url } = assertSupabaseAdminConfigured();
    const isMissingRelation = (msg: string, table: string) => {
      const text = safeText(msg).toLowerCase();
      return (
        (text.includes("does not exist") || text.includes("could not find the table")) &&
        text.includes(table.toLowerCase())
      );
    };
    const logReplaceMenuError = (stage: string, details: Record<string, any>) => {
      console.error("[admin.replace-menu]", {
        stage,
        restaurantId,
        vendorName,
        itemsReceived: Array.isArray(items) ? items.length : 0,
        normalizedCount: normalized.length,
        keyShapes: Array.from(new Set(
          normalized.slice(0, 5).map((row: any) => Object.keys(row || {}).sort().join(","))
        )),
        sampleRow: normalized[0] || null,
        ...details,
      });
    };
    const postRows = async (tableName: string, rows: any[]) => {
      if (!rows.length) return { ok: true };
      const endpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify(rows)
      });
      if (!r.ok) {
        const bodyText = await r.text();
        logReplaceMenuError("postRows_failed", {
          tableName,
          status: r.status,
          response: bodyText,
        });
        throw new Error(bodyText);
      }
      return { ok: true };
    };
    const patchRows = async (tableName: string, where: Record<string, string>, patch: Record<string, any>) => {
      const query = Object.entries(where).map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(String(v))}`).join("&");
      const endpoint = `${url}/rest/v1/${encodeURIComponent(tableName)}?${query}`;
      const r = await fetch(endpoint, {
        method: "PATCH",
        headers: supabaseAdminHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify(patch)
      });
      if (!r.ok) {
        const bodyText = await r.text();
        logReplaceMenuError("patchRows_failed", {
          tableName,
          where,
          status: r.status,
          response: bodyText,
        });
        throw new Error(bodyText);
      }
      return { ok: true };
    };

    // Primary normalized table: delete existing vendor rows, then insert the new set.
    let itemRowsReplaced = false;
    try {
      try {
        await supabaseAdminDeleteWhere(FOOD_MENU_ITEM_TABLE, { restaurant_id: restaurantId }, "id");
      } catch (err: any) {
        const msg = String(err?.message || err || "");
        logReplaceMenuError("delete_primary_failed", { tableName: FOOD_MENU_ITEM_TABLE, message: msg });
        if (!isMissingRelation(msg, FOOD_MENU_ITEM_TABLE)) {
          return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
        }
      }
      await supabaseAdminUpsertRowsIndividually(FOOD_MENU_ITEM_TABLE, normalized, "id");
      itemRowsReplaced = true;
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      logReplaceMenuError("replace_primary_failed", { tableName: FOOD_MENU_ITEM_TABLE, message: msg });
      if (!isMissingRelation(msg, FOOD_MENU_ITEM_TABLE)) {
        return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
      }
      try {
        await supabaseAdminDeleteWhere(LEGACY_FOOD_MENU_ITEM_TABLE, { restaurant_id: restaurantId }, "id");
        await supabaseAdminUpsertRowsIndividually(LEGACY_FOOD_MENU_ITEM_TABLE, normalized, "id");
        itemRowsReplaced = true;
      } catch (legacyErr: any) {
        logReplaceMenuError("replace_legacy_failed", {
          tableName: LEGACY_FOOD_MENU_ITEM_TABLE,
          message: String(legacyErr?.message || legacyErr || msg)
        });
        return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: String(legacyErr?.message || legacyErr || msg) });
      }
    }

    // Persist vendor-level menu blobs used by snapshot loaders and fallbacks.
    const vendorMenuRow = [{
      restaurant_id: restaurantId,
      menu: normalizedRestaurantMenu,
      updated_at: new Date().toISOString()
    }];
    let vendorMenuStored = false;
    for (const tableName of ["ev_vendor_menu", FOOD_VENDOR_MENU_TABLE, LEGACY_FOOD_VENDOR_MENU_TABLE]) {
      try {
        await supabaseAdminDeleteWhere(tableName, { restaurant_id: restaurantId }, "restaurant_id");
      } catch (err: any) {
        const msg = String(err?.message || err || "");
        logReplaceMenuError("vendor_menu_delete_failed", { tableName, message: msg });
        if (!isMissingRelation(msg, tableName)) {
          return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
        }
      }
      try {
        await postRows(tableName, vendorMenuRow);
        vendorMenuStored = true;
      } catch (err: any) {
        const msg = String(err?.message || err || "");
        logReplaceMenuError("vendor_menu_post_failed", { tableName, message: msg });
        if (!isMissingRelation(msg, tableName)) {
          return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
        }
      }
    }

    let restaurantMenuStored = false;
    try {
      await patchRows(FOOD_VENDOR_TABLE, { id: restaurantId }, { menu: normalizedRestaurantMenu });
      restaurantMenuStored = true;
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      logReplaceMenuError("restaurant_menu_patch_primary_failed", { tableName: FOOD_VENDOR_TABLE, message: msg });
      if (!isMissingRelation(msg, FOOD_VENDOR_TABLE)) {
        return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: msg });
      }
      try {
        await patchRows(LEGACY_FOOD_VENDOR_TABLE, { id: restaurantId }, { menu: normalizedRestaurantMenu });
        restaurantMenuStored = true;
      } catch (legacyErr: any) {
        const legacyMsg = String(legacyErr?.message || legacyErr || "");
        logReplaceMenuError("restaurant_menu_patch_legacy_failed", { tableName: LEGACY_FOOD_VENDOR_TABLE, message: legacyMsg });
        if (!isMissingRelation(legacyMsg, LEGACY_FOOD_VENDOR_TABLE)) {
          return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: legacyMsg });
        }
      }
    }

    if (!itemRowsReplaced && !vendorMenuStored && !restaurantMenuStored) {
      return res.status(500).json({
        error: "REPLACE_MENU_FAILED",
        message: "No menu storage table available (expected ev_food_menu_items/ev_menu_items, ev_food_vendor_menus/ev_vendor_menus, or ev_food_vendors.menu)."
      });
    }

    return res.json({
      ok: true,
      replaced: normalized.length,
      generatedIds: normalizedMenuRows.generatedIds,
      deduped: normalizedMenuRows.deduped,
      restaurantId,
      vendorName,
      sync: {
        ev_food_menu_items: itemRowsReplaced,
        ev_food_vendor_menus: vendorMenuStored,
        ev_food_vendors_menu: restaurantMenuStored
      }
    });
  } catch (err: any) {
    console.error("[admin.replace-menu] unhandled", {
      restaurantId,
      vendorName,
      message: String(err?.message || err),
      stack: err?.stack || null,
    });
    return res.status(500).json({ error: "REPLACE_MENU_FAILED", message: String(err?.message || err) });
  }
});
