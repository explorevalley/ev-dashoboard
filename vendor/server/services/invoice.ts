import { makeId } from "@explorevalley/shared";

function safeText(v: any) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

function supabaseHeaders() {
  const key = supabaseServiceRoleKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}

function normalizeTable(table: string) {
  const t = safeText(table).toLowerCase();
  if (t === "cabbookings" || t === "ev_cab_bookings") return "ev_cab_bookings";
  if (t === "travelbookings" || t === "bookings" || t === "ev_bookings") return "ev_bookings";
  if (t === "busbookings" || t === "ev_bus_bookings") return "ev_bus_bookings";
  if (t === "bikebookings" || t === "ev_bike_bookings" || t === "ev_rental_bookings") return "ev_rental_bookings";
  if (t === "foodorders" || t === "ev_food_orders") return "ev_food_orders";
  if (t === "martorders" || t === "ev_mart_orders") return "ev_mart_orders";
  return t;
}

function makeInvoiceNo(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const t = now.getTime().toString().slice(-6);
  return `EV-INV-${y}${m}${d}-${t}`;
}

function invoiceIdFor(table: string, transactionId: string) {
  const raw = `${table}_${transactionId}`
    .replace(/[^a-z0-9_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  const clipped = raw.slice(0, 90);
  return `inv_${clipped || makeId("tx")}`;
}

function amountFromPricing(pricing: any) {
  if (!pricing || typeof pricing !== "object") return 0;
  const fromTotal = num((pricing as any).totalAmount || (pricing as any).total_amount);
  if (fromTotal > 0) return fromTotal;
  const fromGrand = num((pricing as any).grandTotal || (pricing as any).grand_total);
  if (fromGrand > 0) return fromGrand;
  return 0;
}

function amountFromItems(items: any) {
  const list = Array.isArray(items) ? items : [];
  return list.reduce((sum, x) => {
    const qty = Math.max(1, Math.floor(num(x?.quantity || x?.qty || 1)));
    const price = num(x?.price || x?.unitPrice || x?.unit_price || 0);
    return sum + qty * price;
  }, 0);
}

function deriveAmount(row: any) {
  const direct = [
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
    row?.estimatedFare
  ].map(num).find((n) => n > 0);
  if (direct && direct > 0) return direct;
  const pricingAmount = amountFromPricing(row?.pricing);
  if (pricingAmount > 0) return pricingAmount;
  const itemAmount = amountFromItems(row?.items);
  if (itemAmount > 0) return itemAmount;
  return 0;
}

function serviceNameFor(table: string, row: any) {
  if (table === "ev_bookings") {
    const t = safeText(row?.type).toLowerCase();
    if (t === "tour") return "Tour Booking";
    return "Stay Booking";
  }
  if (table === "ev_cab_bookings") return "Cab Booking";
  if (table === "ev_bus_bookings") return "Bus Booking";
  if (table === "ev_rental_bookings") return "Bike Booking";
  if (table === "ev_food_orders") return "Food Order";
  if (table === "ev_mart_orders") return "Mart Order";
  return "Transaction";
}

function serviceIdFor(table: string, row: any) {
  if (table === "ev_bookings") return safeText(row?.item_id || row?.itemId || row?.type || "");
  if (table === "ev_cab_bookings") return safeText(row?.service_area_id || row?.serviceAreaId || row?.rate_id || row?.rateId || "");
  if (table === "ev_bus_bookings") return safeText(row?.bus_id || row?.busId || row?.route_id || row?.routeId || "");
  if (table === "ev_rental_bookings") return safeText(row?.bike_rental_id || row?.bikeRentalId || row?.vehicle_id || row?.vehicleId || "");
  if (table === "ev_food_orders") return safeText(row?.restaurant_id || row?.restaurantId || "");
  if (table === "ev_mart_orders") return safeText(row?.mart_partner_id || row?.martPartnerId || row?.store_id || row?.storeId || "");
  return "";
}

function userNameFromRow(row: any) {
  return safeText(row?.user_name || row?.userName || row?.customer_name || row?.customerName || row?.name || "Customer");
}

function emailFromRow(row: any) {
  return safeText(row?.email || row?.user_email || row?.userEmail);
}

function phoneFromRow(row: any) {
  return safeText(row?.phone || row?.mobile || row?.user_phone || row?.userPhone);
}

function isCompleted(row: any) {
  return safeText(row?.status).toLowerCase() === "completed";
}

const SUPPORTED_TRANSACTION_TABLES = new Set([
  "ev_bookings",
  "ev_cab_bookings",
  "ev_bus_bookings",
  "ev_rental_bookings",
  "ev_food_orders",
  "ev_mart_orders"
]);

export async function ensureInvoiceForCompletedTransaction(params: {
  table: string;
  row: any;
  source?: string;
}) {
  const table = normalizeTable(params.table);
  const row = params.row || {};
  if (!SUPPORTED_TRANSACTION_TABLES.has(table)) return { ok: true, skipped: "UNSUPPORTED_TABLE" as const };
  if (!isCompleted(row)) return { ok: true, skipped: "NOT_COMPLETED" as const };

  const transactionId = safeText(row?.id || row?.transaction_id || row?.transactionId);
  if (!transactionId) return { ok: true, skipped: "MISSING_TRANSACTION_ID" as const };
  if (!supabaseConfigured()) return { ok: true, skipped: "SUPABASE_NOT_CONFIGURED" as const };

  const now = new Date();
  const nowIso = now.toISOString();
  const invoiceId = invoiceIdFor(table, transactionId);
  const invoiceNo = makeInvoiceNo(now);
  const amount = deriveAmount(row);
  const paymentMethod = safeText(row?.payment_method || row?.paymentMethod || row?.payment_mode || row?.paymentMode || "system");
  const paymentId = safeText(row?.payment_id || row?.paymentId || `${table}:${transactionId}`);
  const serviceName = serviceNameFor(table, row);
  const serviceId = serviceIdFor(table, row);

  const invoiceRow: any = {
    id: invoiceId,
    invoice_no: invoiceNo,
    payment_id: paymentId,
    query_id: null,
    service_id: serviceId || null,
    service_name: serviceName,
    user_name: userNameFromRow(row),
    email: emailFromRow(row),
    phone: phoneFromRow(row),
    amount,
    currency: "INR",
    payment_method: paymentMethod,
    payment_status: "paid",
    issued_at: nowIso,
    meta: {
      source: safeText(params.source || "system"),
      transactionTable: table,
      transactionId,
      transactionStatus: safeText(row?.status || "completed"),
      rowSnapshot: row
    },
    created_at: nowIso,
    updated_at: nowIso
  };

  const endpoint = `${supabaseUrl()}/rest/v1/ev_invoices?on_conflict=id`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify([invoiceRow])
  });
  if (!resp.ok) {
    throw new Error(`INVOICE_CREATE_FAILED:${table}:${transactionId}:${resp.status}:${await resp.text()}`);
  }
  const rows = await resp.json().catch(() => []);
  const inserted = Array.isArray(rows) && rows[0] ? rows[0] : invoiceRow;
  return {
    ok: true,
    invoiceId: safeText(inserted?.id || invoiceId),
    invoiceNo: safeText(inserted?.invoice_no || invoiceNo),
    transactionId,
    table
  };
}

