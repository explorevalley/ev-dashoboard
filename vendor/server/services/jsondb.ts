import fs from "fs-extra";
import path from "path";
import { DatabaseSchema, makeId, type Database } from "@explorevalley/shared";
import { syncUserBehaviorProfilesFromData, syncUserProfilesFromOrders } from "./userProfiles";
import { applyOperationalRules } from "./operationalRules";
import { deriveMenuItemMrp } from "./foodPricing";

const BACKUP_DIR = path.join(process.cwd(), "..", "data", "backups");
// Snapshot backups can get very large (full DB JSON). Keep them opt-in and prune automatically when enabled.
const BACKUP_SNAPSHOTS_ENABLED = String(process.env.EV_BACKUP_SNAPSHOTS || "").trim() === "1";
const BACKUP_RETENTION_DAYS = Number(process.env.EV_BACKUP_RETENTION_DAYS || 7);
const BACKUP_KEEP_MAX = Number(process.env.EV_BACKUP_KEEP_MAX || 200);
const BACKUP_MIN_INTERVAL_SEC = Number(process.env.EV_BACKUP_MIN_INTERVAL_SEC || 300);
const BACKUP_SKIP_PREFIXES = String(process.env.EV_BACKUP_SKIP_PREFIXES || "analytics_")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const lastBackupAtByLabel = new Map<string, number>();
const LOCAL_DB_PATH = path.join(process.cwd(), "..", "data", "data.json");
const FORCE_SUPABASE = String(process.env.EV_FORCE_SUPABASE || "").trim() === "1";
const FALLBACK_TO_LOCAL_ON_SUPABASE_ERROR = String(process.env.EV_DB_FALLBACK_TO_LOCAL || "").trim() === "1";
let warnedLocal = false;
/**
 * The MRP a menu row must be stored with. The MRP is the figure the customer
 * is shown and charged; storing 0 makes the app quote the vendor's own price
 * instead, which is how dishes ended up on the menu at the kitchen's rate.
 * An explicit MRP wins (clamped to never sit below the price); otherwise it is
 * derived from the price with the standard markup.
 */
function resolveStoredMenuMrp(rawMrp: any, rawPrice: any) {
  const price = Math.max(0, Number(rawPrice || 0) || 0);
  const mrp = Math.max(0, Number(rawMrp || 0) || 0);
  if (mrp > 0) return Math.max(mrp, price);
  return deriveMenuItemMrp(price);
}

const FOOD_VENDOR_TABLE = "ev_food_vendors";
const LEGACY_FOOD_VENDOR_TABLE = "ev_restaurants";
const FOOD_MENU_ITEM_TABLE = "ev_food_menu_items";
const LEGACY_FOOD_MENU_ITEM_TABLE = "ev_menu_items";
const FOOD_VENDOR_MENU_TABLE = "ev_food_vendor_menus";
const LEGACY_FOOD_VENDOR_MENU_TABLE = "ev_vendor_menus";

function supabaseUrl() {
  return String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}

function supabaseServiceRoleKey() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "");
}

function supabaseUserProfileTable() {
  return String(process.env.SUPABASE_USER_PROFILE_TABLE || "ev_user_profiles").trim() || "ev_user_profiles";
}

function nowISO() { return new Date().toISOString(); }
function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}
function slugToken(v: any, fallback = "item", maxLen = 32) {
  const s = safeText(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const clipped = s.slice(0, maxLen);
  return clipped || fallback;
}
function makeStableMenuItemId(restaurantId: any, itemName: any, suffix = 0) {
  const restaurant = slugToken(restaurantId, "vendor", 24);
  const item = slugToken(itemName, "item", 24);
  return suffix > 0
    ? `menu_${restaurant}_${item}_${suffix + 1}`
    : `menu_${restaurant}_${item}`;
}
function normalizeMenuLookupKey(name: any, category: any) {
  const normalizedName = safeText(name).toLowerCase().replace(/\s+/g, " ");
  const normalizedCategory = safeText(category || "General").toLowerCase().replace(/\s+/g, " ");
  return `${normalizedName}::${normalizedCategory}`;
}
function normalizeMenuItemRowsForSupabase(rows: any[]) {
  const dedupedRows: any[] = [];
  const indexByKey = new Map<string, number>();
  const generatedCounts = new Map<string, number>();

  (Array.isArray(rows) ? rows : []).forEach((rawRow: any, idx: number) => {
    if (!rawRow || typeof rawRow !== "object") return;
    const restaurantId = safeText(rawRow?.restaurant_id || rawRow?.restaurantId || "");
    const itemName = safeText(rawRow?.name || "");
    const category = safeText(rawRow?.category || "General") || "General";
    if (!itemName) return;
    let id = safeText(rawRow?.id || "");
    if (!id) {
      const counterKey = `${restaurantId}::${itemName.toLowerCase()}`;
      const seenCount = generatedCounts.get(counterKey) || 0;
      id = makeStableMenuItemId(restaurantId, itemName, seenCount);
      generatedCounts.set(counterKey, seenCount + 1);
    }
    const row = {
      ...rawRow,
      id,
      restaurant_id: restaurantId,
      category,
      name: itemName
    };
    const key = `id:${id}`;
    const existingIdx = indexByKey.get(key);
    if (existingIdx === undefined) {
      indexByKey.set(key, dedupedRows.length);
      dedupedRows.push(row);
      return;
    }
    dedupedRows[existingIdx] = {
      ...dedupedRows[existingIdx],
      ...row
    };
  });

  return dedupedRows;
}
function dedupeUserProfilesByEmail(rows: any[]) {
  const byEmail = new Map<string, any>();
  const noEmail: any[] = [];
  const ts = (v: any) => {
    const n = new Date(String(v || "")).getTime();
    return Number.isFinite(n) ? n : 0;
  };
  for (const row of rows || []) {
    const email = String(row?.email || "").trim().toLowerCase();
    if (!email) {
      noEmail.push(row);
      continue;
    }
    const prev = byEmail.get(email);
    if (!prev) {
      byEmail.set(email, row);
      continue;
    }
    const prevTs = Math.max(ts(prev?.updated_at), ts(prev?.created_at), ts(prev?.updatedAt), ts(prev?.createdAt));
    const nextTs = Math.max(ts(row?.updated_at), ts(row?.created_at), ts(row?.updatedAt), ts(row?.createdAt));
    if (nextTs >= prevTs) byEmail.set(email, row);
  }
  return [...noEmail, ...Array.from(byEmail.values())];
}
function isUserProfilesDuplicateEmailError(err: any) {
  const msg = String((err && (err.message || err)) || "");
  const table = supabaseUserProfileTable();
  return msg.includes(`${table}_email_unique_idx`) || (msg.includes("\"code\":\"23505\"") && msg.toLowerCase().includes("email"));
}
function dedupeUserBehaviorProfiles(rows: any[]) {
  const byKey = new Map<string, any>();
  const stamp = (row: any) => {
    const ts = Date.parse(String(row?.updated_at || row?.updatedAt || row?.created_at || row?.createdAt || ""));
    return Number.isFinite(ts) ? ts : 0;
  };
  const orderKey = (order: any) => {
    return JSON.stringify({
      type: String(order?.type || ""),
      id: String(order?.id || ""),
      at: String(order?.at || ""),
      amount: Number(order?.amount || 0),
      status: String(order?.status || "")
    });
  };
  const merge = (current: any, incoming: any) => {
    if (!current) return incoming;
    const preferred = stamp(incoming) >= stamp(current) ? incoming : current;
    const secondary = preferred === incoming ? current : incoming;
    const mergedOrders = [
      ...(Array.isArray(current?.orders) ? current.orders : []),
      ...(Array.isArray(incoming?.orders) ? incoming.orders : []),
    ];
    const seenOrders = new Set<string>();
    const nextOrders = mergedOrders.filter((order: any) => {
      const key = orderKey(order);
      if (seenOrders.has(key)) return false;
      seenOrders.add(key);
      return true;
    });
    return {
      ...secondary,
      ...preferred,
      orders: nextOrders
    };
  };
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String(row?.id || "").trim();
    const userId = String(row?.user_id || row?.userId || "").trim();
    const phone = String(row?.phone || "").trim();
    const email = String(row?.email || "").trim().toLowerCase();
    const key = id || userId || `phone:${phone}` || `email:${email}`;
    if (!key) continue;
    byKey.set(key, merge(byKey.get(key), row));
  }
  return Array.from(byKey.values());
}
function assertSupabaseConfigured() {
  if (!supabaseUrl() || !supabaseServiceRoleKey()) {
    throw new Error("SUPABASE_NOT_CONFIGURED: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
}

function shouldUseSupabase() {
  return FORCE_SUPABASE || (!!supabaseUrl() && !!supabaseServiceRoleKey());
}

async function loadLocalDatabase(): Promise<Database> {
  if (!warnedLocal) {
    warnedLocal = true;
    // eslint-disable-next-line no-console
    console.warn("[jsondb] Supabase not configured. Falling back to local data.json.");
  }

  await fs.ensureDir(path.dirname(LOCAL_DB_PATH));
  const exists = await fs.pathExists(LOCAL_DB_PATH);
  if (!exists) {
    const seed = DatabaseSchema.parse({
      settings: DEFAULT_SETTINGS,
      policies: DEFAULT_POLICIES,
      payments: DEFAULT_PAYMENTS,
      sitePages: DEFAULT_SITE_PAGES
    });
    await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }

  const raw = await fs.readFile(LOCAL_DB_PATH, "utf8");
  const parsed = raw.trim() ? JSON.parse(raw) : {};
  const normalized = DatabaseSchema.parse({
    settings: parsed.settings || DEFAULT_SETTINGS,
    policies: parsed.policies || DEFAULT_POLICIES,
    payments: parsed.payments || DEFAULT_PAYMENTS,
    sitePages: parsed.sitePages || DEFAULT_SITE_PAGES,
    ...parsed
  });
  return normalized;
}

async function writeLocalDatabase(db: Database) {
  await fs.ensureDir(path.dirname(LOCAL_DB_PATH));
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf8");
  invalidateDatabaseCache();
}

const DEFAULT_SETTINGS = {
  currency: "INR",
  pageSlugs: {
    affiliateProgram: "affiliate-program",
    contactUs: "contact-us",
    privacyPolicy: "privacy-policy",
    refundPolicy: "refund-policy",
    termsAndConditions: "terms-and-conditions"
  },
  taxRules: {
    hotel: { slabs: [{ min: 0, max: 999, gst: 0 }, { min: 1000, max: 7500, gst: 0.05 }, { min: 7500.01, max: null, gst: 0.18 }] },
    tour: { gst: 0.05, mode: "NO_ITC" },
    food: { gst: 0.05, mode: "DEFAULT" },
    cab: { gst: 0.05, mode: "DEFAULT" },
    invoice: {
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
    }
  }
} as const;

const DEFAULT_POLICIES = {
  hotel: { freeCancelHours: 24, feeAfter: 0.5 },
  tour: { freeCancelHours: 24, feeAfter: 0.5 },
  cab: { freeCancelMinutes: 15, feeAfter: 50 },
  food: { allowCancelMinutes: 5, feeAfter: 20 }
} as const;

const DEFAULT_PAYMENTS = {
  walletEnabled: false,
  refundMethod: "original",
  refundWindowHours: 72
} as const;

const DEFAULT_SITE_PAGES = {
  affiliateProgram: { title: "Affiliate Program", slug: "affiliate-program", content: "" },
  contactUs: { title: "Contact Us", slug: "contact-us", content: "" },
  privacyPolicy: { title: "Privacy Policy", slug: "privacy-policy", content: "" },
  refundPolicy: { title: "Refund Policy", slug: "refund-policy", content: "" },
  termsAndConditions: { title: "Terms and Conditions", slug: "terms-and-conditions", content: "" }
} as const;

function supabaseHeaders(extra?: Record<string, string>) {
  const serviceKey = supabaseServiceRoleKey();
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...(extra || {})
  };
}

async function supabaseSelect<T = any>(table: string, query = "select=*"): Promise<T[]> {
  const url = `${supabaseUrl()}/rest/v1/${table}?${query}`;
  const r = await fetch(url, { headers: supabaseHeaders() });
  if (!r.ok) throw new Error(`${table}_SELECT_FAILED:${r.status}:${await r.text()}`);
  return r.json();
}

/**
 * One page, plus the table's exact row count when asked for it.
 *
 * The error message keeps the `${table}_SELECT_FAILED:${status}:` shape that
 * isMissingTableError and isTransientSupabaseReadError match on.
 */
async function supabaseSelectPage<T = any>(
  table: string,
  query: string,
  wantCount: boolean
): Promise<{ rows: T[]; total: number | null }> {
  const url = `${supabaseUrl()}/rest/v1/${table}?${query}`;
  const headers = wantCount ? supabaseHeaders({ Prefer: "count=exact" }) : supabaseHeaders();
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${table}_SELECT_FAILED:${r.status}:${await r.text()}`);
  const rows = (await r.json()) as T[];
  let total: number | null = null;
  if (wantCount) {
    // content-range comes back as "0-999/6194"
    const parsed = Number(String(r.headers.get("content-range") || "").split("/")[1]);
    total = Number.isFinite(parsed) ? parsed : null;
  }
  return { rows, total };
}

/** How many page requests for one table may be in flight at once. */
const SELECT_PAGE_CONCURRENCY = 6;

/**
 * Every row of a table.
 *
 * The first page is requested with `Prefer: count=exact`, so one round trip
 * returns both the first slice and the total. Everything after it is fetched
 * concurrently instead of discovering the end of the table one sequential
 * round trip at a time - each request costs ~300ms of latency against a
 * hosted Supabase, so a seven-page table was paying ~2s purely in waiting.
 *
 * Offsets still race writes the same way the sequential version did, but the
 * window is smaller, not larger: the pages are requested together rather than
 * spread over seconds.
 */
async function supabaseSelectAll<T = any>(table: string, pageSize = 1000, orderColumn = "id"): Promise<T[]> {
  const order = encodeURIComponent(orderColumn);
  const pageQuery = (offset: number) =>
    `select=*&order=${order}.asc&limit=${pageSize}&offset=${offset}`;

  const first = await supabaseSelectPage<T>(table, pageQuery(0), true);
  if (first.rows.length < pageSize) return first.rows;

  // No usable count header: fall back to walking pages until one comes short.
  if (first.total === null) {
    const all = [...first.rows];
    let offset = pageSize;
    while (true) {
      const page = await supabaseSelect<T>(table, pageQuery(offset));
      all.push(...page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
    return all;
  }

  const offsets: number[] = [];
  for (let o = pageSize; o < first.total; o += pageSize) offsets.push(o);
  if (!offsets.length) return first.rows;

  const pages: T[][] = new Array(offsets.length);
  let nextIndex = 0;
  const worker = async () => {
    for (;;) {
      const i = nextIndex++;
      if (i >= offsets.length) return;
      pages[i] = await supabaseSelect<T>(table, pageQuery(offsets[i]));
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(SELECT_PAGE_CONCURRENCY, offsets.length) }, worker)
  );

  return first.rows.concat(...pages);
}

function isMissingTableError(err: any) {
  const msg = String(err?.message || err || "");
  return msg.includes("PGRST205") || msg.includes("does not exist");
}

function isTransientSupabaseReadError(err: any) {
  const msg = String(err?.message || err || "");
  return (
    /_SELECT_FAILED:5\d{2}:/i.test(msg) ||
    msg.includes("fetch failed") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("EAI_AGAIN") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("Bad gateway") ||
    msg.includes("Gateway Timeout") ||
    msg.includes("The web server reported a bad gateway error") ||
    msg.includes("upstream connect error")
  );
}

function shouldFallbackToLocalOnSupabaseError(err: any) {
  return FALLBACK_TO_LOCAL_ON_SUPABASE_ERROR && isTransientSupabaseReadError(err);
}

function isSupabaseDuplicateConflictBatchError(err: any) {
  const msg = String(err?.message || err || "");
  return (
    msg.includes('{"code":"21000"') ||
    msg.includes("ON CONFLICT DO UPDATE command cannot affect row a second time")
  );
}

async function supabaseSelectAllIfExists<T = any>(table: string, pageSize = 1000, orderColumn = "id"): Promise<T[]> {
  try {
    return await supabaseSelectAll<T>(table, pageSize, orderColumn);
  } catch (err) {
    if (isMissingTableError(err)) return [];
    if (isTransientSupabaseReadError(err)) {
      console.warn(`[jsondb] ${table} select skipped due to transient Supabase read failure:`, String((err as any)?.message || err));
      return [];
    }
    throw err;
  }
}

/**
 * Collapse rows that share the upsert's conflict key, keeping the last.
 *
 * Postgres refuses an `ON CONFLICT DO UPDATE` whose command touches one row
 * twice — "cannot affect row a second time", SQLSTATE 21000 — so a single
 * duplicate id anywhere in the payload fails the whole write. That is how a
 * booking with a re-issued id took down every cab-booking sync rather than just
 * its own row.
 *
 * Last-wins matches the merge-duplicates semantics already requested below: of
 * two versions of the same row, the later one is the newer state.
 */
function dedupeByConflictKey(rows: any[], onConflict: string) {
  const keys = String(onConflict || "id").split(",").map((k) => k.trim()).filter(Boolean);
  if (!keys.length) return rows;
  const positionByKey = new Map<string, number>();
  const out: any[] = [];
  rows.forEach((row) => {
    const key = keys.map((k) => String(row?.[k] ?? "")).join("\u0000");
    const existing = positionByKey.get(key);
    if (existing === undefined) {
      positionByKey.set(key, out.length);
      out.push(row);
    } else {
      out[existing] = row;
    }
  });
  return out;
}

async function supabaseUpsert(table: string, rows: any[], onConflict = "id") {
  if (!rows.length) return;
  rows = dedupeByConflictKey(rows, onConflict);
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const url = `${supabaseUrl()}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders({
        Prefer: "resolution=merge-duplicates,return=minimal"
      }),
      body: JSON.stringify(chunk)
    });
    if (!r.ok) {
      const errorText = await r.text();
      const error = new Error(`${table}_UPSERT_FAILED:${r.status}:${errorText}`);
      // Some production menu datasets can still trigger Postgres batch upsert
      // conflicts even after local normalization. Retry item-by-item so we never
      // have multiple conflicting rows in the same SQL command.
      if ((table === FOOD_MENU_ITEM_TABLE || table === LEGACY_FOOD_MENU_ITEM_TABLE) && chunk.length > 1 && isSupabaseDuplicateConflictBatchError(error)) {
        for (const row of chunk) {
          await supabaseUpsert(table, [row], onConflict);
        }
        continue;
      }
      throw error;
    }
  }
}

