/**
 * Delivery pincode whitelist.
 *
 * Admin (Admin -> Delivery Pincodes) maintains `ev_delivery_pincodes`; food and
 * mart checkout read it to decide whether an address is deliverable.
 *
 * Serviceability is fail-open when the whitelist is empty or unreachable so an
 * unconfigured / offline deployment keeps taking orders exactly as before. Once
 * admin adds a single row the whitelist becomes authoritative and everything
 * outside it is rejected.
 */

export type DeliveryService = "food" | "mart";

export type DeliveryPincodeRow = {
  id: string;
  pincode: string;
  areaName: string;
  city: string;
  district: string;
  state: string;
  foodEnabled: boolean;
  martEnabled: boolean;
  deliveryFee: number;
  minOrderValue: number;
  codEnabled: boolean;
  etaMinutes: number;
  active: boolean;
  notes: string;
};

export type ServiceabilityResult = {
  serviceable: boolean;
  /** `true` when no whitelist is configured, so the check was skipped. */
  unrestricted: boolean;
  reason: "" | "PINCODE_REQUIRED" | "PINCODE_INVALID" | "PINCODE_NOT_SERVICEABLE" | "SERVICE_DISABLED_FOR_PINCODE";
  message: string;
  entry: DeliveryPincodeRow | null;
};

export const TABLE = "ev_delivery_pincodes";
const CACHE_TTL_MS = 60_000;

let cache: { at: number; rows: DeliveryPincodeRow[] } | null = null;

function supabaseUrl() {
  return String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}

function supabaseServiceRoleKey() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "");
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

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function toBool(v: any, fallback = true) {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return fallback;
}

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Six digits, not starting with 0 — the Indian PIN format. */
export function normalizePincode(v: any) {
  const digits = safeText(v).replace(/\D/g, "");
  return digits.length === 6 ? digits : "";
}

export function isValidPincode(v: any) {
  return /^[1-9][0-9]{5}$/.test(normalizePincode(v));
}

/** Pull the first plausible 6-digit pincode out of a free-text address. */
export function extractPincode(text: any) {
  const match = safeText(text).match(/(?<![0-9])[1-9][0-9]{5}(?![0-9])/);
  return match ? match[0] : "";
}

function mapRow(x: any): DeliveryPincodeRow {
  return {
    id: safeText(x?.id),
    pincode: normalizePincode(x?.pincode),
    areaName: safeText(x?.area_name ?? x?.areaName),
    city: safeText(x?.city),
    district: safeText(x?.district),
    state: safeText(x?.state),
    foodEnabled: toBool(x?.food_enabled ?? x?.foodEnabled, true),
    martEnabled: toBool(x?.mart_enabled ?? x?.martEnabled, true),
    deliveryFee: toNumber(x?.delivery_fee ?? x?.deliveryFee, 0),
    minOrderValue: toNumber(x?.min_order_value ?? x?.minOrderValue, 0),
    codEnabled: toBool(x?.cod_enabled ?? x?.codEnabled, true),
    etaMinutes: toNumber(x?.eta_minutes ?? x?.etaMinutes, 45),
    active: toBool(x?.active, true),
    notes: safeText(x?.notes)
  };
}

/**
 * All whitelist rows, cached for a minute. Returns `null` (not `[]`) when the
 * table is missing or Supabase is not configured, so callers can tell
 * "no whitelist" apart from "whitelist is empty".
 */
export async function loadDeliveryPincodes(force = false): Promise<DeliveryPincodeRow[] | null> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;

  // Dev / offline mode reads the same whitelist out of data.json.
  if (!supabaseUrl() || !supabaseServiceRoleKey()) {
    try {
      const { readData } = await import("./jsondb");
      const db: any = await readData();
      const rows = (Array.isArray(db?.deliveryPincodes) ? db.deliveryPincodes : [])
        .map(mapRow)
        .filter((row: DeliveryPincodeRow) => !!row.pincode);
      if (!rows.length) return null;
      cache = { at: Date.now(), rows };
      return rows;
    } catch {
      return null;
    }
  }

  try {
    const url = `${supabaseUrl()}/rest/v1/${TABLE}?select=*&order=pincode.asc&limit=2000`;
    const r = await fetch(url, { headers: supabaseHeaders() });
    if (!r.ok) return null;
    const payload = await r.json().catch(() => []);
    const rows = (Array.isArray(payload) ? payload : []).map(mapRow).filter((row) => !!row.pincode);
    cache = { at: Date.now(), rows };
    return rows;
  } catch {
    return null;
  }
}

export function invalidateDeliveryPincodeCache() {
  cache = null;
}

/** Whitelist rows a customer is allowed to see for a given service. */
export async function listServiceablePincodes(service?: DeliveryService): Promise<DeliveryPincodeRow[]> {
  const rows = await loadDeliveryPincodes();
  if (!rows) return [];
  return rows.filter((row) => {
    if (!row.active) return false;
    if (service === "food") return row.foodEnabled;
    if (service === "mart") return row.martEnabled;
    return row.foodEnabled || row.martEnabled;
  });
}

export async function checkPincodeServiceability(
  rawPincode: any,
  service: DeliveryService,
  opts?: { required?: boolean }
): Promise<ServiceabilityResult> {
  const rows = await loadDeliveryPincodes();
  const whitelistConfigured = Array.isArray(rows) && rows.length > 0;
  const pincode = normalizePincode(rawPincode);

  // No whitelist yet (or Supabase unreachable) — behave as before this feature.
  if (!whitelistConfigured) {
    return { serviceable: true, unrestricted: true, reason: "", message: "", entry: null };
  }

  if (!pincode) {
    if (opts?.required === false) {
      return { serviceable: true, unrestricted: false, reason: "", message: "", entry: null };
    }
    return {
      serviceable: false,
      unrestricted: false,
      reason: safeText(rawPincode) ? "PINCODE_INVALID" : "PINCODE_REQUIRED",
      message: safeText(rawPincode)
        ? "Enter a valid 6-digit pincode."
        : "Delivery pincode is required.",
      entry: null
    };
  }

  const entry = (rows || []).find((row) => row.pincode === pincode) || null;
  if (!entry || !entry.active) {
    return {
      serviceable: false,
      unrestricted: false,
      reason: "PINCODE_NOT_SERVICEABLE",
      message: `We do not deliver to ${pincode} yet.`,
      entry: null
    };
  }

  const enabled = service === "food" ? entry.foodEnabled : entry.martEnabled;
  if (!enabled) {
    return {
      serviceable: false,
      unrestricted: false,
      reason: "SERVICE_DISABLED_FOR_PINCODE",
      message: `${service === "food" ? "Food" : "Mart"} delivery is not available at ${pincode} right now.`,
      entry
    };
  }

  return { serviceable: true, unrestricted: false, reason: "", message: "", entry };
}

/**
 * Resolve the pincode for an order: prefer the explicit field, otherwise dig it
 * out of the free-text address the customer typed.
 */
export function resolveOrderPincode(explicit: any, addressText: any) {
  return normalizePincode(explicit) || extractPincode(addressText);
}
