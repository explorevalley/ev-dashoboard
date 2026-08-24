import { Router } from "express";
import jwt from "jsonwebtoken";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { makeId } from "@explorevalley/shared";
import { mutateData, readData } from "../services/jsondb";
import { getMartVendorJwtSecret } from "../services/runtimeConfig";

type VendorAccount = {
  vendorId: string;
  username: string;
  password?: string;
  passwordHash?: string;
  name?: string;
  active?: boolean;
};

type VendorAuthClaims = {
  sub: string;
  role: "mart_vendor";
  vendorId: string;
  username: string;
};

const VENDOR_SESSION_COOKIE = "ev_mart_vendor_session";
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 6;
const loginFailures = new Map<string, { count: number; firstAt: number; lockUntil: number }>();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function toBool(v: any, fallback = false) {
  if (typeof v === "boolean") return v;
  const s = safeText(v).toLowerCase();
  if (!s) return fallback;
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return fallback;
}

function toMoney(v: any, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n * 100) / 100);
}

function toPercent(v: any, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

function toInt(v: any, fallback = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function parseJsonValue(raw: any) {
  if (typeof raw !== "string") return raw;
  const text = safeText(raw);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseCustomCategoryList(raw: any) {
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((x) => safeText(x)).filter(Boolean)));
  }
  const parsed = parseJsonValue(raw);
  if (Array.isArray(parsed)) {
    return Array.from(new Set(parsed.map((x) => safeText(x)).filter(Boolean)));
  }
  const text = safeText(raw);
  if (!text) return [];
  return Array.from(new Set(text.split(",").map((x) => safeText(x)).filter(Boolean)));
}

const CUSTOM_CATEGORY_FIELDS = [
  "inventory_custom_categories",
  "custom_categories",
  "category_options",
  "categories"
];

function resolveCustomCategoryField(row: any) {
  const src = row && typeof row === "object" ? row : {};
  return CUSTOM_CATEGORY_FIELDS.find((field) => Object.prototype.hasOwnProperty.call(src, field)) || "";
}

function serializeCustomCategoryValue(currentValue: any, categories: string[]) {
  if (typeof currentValue === "string") {
    return JSON.stringify(categories);
  }
  return categories;
}

function normalizeQuantityOption(
  row: any,
  index: number,
  fallbackVendorPrice: number,
  fallbackCustomerPrice: number,
  fallbackMrp: number,
  fallbackStock: number
) {
  const src = row && typeof row === "object" ? row : {};
  const label = safeText(src?.label || src?.name || src?.title || src?.unit || src?.size || src?.capacity);
  if (!label) return null;
  const vendorPrice = toMoney(src?.vendor_price ?? src?.vendorPrice ?? src?.cost_price ?? src?.costPrice ?? src?.base_price ?? src?.basePrice, fallbackVendorPrice);
  return {
    id: safeText(src?.id) || `qty_${index + 1}`,
    label,
    unit: safeText(src?.unit || src?.size || src?.capacity || label),
    value: safeText(src?.value || ""),
    price: toMoney(src?.price ?? src?.customer_price ?? src?.customerPrice, fallbackCustomerPrice),
    vendor_price: vendorPrice,
    mrp: toMoney(src?.mrp, fallbackMrp),
    stock: toInt(src?.stock, fallbackStock),
    is_default: src?.is_default === undefined && src?.isDefault === undefined
      ? index === 0
      : toBool(src?.is_default ?? src?.isDefault, index === 0),
    available: src?.available === undefined ? true : toBool(src?.available, true),
  };
}

function normalizeQuantityOptions(raw: any, fallback: {
  unit: string;
  vendorPrice: number;
  price: number;
  mrp: number;
  stock: number;
}) {
  const parsed = parseJsonValue(raw);
  const list = Array.isArray(parsed)
    ? parsed
    : (parsed && typeof parsed === "object" ? [parsed] : []);
  const normalized = list
    .map((item, index) => normalizeQuantityOption(item, index, fallback.vendorPrice, fallback.price, fallback.mrp, fallback.stock))
    .filter(Boolean) as any[];
  if (normalized.length) {
    return normalized.map((item, index) => ({
      ...item,
      is_default: normalized.some((x) => x.is_default) ? item.is_default : index === 0,
    }));
  }
  if (!fallback.unit) return [];
  return [{
    id: "qty_1",
    label: fallback.unit,
    unit: fallback.unit,
    value: "",
    price: fallback.price,
    vendor_price: fallback.vendorPrice,
    mrp: fallback.mrp,
    stock: fallback.stock,
    is_default: true,
    available: true,
  }];
}

