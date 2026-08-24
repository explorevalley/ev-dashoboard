import React, { useEffect, useMemo, useState } from "react";
import { FaCommentDots, FaDownload, FaFileInvoice, FaInfoCircle, FaLayerGroup, FaRupeeSign, FaSearch, FaTimes } from "react-icons/fa";
import { http, Pagination } from "./LegacyComponents";
import { withDashboardScope } from "./dashboardUrl";

/**
 * Every customer order across every service, in one dense table.
 *
 * This replaces the analytics hero that used to sit at the top of the dashboard.
 * The charts summarised orders without ever showing one, so acting on an order
 * meant leaving the dashboard and finding it in a per-service screen. Operators
 * open this page to answer "what has come in and what do I do about it", which
 * is a row-level question, so the rows are what they get — with the status
 * control on the row itself.
 */

/** Logical table names; `onUpsert` maps these to their Supabase counterparts. */
const SOURCES = Object.freeze({
  BOOKINGS: "travelBookings",
  CAB: "cabBookings",
  BUS: "busBookings",
  BIKE: "bikeBookings",
  FOOD: "foodOrders",
  MART: "martOrders",
  // Duty jobs are requests, not paid orders: no amount, no invoice, no refund.
  // They list here so the desk works one queue instead of two.
  DUTY: "ev_duty_requests"
});

/**
 * Physical Supabase table behind each source, which is what the invoice
 * endpoint keys off. The server also accepts the logical aliases, but the rest
 * of the dashboard sends the real table names, so this does too.
 */
const INVOICE_TABLE_BY_SOURCE = Object.freeze({
  travelBookings: "ev_bookings",
  cabBookings: "ev_cab_bookings",
  busBookings: "ev_bus_bookings",
  bikeBookings: "ev_rental_bookings",
  foodOrders: "ev_food_orders",
  martOrders: "ev_mart_orders"
});

/**
 * One hue per service so the column is scannable by colour alone. Eight
 * services share this table, and a single uniform chip made "which of these is
 * a taxi" a reading exercise rather than a glance.
 */
const SERVICE_TONE = Object.freeze({
  Tour: "svc-tour",
  Hotel: "svc-hotel",
  Cottage: "svc-cottage",
  Taxi: "svc-taxi",
  Bus: "svc-bus",
  Bike: "svc-bike",
  Food: "svc-food",
  Mart: "svc-mart",
  Duty: "svc-duty"
});

/**
 * Side tables read per order rather than listed as orders themselves: the
 * refund queue and the support queries raised from the Contact Us form. Both
 * are keyed by `order_id`.
 */
const REFUNDS_SOURCE = "refundQueue";
const QUERIES_SOURCE = "supportQueries";
/** Star ratings customers leave on a finished order, keyed by `order_id`. */
const REVIEWS_SOURCE = "reviewsBoard";

const STATUS_CHOICES = ["pending", "confirmed", "completed", "cancelled"];

/**
 * The four states POST /api/admin/refunds/status accepts. Anything else it
 * normalises to "pending" ("approved" → processing, "processed" → completed),
 * so offering more choices here would silently write something the operator did
 * not pick.
 */
const REFUND_STATUS_CHOICES = ["pending", "processing", "completed", "rejected"];
const PAGE_SIZE = 25;

/** Internal plumbing the operator does not need to see in the detail popup. */
const HIDDEN_DETAIL_KEYS = new Set([
  "source_table", "sourceTable", "_refund_status", "search_text", "searchText"
]);

