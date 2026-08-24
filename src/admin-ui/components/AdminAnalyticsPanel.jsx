import React, { useMemo } from "react";
import {
  FaBolt,
  FaChartLine,
  FaChartPie,
  FaCheckCircle,
  FaCoins,
  FaLayerGroup,
  FaQuestionCircle,
  FaUndoAlt,
  FaWaveSquare
} from "react-icons/fa";

const TABLES = Object.freeze({
  BOOKINGS: "travelBookings",
  CAB_BOOKINGS: "cabBookings",
  BUS_BOOKINGS: "busBookings",
  BIKE_BOOKINGS: "bikeBookings",
  FOOD_ORDERS: "foodOrders",
  QUERIES: "supportQueries",
  REFUNDS: "refundQueue",
  INVOICES: "invoiceLedger",
  DELIVERY: "deliveryTracking",
  TOURS: "tourDeck",
  HOTELS: "stayCatalog",
  RESTAURANTS: "foodPartners",
  MARTS: "martPartners",
  PRODUCTS: "martProducts",
  DRIVERS: "drivers"
});

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REALIZED_STATUSES = new Set(["confirmed", "completed", "paid", "delivered", "approved", "resolved", "closed"]);
const PENDING_STATUSES = new Set(["pending", "new", "open", "unread", "requested", "processing", "in_progress", "in progress"]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "rejected", "failed", "expired"]);
const QUERY_DONE_STATUSES = new Set(["completed", "resolved", "closed", "answered", "replied", "done"]);
const QUERY_ACTIVE_STATUSES = new Set(["pending", "new", "open", "unread", "processing", "in_progress", "in progress", "assigned"]);

function safeText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function safeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = safeText(value).replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
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

function normalizeStatus(value) {
  return safeText(value).trim().toLowerCase();
}

function statusBucket(status) {
  const normalized = normalizeStatus(status);
  if (!normalized) return "other";
  if (CANCELLED_STATUSES.has(normalized) || normalized.includes("refund")) return "cancelled";
  if (normalized === "completed" || normalized === "paid" || normalized === "delivered") return "completed";
  if (normalized === "confirmed" || normalized === "approved" || normalized === "resolved" || normalized === "closed") return "confirmed";
  if (PENDING_STATUSES.has(normalized)) return "pending";
  return "other";
}

function readTableRows(tablesByName, names) {
  for (const name of names) {
    const table = tablesByName?.get?.(name);
    if (Array.isArray(table?.rows)) return table.rows;
  }
  return [];
}

function parsePricingObject(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  return safeJsonParse(raw);
}

function extractAmount(row) {
  const pricing = parsePricingObject(row?.pricing);
  const candidates = [
    row?.paid_amount,
    row?.total_amount,
    row?.totalAmount,
    row?.amount,
    row?.payment_due_amount,
    row?.payment_order_amount,
    row?.total_fare,
    row?.totalFare,
    row?.estimated_fare,
    row?.estimatedFare,
    row?.fare,
    row?.refund_amount,
    row?.refundAmount,
    pricing?.totalAmount,
    pricing?.total_amount,
    pricing?.estimatedAmount,
    pricing?.estimated_amount,
    pricing?.total,
    pricing?.amount,
    pricing?.fare
  ];
  for (const candidate of candidates) {
    const value = safeNumber(candidate);
    if (value > 0) return value;
  }
  return 0;
}

function extractDate(row) {
  const candidates = [
    row?.updated_at,
    row?.updatedAt,
    row?.created_at,
    row?.createdAt,
    row?.booking_date,
    row?.bookingDate,
    row?.order_time,
    row?.orderTime,
    row?.submitted_at,
    row?.responded_at,
    row?.issued_at,
    row?.travel_date,
    row?.datetime
  ];
  for (const candidate of candidates) {
    const text = safeText(candidate);
    if (text) return text;
  }
  return "";
}

function detectDashboardScope() {
  try {
    if (typeof window === "undefined") return "travel";
    const forcedScope = safeText(window.__EV_DASHBOARD_SCOPE || "").toLowerCase();
    if (forcedScope === "admin" || forcedScope === "all") return "admin";
    if (forcedScope === "food") return "food";
    if (forcedScope === "mart_vendor" || forcedScope === "vendor" || forcedScope === "martvendor") return "mart_vendor";
    if (forcedScope === "support" || forcedScope === "customer_support" || forcedScope === "customer-support") return "support";
    if (forcedScope === "travel") return "travel";
  } catch {}
  return "travel";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Math.max(0, safeNumber(value)));
}

function formatInteger(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(Math.max(0, safeNumber(value)));
}