function hasOwn(src: any, key: string) {
  return !!src && typeof src === "object" && Object.prototype.hasOwnProperty.call(src, key);
}

function syncDefaultQuantityOptionWithLegacyFields(quantityOptions: any[], row: any) {
  const list = Array.isArray(quantityOptions) ? quantityOptions : [];
  if (!list.length) return list;
  const defaultIndex = Math.max(0, list.findIndex((item) => item?.is_default));
  const legacyUnit = safeText(row?.unit || row?.capacity || row?.size || "");
  const hasVendorPrice = hasOwn(row, "price") || hasOwn(row, "vendor_price") || hasOwn(row, "vendorPrice");
  const hasCustomerPrice = hasOwn(row, "customer_price") || hasOwn(row, "customerPrice") || hasOwn(row, "selling_price") || hasOwn(row, "sellingPrice");
  const hasMrp = hasOwn(row, "mrp");
  const hasStock = hasOwn(row, "stock");
  return list.map((item, index) => {
    if (index !== defaultIndex) return item;
    return {
      ...item,
      label: legacyUnit || item.label,
      unit: legacyUnit || item.unit || item.label,
      vendor_price: hasVendorPrice ? toMoney(row?.price ?? row?.vendor_price ?? row?.vendorPrice, item.vendor_price) : item.vendor_price,
      price: hasCustomerPrice ? toMoney(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice, item.price) : item.price,
      mrp: hasMrp ? toMoney(row?.mrp, item.mrp) : item.mrp,
      stock: hasStock ? toInt(row?.stock, item.stock) : item.stock,
      is_default: true,
    };
  });
}

function normalizeUsername(v: any) {
  return safeText(v).toLowerCase();
}

function jwtSecret() {
  return getMartVendorJwtSecret();
}

function parseCookie(cookieHeader: string) {
  const out: Record<string, string> = {};
  safeText(cookieHeader).split(";").forEach((part) => {
    const [k, ...rest] = part.split("=");
    const key = safeText(k);
    if (!key) return;
    out[key] = decodeURIComponent(rest.join("=") || "");
  });
  return out;
}

function readBearerToken(req: any) {
  const auth = safeText(req?.headers?.authorization || req?.headers?.Authorization || "");
  const m = auth.match(/^\s*Bearer\s+(.+)\s*$/i);
  return m ? safeText(m[1]) : "";
}

function readVendorToken(req: any) {
  const bearer = readBearerToken(req);
  if (bearer) return bearer;
  const cookies = parseCookie(safeText(req?.headers?.cookie || ""));
  return safeText(cookies[VENDOR_SESSION_COOKIE] || "");
}

function signVendorToken(account: VendorAccount) {
  const payload: VendorAuthClaims = {
    sub: `${account.vendorId}:${account.username}`,
    role: "mart_vendor",
    vendorId: account.vendorId,
    username: account.username
  };
  return jwt.sign(payload, jwtSecret(), { expiresIn: "12h" });
}

function verifyVendorToken(token: string): VendorAuthClaims | null {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as any;
    if (!decoded || decoded.role !== "mart_vendor") return null;
    const vendorId = safeText(decoded.vendorId);
    const username = normalizeUsername(decoded.username);
    if (!vendorId || !username) return null;
    return {
      sub: safeText(decoded.sub || `${vendorId}:${username}`),
      role: "mart_vendor",
      vendorId,
      username
    };
  } catch {
    return null;
  }
}

function cookieSecure() {
  return safeText(process.env.NODE_ENV).toLowerCase() === "production";
}

function setVendorSessionCookie(res: any, token: string) {
  res.cookie(VENDOR_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000,
    path: "/api/mart-vendor"
  });
}

function clearVendorSessionCookie(res: any) {
  res.clearCookie(VENDOR_SESSION_COOKIE, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/api/mart-vendor"
  });
}