function titleCase(key) {
  return safeText(key)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Money-ish keys, rendered as currency rather than a bare number. */
const MONEY_KEY = /(amount|price|fare|total|subtotal|gst|tax|charge|fee|deposit|discount)/i;
/**
 * Keys that hold a *rate* rather than a sum — `cgst: 0.03` means 3%, not ₹0.03.
 * `AMOUNT_KEY` wins over this, so `gstAmount: 0.5` stays fifty paise instead of
 * being read as 50%.
 */
const RATE_KEY = /(gst|tax|rate|percent|discount)/i;
const AMOUNT_KEY = /(amount|total|fare|price|value|sum|paid)/i;

function isRateKey(key) {
  return RATE_KEY.test(key) && !AMOUNT_KEY.test(key);
}

function looksLikeDate(key, value) {
  return /(_at|date|time)$/i.test(key) && /^\d{4}-\d{2}-\d{2}/.test(safeText(value));
}

/**
 * Currency that keeps paise when there are paise to keep.
 *
 * The table's Amount column deliberately rounds to whole rupees for density,
 * but a pricing breakdown is the one place the exact figure matters — rounding
 * a ₹1.06 total to "₹1" there makes the components stop adding up.
 */
function formatMoneyPrecise(value) {
  const amount = safeNumber(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * One scalar field, formatted for reading rather than for a debugger.
 */
function scalarValue(key, value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (looksLikeDate(key, value)) return formatDate(value);
  if (typeof value === "number") {
    // A tax field below 1 is a multiplier (0.03), not three paise. Showing it
    // as "₹0" was both wrong and indistinguishable from a genuinely zero fee.
    if (isRateKey(key) && value >= 0 && value < 1) {
      return `${Number((value * 100).toFixed(2))}%`;
    }
    if (MONEY_KEY.test(key)) return formatMoneyPrecise(value);
  }
  return safeText(value);
}

/**
 * Turns a raw row into a tree of renderable nodes.
 *
 * The popup used to dump `items` and `pricing` as pretty-printed JSON, which
 * put braces, quotes and internal ids in front of an operator who wanted to
 * know what was ordered and what it cost. Arrays of objects become tables,
 * nested objects become their own labelled group, and only genuinely opaque
 * values fall back to text.
 */
function detailNodes(raw, depth = 0) {
  if (!raw || typeof raw !== "object") return [];
  return Object.keys(raw)
    .filter((key) => !HIDDEN_DETAIL_KEYS.has(key))
    .map((key) => {
      let value = raw[key];
      if (value === null || value === undefined || value === "") return null;
      // Several columns arrive as JSON *strings* (pricing, items) depending on
      // whether the row came from Supabase or JSONDB.
      if (typeof value === "string") {
        const parsed = safeJsonParse(value);
        if (parsed && typeof parsed === "object") value = parsed;
      }
      const label = titleCase(key);

      if (Array.isArray(value)) {
        if (!value.length) return null;
        const objectRows = value.filter((entry) => entry && typeof entry === "object");
        if (objectRows.length === value.length) {
          // Union of keys so a row missing one field still lines up.
          const columns = Array.from(new Set(objectRows.flatMap((entry) => Object.keys(entry))));
          return { kind: "table", key, label, columns, rows: objectRows };
        }
        return { kind: "list", key, label, values: value.map((entry) => safeText(entry)).filter(Boolean) };
      }

      if (typeof value === "object") {
        const children = depth < 2 ? detailNodes(value, depth + 1) : [];
        if (!children.length) return null;
        return { kind: "group", key, label, children };
      }

      return { kind: "scalar", key, label, text: scalarValue(key, value) };
    })
    .filter(Boolean);
}

/**
 * Opens the generated invoice PDF for one order.
 *
 * Same endpoint the live queue's invoice action uses; it builds the PDF from
 * the transaction row on demand, so there is nothing to look up here beyond the
 * table and the id.
 */
function openInvoice(order, download = false) {
  const table = INVOICE_TABLE_BY_SOURCE[order?.source];
  const id = safeText(order?.id);
  if (!table || !id) return;
  // window.open cannot send the X-EV-Dashboard header, so the scope rides in
  // the query string instead - see ./dashboardUrl.
  const endpoint = withDashboardScope(
    `/api/admin/invoices/transaction/${encodeURIComponent(table)}/${encodeURIComponent(id)}/pdf` +
    (download ? "?download=true" : "")
  );
  try {
    if (typeof window !== "undefined" && typeof window.open === "function") {
      window.open(endpoint, "_blank", "noopener,noreferrer");
    }
  } catch {
    // A blocked popup must not take the dashboard down with it.
  }
}

function safeText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function safeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(safeText(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeJsonParse(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parsePricing(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  return safeJsonParse(raw);
}

function normalizeStatus(value) {
  return safeText(value).trim().toLowerCase();
}

/** Same colour buckets the live queue uses, so status reads identically here. */
function statusClass(status) {
  const normalized = normalizeStatus(status);
  if (!normalized || ["pending", "new", "open", "unread", "requested", "processing"].includes(normalized)) {
    return "status-select-pending";
  }
  if (normalized.includes("refund") || ["cancelled", "canceled", "rejected", "failed", "expired"].includes(normalized)) {
    return "status-select-refund";
  }
  return "status-select-confirmed";
}

/**
 * Index rows by the order they belong to.
 *
 * Both `ev_refunds` and `ev_queries` carry `order_id`. Rows without one are
 * skipped rather than bucketed under "": a general enquiry from /contact-us has
 * no order, and attaching it to every order would be worse than showing none.
 */
function groupByOrderId(rows, idOf = directOrderId) {
  const map = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const orderId = safeText(idOf(row));
    if (!orderId) return;
    const bucket = map.get(orderId);
    if (bucket) bucket.push(row);
    else map.set(orderId, [row]);
  });
  return map;
}

/**
 * Whether an order has moved since it was placed, by more than a minute — the
 * slack absorbs rows whose created_at and updated_at are written milliseconds
 * apart at insert time and are not a real update.
 */
function hasLaterActivity(order) {
  const placed = new Date(safeText(order?.date)).getTime();
  if (!Number.isFinite(placed) || !order?.activityAt) return false;
  return order.activityAt - placed > 60000;
}

function directOrderId(row) {
  return safeText(pick(row, "order_id", "orderId"));
}

/**
 * `Order support: food_4f75…` — the subject the API synthesises for a message
 * raised from inside an order.
 */
const ORDER_SUBJECT_RE = /^\s*order support:\s*(\S+)/i;

/**
 * The order a support message belongs to.
 *
 * Prefers the real `order_id` column. Falls back to parsing the subject,
 * because a message sent before `add_query_order_link.sql` was applied lost its
 * order_id on write — the column did not exist yet, so the optional-column
 * upsert stripped it — while the synthesised subject kept the id verbatim.
 * Without this fallback those messages are stranded: the data is there, but
 * nothing joins it to its order.
 */
function queryOrderId(row) {
  const direct = directOrderId(row);
  if (direct) return direct;
  const match = ORDER_SUBJECT_RE.exec(safeText(row?.subject));
  return match ? match[1] : "";
}

/**
 * Newest timestamp among the given values, as epoch ms. Anything unparseable is
 * ignored rather than counted as 1970, which would drag a row to the bottom.
 */
function latestTime(values) {
  let newest = 0;
  (Array.isArray(values) ? values : []).forEach((value) => {
    const text = safeText(value);
    if (!text) return;
    const time = new Date(text).getTime();
    if (Number.isFinite(time) && time > newest) newest = time;
  });
  return newest;
}

/** Every timestamp a row might carry, whichever naming convention it uses. */
function rowTimes(row) {
  return [
    row?.created_at, row?.createdAt, row?.updated_at, row?.updatedAt,
    row?.submitted_at, row?.submittedAt, row?.responded_at, row?.respondedAt
  ];
}

/** Most recent row by created/submitted time, falling back to the last seen. */
function latestOf(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;
  return list.reduce((newest, row) => {
    const at = safeText(pick(row, "updated_at", "updatedAt", "created_at", "createdAt", "submitted_at", "submittedAt"));
    const newestAt = safeText(pick(newest, "updated_at", "updatedAt", "created_at", "createdAt", "submitted_at", "submittedAt"));
    return at > newestAt ? row : newest;
  }, list[0]);
}

function readTableRows(tablesByName, names) {
  for (const name of names) {
    const table = tablesByName?.get?.(name);
    if (Array.isArray(table?.rows)) return table.rows;
  }
  return [];
}

function extractAmount(row) {
  const pricing = parsePricing(row?.pricing);
  const candidates = [
    row?.paid_amount, row?.total_amount, row?.totalAmount, row?.amount,
    row?.total_fare, row?.totalFare, row?.estimated_fare, row?.estimatedFare, row?.fare,
    pricing?.totalAmount, pricing?.total_amount, pricing?.estimatedAmount,
    pricing?.estimated_amount, pricing?.total, pricing?.amount, pricing?.fare
  ];
  for (const candidate of candidates) {
    const value = safeNumber(candidate);
    if (value > 0) return value;
  }
  return 0;
}

function extractDate(row) {
  const candidates = [
    row?.created_at, row?.createdAt, row?.order_time, row?.orderTime,
    row?.booking_date, row?.bookingDate, row?.datetime,
    row?.start_datetime, row?.travel_date, row?.updated_at, row?.updatedAt
  ];
  for (const candidate of candidates) {
    const text = safeText(candidate);
    if (text) return text;
  }
  return "";
}

function formatDate(value) {
  const raw = safeText(value);
  if (!raw) return "—";
  const normalized = raw.includes(" ") && !raw.includes("T") ? raw.replace(" ", "T") : raw;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 16);
  return parsed.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(Math.max(0, safeNumber(value)));
}

/** A pickup stored as "Jibhi (32.24, 77.18)" reads better without the pin. */
function placeText(value) {
  const raw = safeText(value).trim();
  if (!raw) return "";
  if (/^-?\d{1,3}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?$/.test(raw)) return "map pin";
  return raw.replace(/\s*\(\s*-?\d{1,3}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?\s*\)\s*$/, "").trim() || raw;
}

function itemsText(items) {
  const list = Array.isArray(items) ? items : safeJsonParse(safeText(items));
  if (!Array.isArray(list) || !list.length) return "";
  const names = list
    .map((entry) => safeText(entry?.name || entry?.title || entry?.product_name || entry?.item_name || entry))
    .filter(Boolean);
  if (!names.length) return `${list.length} item(s)`;
  return names.length > 1 ? `${names[0]} +${names.length - 1} more` : names[0];
}

function joinParts(parts) {
  return parts.map((part) => safeText(part).trim()).filter(Boolean).join(" · ");
}

/**
 * Reads the first key that carries a value.
 *
 * The same booking reaches this table in two shapes: the Supabase tables are
 * snake_case while JSONDB rows are camelCase, and the admin snapshot can serve
 * either. Checking both is what keeps the Details column from going blank
 * depending on which source answered.
 */
function pick(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && safeText(value) !== "") return value;
  }
  return "";
}

/**
 * Flattens each service's own row shape into one comparable record. `source`
 * travels with the row so a status change writes back to the table it came from.
 */
function buildOrders(tablesByName) {
  const rowsOf = (names) => readTableRows(tablesByName, names);

  // Refunds and support queries live in their own tables, keyed by the order
  // they were raised against. Indexing them once here keeps the per-order
  // lookup a map read rather than a scan of every refund for every row.
  const refundsByOrder = groupByOrderId(rowsOf([REFUNDS_SOURCE, "ev_refunds"]));
  const queriesByOrder = groupByOrderId(rowsOf([QUERIES_SOURCE, "ev_queries"]), queryOrderId);
  const reviewsByOrder = groupByOrderId(rowsOf([REVIEWS_SOURCE, "ev_reviews"]));

  const base = (row, source, service) => {
    const id = safeText(row?.id);
    const refunds = refundsByOrder.get(id) || [];
    // Two independent records of the same fact: the refund queue, and a
    // refund_status stamped onto the order itself. Either one means the
    // customer asked, and older orders only ever had the stamp.
    const rowRefundStatus = normalizeStatus(pick(row, "refund_status", "refundStatus"));
    const queueStatus = normalizeStatus(latestOf(refunds)?.status);
    const queries = queriesByOrder.get(id) || [];
    // One review per order, but read the newest defensively in case an older
    // deployment wrote more than one before the unique index existed.
    const review = latestOf(reviewsByOrder.get(id) || []);
    return {
      id,
      source,
      service,
      status: normalizeStatus(row?.status) || "pending",
      amount: extractAmount(row),
      date: extractDate(row),
      customer: safeText(row?.user_name || row?.userName || row?.name || row?.customer_name),
      phone: safeText(row?.phone || row?.mobile),
      payment: normalizeStatus(row?.payment_status || row?.paymentStatus),
      refundRequested: refunds.length > 0 || !!rowRefundStatus,
      // The order row's own `refund_status` is authoritative: that is the column
      // POST /api/admin/refunds/status writes, and the Refunds page treats
      // `ev_refunds` as legacy read-only. The queue is only a fallback for
      // orders whose refund never made it onto the order row.
      refundStatus: rowRefundStatus || queueStatus,
      // Taxi rides booked from a typed pickup point or "use my current
      // location" have no rate card, so they arrive with no fare and wait for
      // the desk to price them.
      // Called off, whatever the service names that state — plus a refund that
      // actually completed, since the money went back. Mirrors
      // isCancelledTransaction() on the server, which refuses these an invoice.
      cancelled: ["cancelled", "canceled", "rejected", "failed", "expired", "refunded"].includes(normalizeStatus(row?.status))
        || ["completed", "processed", "refunded"].includes(rowRefundStatus),
      bookingMode: normalizeStatus(pick(row, "booking_mode", "bookingMode")) || "union",
      quotedFare: safeNumber(pick(row, "quoted_fare", "quotedFare")),
      quoteStatus: normalizeStatus(pick(row, "quote_status", "quoteStatus")),
      refunds,
      queries,
      rating: safeNumber(review?.rating),
      reviewText: safeText(review?.review || review?.comment),
      ratedAt: safeText(review?.updated_at || review?.created_at),
      // When this order last did anything at all — placed, edited, refunded, or
      // written about. The table sorts on this so a week-old order the customer
      // just complained about surfaces at the top instead of staying buried at
      // its original placement date.
      activityAt: latestTime([
        ...rowTimes(row),
        extractDate(row),
        ...refunds.flatMap(rowTimes),
        ...queries.flatMap(rowTimes)
      ]),
      raw: row
    };
  };

  const travel = rowsOf([SOURCES.BOOKINGS, "ev_bookings"]).map((row) => {
    const type = normalizeStatus(row?.type);
    const itemId = normalizeStatus(pick(row, "item_id", "itemId"));
    const service = type === "tour" ? "Tour" : itemId.startsWith("cottage_") ? "Cottage" : "Hotel";
    const checkIn = safeText(pick(row, "check_in", "checkIn")).slice(0, 10);
    const checkOut = safeText(pick(row, "check_out", "checkOut")).slice(0, 10);
    const rooms = pick(row, "num_rooms", "numRooms");
    return {
      ...base(row, SOURCES.BOOKINGS, service),
      detail: joinParts([
        pick(row, "tour_title", "tourTitle", "hotel_name", "hotelName", "item_id", "itemId"),
        row?.guests ? `${row.guests} guest(s)` : "",
        rooms ? `${rooms} room(s)` : "",
        checkIn ? `in ${checkIn}` : "",
        checkOut ? `out ${checkOut}` : ""
      ])
    };
  });

  const cab = rowsOf([SOURCES.CAB, "ev_cab_bookings"]).map((row) => {
    const from = placeText(pick(row, "pickup_location", "pickupLocation", "pickup"));
    const to = placeText(pick(row, "drop_location", "dropLocation", "drop"));
    const driver = pick(row, "driver_name", "driverName");
    return {
      ...base(row, SOURCES.CAB, "Taxi"),
      detail: joinParts([
        `${from || "?"} → ${to || "?"}`,
        pick(row, "vehicle_type", "vehicleType", "car_type", "carType"),
        row?.passengers ? `${row.passengers} pax` : "",
        driver ? `driver ${driver}` : ""
      ])
    };
  });

  const bus = rowsOf([SOURCES.BUS, "ev_bus_bookings"]).map((row) => {
    const from = pick(row, "from_city", "fromCity");
    const to = pick(row, "to_city", "toCity");
    const travelDate = safeText(pick(row, "travel_date", "travelDate")).slice(0, 10);
    return {
      ...base(row, SOURCES.BUS, "Bus"),
      detail: joinParts([
        `${safeText(from) || "?"} → ${safeText(to) || "?"}`,
        row?.seats ? `${row.seats} seat(s)` : "",
        travelDate
      ])
    };
  });

  const bike = rowsOf([SOURCES.BIKE, "ev_rental_bookings"]).map((row) => {
    const pricing = parsePricing(row?.pricing) || {};
    // Bike rentals write days/qty into the pricing blob rather than columns.
    const days = pick(row, "days", "rental_days") || pricing.units || "";
    const qty = pick(row, "qty", "quantity");
    return {
      ...base(row, SOURCES.BIKE, "Bike"),
      detail: joinParts([
        pick(row, "bike_name", "bikeName", "vehicle_name", "vehicleName", "bike_type", "bikeType"),
        placeText(pick(row, "pickup_location", "pickupLocation")),
        days ? `${days} day(s)` : "",
        qty ? `qty ${qty}` : ""
      ])
    };
  });

  const food = rowsOf([SOURCES.FOOD, "ev_food_orders"]).map((row) => ({
    ...base(row, SOURCES.FOOD, "Food"),
    detail: joinParts([
      pick(row, "restaurant_name", "restaurantName", "restaurant_id", "restaurantId"),
      itemsText(row?.items),
      placeText(pick(row, "delivery_address", "deliveryAddress"))
    ])
  }));

  const mart = rowsOf([SOURCES.MART, "ev_mart_orders"]).map((row) => ({
    ...base(row, SOURCES.MART, "Mart"),
    detail: joinParts([
      pick(row, "store_name", "storeName", "mart_name", "martName"),
      itemsText(row?.items),
      placeText(pick(row, "delivery_address", "deliveryAddress"))
    ])
  }));

  const duty = rowsOf([SOURCES.DUTY, "ev_duty_requests"]).map((row) => ({
    ...base(row, SOURCES.DUTY, "Duty"),
    // `base` reads a customer name from user_name/name, but a duty request has
    // no pricing block and no delivery address, so the detail line is the job
    // itself: what was asked for, when it was wanted, and any requirements.
    detail: joinParts([
      pick(row, "service_name", "serviceName", "service_id", "serviceId"),
      pick(row, "preferred_at", "preferredAt") ? `for ${pick(row, "preferred_at", "preferredAt")}` : "",
      pick(row, "notes")
    ])
  }));

  return [...travel, ...cab, ...bus, ...bike, ...food, ...mart, ...duty]
    .filter((order) => order.id)
    // Most recently active first, not most recently placed. Ties fall back to
    // the placement date so orders with no activity of their own keep their
    // previous relative order.
    .sort((a, b) => (b.activityAt - a.activityAt)
      || (new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()));
}

/** Renders one node from `detailNodes` — scalar, list, table or nested group. */
function DetailNode({ node }) {
  if (node.kind === "scalar") {
    return (
      <div className="orders-modal-field">
        <span className="small muted">{node.label}</span>
        <div className="orders-modal-value">{node.text}</div>
      </div>
    );
  }

  if (node.kind === "list") {
    return (
      <div className="orders-modal-field wide">
        <span className="small muted">{node.label}</span>
        <ul className="orders-modal-list">
          {node.values.map((value, index) => <li key={`${node.key}-${index}`}>{value}</li>)}
        </ul>
      </div>
    );
  }

  if (node.kind === "table") {
    return (
      <div className="orders-modal-field wide">
        <span className="small muted">{node.label} · {node.rows.length}</span>
        <div className="orders-modal-subtable-wrap">
          <table className="orders-modal-subtable">
            <thead>
              <tr>{node.columns.map((col) => <th key={col}>{titleCase(col)}</th>)}</tr>
            </thead>
            <tbody>
              {node.rows.map((row, index) => (
                <tr key={`${node.key}-${index}`}>
                  {node.columns.map((col) => {
                    const cell = row[col];
                    const text = cell && typeof cell === "object"
                      ? JSON.stringify(cell)
                      : scalarValue(col, cell);
                    return <td key={col} title={text}>{text || "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-modal-field wide">
      <span className="small muted">{node.label}</span>
      <div className="orders-modal-group">
        {node.children.map((child) => <DetailNode key={child.key} node={child} />)}
      </div>
    </div>
  );
}

/**
 * Everything the row could not fit, for one order.
 *
 * The table truncates Details to a single line so the grid stays scannable;
 * this is where an operator reads the whole record — the summary up top, then
 * every raw field the source table carries.
 */
function OrderDetailModal({ order, onClose, onStatusChange, busy }) {
  if (!order) return null;
  const nodes = detailNodes(order.raw);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal orders-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="orders-modal-title">
            <span className={`chip ${SERVICE_TONE[order.service] || ""}`}>{order.service}</span>
            <span className="modal-title">{order.id}</span>
            <span className={`orders-status-tag ${statusClass(order.status)}`}>{order.status}</span>
          </div>
          <button type="button" className="btn small ghost" onClick={onClose} aria-label="Close details">
            <FaTimes />
          </button>
        </div>

        <div className="orders-modal-body">
          <div className="orders-modal-summary">
            <div><span className="small muted">Customer</span><div>{order.customer || "—"}</div></div>
            <div><span className="small muted">Phone</span><div>{order.phone || "—"}</div></div>
            <div><span className="small muted">Placed</span><div>{formatDate(order.date)}</div></div>
            <div><span className="small muted">Amount</span><div>{order.amount > 0 ? formatCurrency(order.amount) : "—"}</div></div>
            <div><span className="small muted">Payment</span><div>{order.payment || "—"}</div></div>
            <div>
              <span className="small muted">Status</span>
              <div>
                <select
                  className={`select status-select ${statusClass(order.status)}`}
                  value={order.status}
                  disabled={busy}
                  onChange={(event) => onStatusChange(order, event.target.value)}
                >
                  {STATUS_CHOICES.includes(order.status) ? null : (
                    <option value={order.status}>{order.status}</option>
                  )}
                  {STATUS_CHOICES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="orders-modal-fields">
            {nodes.length
              ? nodes.map((node) => <DetailNode key={node.key} node={node} />)
              : <div className="small muted">This order has no further stored fields.</div>}
          </div>
        </div>

        <div className="modal-foot">
          <div className="orders-invoice-actions">
            <button type="button" className="btn small ghost" onClick={() => openInvoice(order, false)}>
              <FaFileInvoice /> View invoice
            </button>
            <button type="button" className="btn small ghost" onClick={() => openInvoice(order, true)}>
              <FaDownload /> Download
            </button>
          </div>
          <button type="button" className="btn small" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerOrdersTable({ tablesByName, onUpsert, onPatch, onReload }) {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [detailKey, setDetailKey] = useState("");
  const [queryKey, setQueryKey] = useState("");
  const [quoteKey, setQuoteKey] = useState("");

  const orders = useMemo(() => buildOrders(tablesByName), [tablesByName]);

  const services = useMemo(
    () => Array.from(new Set(orders.map((order) => order.service))).sort(),
    [orders]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (serviceFilter !== "all" && order.service !== serviceFilter) return false;
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!needle) return true;
      // Support message text is searchable too: an operator chasing "driver
      // never arrived" should land on the order, not have to find it by id.
      // Review text joins it, so "cold food" or "rude driver" finds the order
      // the customer wrote it about.
      return [order.id, order.customer, order.phone, order.detail, order.service, order.status, order.refundStatus, order.reviewText]
        .concat((order.queries || []).map((query) => safeText(query?.message)))
        .some((field) => safeText(field).toLowerCase().includes(needle));
    });
  }, [orders, search, serviceFilter, statusFilter]);

  // Resolved from the live list, not captured on click: after a status change
  // and reload the popup shows the new value rather than a stale copy. An order
  // that disappears from the source data closes the popup by becoming null.
  const detailOrder = useMemo(
    () => (detailKey ? orders.find((order) => `${order.source}-${order.id}` === detailKey) || null : null),
    [orders, detailKey]
  );

  const queryOrder = useMemo(
    () => (queryKey ? orders.find((order) => `${order.source}-${order.id}` === queryKey) || null : null),
    [orders, queryKey]
  );

  const quoteOrder = useMemo(
    () => (quoteKey ? orders.find((order) => `${order.source}-${order.id}` === quoteKey) || null : null),
    [orders, quoteKey]
  );

  const sendQuote = async (order, fare) => {
    if (!order?.id) return;
    setBusyId(order.id);
    setError("");
    try {
      await http(`/api/admin/cab-bookings/${encodeURIComponent(order.id)}/quote`, {
        method: "POST",
        body: JSON.stringify({ fare })
      });
      setQuoteKey("");
      await onReload();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const filteredValue = filtered.reduce((sum, order) => sum + order.amount, 0);

  // Writes back to the row's own table and reloads, matching how the live queue
  // already persists a status change.
  const changeStatus = async (order, nextStatus) => {
    if (!order?.id || !order?.source) return;
    setBusyId(order.id);
    setError("");
    try {
      // Only the status column. Spreading `order.raw` back in rewrote the
      // whole order - address, items, totals - from the snapshot this table
      // was rendered from, so advancing a status could revert a change made
      // since the page last loaded.
      if (onPatch) {
        await onPatch(order.source, order.id, { status: nextStatus });
      } else {
        await onUpsert(order.source, [{ ...(order.raw || {}), id: order.id, status: nextStatus }]);
      }
      await onReload();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  /**
   * Refund status is not a column on this row's table that we can upsert like
   * `status` — it is patched through the refunds endpoint, which also writes the
   * audit-log entry (REFUND_APPROVED / REFUND_REJECTED / …) and is what the
   * customer's app polls. Writing the column directly would change the value
   * without any of that.
   */
  const changeRefundStatus = async (order, nextStatus) => {
    const table = INVOICE_TABLE_BY_SOURCE[order?.source];
    if (!table || !order?.id) return;
    setBusyId(order.id);
    setError("");
    try {
      await http("/api/admin/refunds/status", {
        method: "POST",
        body: JSON.stringify({
          table,
          orderId: order.id,
          status: nextStatus,
          reason: safeText(pick(order.raw || {}, "refund_reason", "refundReason", "reason"))
        })
      });
      await onReload();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusyId("");
    }
  };

  const resetTo = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <div className="card orders-card">
      <div className="orders-toolbar">
        <div className="orders-toolbar-head">
          <span className="heading-pill section-pill"><FaLayerGroup />Customer Orders</span>
          <span className="small muted">
            {filtered.length === orders.length
              ? `${orders.length} orders`
              : `${filtered.length} of ${orders.length} orders`}
            {filteredValue > 0 ? ` · ${formatCurrency(filteredValue)}` : ""}
          </span>
        </div>
        <div className="orders-toolbar-controls">
          <label className="orders-search">
            <FaSearch />
            <input
              className="input"
              value={search}
              onChange={resetTo(setSearch)}
              placeholder="Search id, customer, phone, details"
            />
          </label>
          <select className="select" value={serviceFilter} onChange={resetTo(setServiceFilter)}>
            <option value="all">All services</option>
            {services.map((service) => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
          <select className="select" value={statusFilter} onChange={resetTo(setStatusFilter)}>
            <option value="all">All statuses</option>
            {STATUS_CHOICES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className="warn mt-10">{error}</div> : null}

      <div className="table-wrap mt-10">
        <table className="table orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Details</th>
              <th className="num">Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Rating</th>
              <th>Fare Quote</th>
              <th>Refund</th>
              <th>Refund Status</th>
              <th>Support</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? pageRows.map((order) => (
              <tr key={`${order.source}-${order.id}`}>
                <td className="mono" title={order.id}>{order.id.slice(0, 14)}</td>
                {/* Placed-on drives the reading; last-activity is shown only
                    when it differs, so an order that jumped to the top of the
                    list says why instead of looking mis-sorted. */}
                <td>
                  <div>{formatDate(order.date)}</div>
                  {hasLaterActivity(order) ? (
                    <div className="small muted" title="Last refund or support activity">
                      upd {formatDate(new Date(order.activityAt).toISOString())}
                    </div>
                  ) : null}
                </td>
                <td>
                  <div className="orders-customer">{order.customer || "—"}</div>
                  {order.phone ? <div className="small muted">{order.phone}</div> : null}
                </td>
                <td><span className={`chip ${SERVICE_TONE[order.service] || ""}`}>{order.service}</span></td>
                {/* The one-line summary that used to live here was truncated to
                    the point of being noise (half an internal vendor id). The
                    cell is just the way into the full record now; the summary
                    itself is on the row's title attribute for a quick hover. */}
                <td className="orders-detail" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    className="btn small ghost orders-detail-btn"
                    title={order.detail || `Details for ${order.id}`}
                    onClick={() => setDetailKey(`${order.source}-${order.id}`)}
                  >
                    <FaInfoCircle /> Details
                  </button>
                </td>
                <td className="num">{order.amount > 0 ? formatCurrency(order.amount) : "—"}</td>
                <td className="small">{order.payment || "—"}</td>
                <td onClick={(event) => event.stopPropagation()}>
                  <select
                    className={`select status-select ${statusClass(order.status)}`}
                    value={order.status}
                    disabled={busyId === order.id}
                    onChange={(event) => changeStatus(order, event.target.value)}
                  >
                    {/* A status outside the four standard ones (refunded,
                        out_for_delivery, …) is shown as itself and stays
                        selected. Falling back to "pending" here would tell the
                        operator the order is in a state it is not in. */}
                    {STATUS_CHOICES.includes(order.status) ? null : (
                      <option value={order.status}>{order.status}</option>
                    )}
                    {STATUS_CHOICES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                {/* What the customer rated this order in My Orders. Blank for
                    orders that are not finished yet, or that nobody rated. */}
                <td className="orders-rating">
                  {order.rating > 0 ? (
                    <span
                      className={`orders-stars ${order.rating <= 2 ? "is-low" : ""}`}
                      title={order.reviewText
                        ? `${order.rating}/5 — "${order.reviewText}"`
                        : `${order.rating}/5${order.ratedAt ? ` on ${formatDate(order.ratedAt)}` : ""}`}
                    >
                      {"\u2605".repeat(order.rating)}
                      <span className="orders-stars-empty">{"\u2605".repeat(5 - order.rating)}</span>
                      {order.reviewText ? <FaCommentDots className="orders-rating-note" /> : null}
                    </span>
                  ) : <span className="small muted">—</span>}
                </td>
                {/* Only quote-mode taxi rides can be quoted; everything else
                    already has a rate-card fare and shows a dash. */}
                <td className="orders-detail" onClick={(event) => event.stopPropagation()}>
                  {order.bookingMode === "quotes" ? (
                    <button
                      type="button"
                      className={`btn small ghost orders-detail-btn ${order.quoteStatus ? "" : "orders-quote-due"}`}
                      title={`Send a fare quote for ${order.id}`}
                      disabled={busyId === order.id}
                      onClick={() => setQuoteKey(`${order.source}-${order.id}`)}
                    >
                      <FaRupeeSign />
                      {order.quoteStatus
                        ? `${formatCurrency(order.quotedFare)} ${order.quoteStatus}`
                        : "Send quote"}
                    </button>
                  ) : <span className="small muted">—</span>}
                </td>
                <td>
                  <span className={`chip ${order.refundRequested ? "refund-yes" : "refund-no"}`}>
                    {order.refundRequested ? "Yes" : "No"}
                  </span>
                </td>
                {/* Editable only where there is a refund to manage. Offering a
                    dropdown on an order nobody asked to refund would let an
                    operator open a refund by mis-clicking a select. */}
                <td onClick={(event) => event.stopPropagation()}>
                  {order.refundStatus ? (
                    <select
                      className={`select status-select refund-select ${statusClass(order.refundStatus)}`}
                      value={order.refundStatus}
                      disabled={busyId === order.id}
                      onChange={(event) => changeRefundStatus(order, event.target.value)}
                    >
                      {/* A stored value outside the four (legacy "processed",
                          "approved") stays selected instead of silently
                          displaying as something the operator did not set. */}
                      {REFUND_STATUS_CHOICES.includes(order.refundStatus) ? null : (
                        <option value={order.refundStatus}>{order.refundStatus}</option>
                      )}
                      {REFUND_STATUS_CHOICES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  ) : <span className="small muted">—</span>}
                </td>
                <td className="orders-detail" onClick={(event) => event.stopPropagation()}>
                  {order.queries.length ? (
                    <button
                      type="button"
                      className="btn small ghost orders-detail-btn"
                      title={`View ${order.queries.length} support message(s) for ${order.id}`}
                      onClick={() => setQueryKey(`${order.source}-${order.id}`)}
                    >
                      <FaCommentDots /> {order.queries.length} message{order.queries.length > 1 ? "s" : ""}
                    </button>
                  ) : <span className="small muted">—</span>}
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  <div className="orders-invoice-actions">
                    {/* A cancelled journey is not a sale — the endpoint refuses
                        to build an invoice for one, so offering the button
                        would only produce an error. */}
                    {/* View only. The invoice opens in a new tab, where the
                        browser's own PDF viewer already offers a download, so a
                        second button here was a duplicate control in a column
                        that has to stay narrow. The detail popup still offers
                        an explicit download. */}
                    {/* Duty requests are unpriced callbacks with no invoice
                        table behind them, so the button would open nothing. */}
                    {order.cancelled || !INVOICE_TABLE_BY_SOURCE[order.source] ? (
                      <span className="small muted">—</span>
                    ) : (
                      <button
                        type="button"
                        className="btn small ghost"
                        title={`View invoice for ${order.id}`}
                        onClick={() => openInvoice(order, false)}
                      >
                        <FaFileInvoice /> View
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={14} className="small muted">No orders match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />

      {/* Looked up by key rather than held as state, so the popup re-reads the
          order after a reload instead of showing the pre-change snapshot. */}
      <OrderDetailModal
        order={detailOrder}
        busy={busyId === detailOrder?.id}
        onStatusChange={changeStatus}
        onClose={() => setDetailKey("")}
      />

      <OrderQueriesModal order={queryOrder} onClose={() => setQueryKey("")} />

      <SendQuoteModal
        order={quoteOrder}
        busy={busyId === quoteOrder?.id}
        onSubmit={sendQuote}
        onClose={() => setQuoteKey("")}
      />
    </div>
  );
}

/**
 * Price a taxi ride the rate card could not.
 *
 * The operator needs the trip in front of them to price it, so the pickup and
 * drop are shown rather than just the order id — for a "use my current location"
 * booking the pickup is raw coordinates, which is the only clue to where the
 * rider actually is.
 */
function SendQuoteModal({ order, busy, onSubmit, onClose }) {
  const [fare, setFare] = useState("");

  // A fresh order gets a fresh field, prefilled with the standing quote when
  // re-quoting after a decline.
  useEffect(() => {
    if (!order) return;
    setFare(order.quotedFare > 0 ? String(order.quotedFare) : "");
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) return null;
  const amount = safeNumber(fare);
  const canSend = !busy && amount > 0;
  const raw = order.raw || {};
  // Distance-based estimate the booking API computed but deliberately did not
  // charge. A starting point for the operator, never a price on its own.
  const suggested = safeNumber(parsePricing(raw?.pricing)?.suggestedFare);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal orders-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="orders-modal-title">
            <span className="chip">Fare quote</span>
            <span className="modal-title">{order.id}</span>
          </div>
          <button type="button" className="btn small ghost" onClick={onClose} aria-label="Close quote">
            <FaTimes />
          </button>
        </div>

        <div className="orders-modal-body">
          <div className="orders-modal-summary">
            <div><span className="small muted">Customer</span><div>{order.customer || "—"}</div></div>
            <div><span className="small muted">Phone</span><div>{order.phone || "—"}</div></div>
            <div><span className="small muted">Pickup</span><div>{safeText(pick(raw, "pickup_location", "pickupLocation")) || "—"}</div></div>
            <div><span className="small muted">Drop</span><div>{safeText(pick(raw, "drop_location", "dropLocation")) || "—"}</div></div>
            <div><span className="small muted">Passengers</span><div>{safeText(raw?.passengers) || "—"}</div></div>
            <div><span className="small muted">Vehicle</span><div>{safeText(pick(raw, "vehicle_type", "vehicleType")) || "—"}</div></div>
          </div>

          {order.quoteStatus ? (
            <div className="small muted">
              Last quote {formatCurrency(order.quotedFare)} · {order.quoteStatus}
              {order.quoteStatus === "declined" ? " — sending a new quote reopens it." : ""}
            </div>
          ) : null}

          <div>
            <span className="small muted">
              Fare to quote (₹)
              {suggested > 0 ? ` · distance estimate ${formatCurrency(suggested)}` : ""}
            </span>
            <input
              className="input mt-8"
              type="number"
              min="1"
              inputMode="numeric"
              value={fare}
              onChange={(event) => setFare(event.target.value)}
              placeholder="e.g. 1850"
            />
          </div>

          <div className="flex-gap6">
            <button type="button" className="btn small" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn small primary"
              disabled={!canSend}
              onClick={() => onSubmit(order, amount)}
            >
              {busy ? "Sending…" : "Send quote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The support messages a customer raised against one order.
 *
 * Contact Us is now a popup inside the order in My Orders, so a message arrives
 * already knowing which order it is about. This is the other end of that: the
 * operator reads the complaint next to the order it concerns instead of
 * matching it up by phone number in the Enquiries table.
 */
function OrderQueriesModal({ order, onClose }) {
  if (!order) return null;
  const queries = [...(order.queries || [])].sort((a, b) => {
    const at = safeText(pick(a, "submitted_at", "submittedAt"));
    const bt = safeText(pick(b, "submitted_at", "submittedAt"));
    return bt.localeCompare(at);
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal orders-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="orders-modal-title">
            <span className="chip">Support</span>
            <span className="modal-title">{order.id}</span>
          </div>
          <button type="button" className="btn small ghost" onClick={onClose} aria-label="Close support messages">
            <FaTimes />
          </button>
        </div>

        <div className="orders-modal-body">
          {queries.length ? queries.map((query, index) => (
            <div key={safeText(query?.id) || index} className="orders-query">
              <div className="orders-query-head">
                <span className={`chip ${statusClass(query?.status)}`}>
                  {normalizeStatus(query?.status) || "pending"}
                </span>
                <span className="small muted">
                  {formatDate(pick(query, "submitted_at", "submittedAt"))}
                </span>
              </div>
              <p className="orders-query-message">{safeText(query?.message) || "—"}</p>
              {safeText(query?.response) ? (
                <div className="orders-query-response">
                  <span className="small muted">Support replied</span>
                  <p>{safeText(query.response)}</p>
                </div>
              ) : null}
            </div>
          )) : <span className="small muted">No support messages for this order.</span>}
        </div>
      </div>
    </div>
  );
}
