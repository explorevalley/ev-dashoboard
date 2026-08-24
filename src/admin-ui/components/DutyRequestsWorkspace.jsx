import React, { useMemo, useState } from "react";
import { FaPhoneAlt, FaRedo, FaSearch } from "react-icons/fa";
import { downloadCsv } from "./csvExport";

/**
 * Duty requests raised from the app's duty screen.
 *
 * Duty work is priced by the desk after the visit, so a request carries no
 * payment and no invoice — it is a callback list. Rows live in
 * `ev_duty_requests`; the desk works them top-down and moves each one along the
 * status track as it is called, scheduled and finished.
 */

const STATUS_CHOICES = ["pending", "contacted", "scheduled", "completed", "cancelled"];

const STATUS_FILTERS = [{ id: "all", label: "All" }, ...STATUS_CHOICES.map((id) => ({ id, label: id }))];

const CSV_COLUMNS = [
  "id", "service_id", "service_name", "user_name", "phone", "email",
  "preferred_at", "notes", "status", "created_at"
];

function safeText(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function formatWhen(value) {
  const raw = safeText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isFinite(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    return parsed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  }
  // `preferred_at` is stored as the customer typed it ("2026-08-20 14:30").
  return raw;
}

function sortTs(row) {
  const ts = new Date(safeText(row?.created_at || row?.createdAt)).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

export default function DutyRequestsWorkspace({
  snapshot,
  TABLES,
  onUpsert,
  onReload
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const rows = useMemo(() => {
    const tableOf = (...names) => (Array.isArray(snapshot?.tables)
      ? snapshot.tables.find((item) => names.includes(item?.name))
      : null);
    const requestTable = tableOf(TABLES.DUTY_REQUESTS, "ev_duty_requests");
    const out = Array.isArray(requestTable?.rows) ? requestTable.rows.slice() : [];

    // Duty jobs booked before ev_duty_requests existed were filed as support
    // queries ("Duty booking: ..." from the paid flow, "Duty request: ..." from
    // the first free-request build). They are shown here so the desk sees one
    // history rather than losing everything older than the new table.
    const queryTable = tableOf(TABLES.QUERIES, "ev_queries", "supportQueries");
    const legacy = (Array.isArray(queryTable?.rows) ? queryTable.rows : [])
      .filter((row) => /^duty (request|booking):/i.test(safeText(row?.subject)))
      .map((row) => {
        const message = safeText(row?.message);
        const fieldFrom = (label) => {
          const hit = message.split(/\r?\n/).find((line) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`));
          return hit ? safeText(hit.slice(hit.indexOf(":") + 1)) : "";
        };
        return {
          id: safeText(row?.id),
          service_id: "",
          service_name: safeText(row?.subject).replace(/^duty (request|booking):\s*/i, ""),
          user_name: safeText(row?.user_name || row?.userName),
          phone: safeText(row?.phone),
          email: safeText(row?.email),
          preferred_at: [fieldFrom("Preferred date"), fieldFrom("Preferred time")].filter(Boolean).join(" "),
          notes: fieldFrom("Requirements") || fieldFrom("Notes"),
          status: safeText(row?.status) || "pending",
          created_at: safeText(row?.submitted_at || row?.submittedAt || row?.created_at),
          _legacy: true
        };
      });

    // Newest first: the desk works the freshest callbacks.
    return [...out, ...legacy].sort((a, b) => sortTs(b) - sortTs(a));
  }, [snapshot, TABLES.DUTY_REQUESTS, TABLES.QUERIES]);

  const filteredRows = useMemo(() => {
    const q = safeText(query).toLowerCase();
    return rows.filter((row) => {
      const status = safeText(row?.status).toLowerCase() || "pending";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return [
        row?.id, row?.service_name, row?.service_id, row?.user_name,
        row?.phone, row?.email, row?.notes, row?.preferred_at
      ].some((field) => safeText(field).toLowerCase().includes(q));
    });
  }, [rows, query, statusFilter]);

  const pendingCount = useMemo(
    () => rows.filter((row) => (safeText(row?.status).toLowerCase() || "pending") === "pending").length,
    [rows]
  );

  const changeStatus = async (row, nextStatus) => {
    const id = safeText(row?.id);
    if (!id || row?._legacy) return;
    setBusyId(id);
    setError("");
    setSuccess("");
    try {
      await onUpsert(TABLES.DUTY_REQUESTS, [{
        ...row,
        status: nextStatus,
        updated_at: new Date().toISOString()
      }]);
      await onReload();
      setSuccess(`${safeText(row?.service_name) || id} → ${nextStatus}`);
    } catch (err) {
      const raw = String(err?.message || err || "");
      setError(
        raw.includes("PGRST205") || raw.includes("ev_duty_requests")
          ? "Supabase table `public.ev_duty_requests` is missing. Create it first, then reload."
          : raw || "Could not update this request."
      );
    } finally {
      setBusyId("");
    }
  };

  const exportCsv = () => {
    downloadCsv("duty-requests.csv", filteredRows.map((row) => ({
      id: safeText(row?.id),
      service_id: safeText(row?.service_id),
      service_name: safeText(row?.service_name),
      user_name: safeText(row?.user_name),
      phone: safeText(row?.phone),
      email: safeText(row?.email),
      preferred_at: safeText(row?.preferred_at),
      notes: safeText(row?.notes),
      status: safeText(row?.status) || "pending",
      created_at: safeText(row?.created_at)
    })), CSV_COLUMNS);
  };

  return (
    <div className="card">
      <div className="row mb-8" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 className="m-0">Duty Requests</h3>
        <span className="badge">{rows.length} total</span>
        {pendingCount ? <span className="badge duty-pending-badge">{pendingCount} pending</span> : null}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn" onClick={onReload}><FaRedo /> Reload</button>
        <button type="button" className="btn" onClick={exportCsv} disabled={!filteredRows.length}>Export CSV</button>
      </div>
      <div className="small mb-8">
        Callback list for duty jobs booked from the app. Duty work is quoted by the desk after the visit,
        so these carry no payment or invoice.
      </div>

      <div className="filters mb-8" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="input-with-icon" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <FaSearch />
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search duty, customer, phone, notes..."
            style={{ minWidth: 260 }}
          />
        </span>
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`btn small ${statusFilter === filter.id ? "primary" : ""}`}
            onClick={() => setStatusFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? <div className="mv-error mb-8">{error}</div> : null}
      {success ? <div className="mv-success mb-8">{success}</div> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Requested</th>
              <th>Duty</th>
              <th>Customer</th>
              <th>Preferred</th>
              <th>Requirements</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const id = safeText(row?.id);
              const status = safeText(row?.status).toLowerCase() || "pending";
              const phone = safeText(row?.phone);
              return (
                <tr key={id}>
                  <td className="small">{formatWhen(row?.created_at) || "—"}</td>
                  <td>
                    <div style={{ fontWeight: 800 }}>{safeText(row?.service_name) || safeText(row?.service_id) || "—"}</div>
                    <div className="small muted mono">{id.slice(0, 18)}</div>
                    {row?._legacy ? <span className="badge duty-legacy-badge">from support queries</span> : null}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{safeText(row?.user_name) || "—"}</div>
                    {phone ? (
                      <a className="small duty-request-phone" href={`tel:${phone}`}><FaPhoneAlt /> {phone}</a>
                    ) : null}
                    {safeText(row?.email) ? <div className="small muted">{safeText(row.email)}</div> : null}
                  </td>
                  <td className="small">{formatWhen(row?.preferred_at) || "Not specified"}</td>
                  <td className="small duty-request-notes" title={safeText(row?.notes)}>
                    {safeText(row?.notes) || "—"}
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <select
                      className={`select status-select ${status}`}
                      value={status}
                      disabled={busyId === id || !!row?._legacy}
                      title={row?._legacy ? "Filed before the duty requests table existed — manage it from Customer Support." : undefined}
                      onChange={(event) => changeStatus(row, event.target.value)}
                    >
                      {/* A stored status outside the standard track stays
                          selected rather than silently reading as something the
                          desk did not set. */}
                      {STATUS_CHOICES.includes(status) ? null : <option value={status}>{status}</option>}
                      {STATUS_CHOICES.map((choice) => (
                        <option key={choice} value={choice}>{choice}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {!filteredRows.length ? (
              <tr>
                <td colSpan={6} className="small muted">
                  {rows.length ? "No duty requests match these filters." : "No duty requests yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
