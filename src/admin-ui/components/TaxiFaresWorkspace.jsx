import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaDownload, FaPlus, FaSearch, FaTrash, FaUndo } from "react-icons/fa";
import { TAXI_FARE_COLUMNS } from "@explorevalley/shared/dist/taxiFares";
import { downloadCsv } from "./csvExport";

const DB_TABLE = "ev_taxi_fares";
const PAGE_SIZE = 100;
const TEXT_FIELDS = ["source", "valley", "destination"];

function safeText(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

/** Fares are whole rupees; keep the cell numeric so a stray letter never reaches the app. */
function fareText(v) {
  if (v === undefined || v === null || v === "") return "";
  return String(v).replace(/[^\d]/g, "");
}

function normalizeRow(row) {
  const out = {
    id: safeText(row?.id),
    sr_no: row?.sr_no === null || row?.sr_no === undefined ? "" : String(row.sr_no),
    source: safeText(row?.source),
    valley: safeText(row?.valley),
    destination: safeText(row?.destination),
    active: row?.active !== false
  };
  TAXI_FARE_COLUMNS.forEach((column) => { out[column.name] = fareText(row?.[column.name]); });
  return out;
}

function toPayload(row) {
  const out = {
    id: row.id,
    sr_no: row.sr_no === "" ? null : Number(row.sr_no),
    source: safeText(row.source),
    valley: safeText(row.valley),
    destination: safeText(row.destination),
    active: row.active !== false,
    updated_at: new Date().toISOString()
  };
  // Blank means "this stand does not offer that vehicle", which is null in the
  // table — not zero, which would read as a free ride.
  TAXI_FARE_COLUMNS.forEach((column) => {
    const value = fareText(row[column.name]);
    out[column.name] = value === "" ? null : Number(value);
  });
  return out;
}

export default function TaxiFaresWorkspace({ rateLists, http, onReload }) {
  const [local, setLocal] = useState(null);
  const [dirty, setDirty] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const gridRef = useRef(null);

  const serverRows = useMemo(() => {
    const rows = (Array.isArray(rateLists) ? rateLists : []).map(normalizeRow);
    return rows.sort((a, b) => (Number(a.sr_no) || 0) - (Number(b.sr_no) || 0));
  }, [rateLists]);

  // Show the server's rows until something is edited, then this component's copy.
  // Derived rather than seeded in an effect so the first paint is already full.
  const [seenServerRows, setSeenServerRows] = useState(serverRows);
  if (seenServerRows !== serverRows) {
    setSeenServerRows(serverRows);
    if (!dirty.size) setLocal(null);
  }
  const rows = local || serverRows;

  const markDirty = useCallback((id) => {
    setDirty((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setNotice("");
  }, []);

  const editRow = useCallback((id, patch) => {
    setLocal((prev) => (prev || serverRows).map((row) => (row.id === id ? { ...row, ...patch } : row)));
    markDirty(id);
  }, [markDirty, serverRows]);

  const sources = useMemo(() => {
    const seen = new Map();
    rows.forEach((row) => {
      const label = safeText(row.source);
      if (!label) return;
      const key = label.toLowerCase();
      seen.set(key, (seen.get(key) || 0) + 1);
    });
    const labelByKey = new Map();
    rows.forEach((row) => {
      const label = safeText(row.source);
      if (label && !labelByKey.has(label.toLowerCase())) labelByKey.set(label.toLowerCase(), label);
    });
    return [...seen.entries()]
      .map(([key, count]) => ({ key, label: labelByKey.get(key) || key, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = safeText(query).toLowerCase();
    return rows.filter((row) => {
      if (sourceFilter !== "all" && safeText(row.source).toLowerCase() !== sourceFilter) return false;
      if (!q) return true;
      return `${row.sr_no} ${row.source} ${row.valley} ${row.destination}`.toLowerCase().includes(q);
    });
  }, [rows, query, sourceFilter]);

  useEffect(() => { setPage(0); }, [query, sourceFilter]);

  // The sheet stacks four rate cards side by side, so any one stand prices only 3-5
  // of the 21 columns and the rest are dead space. Show only the ones in use.
  const columns = useMemo(() => {
    if (showAllColumns) return TAXI_FARE_COLUMNS;
    const used = TAXI_FARE_COLUMNS.filter((column) => filtered.some((row) => row[column.name] !== ""));
    return used.length ? used : TAXI_FARE_COLUMNS;
  }, [filtered, showAllColumns]);

  const hiddenCount = TAXI_FARE_COLUMNS.length - columns.length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = useMemo(
    () => filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [filtered, safePage]
  );

  /** Same pickup spelled two ways shows up in the app as two stands. */
  const casingClashes = useMemo(() => {
    const byKey = new Map();
    rows.forEach((row) => {
      const label = safeText(row.source);
      if (!label) return;
      const key = label.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, new Set());
      byKey.get(key).add(label);
    });
    return [...byKey.values()].filter((set) => set.size > 1).map((set) => [...set]);
  }, [rows]);

  const addRow = () => {
    const nextSr = rows.reduce((max, row) => Math.max(max, Number(row.sr_no) || 0), 0) + 1;
    const row = normalizeRow({
      id: `taxi_fare_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      sr_no: nextSr,
      source: sourceFilter === "all" ? "" : (sources.find((s) => s.key === sourceFilter)?.label || ""),
      valley: "",
      destination: "",
      active: true
    });
    setLocal((prev) => [...(prev || serverRows), row]);
    markDirty(row.id);
    setPage(Math.ceil((filtered.length + 1) / PAGE_SIZE) - 1);
    window.requestAnimationFrame(() => {
      const cells = gridRef.current?.querySelectorAll("[data-cell-col='destination']");
      cells?.[cells.length - 1]?.focus();
    });
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`Delete the fare "${row.source} → ${row.destination}"?`)) return;
    // Never saved, so there is nothing in Supabase to delete.
    if (!serverRows.some((r) => r.id === row.id)) {
      setLocal((prev) => (prev || serverRows).filter((r) => r.id !== row.id));
      setDirty((prev) => { const next = new Set(prev); next.delete(row.id); return next; });
      return;
    }
    setBusy(true);
    setError("");
    try {
      await http("/api/admin/supabase/delete", {
        method: "POST",
        body: JSON.stringify({ table: DB_TABLE, id: row.id, keyColumn: "id", confirmText: "DELETE" })
      });
      setDirty((prev) => { const next = new Set(prev); next.delete(row.id); return next; });
      await onReload?.();
      setNotice("Fare deleted.");
    } catch (err) {
      setError(String(err?.message || err || "Could not delete this fare."));
    } finally {
      setBusy(false);
    }
  };

  /** Enter walks down a column the way a spreadsheet does; Tab already walks across. */
  const onCellKeyDown = (event, rowIndex, colKey) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const next = gridRef.current?.querySelector(`[data-cell-row='${rowIndex + 1}'][data-cell-col='${colKey}']`);
    if (next) next.focus();
  };

  const save = useCallback(async () => {
    if (!dirty.size || busy) return;
    const pending = rows.filter((row) => dirty.has(row.id));
    const invalid = pending.find((row) => !safeText(row.source) || !safeText(row.destination));
    if (invalid) {
      setError("Every fare needs a pickup and a destination before it can be saved.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await http("/api/admin/supabase/upsert", {
        method: "POST",
        body: JSON.stringify({ table: DB_TABLE, rows: pending.map(toPayload) })
      });
      // Reload before clearing the dirty flag: the flag is what keeps local edits
      // from being replaced, so dropping it first would flash the pre-save rows.
      await onReload?.();
      setLocal(null);
      setDirty(new Set());
      setNotice(`Saved ${pending.length} fare${pending.length === 1 ? "" : "s"}. Customers see the new prices immediately.`);
    } catch (err) {
      setError(String(err?.message || err || "Could not save changes."));
    } finally {
      setBusy(false);
    }
  }, [busy, dirty, http, onReload, rows]);

  const discard = () => {
    setLocal(null);
    setDirty(new Set());
    setError("");
    setNotice("Unsaved changes discarded.");
  };

  useEffect(() => {
    const handler = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      save();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  const exportCsv = () => {
    downloadCsv("taxi-fares.csv", filtered.map((row) => {
      const out = {
        "SR.NO": row.sr_no,
        Source: row.source,
        Valley: row.valley,
        Destination: row.destination
      };
      TAXI_FARE_COLUMNS.forEach((column) => { out[column.label] = row[column.name]; });
      return out;
    }));
  };

  const pricedCount = useMemo(
    () => filtered.filter((row) => TAXI_FARE_COLUMNS.some((c) => row[c.name] !== "")).length,
    [filtered]
  );

  return (
    <div className="tv">
      <div className="tv-legend">
        <div>
          <span className="tv-legend-tag">Source</span>
          the stand the customer is picked up from — the app&apos;s <strong>From</strong> list is built from this column.
        </div>
        <div>
          <span className="tv-legend-tag">Destination</span>
          where they are dropped — the app&apos;s <strong>To</strong> list is built from this column.
        </div>
        <div>
          <span className="tv-legend-tag">Valley</span>
          the zone the destination sits in. It only groups the fare sheet; customers never see it.
        </div>
        <div>
          <span className="tv-legend-tag">Fare</span>
          the full published price in ₹ for that trip in that vehicle. Blank = that stand does not offer it.
        </div>
      </div>

      <div className="tv-bar">
        <div className="tv-search">
          <FaSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search source, valley or destination..."
          />
        </div>
        <select className="tv-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">All pickups ({rows.length})</option>
          {sources.map((source) => (
            <option key={source.key} value={source.key}>{source.label} ({source.count})</option>
          ))}
        </select>
        <div className="tv-bar-meta">
          {filtered.length} fares{pricedCount !== filtered.length ? ` · ${filtered.length - pricedCount} unpriced` : ""}
          {hiddenCount > 0 ? ` · ${hiddenCount} unused columns hidden` : ""}
        </div>
        <div className="tv-bar-actions">
          {hiddenCount > 0 || showAllColumns ? (
            <button type="button" className="btn small" onClick={() => setShowAllColumns((v) => !v)}>
              {showAllColumns ? "Hide unused columns" : "Show all columns"}
            </button>
          ) : null}
          <button type="button" className="btn small" onClick={exportCsv}><FaDownload /> Export CSV</button>
          <button type="button" className="btn small" onClick={addRow} disabled={busy}><FaPlus /> Add fare</button>
          <button type="button" className="btn small" onClick={discard} disabled={!dirty.size || busy}><FaUndo /> Discard</button>
          <button type="button" className="btn primary small" onClick={save} disabled={!dirty.size || busy}>
            {busy ? "Saving..." : dirty.size ? `Save ${dirty.size} change${dirty.size === 1 ? "" : "s"}` : "Saved"}
          </button>
        </div>
      </div>

      {error ? <div className="tv-alert error">{error}</div> : null}
      {notice ? <div className="tv-alert ok">{notice}</div> : null}
      {casingClashes.map((variants) => (
        <div className="tv-alert warn" key={variants.join("|")}>
          {variants.map((v) => `"${v}"`).join(" and ")} are the same pickup spelled differently — the app treats them as one stand, so make them match.
        </div>
      ))}

      <div className="tv-panel">
        <div className="tv-scroll tv-scroll-grid" ref={gridRef}>
          <table className="tv-table tv-grid">
            <thead>
              <tr>
                <th className="tv-col-num">SR</th>
                <th className="tv-col-dest">Destination</th>
                <th>Source (pickup)</th>
                <th>Valley (zone)</th>
                {columns.map((column) => (
                  <th key={column.name} className="tv-col-rate" title={column.name}>{column.label}</th>
                ))}
                <th className="tv-col-live">Live</th>
                <th className="tv-col-act" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => (
                <tr key={row.id} className={dirty.has(row.id) ? "is-dirty" : ""}>
                  <td className="tv-col-num">
                    <input
                      className="tv-cell tv-cell-num"
                      value={row.sr_no}
                      onChange={(e) => editRow(row.id, { sr_no: fareText(e.target.value) })}
                    />
                  </td>
                  <td className="tv-col-dest">
                    <input
                      className="tv-cell"
                      data-cell-row={index}
                      data-cell-col="destination"
                      value={row.destination}
                      placeholder="Kasol"
                      onChange={(e) => editRow(row.id, { destination: e.target.value })}
                      onKeyDown={(e) => onCellKeyDown(e, index, "destination")}
                    />
                  </td>
                  {TEXT_FIELDS.filter((f) => f !== "destination").map((field) => (
                    <td key={field}>
                      <input
                        className="tv-cell"
                        data-cell-row={index}
                        data-cell-col={field}
                        value={row[field]}
                        placeholder={field === "source" ? "Kullu" : "Banjar Valley"}
                        onChange={(e) => editRow(row.id, { [field]: e.target.value })}
                        onKeyDown={(e) => onCellKeyDown(e, index, field)}
                      />
                    </td>
                  ))}
                  {columns.map((column) => (
                    <td key={column.name} className="tv-col-rate">
                      <input
                        className="tv-cell tv-cell-num"
                        inputMode="numeric"
                        data-cell-row={index}
                        data-cell-col={column.name}
                        value={row[column.name]}
                        placeholder="—"
                        onChange={(e) => editRow(row.id, { [column.name]: fareText(e.target.value) })}
                        onKeyDown={(e) => onCellKeyDown(e, index, column.name)}
                      />
                    </td>
                  ))}
                  <td className="tv-col-live">
                    <label className="tv-switch">
                      <input
                        type="checkbox"
                        checked={row.active !== false}
                        onChange={(e) => editRow(row.id, { active: e.target.checked })}
                      />
                      <span />
                    </label>
                  </td>
                  <td className="tv-col-act">
                    <button
                      type="button"
                      className="tv-icon-btn danger"
                      title="Delete fare"
                      onClick={() => deleteRow(row)}
                      disabled={busy}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {!visible.length ? (
                <tr>
                  <td colSpan={columns.length + 6} className="tv-empty">
                    No fares match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {pageCount > 1 ? (
          <div className="tv-pager">
            <button type="button" className="btn small" onClick={() => setPage(safePage - 1)} disabled={safePage <= 0}>Previous</button>
            <span>
              Rows {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <button type="button" className="btn small" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1}>Next</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