function accountFromRaw(raw: any): VendorAccount | null {
  const vendorId = safeText(raw?.vendorId || raw?.vendor_id || raw?.mart_partner_id || raw?.martId || raw?.id);
  const username = normalizeUsername(raw?.username || raw?.userName || raw?.email || raw?.login);
  if (!vendorId || !username) return null;
  const password = safeText(raw?.password);
  const passwordHash = safeText(raw?.passwordHash || raw?.password_hash);
  const activeRaw = raw?.active !== undefined ? raw?.active : raw?.available;
  return {
    vendorId,
    username,
    password: password || undefined,
    passwordHash: passwordHash || undefined,
    name: safeText(raw?.name || raw?.vendorName || raw?.displayName) || undefined,
    active: activeRaw === undefined ? true : toBool(activeRaw, true)
  };
}

function parseVendorAccounts(): VendorAccount[] {
  const parsed: VendorAccount[] = [];
  const raw = safeText(process.env.MART_VENDOR_ACCOUNTS || process.env.MART_VENDOR_USERS || "");
  if (raw) {
    try {
      const json = JSON.parse(raw);
      if (Array.isArray(json)) {
        json.forEach((entry) => {
          const account = accountFromRaw(entry);
          if (account) parsed.push(account);
        });
      }
    } catch {
      // Ignore malformed JSON env config.
    }
  }

  const single = accountFromRaw({
    vendorId: process.env.MART_VENDOR_ID,
    username: process.env.MART_VENDOR_USERNAME,
    password: process.env.MART_VENDOR_PASSWORD,
    passwordHash: process.env.MART_VENDOR_PASSWORD_HASH,
    name: process.env.MART_VENDOR_NAME,
    active: process.env.MART_VENDOR_ACTIVE
  });
  if (single) parsed.push(single);

  const byUsername = new Map<string, VendorAccount>();
  parsed.forEach((account) => {
    byUsername.set(normalizeUsername(account.username), account);
  });
  return Array.from(byUsername.values()).filter((x) => x.active !== false);
}

async function loadVendorAccountsFromDb(): Promise<VendorAccount[]> {
  if (!supabaseConfigured()) return [];
  try {
    const r = await supabaseRequest(
      "ev_mart_partners?select=id,name,username,password,password_hash,active,available,created_at,updated_at&order=updated_at.desc.nullslast&limit=1000"
    );
    const rows = (await r.json().catch(() => [])) as any[];
    const out: VendorAccount[] = [];
    const seen = new Set<string>();
    (Array.isArray(rows) ? rows : []).forEach((raw) => {
      const account = accountFromRaw(raw);
      if (!account || account.active === false) return;
      const key = normalizeUsername(account.username);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(account);
    });
    return out;
  } catch {
    return [];
  }
}

async function resolveVendorAccounts(): Promise<VendorAccount[]> {
  const dbAccounts = await loadVendorAccountsFromDb();
  if (dbAccounts.length) return dbAccounts;
  return parseVendorAccounts();
}