function formatPct(value) {
  const n = safeNumber(value);
  return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
}

function chartAmountLabel(amount) {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return formatInteger(amount);
}

function scopeLabel(scope) {
  if (scope === "food") return "FOOD | MART | DUTY";
  if (scope === "support") return "Support Dashboard";
  if (scope === "mart_vendor") return "Mart Vendor Dashboard";
  if (scope === "admin") return "Admin Dashboard";
  return "Travel Dashboard";
}

function headingIconByLabel(label) {
  const key = safeText(label).toLowerCase();
  if (key.includes("total earnings")) return FaCoins;
  if (key.includes("pending revenue")) return FaChartLine;
  if (key.includes("gross booked value")) return FaLayerGroup;
  if (key.includes("pending queries")) return FaQuestionCircle;
  if (key.includes("completed queries")) return FaCheckCircle;
  if (key.includes("active refunds")) return FaUndoAlt;
  if (key.includes("revenue trend")) return FaWaveSquare;
  if (key.includes("service mix")) return FaChartPie;
  if (key.includes("support")) return FaQuestionCircle;
  if (key.includes("recent highlights")) return FaBolt;
  return FaLayerGroup;
}

function HeadingPill({ label, className = "" }) {
  const Icon = headingIconByLabel(label);
  return (
    <span className={`heading-pill ${className}`.trim()}>
      <Icon />
      {label}
    </span>
  );
}

function KpiCard({ label, value, tone = "green", meta = "" }) {
  return (
    <div className={`analytics-kpi-card tone-${tone}`}>
      <div className="analytics-kpi-label"><HeadingPill label={label} className="kpi-pill" /></div>
      <div className="analytics-kpi-value">{value}</div>
      {meta ? <div className="analytics-kpi-meta">{meta}</div> : null}
    </div>
  );
}