async function supabaseInsertIgnoreDuplicates(table: string, rows: any[], onConflict = "id") {
  if (!rows.length) return;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const url = `${supabaseUrl()}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders({
        Prefer: "resolution=ignore-duplicates,return=minimal"
      }),
      body: JSON.stringify(chunk)
    });
    if (!r.ok) throw new Error(`${table}_INSERT_FAILED:${r.status}:${await r.text()}`);
  }
}

async function supabaseUpsertWithOptionalPriceFields(table: string, rows: any[], onConflict = "id") {
  // Columns that may not exist on older Supabase schemas; we strip them and retry.
  const optionalColumns = [
    "mrp",
    "price_dropped",
    "price_drop_percent",
    "image_meta",
    "hero_image",
    "image_titles",
    "image_descriptions",
    "vendor_mobile",
    "additional_comments",
    // WP-Travel-like tour enrichment / i18n (backward compatible).
    "map_embed_url",
    "faqs",
    "itinerary_items",
    "facts",
    "content_blocks",
    "i18n",
    // WP-Travel-like booking enrichment (backward compatible).
    "country_code",
    "paid_amount",
    "email",
    // Food orders enrichment (backward compatible).
    "user_id",
    "restaurant_id",
    "delivery_pincode",
    "delivery_address_id",
    "delivery_region",
    // Customer profile address (backward compatible — see
    // server/sql/add_delivery_pincodes_and_user_addresses.sql).
    "address",
    "city",
    "state",
    "pincode",
    "landmark",
    "default_address_id",
    // Customer notification bell (backward compatible — see
    // server/sql/add_user_push_notifications.sql). Until that runs the column
    // is stripped and the notification is simply not stored.
    "push_notifications",
    // Settings (backward compatible).
    "page_slugs",
    // Support queries raised from inside an order (backward compatible — see
    // server/sql/add_query_order_link.sql).
    "order_id",
    "order_type",
    "source",
    // Desk-quoted taxi fares (backward compatible — see
    // server/sql/add_cab_quote_fields.sql).
    "booking_mode",
    "quoted_fare",
    "quoted_at",
    "quoted_by",
    "quote_status",
    // Which Razorpay charge paid for a booking (backward compatible — see
    // server/sql/add_booking_payment_reference.sql). Until that runs the columns
    // are stripped and the booking simply saves without its payment reference,
    // rather than the whole write failing.
    "razorpay_payment_id",
    "razorpay_order_id"
  ];
  let workingRows = rows.map((r) => ({ ...r }));
  const removed = new Set<string>();

  for (;;) {
    try {
      await supabaseUpsert(table, workingRows, onConflict);
      return;
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      const hit = optionalColumns.find((c) => msg.includes(c) && !removed.has(c));
      if (!hit) throw err;
      removed.add(hit);
      workingRows = workingRows.map((r) => {
        const copy = { ...r };
        delete (copy as any)[hit];
        return copy;
      });
    }
  }
}

function buildImageMeta(images: string[], titles: string[], descriptions: string[]) {
  const maxLen = Math.max(images.length, titles.length, descriptions.length);
  const out: Array<{ url: string; title: string; description: string }> = [];
  for (let i = 0; i < maxLen; i += 1) {
    const url = String(images[i] || "");
    const title = String(titles[i] || "");
    const description = String(descriptions[i] || "");
    if (url || title || description) out.push({ url, title, description });
  }
  return out;
}

function extractImageTitles(meta: any[], fallbackTitles: any[] = []) {
  if (Array.isArray(fallbackTitles) && fallbackTitles.length) return fallbackTitles.map((x) => String(x || ""));
  return (Array.isArray(meta) ? meta : []).map((m) => String(m?.title || ""));
}

function extractImageDescriptions(meta: any[], fallbackDescriptions: any[] = []) {
  if (Array.isArray(fallbackDescriptions) && fallbackDescriptions.length) return fallbackDescriptions.map((x) => String(x || ""));
  return (Array.isArray(meta) ? meta : []).map((m) => String(m?.description || ""));
}

function normalizeImagePayload(imagesRaw: any, titlesRaw: any, descriptionsRaw: any, metaRaw: any) {
  const images = Array.isArray(imagesRaw) ? imagesRaw : [];
  const titles = Array.isArray(titlesRaw) ? titlesRaw : [];
  const descriptions = Array.isArray(descriptionsRaw) ? descriptionsRaw : [];
  const meta = Array.isArray(metaRaw) ? metaRaw : [];

  const hasObjectImages = images.some((x) => x && typeof x === "object");
  if (hasObjectImages) {
    const normalizedMeta = images.map((x) => {
      const o = x && typeof x === "object" ? x : { url: x };
      return {
        url: String((o as any).url || (o as any).src || ""),
        title: String((o as any).title || ""),
        description: String((o as any).description || "")
      };
    }).filter((x) => x.url || x.title || x.description);
    return {
      images: normalizedMeta.map((x) => x.url).filter(Boolean),
      imageTitles: normalizedMeta.map((x) => x.title),
      imageDescriptions: normalizedMeta.map((x) => x.description),
      imageMeta: normalizedMeta
    };
  }

  const imageStrings = images.map((x) => String(x || "")).filter(Boolean);
  const metaFinal = meta.length ? meta : buildImageMeta(imageStrings, titles, descriptions);
  return {
    images: imageStrings,
    imageTitles: extractImageTitles(metaFinal, titles),
    imageDescriptions: extractImageDescriptions(metaFinal, descriptions),
    imageMeta: metaFinal
  };
}

function toIsoStringOrNow(v: any) {
  if (!v) return nowISO();
  return String(v);
}

function nullableText(v: any) {
  if (v === null || v === undefined || v === "") return undefined;
  return String(v);
}

function safeJsonParseObject(value: any) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || !(t.startsWith("{") || t.startsWith("["))) return null;
  try { return JSON.parse(t); } catch { return null; }
}

function normalizeTaxBreakup(raw: any, baseAmount: number, totalAmount: number) {
  const input = raw && typeof raw === "object" ? raw : (safeJsonParseObject(raw) || {});
  const gstRate = Number((input as any).gstRate ?? (input as any).gst_rate ?? (input as any).rate ?? 0) || 0;
  const taxableValue = Number((input as any).taxableValue ?? (input as any).taxable_value ?? baseAmount) || 0;
  const inferredGst = Math.max(0, Number(((input as any).gstAmount ?? (input as any).gst_amount) ?? (totalAmount - baseAmount)) || 0);
  const cgst = Number((input as any).cgst ?? 0) || 0;
  const sgst = Number((input as any).sgst ?? 0) || 0;
  const igst = Number((input as any).igst ?? 0) || 0;
  return {
    gstRate: Math.max(0, Math.min(1, gstRate)),
    taxableValue: Math.max(0, taxableValue),
    gstAmount: Math.max(0, inferredGst),
    cgst: Math.max(0, cgst),
    sgst: Math.max(0, sgst),
    igst: Math.max(0, igst)
  };
}

function normalizeFoodOrderItems(items: any, restaurantId: string) {
  const parsed = safeJsonParseObject(items);
  const list = Array.isArray(items) ? items : (Array.isArray(parsed) ? parsed : []);
  return list.map((it: any) => {
    const qty = it?.quantity ?? it?.qty ?? it?.count ?? it?.q ?? 1;
    return {
      menuItemId: nullableText(it?.menuItemId ?? it?.menu_item_id ?? it?.id) || undefined,
      restaurantId: nullableText(it?.restaurantId ?? it?.restaurant_id ?? restaurantId) || undefined,
      name: String(it?.name ?? it?.title ?? "").trim() || "Item",
      quantity: Math.max(1, Number(qty || 1)),
      price: Math.max(0, Number(it?.price ?? it?.amount ?? 0) || 0)
    };
  }).filter((x: any) => x.name && x.quantity > 0);
}

function normalizeFoodPricing(rawPricing: any, items: Array<{ quantity: number; price: number }>) {
  const p = rawPricing && typeof rawPricing === "object" ? rawPricing : (safeJsonParseObject(rawPricing) || {});
  const totalAmount = Number((p as any).totalAmount ?? (p as any).total_amount ?? (p as any).total ?? 0) || 0;
  const baseCandidate = Number((p as any).baseAmount ?? (p as any).base_amount ?? (p as any).subtotal ?? 0) || 0;
  const sumItems = items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.price || 0)), 0);
  const baseAmount = Math.max(0, baseCandidate || sumItems || totalAmount || 0);
  const tax = normalizeTaxBreakup((p as any).tax, baseAmount, totalAmount || baseAmount);
  const computedTotal = Math.max(0, totalAmount || (baseAmount + (tax.gstAmount || 0)));
  if (!tax.taxableValue) tax.taxableValue = baseAmount;
  return { baseAmount, tax, totalAmount: computedTotal };
}

function normalizeRestaurantKey(v: any) {
  return String(v || "").trim();
}

function normalizeVendorMenuPayload(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      return normalizeVendorMenuPayload(JSON.parse(v));
    } catch {
      return [];
    }
  }
  if (v && typeof v === "object") {
    const obj: any = v;
    if (Array.isArray(obj.menu)) return obj.menu;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.dishes)) return obj.dishes;
  }
  return [];
}

function normalizeStringList(value: any): string[] {
  if (Array.isArray(value)) return value.map((x) => String(x || "").trim()).filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith("[") || t.startsWith("{")) {
      const parsed = safeJsonParseObject(t);
      return normalizeStringList(parsed);
    }
    return t.split(",").map((x) => x.trim()).filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.values(value).map((x) => String(x || "").trim()).filter(Boolean);
  }
  return [];
}

function normalizeHotelRoomTypes(value: any, basePrice: number) {
  const arr = Array.isArray(value)
    ? value
    : (value && typeof value === "object" ? Object.values(value) : []);
  const mapped = arr.map((rt: any) => ({
    type: String(rt?.type || rt?.name || "Standard Room"),
    price: Math.max(0, Number(rt?.price ?? rt?.amount ?? basePrice ?? 0) || 0),
    capacity: Math.max(1, Number(rt?.capacity ?? rt?.guests ?? rt?.occupancy ?? 2) || 2)
  }));
  if (mapped.length > 0) return mapped;
  return [{
    type: "Standard Room",
    price: Math.max(0, Number(basePrice || 0)),
    capacity: 2
  }];
}

function normalizeSeasonalPricing(value: any) {
  if (Array.isArray(value)) return value;
  // Legacy templates often send `{}` for "no seasonal pricing".
  if (!value || (typeof value === "object" && Object.keys(value).length === 0)) return [];
  // Non-empty objects with unknown shape are ignored instead of crashing API.
  return [];
}

async function loadSupabaseDatabase(): Promise<Database> {
  const [
    settingsRows,
    policiesRows,
    paymentsRows,
    tours,
    festivals,
    hotels,
    foodVendors,
    legacyRestaurants,
    foodMenuItems,
    legacyMenuItems,
    bookings,
    cabBookings,
    busRoutes,
    busBookings,
    bikeRentals,
    bikeBookings,
    foodOrders,
    foodCarts,
    martCarts,
    queries,
    auditLog,
    cabProviders,
    cabRates,
    driverRegistrationRequests,
    drivers,
    driverVehicles,
    driverDocuments,
    driverAvailability,
    driverBids,
    rideAssignments,
    serviceAreas,
    coupons,
    foodVendorMenus,
    legacyVendorMenus,
    sitePagesRows,
    userProfilesRows,
    userBehaviorRows,
    analyticsEventRows
  ] = await Promise.all([
    supabaseSelect<any>("ev_settings", "id=eq.main&select=*"),
    supabaseSelect<any>("ev_policies", "id=eq.main&select=*"),
    supabaseSelect<any>("ev_payments", "id=eq.main&select=*"),
    supabaseSelectAll<any>("ev_tours"),
    supabaseSelectAll<any>("ev_festivals"),
    supabaseSelectAll<any>("ev_hotels"),
    supabaseSelectAllIfExists<any>(FOOD_VENDOR_TABLE),
    supabaseSelectAll<any>(LEGACY_FOOD_VENDOR_TABLE),
    supabaseSelectAllIfExists<any>(FOOD_MENU_ITEM_TABLE),
    supabaseSelectAll<any>(LEGACY_FOOD_MENU_ITEM_TABLE),
    supabaseSelectAll<any>("ev_bookings"),
    supabaseSelectAll<any>("ev_cab_bookings"),
    supabaseSelectAllIfExists<any>("ev_buses"),
    supabaseSelectAllIfExists<any>("ev_bus_bookings"),
    supabaseSelectAllIfExists<any>("ev_bike_rentals"),
    supabaseSelectAllIfExists<any>("ev_bike_bookings"),
    supabaseSelectAll<any>("ev_food_orders"),
    supabaseSelectAllIfExists<any>("ev_food_carts"),
    supabaseSelectAllIfExists<any>("ev_mart_carts"),
    supabaseSelectAll<any>("ev_queries"),
    supabaseSelectAll<any>("ev_audit_log"),
    supabaseSelectAllIfExists<any>("ev_cab_providers"),
    supabaseSelectAllIfExists<any>("ev_cab_rates"),
    supabaseSelectAllIfExists<any>("ev_driver_registration_requests"),
    supabaseSelectAllIfExists<any>("ev_drivers"),
    supabaseSelectAllIfExists<any>("ev_driver_vehicles"),
    supabaseSelectAllIfExists<any>("ev_driver_documents"),
    supabaseSelectAllIfExists<any>("ev_driver_availability"),
    supabaseSelectAllIfExists<any>("ev_cab_bids"),
    supabaseSelectAllIfExists<any>("ev_ride_assignments"),
    supabaseSelectAllIfExists<any>("ev_service_areas"),
    supabaseSelectAll<any>("ev_coupons", 1000, "code"),
    supabaseSelectAllIfExists<any>(FOOD_VENDOR_MENU_TABLE, 1000, "restaurant_id"),
    supabaseSelectAllIfExists<any>(LEGACY_FOOD_VENDOR_MENU_TABLE, 1000, "restaurant_id"),
    supabaseSelectAllIfExists<any>("ev_site_pages", 1000, "slug"),
    supabaseSelectAllIfExists<any>(supabaseUserProfileTable(), 1000, "id"),
    supabaseSelectAllIfExists<any>("ev_user_behavior_profiles", 1000, "id"),
    supabaseSelectAllIfExists<any>("ev_analytics_events", 1000, "at")
  ]);
  const restaurants = foodVendors.length ? foodVendors : legacyRestaurants;
  const menuItems = foodMenuItems.length ? foodMenuItems : legacyMenuItems;
  const vendorMenus = foodVendorMenus.length ? foodVendorMenus : legacyVendorMenus;

  const settings = settingsRows[0]
    ? {
        currency: settingsRows[0].currency || "INR",
        pageSlugs: {
          ...DEFAULT_SETTINGS.pageSlugs,
          ...((settingsRows[0].page_slugs && typeof settingsRows[0].page_slugs === "object") ? settingsRows[0].page_slugs : {})
        },
        taxRules: {
          ...DEFAULT_SETTINGS.taxRules,
          ...((settingsRows[0].tax_rules && typeof settingsRows[0].tax_rules === "object") ? settingsRows[0].tax_rules : {}),
          invoice: {
            ...(DEFAULT_SETTINGS.taxRules as any).invoice,
            ...(((settingsRows[0].tax_rules && typeof settingsRows[0].tax_rules === "object") ? (settingsRows[0].tax_rules as any).invoice : {}) || {})
          }
        },
        pricingTiers: settingsRows[0].pricing_tiers || []
      }
    : DEFAULT_SETTINGS;

  const policyRow = policiesRows[0] || {};
  const paymentsRow = paymentsRows[0] || {};

  const mergedPolicies = {
    hotel: {
      freeCancelHours: Number(policyRow?.hotel?.freeCancelHours ?? DEFAULT_POLICIES.hotel.freeCancelHours),
      feeAfter: Number(policyRow?.hotel?.feeAfter ?? DEFAULT_POLICIES.hotel.feeAfter)
    },
    tour: {
      freeCancelHours: Number(policyRow?.tour?.freeCancelHours ?? DEFAULT_POLICIES.tour.freeCancelHours),
      feeAfter: Number(policyRow?.tour?.feeAfter ?? DEFAULT_POLICIES.tour.feeAfter)
    },
    cab: {
      freeCancelMinutes: Number(policyRow?.cab?.freeCancelMinutes ?? DEFAULT_POLICIES.cab.freeCancelMinutes),
      feeAfter: Number(policyRow?.cab?.feeAfter ?? DEFAULT_POLICIES.cab.feeAfter)
    },
    food: {
      allowCancelMinutes: Number(policyRow?.food?.allowCancelMinutes ?? DEFAULT_POLICIES.food.allowCancelMinutes),
      feeAfter: Number(policyRow?.food?.feeAfter ?? DEFAULT_POLICIES.food.feeAfter)
    }
  };

  const mergedPayments = {
    walletEnabled: Boolean(paymentsRow?.wallet_enabled ?? DEFAULT_PAYMENTS.walletEnabled),
    refundMethod: String(paymentsRow?.refund_method || DEFAULT_PAYMENTS.refundMethod),
    refundWindowHours: Number(paymentsRow?.refund_window_hours ?? DEFAULT_PAYMENTS.refundWindowHours)
  };

  const vendorMenuByRestaurant = (vendorMenus || []).reduce((acc: Record<string, any[]>, x: any) => {
    const rid = normalizeRestaurantKey(x.restaurant_id);
    if (!rid) return acc;
    acc[rid] = normalizeVendorMenuPayload(x.menu);
    return acc;
  }, {});
  const vendorMenuImageByRestaurant = Object.entries(vendorMenuByRestaurant).reduce((acc, [rid, rows]) => {
    const byId = new Map<string, string>();
    const byKey = new Map<string, string>();
    (Array.isArray(rows) ? rows : []).forEach((row: any) => {
      const image = safeText(row?.image || row?.hero_image || "");
      if (!image) return;
      const id = safeText(row?.id || "");
      const key = normalizeMenuLookupKey(row?.name, row?.category);
      if (id && !byId.has(id)) byId.set(id, image);
      if (key && !byKey.has(key)) byKey.set(key, image);
    });
    acc[rid] = { byId, byKey };
    return acc;
  }, {} as Record<string, { byId: Map<string, string>; byKey: Map<string, string> }>);

  const menuByRestaurant = (menuItems || []).reduce((acc: Record<string, any[]>, m: any) => {
    const rid = normalizeRestaurantKey(m.restaurant_id);
    if (!rid) return acc;
    if (!acc[rid]) acc[rid] = [];
    acc[rid].push({
      id: String(m.id || ""),
      name: String(m.name || ""),
      category: String(m.category || "General"),
      description: String(m.description || ""),
      image: String(m.image || m.hero_image || ""),
      price: Number(m.price || 0),
      rating: 0,
      maxOrders: Number(m.max_per_order || 10),
      addons: Array.isArray(m.addons) ? m.addons : []
    });
    return acc;
  }, {});

  const sitePagesMap = (sitePagesRows || []).reduce((acc: Record<string, any>, row: any) => {
    const slug = String(row?.slug || "").trim();
    if (!slug) return acc;
    acc[slug] = {
      title: String(row?.title || slug),
      slug,
      content: String(row?.content || ""),
      updatedAt: nullableText(row?.updated_at)
    };
    return acc;
  }, {});

  const slugs = (settings as any)?.pageSlugs || DEFAULT_SETTINGS.pageSlugs;
  const pickPage = (key: keyof typeof DEFAULT_SITE_PAGES, fallback: any) => {
    const slug = String((slugs && (slugs as any)[key]) || fallback.slug || "");
    const hit = slug ? sitePagesMap[slug] : null;
    if (hit) return hit;
    return { ...fallback, slug };
  };

  const sitePages = {
    affiliateProgram: pickPage("affiliateProgram", DEFAULT_SITE_PAGES.affiliateProgram),
    contactUs: pickPage("contactUs", DEFAULT_SITE_PAGES.contactUs),
    privacyPolicy: pickPage("privacyPolicy", DEFAULT_SITE_PAGES.privacyPolicy),
    refundPolicy: pickPage("refundPolicy", DEFAULT_SITE_PAGES.refundPolicy),
    termsAndConditions: pickPage("termsAndConditions", DEFAULT_SITE_PAGES.termsAndConditions)
  };

  const dbCandidate = {
    settings,
    tours: tours.map((x: any) => ({
      id: x.id,
      title: x.title,
      description: x.description,
      price: Number(x.price || 0),
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      duration: x.duration,
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      highlights: x.highlights || [],
      itinerary: x.itinerary || "",
      mapEmbedUrl: String(x.map_embed_url || ""),
      faqs: x.faqs || [],
      itineraryItems: x.itinerary_items || [],
      facts: x.facts || [],
      contentBlocks: x.content_blocks || {},
      i18n: x.i18n || {},
      inclusions: x.inclusions || [],
      exclusions: x.exclusions || [],
      maxGuests: Number(x.max_guests || 1),
      availability: x.availability || { closedDates: [], capacityByDate: {} },
      available: x.available !== false,
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: nullableText(x.updated_at)
    })),
    festivals: festivals.map((x: any) => ({
      id: x.id,
      title: x.title,
      description: x.description || "",
      location: x.location || "",
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      month: x.month || "All Season",
      date: nullableText(x.date),
      vibe: x.vibe || "",
      ticket: x.ticket || "On request",
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      highlights: x.highlights || [],
      available: x.available !== false,
      createdAt: nullableText(x.created_at),
      updatedAt: nullableText(x.updated_at)
    })),
    hotels: hotels.map((x: any) => ({
      id: x.id,
      name: x.name,
      description: x.description,
      location: x.location,
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      pricePerNight: Number(x.price_per_night || 0),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      amenities: normalizeStringList(x.amenities),
      privateSpaces: normalizeStringList(x.private_spaces),
      sharedSpaces: x.shared_spaces ?? [],
      roomAmenities: normalizeStringList(x.room_amenities),
      popularWithGuests: normalizeStringList(x.popular_with_guests),
      roomFeatures: normalizeStringList(x.room_features),
      basicFacilities: normalizeStringList(x.basic_facilities),
      bedsAndBlanket: normalizeStringList(x.beds_and_blanket),
      foodAndDrinks: normalizeStringList(x.food_and_drinks),
      safetyAndSecurity: normalizeStringList(x.safety_and_security),
      mediaAndEntertainment: normalizeStringList(x.media_and_entertainment),
      bathroom: normalizeStringList(x.bathroom),
      otherFacilities: normalizeStringList(x.other_facilities),
      inclusion: x.inclusion ?? [],
      exclusion: x.exclusion ?? [],
      roomTypes: normalizeHotelRoomTypes(x.room_types, Number(x.price_per_night || 0)),
      rating: Number(x.rating || 0),
      reviews: Number(x.reviews || 0),
      checkInTime: x.check_in_time || "14:00",
      checkOutTime: x.check_out_time || "11:00",
      availability: x.availability || { closedDates: [], roomsByType: {} },
      seasonalPricing: normalizeSeasonalPricing(x.seasonal_pricing),
      dateOverrides: x.date_overrides || {},
      minNights: Number(x.min_nights || 1),
      maxNights: Number(x.max_nights || 30),
      childPolicy: x.child_policy || "",
      available: x.available !== false,
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    restaurants: restaurants.map((x: any) => ({
      id: x.id,
      name: x.name,
      description: x.description,
      gstin: String(x.gstin || x.gst_number || x.gstNumber || x.gst_no || ""),
      username: String(x.username || ""),
      passwordHash: String(x.password_hash || ""),
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      cuisine: x.cuisine || [],
      rating: Number(x.rating || 0),
      reviewCount: Number(x.review_count || 0),
      deliveryTime: x.delivery_time || "",
      minimumOrder: Number(x.minimum_order || 0),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      images: x.images || [],
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(x.images || [], x.image_titles || [], x.image_descriptions || []),
      available: x.available !== false,
      isVeg: !!x.is_veg,
      tags: x.tags || [],
      location: x.location || "",
      serviceRadiusKm: Number(x.service_radius_km || 0),
      deliveryZones: x.delivery_zones || [],
      openHours: x.open_hours || "09:00",
      closingHours: x.closing_hours || "22:00",
      menu: (() => {
        const rid = normalizeRestaurantKey(x.id);
        const directVendorMenu = normalizeVendorMenuPayload(vendorMenuByRestaurant[rid]);
        const tableMenu = normalizeVendorMenuPayload(x.menu);
        const fallbackMenu = normalizeVendorMenuPayload(menuByRestaurant[rid] || []);
        const chosen = directVendorMenu.length ? directVendorMenu : (tableMenu.length ? tableMenu : fallbackMenu);
        return chosen.map((m: any, i: number) => ({
        id: String(m?.id || `${x.id}_menu_${i + 1}`),
        name: String(m?.name || ""),
        category: String(m?.category || "General"),
        description: String(m?.description || ""),
        image: String(m?.image || ""),
        price: Number(m?.price || 0),
        rating: Number(m?.rating || 0),
        maxOrders: Number(m?.maxOrders || 10),
        addons: Array.isArray(m?.addons) ? m.addons : []
        }));
      })()
    })),
    menuItems: menuItems.map((x: any) => {
      const restaurantId = normalizeRestaurantKey(x.restaurant_id);
      const imageFallbacks = vendorMenuImageByRestaurant[restaurantId] || { byId: new Map<string, string>(), byKey: new Map<string, string>() };
      const fallbackImage =
        imageFallbacks.byId.get(safeText(x.id || "")) ||
        imageFallbacks.byKey.get(normalizeMenuLookupKey(x.name, x.category)) ||
        "";
      const resolvedImage = nullableText(x.image || x.hero_image || fallbackImage);
      return ({
      id: x.id,
      restaurantId: x.restaurant_id,
      category: x.category,
      name: x.name,
      description: x.description || "",
      price: Number(x.price || 0),
      mrp: Math.max(0, Number(x.mrp || 0) || 0),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: nullableText(x.hero_image || x.image || fallbackImage),
      image: resolvedImage,
      imageTitles: extractImageTitles(x.image_meta || [], x.image_titles || []),
      imageDescriptions: extractImageDescriptions(x.image_meta || [], x.image_descriptions || []),
      imageMeta: (x.image_meta && x.image_meta.length)
        ? x.image_meta
        : buildImageMeta(resolvedImage ? [resolvedImage] : [], x.image_titles || [], x.image_descriptions || []),
      available: x.available !== false,
      isVeg: !!x.is_veg,
      tags: x.tags || [],
      stock: Number(x.stock || 0),
      maxPerOrder: Number(x.max_per_order || 10),
      addons: x.addons || [],
      variants: x.variants || []
    })}),
    bookings: bookings.map((x: any) => ({
      id: x.id,
      type: x.type,
      itemId: x.item_id,
      userName: x.user_name,
      email: x.email,
      phone: x.phone,
      aadhaarUrl: nullableText(x.aadhaar_url) || "",
      countryCode: nullableText(x.country_code) || "",
      paidAmount: x.paid_amount === undefined || x.paid_amount === null ? undefined : Number(x.paid_amount),
      razorpayPaymentId: nullableText(x.razorpay_payment_id) || "",
      razorpayOrderId: nullableText(x.razorpay_order_id) || "",
      guests: Number(x.guests || 1),
      checkIn: nullableText(x.check_in),
      checkOut: nullableText(x.check_out),
      roomType: nullableText(x.room_type),
      numRooms: Number(x.num_rooms || 1),
      tourDate: nullableText(x.tour_date),
      specialRequests: x.special_requests || "",
      pricing: x.pricing || {},
      status: x.status || "pending",
      bookingDate: toIsoStringOrNow(x.booking_date)
    })),
    cabBookings: cabBookings.map((x: any) => ({
      id: x.id,
      userName: x.user_name,
      email: String(x.email || ""),
      phone: x.phone,
      pickupLocation: x.pickup_location,
      dropLocation: x.drop_location,
      datetime: x.datetime,
      passengers: Number(x.passengers || 1),
      vehicleType: x.vehicle_type,
      estimatedFare: Number(x.estimated_fare || 0),
      // Absent until add_cab_quote_fields.sql has been applied.
      bookingMode: String(x.booking_mode || "") === "quotes" ? "quotes" : "union",
      quotedFare: Number(x.quoted_fare || 0),
      quotedAt: nullableText(x.quoted_at) || "",
      quotedBy: String(x.quoted_by || ""),
      // "cancelled" belongs here too: cancelling a ride closes any open quote,
      // and without it the state would read back as "" and lose the reason the
      // quote is no longer acceptable.
      quoteStatus: ["quoted", "accepted", "declined", "cancelled"].includes(String(x.quote_status || ""))
        ? String(x.quote_status)
        : "",
      serviceAreaId: nullableText(x.service_area_id),
      selectedBidId: String(x.selected_bid_id || ""),
      assignedDriverId: String(x.assigned_driver_id || ""),
      paymentStatus: String(x.payment_status || ""),
      paymentRequired: x.payment_required === true,
      paymentDueAmount: Number(x.payment_due_amount || 0),
      paymentBidId: String(x.payment_bid_id || ""),
      paymentOrderId: String(x.payment_order_id || ""),
      paymentOrderAmount: Number(x.payment_order_amount || 0),
      paymentCurrency: String(x.payment_currency || ""),
      paymentPaidAt: nullableText(x.payment_paid_at),
      paymentId: String(x.payment_id || ""),
      paymentSignature: String(x.payment_signature || ""),
      rideOtp: String(x.ride_otp || ""),
      rideOtpIssuedAt: nullableText(x.ride_otp_issued_at),
      rideOtpStatus: ["pending", "verified", "not_required"].includes(String(x.ride_otp_status || "").trim().toLowerCase())
        ? String(x.ride_otp_status || "").trim().toLowerCase()
        : "not_required",
      rideOtpVerifiedAt: nullableText(x.ride_otp_verified_at),
      rideOtpVerifiedBy: String(x.ride_otp_verified_by || ""),
      pickupUpdatedAt: nullableText(x.pickup_updated_at),
      pickupUpdatedBy: String(x.pickup_updated_by || ""),
      fineAmount: Number(x.fine_amount || 0),
      fineStatus: String(x.fine_status || "none"),
      fineReason: String(x.fine_reason || ""),
      noShowReportedBy: String(x.no_show_reported_by || ""),
      noShowReportedAt: nullableText(x.no_show_reported_at),
      pricing: x.pricing || {},
      status: x.status || "pending",
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: nullableText(x.updated_at)
    })),
    busRoutes: busRoutes.map((x: any) => ({
      id: String(x.id || ""),
      operatorName: String(x.operator_name || ""),
      operatorCode: String(x.operator_code || ""),
      fromCity: String(x.from_city || ""),
      fromCode: String(x.from_code || ""),
      toCity: String(x.to_city || ""),
      toCode: String(x.to_code || ""),
      departureTime: String(x.departure_time || ""),
      arrivalTime: String(x.arrival_time || ""),
      durationText: String(x.duration_text || ""),
      busType: String(x.bus_type || "Non AC"),
      fare: Number(x.fare || 0),
      totalSeats: Number(x.total_seats || 20),
      seatLayout: Array.isArray(x.seat_layout) ? x.seat_layout : [],
      serviceDates: Array.isArray(x.service_dates) ? x.service_dates : [],
      seatsBookedByDate: (x.seats_booked_by_date && typeof x.seats_booked_by_date === "object") ? x.seats_booked_by_date : {},
      heroImage: String(x.hero_image || ""),
      active: x.active !== false,
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    busBookings: busBookings.map((x: any) => ({
      id: String(x.id || ""),
      routeId: String(x.route_id || ""),
      userName: String(x.user_name || ""),
      email: String(x.email || ""),
      phone: String(x.phone || ""),
      fromCity: String(x.from_city || ""),
      toCity: String(x.to_city || ""),
      travelDate: String(x.travel_date || ""),
      seats: Array.isArray(x.seats) ? x.seats.map((s: any) => String(s || "")) : [],
      farePerSeat: Number(x.fare_per_seat || 0),
      totalFare: Number(x.total_fare || 0),
      status: String(x.status || "pending"),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    bikeRentals: bikeRentals.map((x: any) => ({
      id: String(x.id || ""),
      name: String(x.name || ""),
      location: String(x.location || ""),
      bikeType: String(x.bike_type || "Scooter"),
      pricePerHour: Number(x.price_per_hour || 0),
      pricePerDay: Number(x.price_per_day || 0),
      availableQty: Number(x.available_qty || 0),
      securityDeposit: Number(x.security_deposit || 0),
      helmetIncluded: x.helmet_included !== false,
      vendorMobile: String(x.vendor_mobile || ""),
      image: String(x.image || ""),
      active: x.active !== false,
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    bikeBookings: bikeBookings.map((x: any) => ({
      id: String(x.id || ""),
      bikeRentalId: String(x.bike_rental_id || ""),
      userName: String(x.user_name || ""),
      email: String(x.email || ""),
      phone: String(x.phone || ""),
      startDateTime: String(x.start_datetime || ""),
      hours: Number(x.hours || 1),
      qty: Number(x.qty || 1),
      totalFare: Number(x.total_fare || 0),
      status: String(x.status || "pending"),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    foodOrders: foodOrders.map((x: any) => ({
      id: x.id,
      userId: String(x.user_id || ""),
      restaurantId: String(x.restaurant_id || ""),
      userName: x.user_name,
      email: String(x.email || ""),
      phone: x.phone,
      items: (() => {
        const rid = String(x.restaurant_id || "");
        return normalizeFoodOrderItems(x.items, rid);
      })(),
      deliveryAddress: x.delivery_address,
      deliveryPincode: String(x.delivery_pincode || ""),
      deliveryAddressId: String(x.delivery_address_id || ""),
      deliveryRegion: String(x.delivery_region || ""),
      specialInstructions: x.special_instructions || "",
      pricing: (() => {
        const rid = String(x.restaurant_id || "");
        const itemsNorm = normalizeFoodOrderItems(x.items, rid);
        return normalizeFoodPricing(x.pricing || {}, itemsNorm);
      })(),
      status: x.status || "pending",
      orderTime: toIsoStringOrNow(x.order_time)
    })),
    queries: queries.map((x: any) => ({
      id: x.id,
      userName: x.user_name,
      email: x.email,
      phone: x.phone,
      subject: x.subject,
      message: x.message,
      // Absent until add_query_order_link.sql has been applied; older rows are
      // general enquiries, which is what these defaults describe.
      orderId: x.order_id || "",
      orderType: x.order_type || "",
      source: x.source || "contact_page",
      status: x.status || "pending",
      submittedAt: toIsoStringOrNow(x.submitted_at),
      respondedAt: x.responded_at || null,
      response: x.response || null
    })),
    auditLog: auditLog.map((x: any) => ({
      id: x.id,
      at: toIsoStringOrNow(x.at),
      adminChatId: x.admin_chat_id ?? undefined,
      action: x.action,
      entity: nullableText(x.entity),
      entityId: nullableText(x.entity_id),
      meta: x.meta || {}
    })),
    cabProviders: cabProviders.map((x: any) => ({
      id: x.id,
      name: x.name,
      vehicleType: x.vehicle_type,
      plateNumber: x.plate_number,
      capacity: Number(x.capacity || 1),
      vendorMobile: String(x.vendor_mobile || ""),
      additionalComments: String(x.additional_comments || ""),
      priceDropped: x.price_dropped === true,
      priceDropPercent: Number(x.price_drop_percent || 0),
      heroImage: x.hero_image || "",
      active: x.active !== false,
      serviceAreaId: nullableText(x.service_area_id)
    })),
    cabRates: cabRates.map((x: any) => ({
      id: nullableText(x.id),
      origin: String(x.origin || ""),
      destination: String(x.destination || ""),
      routeLabel: String(x.route_label || ""),
      ordinary4_1: x.ordinary_4_1 === null || x.ordinary_4_1 === undefined ? undefined : Number(x.ordinary_4_1),
      luxury4_1: x.luxury_4_1 === null || x.luxury_4_1 === undefined ? undefined : Number(x.luxury_4_1),
      ordinary6_1: x.ordinary_6_1 === null || x.ordinary_6_1 === undefined ? undefined : Number(x.ordinary_6_1),
      luxury6_1: x.luxury_6_1 === null || x.luxury_6_1 === undefined ? undefined : Number(x.luxury_6_1),
      traveller: x.traveller === null || x.traveller === undefined ? undefined : Number(x.traveller)
    })),
    driverRegistrationRequests: driverRegistrationRequests.map((x: any) => ({
      id: String(x.id || ""),
      name: String(x.name || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      vehicleType: String(x.vehicle_type || ""),
      vehicleNumber: String(x.vehicle_number || ""),
      licenseNumber: String(x.license_number || ""),
      idProofUrl: String(x.id_proof_url || ""),
      notes: String(x.notes || ""),
      status: String(x.status || "pending"),
      reviewedBy: String(x.reviewed_by || ""),
      reviewedAt: x.reviewed_at ? toIsoStringOrNow(x.reviewed_at) : "",
      rejectionReason: String(x.rejection_reason || ""),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    drivers: drivers.map((x: any) => ({
      id: String(x.id || ""),
      registrationRequestId: String(x.registration_request_id || ""),
      name: String(x.name || ""),
      username: String(x.username || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      passwordHash: String(x.password_hash || ""),
      status: String(x.status || "pending"),
      rating: Number(x.rating || 4.5),
      active: x.active !== false,
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    driverVehicles: driverVehicles.map((x: any) => ({
      id: String(x.id || ""),
      driverId: String(x.driver_id || ""),
      vehicleType: String(x.viechle_cat || x.vehicle_type || ""),
      viechle_cat: String(x.viechle_cat || x.vehicle_type || ""),
      vehicleNumber: String(x.vehicle_number || ""),
      color: String(x.color || ""),
      model: String(x.model || ""),
      seats: Number(x.seats || 4),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    driverDocuments: driverDocuments.map((x: any) => ({
      id: String(x.id || ""),
      driverId: String(x.driver_id || ""),
      registrationRequestId: String(x.registration_request_id || ""),
      kind: String(x.kind || "other"),
      url: String(x.url || ""),
      label: String(x.label || ""),
      createdAt: toIsoStringOrNow(x.created_at)
    })),
    driverAvailability: driverAvailability.map((x: any) => ({
      id: String(x.id || ""),
      driverId: String(x.driver_id || ""),
      online: x.online === true,
      lat: x.lat === null || x.lat === undefined ? undefined : Number(x.lat),
      lng: x.lng === null || x.lng === undefined ? undefined : Number(x.lng),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    driverBids: driverBids.map((x: any) => ({
      id: String(x.id || ""),
      rideRequestId: String(x.ride_request_id || ""),
      driverId: String(x.driver_id || ""),
      bidPrice: Number(x.bid_price || 0),
      etaMin: Number(x.eta_min || 0),
      status: String(x.status || "active"),
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    rideAssignments: rideAssignments.map((x: any) => ({
      id: String(x.id || ""),
      rideRequestId: String(x.ride_request_id || ""),
      driverId: String(x.driver_id || ""),
      bidId: String(x.bid_id || ""),
      status: String(x.status || "assigned"),
      assignedAt: toIsoStringOrNow(x.assigned_at),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    serviceAreas: serviceAreas.map((x: any) => ({
      id: x.id,
      name: x.name,
      city: x.city,
      enabled: x.enabled !== false
    })),
    coupons: coupons.map((x: any) => ({
      code: x.code,
      type: x.type,
      amount: Number(x.amount || 0),
      minCart: Number(x.min_cart || 0),
      category: x.category || "all",
      expiry: x.expiry,
      maxUses: x.max_uses ?? undefined
    })),
    userProfiles: userProfilesRows.map((x: any) => ({
      id: String(x.id || ""),
      phone: String(x.phone || ""),
      name: String(x.name || ""),
      email: String(x.email || ""),
      address: String(x.address || ""),
      city: String(x.city || ""),
      state: String(x.state || ""),
      pincode: String(x.pincode || ""),
      landmark: String(x.landmark || ""),
      defaultAddressId: String(x.default_address_id || ""),
      ipAddress: String(x.ip_address || ""),
      browser: String(x.browser || ""),
      password: String(x.password || ""),
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at),
      orders: Array.isArray(x.orders) ? x.orders : [],
      // The counterpart of the write mapping: without this a stored
      // notification would be read back as absent and the next profile write
      // would erase it.
      pushNotifications: Array.isArray(x.push_notifications) ? x.push_notifications : []
    })),
    userBehaviorProfiles: userBehaviorRows.map((x: any) => ({
      id: String(x.id || ""),
      userId: String(x.user_id || ""),
      phone: String(x.phone || ""),
      name: String(x.name || ""),
      email: String(x.email || ""),
      coreIdentity: x.core_identity || {},
      deviceFingerprinting: x.device_fingerprinting || {},
      locationMobility: x.location_mobility || {},
      behavioralAnalytics: x.behavioral_analytics || {},
      transactionPayment: x.transaction_payment || {},
      preferencePersonalization: x.preference_personalization || {},
      ratingsReviewsFeedback: x.ratings_reviews_feedback || {},
      marketingAttribution: x.marketing_attribution || {},
      trustSafetyFraud: x.trust_safety_fraud || {},
      derivedInferred: x.derived_inferred || {},
      orders: Array.isArray(x.orders) ? x.orders : [],
      createdAt: toIsoStringOrNow(x.created_at),
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    carts: (foodCarts || []).map((x: any) => ({
      id: String(x.id || ""),
      userId: String(x.user_id || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      restaurantId: String(x.restaurant_id || ""),
      items: Array.isArray(x.items) ? x.items : [],
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    martCarts: (martCarts || []).map((x: any) => ({
      id: String(x.id || ""),
      userId: String(x.user_id || ""),
      userName: String(x.user_name || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      deliveryAddress: String(x.delivery_address || ""),
      items: Array.isArray(x.items) ? x.items : [],
      updatedAt: toIsoStringOrNow(x.updated_at)
    })),
    analyticsEvents: analyticsEventRows.map((x: any) => ({
      id: String(x.id || ""),
      type: String(x.type || ""),
      category: String(x.category || ""),
      userId: String(x.user_id || ""),
      phone: String(x.phone || ""),
      email: String(x.email || ""),
      at: toIsoStringOrNow(x.at),
      meta: x.meta || {}
    })),
    policies: mergedPolicies,
    payments: mergedPayments,
    sitePages
  };

  syncUserProfilesFromOrders(dbCandidate as any);
  syncUserBehaviorProfilesFromData(dbCandidate as any);
  return DatabaseSchema.parse(dbCandidate);
}

async function writeSupabaseDatabase(db: Database) {
  // Drop the read cache up front, not after. If a write fails part way the
  // database no longer matches what was cached, so the cached copy must not
  // survive either outcome.
  invalidateDatabaseCache();
  await supabaseUpsertWithOptionalPriceFields("ev_settings", [{
    id: "main",
    currency: db.settings.currency,
    page_slugs: (db.settings as any).pageSlugs || DEFAULT_SETTINGS.pageSlugs,
    tax_rules: db.settings.taxRules || {},
    pricing_tiers: db.settings.pricingTiers || []
  }]);

  await supabaseUpsert("ev_policies", [{
    id: "main",
    hotel: db.policies?.hotel || {},
    tour: db.policies?.tour || {},
    cab: db.policies?.cab || {},
    food: db.policies?.food || {}
  }]);

  await supabaseUpsert("ev_payments", [{
    id: "main",
    wallet_enabled: !!db.payments?.walletEnabled,
    refund_method: db.payments?.refundMethod || "original",
    refund_window_hours: Number(db.payments?.refundWindowHours || 72)
  }]);

  // Safety: never perform blanket deletes during sync. We only upsert rows.

  if (db.tours.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_tours", db.tours.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload((x as any).images, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, title: x.title, description: x.description, price: x.price, vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", duration: x.duration, images: n.images, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta
        };
      })(),
      highlights: x.highlights || [], itinerary: x.itinerary || "", inclusions: x.inclusions || [], exclusions: x.exclusions || [],
      map_embed_url: String((x as any).mapEmbedUrl || ""),
      faqs: (x as any).faqs || [],
      itinerary_items: (x as any).itineraryItems || [],
      facts: (x as any).facts || [],
      content_blocks: (x as any).contentBlocks || {},
      i18n: (x as any).i18n || {},
      max_guests: x.maxGuests, availability: x.availability || {}, available: x.available !== false,
      created_at: x.createdAt || null, updated_at: x.updatedAt || null
    })));
  }
  if (db.festivals.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_festivals", db.festivals.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload((x as any).images, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, title: x.title, description: x.description || "", location: x.location || "", vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", month: x.month || "All Season", images: n.images, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta
        };
      })(),
      date: x.date || null, vibe: x.vibe || "", ticket: String(x.ticket ?? "On request"), highlights: x.highlights || [],
      available: x.available !== false, created_at: x.createdAt || null, updated_at: x.updatedAt || null
    })));
  }
  if (db.hotels.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_hotels", db.hotels.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload((x as any).images, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, name: x.name, description: x.description, location: x.location, vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", price_per_night: x.pricePerNight, price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", images: n.images, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta
        };
      })(),
      amenities: x.amenities || [], room_types: x.roomTypes || [], rating: x.rating || 0, reviews: x.reviews || 0,
      private_spaces: (x as any).privateSpaces || [],
      shared_spaces: (x as any).sharedSpaces || [],
      room_amenities: (x as any).roomAmenities || [],
      popular_with_guests: (x as any).popularWithGuests || [],
      room_features: (x as any).roomFeatures || [],
      basic_facilities: (x as any).basicFacilities || [],
      beds_and_blanket: (x as any).bedsAndBlanket || [],
      food_and_drinks: (x as any).foodAndDrinks || [],
      safety_and_security: (x as any).safetyAndSecurity || [],
      media_and_entertainment: (x as any).mediaAndEntertainment || [],
      bathroom: (x as any).bathroom || [],
      other_facilities: (x as any).otherFacilities || [],
      inclusion: (x as any).inclusion || [],
      exclusion: (x as any).exclusion || [],
      check_in_time: x.checkInTime || "14:00", check_out_time: x.checkOutTime || "11:00", availability: x.availability || {},
      seasonal_pricing: x.seasonalPricing || [], date_overrides: x.dateOverrides || {}, min_nights: x.minNights || 1,
      max_nights: x.maxNights || 30, child_policy: x.childPolicy || "", available: x.available !== false, created_at: x.createdAt || null
    })));
  }
  if (db.restaurants.length) {
    const vendorRows = db.restaurants.map((x) => ({
      ...(() => {
        const n = normalizeImagePayload((x as any).images, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, name: x.name, description: x.description, username: (x as any).username || "", password_hash: (x as any).passwordHash || "", vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", cuisine: x.cuisine || [], rating: x.rating || 0, review_count: x.reviewCount || 0,
          delivery_time: x.deliveryTime || "", minimum_order: x.minimumOrder || 0, price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", images: n.images, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta, available: x.available !== false
        };
      })(),
      is_veg: !!x.isVeg, tags: x.tags || [], location: x.location || "", service_radius_km: x.serviceRadiusKm || 0,
      delivery_zones: x.deliveryZones || [], open_hours: x.openHours || "09:00", closing_hours: x.closingHours || "22:00",
      menu: (x as any).menu || []
    }));
    try {
      await supabaseUpsertWithOptionalPriceFields(FOOD_VENDOR_TABLE, vendorRows);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      await supabaseUpsertWithOptionalPriceFields(LEGACY_FOOD_VENDOR_TABLE, vendorRows);
    }
  }
  if (db.restaurants.length) {
    try {
      await supabaseUpsert(FOOD_VENDOR_MENU_TABLE, db.restaurants.map((x) => ({
        restaurant_id: x.id,
        menu: (x as any).menu || [],
        updated_at: nowISO()
      })), "restaurant_id");
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      try {
        await supabaseUpsert(LEGACY_FOOD_VENDOR_MENU_TABLE, db.restaurants.map((x) => ({
          restaurant_id: x.id,
          menu: (x as any).menu || [],
          updated_at: nowISO()
        })), "restaurant_id");
      } catch (legacyErr) {
        if (!isMissingTableError(legacyErr)) throw legacyErr;
      }
    }
  }
  const existingMenuById = new Map((db.menuItems || []).map((mi: any) => [String(mi.id || ""), mi]));
  const existingMenuByRestaurantAndName = new Map(
    (db.menuItems || []).map((mi: any) => [`${String(mi.restaurantId || "").trim()}::${String(mi.name || "").trim().toLowerCase()}`, mi])
  );
  const menuItemsFromVendors = (db.restaurants || []).flatMap((r: any) => {
    const items = Array.isArray(r?.menu) ? r.menu : [];
    return items.map((m: any, idx: number) => {
      const id = String(m?.id || `${r.id}_menu_${idx + 1}`);
      const nameKey = `${String(r.id || "").trim()}::${String(m?.name || "").trim().toLowerCase()}`;
      const existing = existingMenuById.get(id) || existingMenuByRestaurantAndName.get(nameKey);
      return {
      id,
      restaurantId: r.id,
      category: String(m?.category || "General"),
      name: String(m?.name || ""),
      description: String(m?.description || ""),
      price: Number(m?.price || 0),
      // The MRP is what the customer is charged, so a menu blob that carries
      // none must not persist a 0 - the app would then quote the vendor price.
      mrp: resolveStoredMenuMrp(m?.mrp ?? existing?.mrp, m?.price),
      heroImage: String(m?.image || ""),
      image: String(m?.image || ""),
      available: existing ? existing.available !== false : true,
      isVeg: existing ? !!existing.isVeg : false,
      tags: Array.isArray(existing?.tags) ? existing.tags : [],
      stock: (() => {
        const incoming = Number((m as any)?.stock);
        if (Number.isFinite(incoming) && incoming >= 0) return Math.floor(incoming);
        if (existing && Number.isFinite(Number(existing.stock))) return Math.max(0, Number(existing.stock));
        return 9999;
      })(),
      maxPerOrder: Number(m?.maxOrders || Number(existing?.maxPerOrder || 10)),
      addons: Array.isArray(m?.addons) ? m.addons.map((a: any) => ({ name: String(a?.name || ""), price: Number(a?.price || 0) })) : [],
      variants: [],
      priceDropped: false,
      priceDropPercent: 0,
      imageTitles: [],
      imageDescriptions: [],
      imageMeta: []
    };});
  });

  const menuItemsToPersist = menuItemsFromVendors.length ? menuItemsFromVendors : db.menuItems;
  if (menuItemsToPersist.length) {
    const normalizedMenuItems = normalizeMenuItemRowsForSupabase(menuItemsToPersist.map((x) => ({
      ...(() => {
        const rawImages = Array.isArray((x as any).images) && (x as any).images.length
          ? (x as any).images
          : ((x as any).image ? [(x as any).image] : []);
        const n = normalizeImagePayload(rawImages, (x as any).imageTitles, (x as any).imageDescriptions, (x as any).imageMeta);
        return {
          id: x.id, restaurant_id: x.restaurantId, category: x.category, name: x.name, description: x.description || "",
          price: x.price, mrp: resolveStoredMenuMrp((x as any).mrp, x.price), price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", image: x.image || n.images[0] || null, image_titles: n.imageTitles, image_descriptions: n.imageDescriptions, image_meta: n.imageMeta, available: x.available !== false, is_veg: !!x.isVeg, tags: x.tags || [], stock: x.stock || 0
        };
      })(),
      max_per_order: x.maxPerOrder || 10, addons: x.addons || [], variants: x.variants || []
    })));
    try {
      await supabaseUpsertWithOptionalPriceFields(FOOD_MENU_ITEM_TABLE, normalizedMenuItems);
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
      await supabaseUpsertWithOptionalPriceFields(LEGACY_FOOD_MENU_ITEM_TABLE, normalizedMenuItems);
    }
  }
  if (db.bookings.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_bookings", db.bookings.map((x) => ({
      id: x.id, type: x.type, item_id: x.itemId, user_name: x.userName, email: x.email, phone: x.phone, guests: x.guests,
      check_in: x.checkIn || null, check_out: x.checkOut || null, room_type: x.roomType || null, num_rooms: x.numRooms || 1,
      tour_date: x.tourDate || null, special_requests: x.specialRequests || "", pricing: x.pricing || {}, status: x.status || "pending",
      booking_date: x.bookingDate || null, aadhaar_url: (x as any).aadhaarUrl || "",
      country_code: String((x as any).countryCode || ""),
      paid_amount: (x as any).paidAmount === undefined ? null : Number((x as any).paidAmount),
      razorpay_payment_id: String((x as any).razorpayPaymentId || ""),
      razorpay_order_id: String((x as any).razorpayOrderId || "")
    })));
  }
  if (db.cabBookings.length) {
    // Optional-column upsert: the quote columns only exist once
    // add_cab_quote_fields.sql has been applied.
    await supabaseUpsertWithOptionalPriceFields("ev_cab_bookings", db.cabBookings.map((x) => ({
      id: x.id, user_name: x.userName, email: String((x as any).email || ""), phone: x.phone, pickup_location: x.pickupLocation, drop_location: x.dropLocation,
      datetime: x.datetime, passengers: x.passengers, vehicle_type: x.vehicleType, estimated_fare: x.estimatedFare,
      booking_mode: String((x as any).bookingMode || "union"),
      quoted_fare: Number((x as any).quotedFare || 0),
      quoted_at: nullableText((x as any).quotedAt) || null,
      quoted_by: String((x as any).quotedBy || ""),
      quote_status: String((x as any).quoteStatus || ""),
      service_area_id: x.serviceAreaId || null,
      selected_bid_id: String((x as any).selectedBidId || ""),
      assigned_driver_id: String((x as any).assignedDriverId || ""),
      payment_status: String((x as any).paymentStatus || ""),
      payment_required: (x as any).paymentRequired === true,
      payment_due_amount: Number((x as any).paymentDueAmount || 0),
      payment_bid_id: String((x as any).paymentBidId || ""),
      payment_order_id: String((x as any).paymentOrderId || ""),
      payment_order_amount: Number((x as any).paymentOrderAmount || 0),
      payment_currency: String((x as any).paymentCurrency || ""),
      payment_paid_at: nullableText((x as any).paymentPaidAt) || null,
      payment_id: String((x as any).paymentId || ""),
      payment_signature: String((x as any).paymentSignature || ""),
      ride_otp: String((x as any).rideOtp || ""),
      ride_otp_issued_at: nullableText((x as any).rideOtpIssuedAt) || null,
      ride_otp_status: ["pending", "verified", "not_required"].includes(String((x as any).rideOtpStatus || "").trim().toLowerCase())
        ? String((x as any).rideOtpStatus || "").trim().toLowerCase()
        : "not_required",
      ride_otp_verified_at: nullableText((x as any).rideOtpVerifiedAt) || null,
      ride_otp_verified_by: String((x as any).rideOtpVerifiedBy || ""),
      pickup_updated_at: nullableText((x as any).pickupUpdatedAt) || null,
      pickup_updated_by: String((x as any).pickupUpdatedBy || ""),
      fine_amount: Number((x as any).fineAmount || 0),
      fine_status: String((x as any).fineStatus || "none"),
      fine_reason: String((x as any).fineReason || ""),
      no_show_reported_by: String((x as any).noShowReportedBy || ""),
      no_show_reported_at: nullableText((x as any).noShowReportedAt) || null,
      pricing: x.pricing || {}, status: x.status || "pending", created_at: x.createdAt || null, updated_at: (x as any).updatedAt || null
    })));
  }
  if ((db as any).driverRegistrationRequests?.length) {
    try {
      await supabaseUpsert("ev_driver_registration_requests", (db as any).driverRegistrationRequests.map((x: any) => ({
        id: String(x.id || ""),
        name: String(x.name || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        vehicle_type: String(x.vehicleType || ""),
        vehicle_number: String(x.vehicleNumber || ""),
        license_number: String(x.licenseNumber || ""),
        id_proof_url: String(x.idProofUrl || ""),
        notes: String(x.notes || ""),
        status: String(x.status || "pending"),
        reviewed_by: String(x.reviewedBy || ""),
        reviewed_at: x.reviewedAt || null,
        rejection_reason: String(x.rejectionReason || ""),
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if ((db as any).drivers?.length) {
    try {
      await supabaseUpsert("ev_drivers", (db as any).drivers.map((x: any) => ({
        id: String(x.id || ""),
        registration_request_id: String(x.registrationRequestId || ""),
        name: String(x.name || ""),
        username: String(x.username || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        password_hash: String(x.passwordHash || ""),
        status: String(x.status || "pending"),
        rating: Number(x.rating || 4.5),
        active: x.active !== false,
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if ((db as any).driverVehicles?.length) {
    try {
      await supabaseUpsert("ev_driver_vehicles", (db as any).driverVehicles.map((x: any) => ({
        id: String(x.id || ""),
        driver_id: String(x.driverId || ""),
        vehicle_type: String(x.vehicleType || ""),
        viechle_cat: String((x as any).viechle_cat || x.vehicleType || ""),
        vehicle_number: String(x.vehicleNumber || ""),
        color: String(x.color || ""),
        model: String(x.model || ""),
        seats: Number(x.seats || 4),
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if ((db as any).driverDocuments?.length) {
    try {
      await supabaseUpsert("ev_driver_documents", (db as any).driverDocuments.map((x: any) => ({
        id: String(x.id || ""),
        driver_id: String(x.driverId || ""),
        registration_request_id: String(x.registrationRequestId || ""),
        kind: String(x.kind || "other"),
        url: String(x.url || ""),
        label: String(x.label || ""),
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if ((db as any).driverAvailability?.length) {
    try {
      await supabaseUpsert("ev_driver_availability", (db as any).driverAvailability.map((x: any) => ({
        id: String(x.id || ""),
        driver_id: String(x.driverId || ""),
        online: x.online === true,
        lat: x.lat === undefined ? null : Number(x.lat),
        lng: x.lng === undefined ? null : Number(x.lng),
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if ((db as any).driverBids?.length) {
    try {
      await supabaseUpsert("ev_cab_bids", (db as any).driverBids.map((x: any) => ({
        id: String(x.id || ""),
        ride_request_id: String(x.rideRequestId || ""),
        driver_id: String(x.driverId || ""),
        bid_price: Number(x.bidPrice || 0),
        eta_min: Number(x.etaMin || 0),
        status: String(x.status || "active"),
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if ((db as any).rideAssignments?.length) {
    try {
      await supabaseUpsert("ev_ride_assignments", (db as any).rideAssignments.map((x: any) => ({
        id: String(x.id || ""),
        ride_request_id: String(x.rideRequestId || ""),
        driver_id: String(x.driverId || ""),
        bid_id: String(x.bidId || ""),
        status: String(x.status || "assigned"),
        assigned_at: x.assignedAt || nowISO(),
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.busRoutes.length) {
    try {
      await supabaseUpsert("ev_buses", db.busRoutes.map((x) => ({
        id: x.id,
        operator_name: x.operatorName,
        operator_code: x.operatorCode || "",
        from_city: x.fromCity,
        from_code: x.fromCode || "",
        to_city: x.toCity,
        to_code: x.toCode || "",
        departure_time: x.departureTime || "",
        arrival_time: x.arrivalTime || "",
        duration_text: x.durationText || "",
        bus_type: x.busType || "Non AC",
        fare: Number(x.fare || 0),
        total_seats: Number(x.totalSeats || 20),
        seat_layout: x.seatLayout || [],
        service_dates: x.serviceDates || [],
        seats_booked_by_date: x.seatsBookedByDate || {},
        hero_image: x.heroImage || "",
        active: x.active !== false,
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.busBookings.length) {
    try {
      await supabaseUpsert("ev_bus_bookings", db.busBookings.map((x) => ({
        id: x.id,
        route_id: x.routeId,
        user_name: x.userName,
        email: String((x as any).email || ""),
        phone: x.phone,
        from_city: x.fromCity,
        to_city: x.toCity,
        travel_date: x.travelDate,
        seats: x.seats || [],
        fare_per_seat: Number(x.farePerSeat || 0),
        total_fare: Number(x.totalFare || 0),
        status: x.status || "pending",
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if ((db as any).bikeRentals?.length) {
    try {
      await supabaseUpsert("ev_bike_rentals", (db as any).bikeRentals.map((x: any) => ({
        id: String(x.id || ""),
        name: String(x.name || ""),
        location: String(x.location || ""),
        bike_type: String(x.bikeType || "Scooter"),
        price_per_hour: Number(x.pricePerHour || 0),
        price_per_day: Number(x.pricePerDay || 0),
        available_qty: Number(x.availableQty || 0),
        security_deposit: Number(x.securityDeposit || 0),
        helmet_included: x.helmetIncluded !== false,
        vendor_mobile: String(x.vendorMobile || ""),
        image: String(x.image || ""),
        active: x.active !== false,
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if ((db as any).bikeBookings?.length) {
    try {
      await supabaseUpsert("ev_bike_bookings", (db as any).bikeBookings.map((x: any) => ({
        id: String(x.id || ""),
        bike_rental_id: String(x.bikeRentalId || ""),
        user_name: String(x.userName || ""),
        phone: String(x.phone || ""),
        start_datetime: String(x.startDateTime || ""),
        hours: Number(x.hours || 1),
        qty: Number(x.qty || 1),
        total_fare: Number(x.totalFare || 0),
        status: String(x.status || "pending"),
        created_at: x.createdAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.foodOrders.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_food_orders", db.foodOrders.map((x) => ({
      id: x.id, user_id: String((x as any).userId || ""), restaurant_id: String((x as any).restaurantId || ""),
      user_name: x.userName, email: String((x as any).email || ""), phone: x.phone, items: x.items || [], delivery_address: x.deliveryAddress,
      delivery_pincode: String((x as any).deliveryPincode || ""),
      delivery_address_id: String((x as any).deliveryAddressId || ""),
      delivery_region: String((x as any).deliveryRegion || ""),
      special_instructions: x.specialInstructions || "", pricing: x.pricing || {}, status: x.status || "pending", order_time: x.orderTime || null
    })));
  }
  if ((db as any).carts?.length) {
    try {
      await supabaseUpsert("ev_food_carts", (db as any).carts.map((x: any) => ({
        id: String(x.id || makeId("cart")),
        user_id: String(x.userId || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        restaurant_id: String(x.restaurantId || ""),
        items: Array.isArray(x.items) ? x.items : [],
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if ((db as any).martCarts?.length) {
    try {
      await supabaseUpsert("ev_mart_carts", (db as any).martCarts.map((x: any) => ({
        id: String(x.id || makeId("martcart")),
        user_id: String(x.userId || ""),
        user_name: String(x.userName || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        delivery_address: String(x.deliveryAddress || ""),
        items: Array.isArray(x.items) ? x.items : [],
        updated_at: x.updatedAt || nowISO()
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.queries.length) {
    // Optional-column upsert: order_id/order_type/source only exist once
    // add_query_order_link.sql has been applied, and the sync must not fail for
    // projects that have not run it yet.
    await supabaseUpsertWithOptionalPriceFields("ev_queries", db.queries.map((x) => ({
      id: x.id, user_name: x.userName, email: x.email, phone: x.phone, subject: x.subject, message: x.message, status: x.status || "pending",
      order_id: (x as any).orderId || "", order_type: (x as any).orderType || "", source: (x as any).source || "contact_page",
      submitted_at: x.submittedAt || null, responded_at: x.respondedAt || null, response: x.response || null
    })));
  }
  if (db.auditLog.length) {
    // Audit logs should be append-only. We insert and ignore duplicates so DB-level
    // UPDATE/DELETE blocking triggers (if installed) won't break server sync.
    const tail = db.auditLog.length > 2000 ? db.auditLog.slice(-2000) : db.auditLog;
    await supabaseInsertIgnoreDuplicates("ev_audit_log", tail.map((x) => ({
      id: x.id, at: x.at, admin_chat_id: x.adminChatId ?? null, action: x.action, entity: x.entity || null, entity_id: x.entityId || null, meta: x.meta || {}
    })));
  }
  if (db.cabProviders.length) {
    await supabaseUpsertWithOptionalPriceFields("ev_cab_providers", db.cabProviders.map((x) => ({
      id: x.id, name: x.name, vehicle_type: x.vehicleType, plate_number: x.plateNumber, capacity: x.capacity, vendor_mobile: (x as any).vendorMobile || "", additional_comments: (x as any).additionalComments || "", price_dropped: (x as any).priceDropped === true, price_drop_percent: Number((x as any).priceDropPercent || 0), hero_image: (x as any).heroImage || "", active: x.active !== false,
      service_area_id: x.serviceAreaId || null
    })));
  }
  if ((db as any).cabRates?.length) {
    try {
      await supabaseUpsert("ev_cab_rates", (db as any).cabRates.map((x: any) => ({
        id: x.id || undefined,
        origin: x.origin,
        destination: x.destination,
        route_label: x.routeLabel || "",
        ordinary_4_1: x.ordinary4_1 ?? null,
        luxury_4_1: x.luxury4_1 ?? null,
        ordinary_6_1: x.ordinary6_1 ?? null,
        luxury_6_1: x.luxury6_1 ?? null,
        traveller: x.traveller ?? null
      })));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.serviceAreas.length) {
    await supabaseUpsert("ev_service_areas", db.serviceAreas.map((x) => ({
      id: x.id, name: x.name, city: x.city, enabled: x.enabled !== false
    })));
  }
  if (db.coupons.length) {
    await supabaseUpsert("ev_coupons", db.coupons.map((x) => ({
      code: x.code, type: x.type, amount: x.amount, min_cart: x.minCart || 0, category: x.category || "all", expiry: x.expiry, max_uses: x.maxUses || null
    })), "code");
  }
  const userProfiles = (db as any).userProfiles as any[] | undefined;
  if (userProfiles?.length) {
    try {
      const mappedProfiles = userProfiles.map((x: any) => ({
        id: String(x.id || ""),
        phone: String(x.phone || ""),
        name: String(x.name || ""),
        email: String(x.email || ""),
        address: String(x.address || ""),
        city: String(x.city || ""),
        state: String(x.state || ""),
        pincode: String(x.pincode || ""),
        landmark: String(x.landmark || ""),
        default_address_id: String(x.defaultAddressId || ""),
        ip_address: String(x.ipAddress || ""),
        browser: String(x.browser || ""),
        password: String(x.password || ""),
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO(),
        orders: Array.isArray(x.orders) ? x.orders : [],
        // Was absent from this mapping, so everything written to a profile's
        // notification list - order confirmations, desk fare quotes, admin
        // broadcasts - was dropped on the way to Supabase and the bell stayed
        // empty. Stripped automatically if the column has not been added yet.
        push_notifications: Array.isArray(x.pushNotifications) ? x.pushNotifications : []
      }));
      await supabaseUpsertWithOptionalPriceFields(supabaseUserProfileTable(), dedupeUserProfilesByEmail(mappedProfiles));
    } catch (err) {
      if (isMissingTableError(err)) {
        // no-op: optional table
      } else if (isUserProfilesDuplicateEmailError(err)) {
        // Keep bookings/orders non-blocking when profile table contains historic duplicate-email states.
        // eslint-disable-next-line no-console
        console.warn(`[jsondb] ${supabaseUserProfileTable()} upsert skipped due to duplicate email constraint:`, String((err as any)?.message || err));
      } else {
        throw err;
      }
    }
  }
  const userBehaviorProfiles = (db as any).userBehaviorProfiles as any[] | undefined;
  if (userBehaviorProfiles?.length) {
    try {
      await supabaseUpsert("ev_user_behavior_profiles", dedupeUserBehaviorProfiles(userBehaviorProfiles.map((x: any) => ({
        id: String(x.id || ""),
        user_id: String(x.userId || ""),
        phone: String(x.phone || ""),
        name: String(x.name || ""),
        email: String(x.email || ""),
        core_identity: x.coreIdentity || {},
        device_fingerprinting: x.deviceFingerprinting || {},
        location_mobility: x.locationMobility || {},
        behavioral_analytics: x.behavioralAnalytics || {},
        transaction_payment: x.transactionPayment || {},
        preference_personalization: x.preferencePersonalization || {},
        ratings_reviews_feedback: x.ratingsReviewsFeedback || {},
        marketing_attribution: x.marketingAttribution || {},
        trust_safety_fraud: x.trustSafetyFraud || {},
        derived_inferred: x.derivedInferred || {},
        orders: Array.isArray(x.orders) ? x.orders : [],
        created_at: x.createdAt || nowISO(),
        updated_at: x.updatedAt || nowISO()
      }))));
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  const analyticsEvents = (db as any).analyticsEvents as any[] | undefined;
  if (analyticsEvents?.length) {
    try {
      const ordered = analyticsEvents
        .slice()
        .sort((a: any, b: any) => new Date(a?.at || 0).getTime() - new Date(b?.at || 0).getTime())
        .slice(-5000);
      await supabaseUpsert("ev_analytics_events", ordered.map((x: any) => ({
        id: String(x.id || ""),
        type: String(x.type || ""),
        category: String(x.category || ""),
        user_id: String(x.userId || ""),
        phone: String(x.phone || ""),
        email: String(x.email || ""),
        at: x.at || nowISO(),
        meta: x.meta || {}
      })), "id");
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }
  if (db.sitePages) {
    try {
      const sitePageRows = Object.values(db.sitePages).map((x: any) => ({
        slug: String(x?.slug || ""),
        title: String(x?.title || x?.slug || ""),
        content: String(x?.content || ""),
        updated_at: x?.updatedAt || nowISO()
      })).filter((x: any) => x.slug);
      if (sitePageRows.length) {
        await supabaseUpsert("ev_site_pages", sitePageRows, "slug");
      }
    } catch (err) {
      if (!isMissingTableError(err)) throw err;
    }
  }

  // Again on the way out. The invalidation at the top of this function cannot
  // cover a read that started while the upserts were still running and
  // repopulated the cache from a half-written state.
  invalidateDatabaseCache();
}

/**
 * Read cache for the assembled database.
 *
 * loadSupabaseDatabase() pulls ~36 tables in full on every call - on this
 * dataset roughly 11 MB and 11k rows - and readData() is called by most read
 * endpoints, several of which the dashboard fires at once when it opens. The
 * cache exists because that work is identical every time within a short
 * window.
 *
 * TTL is deliberately short. The mobile app writes to the same Supabase
 * project directly, so this process cannot see every change; the TTL bounds
 * how long an outside write stays invisible. Writes made *through this
 * process* invalidate immediately, so an admin never sees their own edit go
 * missing. Set DB_CACHE_TTL_MS=0 to turn caching off entirely.
 */
const DB_CACHE_TTL_MS = (() => {
  const raw = process.env.DB_CACHE_TTL_MS;
  const n = raw === undefined || raw === "" ? 15000 : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 15000;
})();

let dbCacheValue: Database | null = null;
let dbCacheAt = 0;
let dbLoadInFlight: Promise<Database> | null = null;

/** Called after any write, so the next read reflects it. */
export function invalidateDatabaseCache() {
  dbCacheValue = null;
  dbCacheAt = 0;
}

/**
 * Callers treat the result as their own and some mutate it in place, so a
 * cache hit hands back a copy. Cloning ~11 MB costs a few tens of ms against
 * the multiple seconds a reload costs, and it keeps one handler's edits from
 * leaking into the next request's view.
 */
function cloneDatabase(db: Database): Database {
  const structured = (globalThis as any).structuredClone;
  if (typeof structured === "function") return structured(db) as Database;
  return JSON.parse(JSON.stringify(db)) as Database;
}

export async function readData(): Promise<Database> {
  if (!shouldUseSupabase()) return loadLocalDatabase();

  assertSupabaseConfigured();

  if (DB_CACHE_TTL_MS > 0 && dbCacheValue && Date.now() - dbCacheAt < DB_CACHE_TTL_MS) {
    return cloneDatabase(dbCacheValue);
  }

  // Collapse concurrent callers onto a single load. Without this, the several
  // requests the dashboard issues on open each start their own full fetch.
  if (dbLoadInFlight) return cloneDatabase(await dbLoadInFlight);

  const inFlight = (async () => {
    try {
      // Awaited inside the try on purpose. The previous form returned the
      // promise without awaiting it, so a rejection escaped the catch entirely
      // and the fallback below never ran.
      const value = await loadSupabaseDatabase();
      if (DB_CACHE_TTL_MS > 0) {
        dbCacheValue = value;
        dbCacheAt = Date.now();
      }
      return value;
    } catch (err) {
      if (shouldFallbackToLocalOnSupabaseError(err)) {
        console.warn("[jsondb] Supabase read failed. Falling back to local data.json.", String((err as any)?.message || err));
        return loadLocalDatabase();
      }
      throw err;
    } finally {
      dbLoadInFlight = null;
    }
  })();
  dbLoadInFlight = inFlight;

  return cloneDatabase(await inFlight);
}

function parseBackupStampFromName(name: string) {
  // Matches: 2026-02-08T08-09-36-235Z_label.json
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_/.exec(name);
  if (!m) return null;
  const iso = `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

async function pruneBackupDirBestEffort() {
  try {
    if (!BACKUP_SNAPSHOTS_ENABLED) return;
    if (!(await fs.pathExists(BACKUP_DIR))) return;

    const files = (await fs.readdir(BACKUP_DIR))
      .filter((n) => n.toLowerCase().endsWith(".json"))
      .map((n) => ({
        name: n,
        fullPath: path.join(BACKUP_DIR, n),
        ts: parseBackupStampFromName(n)
      }));

    const now = Date.now();
    if (Number.isFinite(BACKUP_RETENTION_DAYS) && BACKUP_RETENTION_DAYS > 0) {
      const cutoff = now - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      for (const f of files) {
        const ts = f.ts ?? (await fs.stat(f.fullPath)).mtimeMs;
        if (ts < cutoff) await fs.remove(f.fullPath);
      }
    }

    if (Number.isFinite(BACKUP_KEEP_MAX) && BACKUP_KEEP_MAX > 0) {
      const remaining = (await fs.readdir(BACKUP_DIR))
        .filter((n) => n.toLowerCase().endsWith(".json"))
        .map((n) => ({ name: n, fullPath: path.join(BACKUP_DIR, n), ts: parseBackupStampFromName(n) }));

      if (remaining.length > BACKUP_KEEP_MAX) {
        const sorted = remaining
          .map((x) => ({ ...x, ts2: x.ts ?? 0 }))
          .sort((a, b) => (b.ts2 - a.ts2));
        const toDelete = sorted.slice(BACKUP_KEEP_MAX);
        for (const f of toDelete) await fs.remove(f.fullPath);
      }
    }
  } catch {
    // Best-effort pruning only.
  }
}

async function writeBackupSnapshot(db: Database, label?: string) {
  if (!label) return;
  if (!BACKUP_SNAPSHOTS_ENABLED) return;

  const normalized = String(label || "").trim();
  if (!normalized) return;

  const lower = normalized.toLowerCase();
  if (BACKUP_SKIP_PREFIXES.some((p) => lower.startsWith(p))) return;

  const now = Date.now();
  const last = lastBackupAtByLabel.get(normalized) || 0;
  if (Number.isFinite(BACKUP_MIN_INTERVAL_SEC) && BACKUP_MIN_INTERVAL_SEC > 0) {
    if ((now - last) < (BACKUP_MIN_INTERVAL_SEC * 1000)) return;
  }
  lastBackupAtByLabel.set(normalized, now);

  await fs.ensureDir(BACKUP_DIR);
  const stamp = nowISO().replace(/[:.]/g, "-");
  const out = path.join(BACKUP_DIR, `${stamp}_${normalized}.json`);
  await fs.writeFile(out, JSON.stringify(db, null, 2), "utf8");
  await pruneBackupDirBestEffort();
}

export async function mutateData(mutator: (db: Database) => void, backupLabel?: string) {
  if (!shouldUseSupabase()) {
    const db = await loadLocalDatabase();
    const before = DatabaseSchema.parse(JSON.parse(JSON.stringify(db)));
    await writeBackupSnapshot(db, backupLabel);
    mutator(db);
    const skipOperationalRules = String(backupLabel || "").toLowerCase().startsWith("analytics");
    if (!skipOperationalRules) {
      applyOperationalRules(before, db);
    }
    syncUserProfilesFromOrders(db);
    syncUserBehaviorProfilesFromData(db);
    const validated = DatabaseSchema.parse(db);
    await writeLocalDatabase(validated);
    return validated;
  }

  assertSupabaseConfigured();
  let db: Database;
  if (FALLBACK_TO_LOCAL_ON_SUPABASE_ERROR) {
    try {
      db = await loadSupabaseDatabase();
    } catch (err) {
      if (!shouldFallbackToLocalOnSupabaseError(err)) throw err;
      console.warn("[jsondb] Supabase mutate read failed. Falling back to local data.json.", String((err as any)?.message || err));
      db = await loadLocalDatabase();
    }
  } else {
    db = await loadSupabaseDatabase();
  }
  const before = DatabaseSchema.parse(JSON.parse(JSON.stringify(db)));
  await writeBackupSnapshot(db, backupLabel);
  mutator(db);
  const skipOperationalRules = String(backupLabel || "").toLowerCase().startsWith("analytics");
  if (!skipOperationalRules) {
    applyOperationalRules(before, db);
  }
  syncUserProfilesFromOrders(db);
  syncUserBehaviorProfilesFromData(db);
  const validated = DatabaseSchema.parse(db);
  await writeSupabaseDatabase(validated);
  return validated;
}

// retained for scripts/tests to force full DB write through same path
export async function writeData(db: Database) {
  if (!shouldUseSupabase()) {
    syncUserProfilesFromOrders(db);
    syncUserBehaviorProfilesFromData(db);
    const validated = DatabaseSchema.parse(db);
    await writeLocalDatabase(validated);
    return validated;
  }

  assertSupabaseConfigured();
  syncUserProfilesFromOrders(db);
  syncUserBehaviorProfilesFromData(db);
  const validated = DatabaseSchema.parse(db);
  if (FALLBACK_TO_LOCAL_ON_SUPABASE_ERROR) {
    try {
      await writeSupabaseDatabase(validated);
    } catch (err) {
      if (!shouldFallbackToLocalOnSupabaseError(err)) throw err;
      console.warn("[jsondb] Supabase write failed. Falling back to local data.json.", String((err as any)?.message || err));
      await writeLocalDatabase(validated);
    }
    return validated;
  }
  await writeSupabaseDatabase(validated);
  return validated;
}