function comparePlain(a: string, b: string) {
  const aa = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (aa.length !== bb.length) return false;
  try {
    return timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

function verifyPassword(password: string, account: VendorAccount): boolean {
  const plain = safeText(account.password);
  if (plain) return comparePlain(password, plain);

  const hash = safeText(account.passwordHash);
  if (!hash) return false;
  if (hash.startsWith("sha256$")) {
    const expectedHex = hash.slice("sha256$".length);
    const digest = createHash("sha256").update(password).digest("hex");
    return comparePlain(digest, expectedHex);
  }
  if (hash.startsWith("scrypt$")) {
    const parts = hash.split("$");
    if (parts.length !== 3) return false;
    const saltHex = parts[1];
    const expectedHex = parts[2];
    const derived = scryptSync(password, Buffer.from(saltHex, "hex"), 32).toString("hex");
    return comparePlain(derived, expectedHex);
  }
  return comparePlain(password, hash);
}

function supabaseUrl() {
  return safeText(process.env.SUPABASE_URL).replace(/\/+$/, "");
}

function supabaseServiceRoleKey() {
  return safeText(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
}

function supabaseConfigured() {
  return !!supabaseUrl() && !!supabaseServiceRoleKey();
}

function encodePath(value: string) {
  return String(value || "")
    .split("/")
    .map((x) => encodeURIComponent(x))
    .join("/");
}

function normalizeUploadFolder(raw: any, fallback = "images/mart-vendor") {
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
  return { baseName, ext };
}

function isAllowedUploadImage(file: { mimetype?: string; originalname?: string }) {
  const mime = safeText(file?.mimetype).toLowerCase();
  const name = safeText(file?.originalname).toLowerCase();
  const allowedMime = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/avif"
  ]);
  if (allowedMime.has(mime)) return true;
  return /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(name);
}

async function normalizeUploadImage(buffer: Buffer, mimeType: string) {
  const lower = safeText(mimeType).toLowerCase();
  if (lower === "image/png") {
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
  if (!supabaseUrlRaw || !supabaseKey || !supabaseBucket) throw new Error("SUPABASE_STORAGE_NOT_CONFIGURED");
  return { supabaseUrlRaw, supabaseKey, supabaseBucket };
}

async function uploadImageBufferToSupabase(buffer: Buffer, mimeType: string, folderRaw: any, originalName?: string) {
  const folder = normalizeUploadFolder(folderRaw, "images/mart-vendor");
  const { baseName, ext } = makeUploadFileName(mimeType, originalName);
  const { contentType, body } = await normalizeUploadImage(buffer, mimeType);
  const { supabaseUrlRaw, supabaseKey, supabaseBucket } = getSupabaseStorageConfig();
  let objectPath = "";
  let uploaded = false;
  let lastErr = "";
  for (let attempt = 0; attempt < 50; attempt += 1) {
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
    if (uploadResp.status === 409 || /already exists|duplicate/i.test(text)) continue;
    throw new Error(`SUPABASE_UPLOAD_FAILED:${text}`);
  }
  if (!uploaded || !objectPath) throw new Error(`SUPABASE_UPLOAD_FAILED:${lastErr || "UNABLE_TO_RESOLVE_FILENAME"}`);
  const publicUrl = `${supabaseUrlRaw}/storage/v1/object/public/${encodePath(supabaseBucket)}/${encodePath(objectPath)}`;
  return { ok: true, url: publicUrl, path: objectPath, bucket: supabaseBucket };
}

function supabaseHeaders(extra?: Record<string, string>) {
  const key = supabaseServiceRoleKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(extra || {})
  };
}

async function supabaseRequest(path: string, init?: RequestInit) {
  const endpoint = `${supabaseUrl()}/rest/v1/${path.replace(/^\/+/, "")}`;
  const r = await fetch(endpoint, {
    ...(init || {}),
    headers: {
      ...supabaseHeaders(),
      ...((init?.headers || {}) as any)
    }
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(txt || "SUPABASE_REQUEST_FAILED");
  }
  return r;
}

async function supabaseSelectAll(path: string, pageSize = 1000, maxPages = 200) {
  const out: any[] = [];
  let offset = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const join = path.includes("?") ? "&" : "?";
    const pagePath = `${path}${join}limit=${pageSize}&offset=${offset}`;
    const r = await supabaseRequest(pagePath);
    const rows = (await r.json().catch(() => [])) as any[];
    const arr = Array.isArray(rows) ? rows : [];
    if (!arr.length) break;
    out.push(...arr);
    if (arr.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

async function loadVendorSnapshot(vendorId: string) {
  const buildCatalog = (rows: any[]) => {
    const byName = new Map<string, { name: string; image: string }>();
    (Array.isArray(rows) ? rows : []).forEach((row: any) => {
      const name = safeText(row?.name || row?.title);
      if (!name) return;
      const key = name.toLowerCase();
      const image = safeText(row?.image || row?.image_url || row?.imageUrl || "");
      const prev = byName.get(key);
      if (!prev) {
        byName.set(key, { name, image });
        return;
      }
      if (!prev.image && image) {
        byName.set(key, { ...prev, image });
      }
    });
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  if (supabaseConfigured()) {
    const vendorQ = `ev_mart_partners?select=*&id=eq.${encodeURIComponent(vendorId)}&limit=1`;
    const productQ = `ev_mart_products?select=*&mart_partner_id=eq.${encodeURIComponent(vendorId)}&order=created_at.desc.nullslast`;
    const catalogQ = "ev_mart_products?select=name,image";
    const [vendorRes, products, catalogRows] = await Promise.all([
      supabaseRequest(vendorQ),
      supabaseSelectAll(productQ, 1000),
      supabaseSelectAll(catalogQ, 1000)
    ]);
    const vendors = (await vendorRes.json().catch(() => [])) as any[];
    return {
      vendor: vendors[0] || { id: vendorId, name: vendorId },
      products: Array.isArray(products) ? products : [],
      catalog: buildCatalog(catalogRows)
    };
  }

  const db = await readData();
  const anyDb = db as any;
  const vendors = Array.isArray(anyDb.martPartners) ? anyDb.martPartners : [];
  const products = Array.isArray(anyDb.martProducts) ? anyDb.martProducts : [];
  const vendor = vendors.find((x: any) => safeText(x?.id) === vendorId) || { id: vendorId, name: vendorId };
  const filtered = products.filter((x: any) => {
    const pVendorId = safeText(x?.mart_partner_id || x?.martId || x?.mart_id);
    return pVendorId === vendorId;
  });
  return { vendor, products: filtered, catalog: buildCatalog(products) };
}

async function saveVendorCustomCategories(vendorId: string, categories: any[]) {
  const normalized = parseCustomCategoryList(categories);
  if (supabaseConfigured()) {
    const vendorQ = `ev_mart_partners?select=*&id=eq.${encodeURIComponent(vendorId)}&limit=1`;
    const vendorRes = await supabaseRequest(vendorQ);
    const vendors = (await vendorRes.json().catch(() => [])) as any[];
    const vendor = vendors[0];
    if (!vendor) throw new Error("VENDOR_NOT_FOUND");
    const customCategoryField = resolveCustomCategoryField(vendor);
    if (!customCategoryField) {
      throw new Error("Missing custom category column on ev_mart_partners. Add inventory_custom_categories (or custom_categories/category_options/categories).");
    }
    const payload = {
      ...vendor,
      id: vendorId,
      [customCategoryField]: serializeCustomCategoryValue(vendor?.[customCategoryField], normalized)
    };
    await supabaseRequest("ev_mart_partners?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([payload])
    });
    return normalized;
  }

  await mutateData((db) => {
    const anyDb = db as any;
    if (!Array.isArray(anyDb.martPartners)) anyDb.martPartners = [];
    const rows = anyDb.martPartners as any[];
    const idx = rows.findIndex((row: any) => safeText(row?.id) === vendorId);
    if (idx === -1) {
      rows.push({ id: vendorId, name: vendorId, inventory_custom_categories: normalized });
      return;
    }
    const current = rows[idx] || {};
    const customCategoryField = resolveCustomCategoryField(current) || "inventory_custom_categories";
    rows[idx] = {
      ...current,
      [customCategoryField]: serializeCustomCategoryValue(current?.[customCategoryField], normalized)
    };
  }, "mart_vendor_custom_categories");

  return normalized;
}

function sanitizeProductRow(vendorId: string, row: any) {
  const id = safeText(row?.id || "");
  const name = safeText(row?.name || row?.title);
  if (!name) throw new Error("PRODUCT_NAME_REQUIRED");
  const vendorPrice = toMoney(row?.price ?? row?.vendor_price ?? row?.vendorPrice, 0);
  const customerPrice = toMoney(row?.customer_price ?? row?.customerPrice ?? row?.selling_price ?? row?.sellingPrice, vendorPrice);
  const evPercentage = toPercent(row?.ev_percentage ?? row?.evPercent ?? row?.ev_percent, 0);
  const categoryIcon = safeText(row?.category_icon || row?.categoryIcon || "");
  const categoryImage = safeText(row?.category_image || row?.categoryImage || row?.category_img || row?.categoryImg || "");
  const baseTags = Array.isArray(row?.tags)
    ? row.tags
    : safeText(row?.tags).split(",").map((x: string) => x.trim()).filter(Boolean);
  const tagsWithoutCategoryMedia = baseTags.filter((tag: string) => {
    const normalized = safeText(tag).toLowerCase();
    return !normalized.startsWith("caticon:") && !normalized.startsWith("catimage:");
  });
  const tags = [
    ...tagsWithoutCategoryMedia,
    ...(categoryIcon ? [`caticon:${categoryIcon}`] : []),
    ...(categoryImage ? [`catimage:${categoryImage}`] : []),
  ];
  const unit = safeText(row?.unit || row?.capacity || row?.size || "");
  const mrp = toMoney(row?.mrp, 0);
  const stock = toInt(row?.stock, 0);
  const quantityOptions = syncDefaultQuantityOptionWithLegacyFields(
    normalizeQuantityOptions(
      row?.quantity_options ?? row?.quantityOptions ?? row?.variants,
      { unit, vendorPrice, price: customerPrice, mrp, stock }
    ),
    row
  );
  const defaultQuantityOption = quantityOptions.find((item) => item?.is_default) || quantityOptions[0] || null;
  return {
    id: id || makeId("mprod"),
    mart_partner_id: vendorId,
    name,
    category_id: safeText(row?.category_id || row?.categoryId || "uncategorized") || "uncategorized",
    unit,
    sub_category: safeText(row?.sub_category || row?.subCategory || ""),
    description: safeText(row?.description || ""),
    price: toMoney(defaultQuantityOption?.vendor_price, vendorPrice),
    ev_percentage: evPercentage,
    customer_price: toMoney(defaultQuantityOption?.price, customerPrice),
    mrp: toMoney(defaultQuantityOption?.mrp, mrp),
    stock: toInt(defaultQuantityOption?.stock, stock),
    max_per_order: toInt(row?.max_per_order ?? row?.maxPerOrder, 10) || 10,
    is_veg: toBool(row?.is_veg ?? row?.isVeg, false),
    available: row?.available === undefined ? true : toBool(row?.available, true),
    image: safeText(row?.image || ""),
    brand: safeText(row?.brand || ""),
    tags,
    delivery_pincodes: safeText(row?.delivery_pincodes || row?.deliveryPincodes || ""),
    type: safeText(row?.type || ""),
    rating: toMoney(row?.rating, 0),
    category_icon: categoryIcon,
    category_image: categoryImage,
    quantity_options: quantityOptions,
  };
}

function getLoginKey(req: any, username: string) {
  const ip = safeText(req?.ip || req?.headers?.["x-forwarded-for"] || "unknown");
  return `${ip}:${normalizeUsername(username)}`;
}

function checkLoginLock(req: any, username: string) {
  const key = getLoginKey(req, username);
  const rec = loginFailures.get(key);
  if (!rec) return { locked: false, retryAfterMs: 0 };
  const now = Date.now();
  if (rec.lockUntil > now) return { locked: true, retryAfterMs: rec.lockUntil - now };
  if (now - rec.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return { locked: false, retryAfterMs: 0 };
  }
  return { locked: false, retryAfterMs: 0 };
}

function noteLoginFailure(req: any, username: string) {
  const key = getLoginKey(req, username);
  const now = Date.now();
  const rec = loginFailures.get(key);
  if (!rec || now - rec.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 1, firstAt: now, lockUntil: 0 });
    return;
  }
  const nextCount = rec.count + 1;
  const lockUntil = nextCount >= LOGIN_MAX_ATTEMPTS ? now + LOGIN_WINDOW_MS : 0;
  loginFailures.set(key, { count: nextCount, firstAt: rec.firstAt, lockUntil });
}

function clearLoginFailure(req: any, username: string) {
  loginFailures.delete(getLoginKey(req, username));
}

function requireVendorAuth(req: any, res: any, next: any) {
  const token = readVendorToken(req);
  if (!token) return res.status(401).json({ ok: false, error: "VENDOR_AUTH_REQUIRED" });
  const claims = verifyVendorToken(token);
  if (!claims) return res.status(401).json({ ok: false, error: "VENDOR_AUTH_INVALID" });
  (req as any).vendorAuth = claims;
  return next();
}

export function martVendorRouter() {
  const r = Router();

  r.get("/auth/session", (req, res) => {
    const token = readVendorToken(req);
    if (!token) return res.status(401).json({ ok: false, error: "VENDOR_AUTH_REQUIRED" });
    const claims = verifyVendorToken(token);
    if (!claims) return res.status(401).json({ ok: false, error: "VENDOR_AUTH_INVALID" });
    return res.json({ ok: true, vendorId: claims.vendorId, username: claims.username });
  });

  r.post("/auth/login", async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const password = safeText(req.body?.password || "");
    if (!username || !password) return res.status(400).json({ ok: false, error: "USERNAME_PASSWORD_REQUIRED" });
    const lock = checkLoginLock(req, username);
    if (lock.locked) {
      return res.status(429).json({
        ok: false,
        error: "TOO_MANY_ATTEMPTS",
        retryAfterSeconds: Math.ceil(lock.retryAfterMs / 1000)
      });
    }

    const accounts = await resolveVendorAccounts();
    const account = accounts.find((x) => normalizeUsername(x.username) === username && x.active !== false);
    if (!account || !verifyPassword(password, account)) {
      noteLoginFailure(req, username);
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    clearLoginFailure(req, username);
    const token = signVendorToken(account);
    setVendorSessionCookie(res, token);
    return res.json({
      ok: true,
      token,
      vendorId: account.vendorId,
      username: account.username,
      name: account.name || account.vendorId
    });
  });

  r.post("/auth/logout", (req, res) => {
    clearVendorSessionCookie(res);
    return res.json({ ok: true });
  });

  r.get("/snapshot", requireVendorAuth, async (req, res) => {
    const claims = (req as any).vendorAuth as VendorAuthClaims;
    try {
      const data = await loadVendorSnapshot(claims.vendorId);
      return res.json({
        ok: true,
        vendor: data.vendor,
        products: data.products,
        catalog: data.catalog
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: "SNAPSHOT_FAILED", message: String(err?.message || err) });
    }
  });

  r.post("/custom-categories", requireVendorAuth, async (req, res) => {
    const claims = (req as any).vendorAuth as VendorAuthClaims;
    try {
      const categories = parseCustomCategoryList(req.body?.categories);
      const saved = await saveVendorCustomCategories(claims.vendorId, categories);
      return res.json({ ok: true, categories: saved });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: "CUSTOM_CATEGORIES_SAVE_FAILED", message: String(err?.message || err) });
    }
  });

  r.post("/products/upsert", requireVendorAuth, async (req, res) => {
    const claims = (req as any).vendorAuth as VendorAuthClaims;
    const rowsIn = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rowsIn.length) return res.status(400).json({ ok: false, error: "ROWS_REQUIRED" });
    let rows: any[] = [];
    try {
      rows = rowsIn.map((row: any) => sanitizeProductRow(claims.vendorId, row));
    } catch (err: any) {
      return res.status(400).json({ ok: false, error: safeText(err?.message || "INVALID_ROW") || "INVALID_ROW" });
    }

    try {
      if (supabaseConfigured()) {
        const existingOwnerById = new Map<string, string>();
        const idsToCheck = Array.from(
          new Set(rows.map((row) => safeText(row?.id)).filter(Boolean))
        );
        for (const id of idsToCheck) {
          const chk = await supabaseRequest(
            `ev_mart_products?select=id,mart_partner_id&id=eq.${encodeURIComponent(id)}&limit=1`
          );
          const found = (await chk.json().catch(() => [])) as any[];
          const owner = safeText(found?.[0]?.mart_partner_id);
          if (owner) existingOwnerById.set(id, owner);
        }
        const usedIds = new Set<string>();
        const normalizedRows = rows.map((row) => {
          let nextId = safeText(row?.id) || makeId("mprod");
          while (
            usedIds.has(nextId) ||
            (existingOwnerById.has(nextId) && existingOwnerById.get(nextId) !== claims.vendorId)
          ) {
            nextId = makeId("mprod");
          }
          usedIds.add(nextId);
          return { ...row, id: nextId, mart_partner_id: claims.vendorId };
        });
        const r2 = await supabaseRequest("ev_mart_products?on_conflict=id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify(normalizedRows)
        });
        const payload = (await r2.json().catch(() => [])) as any[];
        return res.json({ ok: true, rows: Array.isArray(payload) ? payload : normalizedRows });
      }

      await mutateData((db) => {
        const anyDb = db as any;
        if (!Array.isArray(anyDb.martProducts)) anyDb.martProducts = [];
        const nextRows = anyDb.martProducts as any[];
        const byVendorAndId = new Map(
          nextRows.map((x: any, idx: number) => [
            `${safeText(x?.mart_partner_id || x?.martId || x?.mart_id)}::${safeText(x?.id)}`,
            idx
          ])
        );
        rows.forEach((row) => {
          let id = safeText(row?.id) || makeId("mprod");
          while (byVendorAndId.has(`${claims.vendorId}::${id}`)) {
            const existingIdx = byVendorAndId.get(`${claims.vendorId}::${id}`);
            const existing = existingIdx === undefined ? null : nextRows[existingIdx];
            if (safeText(existing?.id) === id) break;
            id = makeId("mprod");
          }
          const key = `${claims.vendorId}::${id}`;
          const idx = byVendorAndId.get(key);
          if (idx === undefined) {
            nextRows.push({ ...row, id, martId: claims.vendorId, mart_partner_id: claims.vendorId });
            byVendorAndId.set(key, nextRows.length - 1);
          } else {
            nextRows[idx] = { ...(nextRows[idx] || {}), ...row, id, martId: claims.vendorId, mart_partner_id: claims.vendorId };
          }
        });
      }, "mart_vendor_products_upsert");
      return res.json({ ok: true, rows });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: "UPSERT_FAILED", message: String(err?.message || err) });
    }
  });

  r.post("/products/delete", requireVendorAuth, async (req, res) => {
    const claims = (req as any).vendorAuth as VendorAuthClaims;
    const id = safeText(req.body?.id);
    if (!id) return res.status(400).json({ ok: false, error: "PRODUCT_ID_REQUIRED" });
    try {
      if (supabaseConfigured()) {
        await supabaseRequest(`ev_mart_products?id=eq.${encodeURIComponent(id)}&mart_partner_id=eq.${encodeURIComponent(claims.vendorId)}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" }
        });
      } else {
        await mutateData((db) => {
          const anyDb = db as any;
          const rows = Array.isArray(anyDb.martProducts) ? anyDb.martProducts : [];
          anyDb.martProducts = rows.filter((row: any) => {
            const rowId = safeText(row?.id);
            const rowVendor = safeText(row?.mart_partner_id || row?.martId || row?.mart_id);
            if (rowId !== id) return true;
            return rowVendor !== claims.vendorId;
          });
        }, "mart_vendor_products_delete");
      }
      return res.json({ ok: true, id });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: "DELETE_FAILED", message: String(err?.message || err) });
    }
  });

  r.post("/products/upload-image", requireVendorAuth, upload.single("image"), async (req, res) => {
    const claims = (req as any).vendorAuth as VendorAuthClaims;
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ ok: false, error: "IMAGE_FILE_REQUIRED" });
      if (!isAllowedUploadImage(file)) {
        return res.status(400).json({ ok: false, error: "INVALID_IMAGE_TYPE", message: "Only JPG, PNG, WEBP, HEIC, HEIF, AVIF are allowed." });
      }
      const folder = `images/mart-vendor/${encodeURIComponent(claims.vendorId)}`;
      const uploaded = await uploadImageBufferToSupabase(file.buffer, file.mimetype, folder, safeText(file.originalname));
      return res.json(uploaded);
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      if (msg.startsWith("SUPABASE_STORAGE_NOT_CONFIGURED")) {
        return res.status(500).json({
          ok: false,
          error: "SUPABASE_STORAGE_NOT_CONFIGURED",
          message: "Image uploads require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET."
        });
      }
      if (msg.startsWith("SUPABASE_UPLOAD_FAILED:")) {
        return res.status(500).json({
          ok: false,
          error: "SUPABASE_UPLOAD_FAILED",
          message: msg.replace(/^SUPABASE_UPLOAD_FAILED:/, "")
        });
      }
      return res.status(500).json({ ok: false, error: "UPLOAD_FAILED", message: msg || "Upload failed." });
    }
  });

  // Utility endpoint to generate secure hashes for env setup (manager/admin use only).
  r.post("/auth/hash", (req, res) => {
    const password = safeText(req.body?.password || "");
    const managerKey = safeText(req.body?.managerKey || req.headers["x-manager-key"] || "");
    const expected = safeText(process.env.MART_VENDOR_HASH_KEY || process.env.ADMIN_DASHBOARD_KEY || "");
    if (!expected || managerKey !== expected) return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    if (!password) return res.status(400).json({ ok: false, error: "PASSWORD_REQUIRED" });
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, Buffer.from(salt, "hex"), 32).toString("hex");
    return res.json({ ok: true, passwordHash: `scrypt$${salt}$${hash}` });
  });

  return r;
}