function SectionCard({ title, sub, children }) {
  return (
    <div className="analytics-card">
      <div className="analytics-card-head">
        <div>
          <h3 className="analytics-card-title"><HeadingPill label={title} className="section-pill" /></h3>
          {sub ? <div className="analytics-card-sub">{sub}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AdminAnalyticsPanel({ tablesByName, dashboardScope, compact = false, showRecentHighlights = true }) {
  const scope = safeText(dashboardScope).toLowerCase() || detectDashboardScope();
  const bookingsRows = readTableRows(tablesByName, [TABLES.BOOKINGS, "ev_bookings"]);
  const cabBookingRows = readTableRows(tablesByName, [TABLES.CAB_BOOKINGS, "ev_cab_bookings"]);
  const busBookingRows = readTableRows(tablesByName, [TABLES.BUS_BOOKINGS, "ev_bus_bookings"]);
  const bikeBookingRows = readTableRows(tablesByName, [TABLES.BIKE_BOOKINGS, "ev_rental_bookings"]);
  const foodOrderRows = readTableRows(tablesByName, [TABLES.FOOD_ORDERS, "ev_food_orders"]);
  const martOrderRows = readTableRows(tablesByName, ["ev_mart_orders", "martOrders"]);
  const queryRows = readTableRows(tablesByName, [TABLES.QUERIES, "ev_queries"]);
  const refundRows = readTableRows(tablesByName, [TABLES.REFUNDS, "ev_refunds"]);
  const invoiceRows = readTableRows(tablesByName, [TABLES.INVOICES, "ev_invoices"]);
  const deliveryRows = readTableRows(tablesByName, [TABLES.DELIVERY, "ev_delivery_tracking"]);
  const toursRows = readTableRows(tablesByName, [TABLES.TOURS, "ev_tours"]);
  const staysRows = readTableRows(tablesByName, [TABLES.HOTELS, "ev_hotels"]);
  const restaurantsRows = readTableRows(tablesByName, [TABLES.RESTAURANTS, "ev_food_vendors", "ev_restaurants"]);
  const martsRows = readTableRows(tablesByName, [TABLES.MARTS, "ev_marts"]);
  const productsRows = readTableRows(tablesByName, [TABLES.PRODUCTS, "ev_mart_products"]);
  const driversRows = readTableRows(tablesByName, [TABLES.DRIVERS, "ev_drivers"]);

  const transactions = useMemo(() => {
    const travelBookings = (bookingsRows || []).map((row) => {
      const rawType = normalizeStatus(row?.type || "travel");
      const itemId = normalizeStatus(row?.item_id || row?.itemId);
      const service = rawType === "tour" ? "Tours" : (itemId.startsWith("cottage_") ? "Cottages" : "Hotels");
      return {
        id: safeText(row?.id),
        service,
        amount: extractAmount(row),
        status: normalizeStatus(row?.status),
        date: extractDate(row),
        customer: safeText(row?.user_name || row?.userName)
      };
    });
    const cab = (cabBookingRows || []).map((row) => ({
      id: safeText(row?.id),
      service: "Cabs",
      amount: extractAmount(row),
      status: normalizeStatus(row?.status),
      date: extractDate(row),
      customer: safeText(row?.user_name || row?.userName)
    }));
    const bus = (busBookingRows || []).map((row) => ({
      id: safeText(row?.id),
      service: "Buses",
      amount: extractAmount(row),
      status: normalizeStatus(row?.status),
      date: extractDate(row),
      customer: safeText(row?.user_name || row?.userName)
    }));
    const bikes = (bikeBookingRows || []).map((row) => ({
      id: safeText(row?.id),
      service: "Bikes",
      amount: extractAmount(row),
      status: normalizeStatus(row?.status),
      date: extractDate(row),
      customer: safeText(row?.user_name || row?.userName)
    }));
    const food = (foodOrderRows || []).map((row) => ({
      id: safeText(row?.id),
      service: "Food",
      amount: extractAmount(row),
      status: normalizeStatus(row?.status),
      date: extractDate(row),
      customer: safeText(row?.user_name || row?.userName)
    }));
    const mart = (martOrderRows || []).map((row) => ({
      id: safeText(row?.id),
      service: "Mart",
      amount: extractAmount(row),
      status: normalizeStatus(row?.status),
      date: extractDate(row),
      customer: safeText(row?.user_name || row?.userName || row?.name)
    }));
    return [...travelBookings, ...cab, ...bus, ...bikes, ...food, ...mart];
  }, [bookingsRows, cabBookingRows, busBookingRows, bikeBookingRows, foodOrderRows, martOrderRows]);

  const analytics = useMemo(() => {
    const recognizedTransactions = transactions.filter((entry) => REALIZED_STATUSES.has(entry.status));
    const pendingTransactions = transactions.filter((entry) => PENDING_STATUSES.has(entry.status));
    const totalEarnings = recognizedTransactions.reduce((sum, entry) => sum + entry.amount, 0);
    const pendingRevenue = pendingTransactions.reduce((sum, entry) => sum + entry.amount, 0);
    const grossRevenue = transactions
      .filter((entry) => !(CANCELLED_STATUSES.has(entry.status) || entry.status.includes("refund")))
      .reduce((sum, entry) => sum + entry.amount, 0);
    const avgOrderValue = recognizedTransactions.length ? totalEarnings / recognizedTransactions.length : 0;

    const pendingQueries = (queryRows || []).filter((row) => QUERY_ACTIVE_STATUSES.has(normalizeStatus(row?.status))).length;
    const completedQueries = (queryRows || []).filter((row) => QUERY_DONE_STATUSES.has(normalizeStatus(row?.status))).length;
    const processingQueries = (queryRows || []).filter((row) => {
      const status = normalizeStatus(row?.status);
      return status === "processing" || status === "assigned" || status === "in_progress" || status === "in progress";
    }).length;
    const queryResolutionRate = queryRows.length ? (completedQueries / queryRows.length) * 100 : 0;

    const activeRefundRows = (refundRows || []).filter((row) => {
      const status = normalizeStatus(row?.status || row?._refund_status);
      return status === "requested" || status === "processing" || status === "approved" || status === "pending";
    });
    const refundExposure = activeRefundRows.reduce((sum, row) => sum + extractAmount(row), 0);
    const refundClosed = (refundRows || []).filter((row) => {
      const status = normalizeStatus(row?.status || row?._refund_status);
      return status === "completed" || status === "rejected";
    }).length;

    const deliveryActive = (deliveryRows || []).filter((row) => {
      const status = normalizeStatus(row?.status);
      return status && status !== "delivered" && status !== "completed" && status !== "cancelled";
    }).length;

    const transactionBuckets = [
      { label: "Pending", key: "pending", count: 0 },
      { label: "Confirmed", key: "confirmed", count: 0 },
      { label: "Completed", key: "completed", count: 0 },
      { label: "Cancelled", key: "cancelled", count: 0 }
    ];
    transactions.forEach((entry) => {
      const bucket = statusBucket(entry.status);
      const match = transactionBuckets.find((item) => item.key === bucket);
      if (match) match.count += 1;
    });

    const queryStatusBars = [
      { label: "Pending", count: pendingQueries },
      { label: "In Progress", count: processingQueries },
      { label: "Completed", count: completedQueries }
    ];

    const serviceMix = Array.from(transactions.reduce((map, entry) => {
      if (!entry.amount && !entry.id) return map;
      const current = map.get(entry.service) || { label: entry.service, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += entry.amount;
      map.set(entry.service, current);
      return map;
    }, new Map()).values())
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
      .slice(0, 6);

    const monthKeys = [];
    const now = new Date();
    for (let index = 5; index >= 0; index -= 1) {
      const dt = new Date(now.getFullYear(), now.getMonth() - index, 1);
      monthKeys.push({
        key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`,
        label: MONTH_LABELS[dt.getMonth()]
      });
    }
    const revenueByMonth = monthKeys.map((item) => ({ ...item, value: 0 }));
    recognizedTransactions.forEach((entry) => {
      const dt = new Date(entry.date || 0);
      if (Number.isNaN(dt.getTime())) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const target = revenueByMonth.find((bucket) => bucket.key === key);
      if (target) target.value += entry.amount;
    });

    const recentHighlights = [
      ...transactions.map((entry) => ({
        type: entry.service,
        title: `${entry.service} order ${entry.id || ""}`.trim(),
        status: entry.status || "pending",
        date: entry.date,
        amount: entry.amount,
        detail: entry.customer
      })),
      ...queryRows.map((row) => ({
        type: "Query",
        title: safeText(row?.subject || row?.message || row?.id || "Customer query"),
        status: normalizeStatus(row?.status) || "pending",
        date: extractDate(row),
        amount: 0,
        detail: safeText(row?.user_name || row?.email || row?.phone)
      }))
    ]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, compact ? 6 : 10);

    return {
      totalEarnings,
      pendingRevenue,
      grossRevenue,
      avgOrderValue,
      pendingQueries,
      completedQueries,
      processingQueries,
      queryResolutionRate,
      activeRefunds: activeRefundRows.length,
      refundExposure,
      refundClosed,
      deliveryActive,
      liveTransactions: pendingTransactions.length,
      completedTransactions: recognizedTransactions.length,
      invoicesIssued: invoiceRows.length,
      catalogItems: toursRows.length + staysRows.length + restaurantsRows.length + martsRows.length + productsRows.length,
      partners: restaurantsRows.length + martsRows.length,
      drivers: driversRows.length,
      serviceMix,
      revenueByMonth,
      queryStatusBars,
      transactionBuckets,
      recentHighlights
    };
  }, [transactions, queryRows, refundRows, invoiceRows.length, deliveryRows, toursRows.length, staysRows.length, restaurantsRows.length, martsRows.length, productsRows.length, driversRows.length, compact]);

  const revenueMax = Math.max(1, ...analytics.revenueByMonth.map((item) => item.value));
  const serviceMax = Math.max(1, ...analytics.serviceMix.map((item) => item.revenue || item.count));
  const queueMax = Math.max(1, ...analytics.queryStatusBars.map((item) => item.count), ...analytics.transactionBuckets.map((item) => item.count));

  const topLineCards = [
    {
      label: "Pending Revenue",
      value: formatCurrency(analytics.pendingRevenue),
      meta: `${formatInteger(analytics.liveTransactions)} live transactions`,
      tone: "amber"
    },
    {
      label: "Gross Booked Value",
      value: formatCurrency(analytics.grossRevenue),
      meta: `Avg ticket ${formatCurrency(analytics.avgOrderValue)}`,
      tone: "slate"
    }
  ];

  const supportCards = [
    {
      label: "Pending Queries",
      value: formatInteger(analytics.pendingQueries),
      meta: `${formatPct(analytics.queryResolutionRate)} resolution rate`,
      tone: "amber"
    },
    {
      label: "Completed Queries",
      value: formatInteger(analytics.completedQueries),
      meta: `${formatInteger(analytics.processingQueries)} in progress`,
      tone: "green"
    },
    {
      label: "Active Refunds",
      value: formatInteger(analytics.activeRefunds),
      meta: `Exposure ${formatCurrency(analytics.refundExposure)}`,
      tone: "rose"
    }
  ];

  const hasSupportData = queryRows.length > 0 || refundRows.length > 0 || invoiceRows.length > 0 || deliveryRows.length > 0;
  const heroBadges = [
    `${formatInteger(transactions.length)} total transactions`,
    `${formatInteger(analytics.completedTransactions)} completed`,
    `${formatInteger(analytics.activeRefunds)} refund cases`,
    `${formatInteger(analytics.drivers)} drivers loaded`
  ].filter(Boolean);

  return (
    <div className={`analytics-shell ${compact ? "compact" : ""}`}>
      <div className="analytics-hero">
        <div className="analytics-hero-main">
          <div className="analytics-eyebrow"><HeadingPill label="Live Analytics" className="hero-pill" /></div>
          <h2 className="analytics-title">{scopeLabel(scope)}</h2>
          <div className="analytics-subtitle">Revenue, support load, and transaction health summarized from the same Supabase snapshot your dashboard is already using.</div>
          <div className="analytics-badge-row">
            {heroBadges.map((item) => (
              <span key={item} className="analytics-chip">{item}</span>
            ))}
          </div>
        </div>

        <div className="analytics-hero-kpi-wrap">
          <KpiCard
            label="Total Earnings"
            value={formatCurrency(analytics.totalEarnings)}
            meta={`${formatInteger(analytics.completedTransactions)} completed or confirmed`}
            tone="green"
          />
        </div>
      </div>

      <div className="analytics-kpi-grid">
        {topLineCards.map((card) => (
          <KpiCard key={card.label} label={card.label} value={card.value} meta={card.meta} tone={card.tone} />
        ))}
        {hasSupportData ? supportCards.map((card) => (
          <KpiCard key={card.label} label={card.label} value={card.value} meta={card.meta} tone={card.tone} />
        )) : null}
      </div>

      <div className="analytics-chart-grid">
        <SectionCard title="Revenue Trend" sub="Last 6 months of realized earnings">
          <div className="analytics-bars">
            {analytics.revenueByMonth.map((item) => (
              <div key={item.key} className="analytics-bar-col">
                <div className="analytics-bar-value">{chartAmountLabel(item.value)}</div>
                <div className="analytics-bar-track">
                  <div className="analytics-bar-fill" style={{ height: `${Math.max(item.value > 0 ? 12 : 0, (item.value / revenueMax) * 100)}%` }} />
                </div>
                <div className="analytics-bar-label">{item.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Service Mix" sub="Revenue and order weight by category">
          <div className="analytics-list">
            {analytics.serviceMix.length ? analytics.serviceMix.map((item) => (
              <div key={item.label} className="analytics-list-row">
                <div className="analytics-list-head">
                  <span>{item.label}</span>
                  <span>{formatCurrency(item.revenue)}</span>
                </div>
                <div className="analytics-progress">
                  <span className="analytics-progress-fill" style={{ width: `${Math.max(10, (item.revenue / serviceMax) * 100)}%` }} />
                </div>
                <div className="analytics-list-meta">{formatInteger(item.count)} orders</div>
              </div>
            )) : <div className="small">No transaction data yet.</div>}
          </div>
        </SectionCard>

        <SectionCard title="Support & Operations" sub="Open workload across support and order flow">
          <div className="analytics-list">
            {analytics.queryStatusBars.map((item) => (
              <div key={item.label} className="analytics-list-row">
                <div className="analytics-list-head">
                  <span>{item.label} Queries</span>
                  <span>{formatInteger(item.count)}</span>
                </div>
                <div className="analytics-progress muted">
                  <span className="analytics-progress-fill" style={{ width: `${Math.max(item.count > 0 ? 12 : 0, (item.count / queueMax) * 100)}%` }} />
                </div>
              </div>
            ))}
            {analytics.transactionBuckets.map((item) => (
              <div key={item.key} className="analytics-list-row">
                <div className="analytics-list-head">
                  <span>{item.label} Orders</span>
                  <span>{formatInteger(item.count)}</span>
                </div>
                <div className="analytics-progress">
                  <span className="analytics-progress-fill alt" style={{ width: `${Math.max(item.count > 0 ? 12 : 0, (item.count / queueMax) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {showRecentHighlights ? (
        <div className="analytics-lower-grid">
          <SectionCard title="Recent Highlights" sub="Latest transactions and customer-side activity">
            <div className="analytics-feed">
              {analytics.recentHighlights.length ? analytics.recentHighlights.map((item, index) => (
                <div key={`${item.type}-${item.title}-${index}`} className="analytics-feed-item">
                  <div className="analytics-feed-main">
                    <div className="analytics-feed-title">{item.title || item.type}</div>
                    <div className="analytics-feed-detail">{item.detail || item.type}</div>
                  </div>
                  <div className="analytics-feed-side">
                    <div className={`analytics-status ${statusBucket(item.status)}`}>{item.status || "pending"}</div>
                    <div className="analytics-feed-date">{safeText(item.date).slice(0, 16).replace("T", " ") || "-"}</div>
                    <div className="analytics-feed-amount">{item.amount > 0 ? formatCurrency(item.amount) : item.type}</div>
                  </div>
                </div>
              )) : <div className="small">No recent highlights yet.</div>}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
