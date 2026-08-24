import React, { useMemo, useState } from "react";
import { FaDownload, FaFileAlt, FaPrint, FaRedo, FaSlidersH, FaTable } from "react-icons/fa";
import { withDashboardScope } from "../components/dashboardUrl";

function safeText(v) {
  return v === undefined || v === null ? "" : String(v);
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function amountText(v) {
  const n = toNumber(v);
  return n ? `INR ${n.toLocaleString("en-IN")}` : "INR 0";
}

function normalizeStatus(v) {
  return safeText(v).trim().toLowerCase();
}

function normalizeSourceAlias(tableName, TABLES) {
  const raw = safeText(tableName).trim();
  if (!raw) return TABLES.BOOKINGS;
  const dbToAlias = {
    ev_bookings: TABLES.BOOKINGS,
    ev_cab_bookings: TABLES.CAB_BOOKINGS,
    ev_bus_bookings: TABLES.BUS_BOOKINGS,
    ev_rental_bookings: TABLES.BIKE_BOOKINGS,
    ev_food_orders: TABLES.FOOD_ORDERS,
    ev_mart_orders: "ev_mart_orders"
  };
  return dbToAlias[raw] || raw;
}

function sourceAliasToDb(sourceAlias, TABLES) {
  const map = {
    [TABLES.BOOKINGS]: "ev_bookings",
    [TABLES.CAB_BOOKINGS]: "ev_cab_bookings",
    [TABLES.BUS_BOOKINGS]: "ev_bus_bookings",
    [TABLES.BIKE_BOOKINGS]: "ev_rental_bookings",
    [TABLES.FOOD_ORDERS]: "ev_food_orders",
    ev_mart_orders: "ev_mart_orders",
    invoiceLedger: "ev_invoices"
  };
  const src = safeText(sourceAlias).trim();
  return map[src] || src;
}

function sourceLabel(sourceAlias, TABLES) {
  const src = safeText(sourceAlias);
  if (src === TABLES.BOOKINGS) return "Travel Booking";
  if (src === TABLES.CAB_BOOKINGS) return "Taxi Booking";
  if (src === TABLES.BUS_BOOKINGS) return "Bus Booking";
  if (src === TABLES.BIKE_BOOKINGS) return "Bike Booking";
  if (src === TABLES.FOOD_ORDERS) return "Food Order";
  if (src === "ev_mart_orders") return "Mart Order";
  if (src === "invoiceLedger") return "Invoice Ledger";
  return src || "Booking";
}

const INVOICE_SERVICE_OPTIONS = [
  { key: "default", label: "Default" },
  { key: "stay", label: "Stay (Legacy)" },
  { key: "hotel", label: "Hotel" },
  { key: "cottage", label: "Cottage" },
  { key: "tour", label: "Tour" },
  { key: "taxi", label: "Taxi" },
  { key: "bike", label: "Bike" },
  { key: "food", label: "Food" },
  { key: "mart", label: "Mart" }
];

export default function InvoicesPage({
  PricingControlsWorkspace,
  snapshot,
  onReload,
  onUpsert,
  TABLES,
  isLikelyCottage,
  safeJsonParse
}) {
  const [activeRowTab, setActiveRowTab] = useState("profile");
  const [lastServiceTab, setLastServiceTab] = useState("default");

  const byName = useMemo(
    () => new Map((snapshot?.tables || []).map((t) => [t.name, t])),
    [snapshot?.generatedAt]
  );

  const invoiceRows = useMemo(() => {
    const getRows = (name) => {
      const rows = byName.get(name)?.rows;
      return Array.isArray(rows) ? rows : [];
    };

    const ledger = getRows(TABLES.INVOICES).map((r) => {
      const transactionId = safeText(r?.transaction_id || r?.transactionId || r?.booking_id || r?.bookingId || r?.id);
      const sourceAlias = normalizeSourceAlias(
        r?.source_table || r?.sourceTable || r?.table_name || r?.tableName,
        TABLES
      );
      return {
        rowId: safeText(r?.id || `${sourceAlias}:${transactionId}`),
        transactionId,
        sourceTable: sourceAlias || "invoiceLedger",
        userName: safeText(r?.customer_name || r?.user_name || r?.userName || r?.name),
        phone: safeText(r?.phone || r?.customer_phone || r?.customerPhone),
        amount: toNumber(r?.amount || r?.total || r?.gross_total || r?.grand_total || r?.total_amount || r?.totalAmount),
        status: normalizeStatus(r?.status || r?.payment_status || r?.paymentStatus || "completed"),
        createdAt: safeText(r?.created_at || r?.createdAt || r?.invoice_date || r?.invoiceDate || r?.date)
      };
    });

    const transactionSources = [
      { table: TABLES.BOOKINGS, rows: getRows(TABLES.BOOKINGS) },
      { table: TABLES.CAB_BOOKINGS, rows: getRows(TABLES.CAB_BOOKINGS) },
      { table: TABLES.BUS_BOOKINGS, rows: getRows(TABLES.BUS_BOOKINGS) },
      { table: TABLES.BIKE_BOOKINGS, rows: getRows(TABLES.BIKE_BOOKINGS) },
      { table: TABLES.FOOD_ORDERS, rows: getRows(TABLES.FOOD_ORDERS) },
      { table: "ev_mart_orders", rows: getRows("ev_mart_orders") }
    ];

    const completedTx = transactionSources.flatMap(({ table, rows }) => (
      rows
        .filter((r) => normalizeStatus(r?.status || r?.payment_status || r?.paymentStatus) === "completed")
        .map((r) => ({
          rowId: safeText(r?.id || ""),
          transactionId: safeText(r?.id || ""),
          sourceTable: table,
          userName: safeText(r?.user_name || r?.userName || r?.name || r?.customer_name || r?.customerName),
          phone: safeText(r?.phone || r?.customer_phone || r?.customerPhone),
          amount: toNumber(r?.amount || r?.total || r?.total_amount || r?.totalAmount || r?.fare || r?.price),
          status: normalizeStatus(r?.status || "completed"),
          createdAt: safeText(r?.created_at || r?.createdAt || r?.booking_date || r?.order_time || r?.datetime)
        }))
    ));

    const merged = [...ledger, ...completedTx];
    const seen = new Set();
    const unique = merged.filter((r) => {
      const key = `${r.sourceTable}:${r.transactionId}`;
      if (!r.transactionId || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.sort((a, b) => safeText(b.createdAt).localeCompare(safeText(a.createdAt)));
  }, [byName, TABLES]);

  const openInvoicePdf = (row, download = false) => {
    try {
      const transactionId = safeText(row?.transactionId || row?.rowId);
      if (!transactionId) return;
      const table = sourceAliasToDb(row?.sourceTable, TABLES);
      // window.open cannot send the X-EV-Dashboard header, so the scope rides
      // in the query string instead - see ../components/dashboardUrl.
      const endpoint = withDashboardScope(
        `/api/admin/invoices/transaction/${encodeURIComponent(table)}/${encodeURIComponent(transactionId)}/pdf` +
        (download ? "?download=true" : "")
      );
      if (typeof window !== "undefined" && typeof window.open === "function") {
        window.open(endpoint, "_blank", "noopener,noreferrer");
      }
    } catch {
      // no-op
    }
  };

  const activeServiceTab = INVOICE_SERVICE_OPTIONS.some((x) => x.key === activeRowTab)
    ? activeRowTab
    : lastServiceTab;
  const activeServiceLabel = (INVOICE_SERVICE_OPTIONS.find((x) => x.key === activeServiceTab)?.label || "Default");

  return (
    <div className="pricing-wrap">
      <div className="pricing-card invoice-shell">
        <div className="invoice-head">
          <div>
            <h3 className="m-0">Invoices</h3>
            <div className="small mt-8">Manage invoice template settings and view all generated/completed invoices.</div>
          </div>
          <div className="invoice-meta-pills">
            <span className="invoice-pill">Invoices {invoiceRows.length}</span>
          </div>
        </div>

        <div className="invoice-service-tabs mt-12">
          <button
            className={`invoice-service-tab ${activeRowTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveRowTab("profile")}
          >
            <FaSlidersH /> Invoice Profile
          </button>
          <button
            className={`invoice-service-tab ${activeRowTab === "table" ? "active" : ""}`}
            onClick={() => setActiveRowTab("table")}
          >
            <FaTable /> Invoices Table
          </button>
          {INVOICE_SERVICE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`invoice-service-tab ${activeRowTab === opt.key ? "active" : ""}`}
              onClick={() => {
                setActiveRowTab(opt.key);
                setLastServiceTab(opt.key);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {activeRowTab !== "table" ? (
        <PricingControlsWorkspace
          snapshot={snapshot}
          onReload={onReload}
          onUpsert={onUpsert}
          TABLES={TABLES}
          isLikelyCottage={isLikelyCottage}
          safeJsonParse={safeJsonParse}
          invoiceOnly
          invoiceService={activeServiceTab}
          onInvoiceServiceChange={(next) => {
            setLastServiceTab(next);
            if (INVOICE_SERVICE_OPTIONS.some((x) => x.key === next)) setActiveRowTab(next);
          }}
          showInvoiceServiceTabs={false}
          invoiceViewLabel={activeRowTab === "profile" ? "" : activeServiceLabel}
        />
      ) : null}

      {activeRowTab === "table" ? (
        <div className="pricing-card invoice-shell">
          <div className="row mb-8">
            <h3 className="m-0"><FaFileAlt /> All Invoices</h3>
            <div className="flex-1" />
            <button className="btn small" onClick={onReload}><FaRedo /> Reload</button>
          </div>
          <div className="table-wrap mt-10">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Transaction ID</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((r, idx) => (
                  <tr key={`${r.sourceTable}:${r.transactionId}:${idx}`}>
                    <td>{idx + 1}</td>
                    <td>{sourceLabel(r.sourceTable, TABLES)}</td>
                    <td>{safeText(r.transactionId).slice(0, 40)}</td>
                    <td>{safeText(r.userName) || "—"}</td>
                    <td>{safeText(r.phone) || "—"}</td>
                    <td>{amountText(r.amount)}</td>
                    <td><span className="badge">{safeText(r.status) || "completed"}</span></td>
                    <td>{safeText(r.createdAt).slice(0, 19).replace("T", " ") || "—"}</td>
                    <td>
                      <div className="flex-gap8-wrap">
                        <button className="btn small" onClick={() => openInvoicePdf(r, false)}><FaPrint /> Print</button>
                        <button className="btn small" onClick={() => openInvoicePdf(r, true)}><FaDownload /> Download</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!invoiceRows.length ? <tr><td colSpan={9} className="small">No invoices found yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
