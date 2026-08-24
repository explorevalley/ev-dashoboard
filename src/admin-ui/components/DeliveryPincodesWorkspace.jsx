import React, { useEffect, useMemo, useState } from "react";
import { downloadCsv } from "./csvExport";

/**
 * Delivery pincode whitelist.
 *
 * Rows in `ev_delivery_pincodes` decide where food and mart orders can be
 * delivered. While the table is empty delivery stays unrestricted, so the very
 * first row a manager adds is what switches enforcement on.
 */

const SERVICE_FILTERS = [
  { id: "all", label: "All services" },
  { id: "food", label: "Food only" },
  { id: "mart", label: "Mart only" }
];

const CSV_COLUMNS = [
  "pincode", "area_name", "city", "district", "state",
  "food_enabled", "mart_enabled", "delivery_fee", "min_order_value",
  "cod_enabled", "eta_minutes", "active", "notes"
];

function safeText(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function toBool(v, fallback = true) {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return fallback;
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePincode(v) {
  const digits = safeText(v).replace(/\D/g, "");
  return digits.slice(0, 6);
}

function isValidPincode(v) {
  return /^[1-9][0-9]{5}$/.test(normalizePincode(v));
}

function pincodeRowId(pincode) {
  return `pin_${normalizePincode(pincode)}`;
}

function normalizeRow(row) {
  return {
    id: safeText(row?.id) || pincodeRowId(row?.pincode),
    pincode: normalizePincode(row?.pincode),
    area_name: safeText(row?.area_name ?? row?.areaName),
    city: safeText(row?.city),
    district: safeText(row?.district),
    state: safeText(row?.state),
    food_enabled: toBool(row?.food_enabled ?? row?.foodEnabled, true),
    mart_enabled: toBool(row?.mart_enabled ?? row?.martEnabled, true),
    delivery_fee: toNumber(row?.delivery_fee ?? row?.deliveryFee, 0),
    min_order_value: toNumber(row?.min_order_value ?? row?.minOrderValue, 0),
    cod_enabled: toBool(row?.cod_enabled ?? row?.codEnabled, true),
    eta_minutes: toNumber(row?.eta_minutes ?? row?.etaMinutes, 45),
    active: toBool(row?.active, true),
    notes: safeText(row?.notes)
  };
}

const EMPTY_DRAFT = Object.freeze({
  pincode: "",
  area_name: "",
  city: "",
  district: "",
  state: "Himachal Pradesh",
  food_enabled: true,
  mart_enabled: true,
  delivery_fee: 0,
  min_order_value: 0,
  cod_enabled: true,
  eta_minutes: 45,
  active: true,
  notes: ""
});

function formatWorkspaceError(err) {
  const raw = String(err?.message || err || "").trim();
  if (!raw) return "Could not save pincode.";
  if (raw.includes("PGRST205") || raw.includes("ev_delivery_pincodes") && raw.includes("Could not find the table")) {
    return "Supabase table `public.ev_delivery_pincodes` is missing. Run server/sql/add_delivery_pincodes_and_user_addresses.sql, then reload.";
  }
  return raw;
}

export default function DeliveryPincodesWorkspace({ snapshot, TABLES, onUpsert, onDelete, onReload }) {
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [edits, setEdits] = useState({});
  const [bulkText, setBulkText] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const rows = useMemo(() => {
    const table = Array.isArray(snapshot?.tables)
      ? snapshot.tables.find((item) => item?.name === TABLES.DELIVERY_PINCODES)
      : null;
    const out = (Array.isArray(table?.rows) ? table.rows : []).map(normalizeRow);
    out.sort((a, b) => a.pincode.localeCompare(b.pincode));
    return out;
  }, [TABLES.DELIVERY_PINCODES, snapshot]);

  // Drop stale edits once a reload brings the saved values back.
  useEffect(() => {
    setEdits((prev) => {
      const ids = new Set(rows.map((row) => row.id));
      const next = {};
      Object.entries(prev).forEach(([id, value]) => {
        if (ids.has(id)) next[id] = value;
      });
      return next;
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = safeText(query).toLowerCase();
    return rows.filter((row) => {
      if (serviceFilter === "food" && !row.food_enabled) return false;
      if (serviceFilter === "mart" && !row.mart_enabled) return false;
      if (!q) return true;
      return `${row.pincode} ${row.area_name} ${row.city} ${row.district} ${row.state} ${row.notes}`
        .toLowerCase()
        .includes(q);
    });
  }, [query, rows, serviceFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((row) => row.active).length,
    food: rows.filter((row) => row.active && row.food_enabled).length,
    mart: rows.filter((row) => row.active && row.mart_enabled).length
  }), [rows]);

  const dirtyIds = useMemo(() => Object.keys(edits), [edits]);

  const rowValue = (row) => ({ ...row, ...(edits[row.id] || {}) });

  const editRow = (row, patch) => {
    setEdits((prev) => ({ ...prev, [row.id]: { ...(prev[row.id] || {}), ...patch } }));
    setSuccess("");
  };

  const saveRows = async (payload, message) => {
    if (!payload.length) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await onUpsert(TABLES.DELIVERY_PINCODES, payload);
      await onReload();
      setEdits({});
      setSuccess(message);
    } catch (err) {
      setError(formatWorkspaceError(err));
    } finally {
      setBusy(false);
    }
  };

  const addPincode = async () => {
    const pincode = normalizePincode(draft.pincode);
    if (!isValidPincode(pincode)) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }
    if (rows.some((row) => row.pincode === pincode)) {
      setError(`Pincode ${pincode} is already on the whitelist.`);
      return;
    }
    if (!draft.food_enabled && !draft.mart_enabled) {
      setError("Enable delivery for food, mart, or both.");
      return;
    }
    const row = normalizeRow({ ...draft, pincode, id: pincodeRowId(pincode) });
    await saveRows([row], `Added ${pincode}${row.area_name ? ` (${row.area_name})` : ""} to the whitelist.`);
    setDraft(EMPTY_DRAFT);
  };

  const saveAllEdits = async () => {
    const payload = rows.filter((row) => edits[row.id]).map((row) => normalizeRow(rowValue(row)));
    const invalid = payload.find((row) => !isValidPincode(row.pincode));
    if (invalid) {
      setError(`"${invalid.pincode || "(blank)"}" is not a valid 6-digit pincode.`);
      return;
    }
    await saveRows(payload, `Saved ${payload.length} pincode${payload.length === 1 ? "" : "s"}.`);
  };

  const toggleField = async (row, field) => {
    const next = normalizeRow({ ...rowValue(row), [field]: !rowValue(row)[field] });
    await saveRows([next], `Updated ${next.pincode}.`);
  };

  const removePincode = async (row) => {
    if (!window.confirm(`Remove ${row.pincode}${row.area_name ? ` (${row.area_name})` : ""} from the delivery whitelist?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await onDelete(TABLES.DELIVERY_PINCODES, row.id, "id", "DELETE");
      await onReload();
      setSuccess(`Removed ${row.pincode}.`);
    } catch (err) {
      setError(formatWorkspaceError(err));
    } finally {
      setBusy(false);
    }
  };

  /** Accepts "175101", "175101, Kullu" or "175101, Kullu, Kullu" per line. */
  const importBulk = async () => {
    const lines = safeText(bulkText).split(/[\n;]+/).map((line) => safeText(line)).filter(Boolean);
    if (!lines.length) {
      setError("Paste at least one pincode.");
      return;
    }
    const existing = new Set(rows.map((row) => row.pincode));
    const seen = new Set();
    const payload = [];
    const rejected = [];
    lines.forEach((line) => {
      const parts = line.split(",").map((part) => safeText(part));
      const pincode = normalizePincode(parts[0]);
      if (!isValidPincode(pincode) || seen.has(pincode)) {
        if (!seen.has(pincode)) rejected.push(parts[0] || line);
        return;
      }
      seen.add(pincode);
      const previous = rows.find((row) => row.pincode === pincode);
      payload.push(normalizeRow({
        ...(previous || EMPTY_DRAFT),
        id: previous?.id || pincodeRowId(pincode),
        pincode,
        area_name: parts[1] || previous?.area_name || "",
        city: parts[2] || previous?.city || parts[1] || "",
        district: parts[3] || previous?.district || "",
        state: parts[4] || previous?.state || EMPTY_DRAFT.state
      }));
    });
    if (!payload.length) {
      setError("No valid 6-digit pincodes found in that list.");
      return;
    }
    const added = payload.filter((row) => !existing.has(row.pincode)).length;
    const updated = payload.length - added;
    await saveRows(
      payload,
      `Imported ${payload.length} pincode${payload.length === 1 ? "" : "s"} (${added} new, ${updated} updated)` +
      (rejected.length ? ` — skipped ${rejected.length} invalid entr${rejected.length === 1 ? "y" : "ies"}.` : ".")
    );
    setBulkText("");
    setBulkOpen(false);
  };

  const exportCsv = () => {
    downloadCsv(
      "delivery-pincodes.csv",
      filteredRows.map((row) => ({ ...row, food_enabled: String(row.food_enabled), mart_enabled: String(row.mart_enabled), cod_enabled: String(row.cod_enabled), active: String(row.active) })),
      CSV_COLUMNS
    );
  };

  return (
    <div className="pincode-workspace">
      <div className="card">
        <div className="filters" style={{ flexWrap: "wrap", gap: 8 }}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pincode, area, or city..."
            style={{ minWidth: 240 }}
          />
          <select className="input" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={{ maxWidth: 160 }}>
            {SERVICE_FILTERS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <div className="badge">{stats.total} pincodes</div>
          <div className="badge">{stats.food} food</div>
          <div className="badge">{stats.mart} mart</div>
          <button type="button" className="btn" onClick={() => setBulkOpen((prev) => !prev)}>
            {bulkOpen ? "Close bulk import" : "Bulk import"}
          </button>
          <button type="button" className="btn" onClick={exportCsv} disabled={!filteredRows.length}>Export CSV</button>
          {dirtyIds.length ? (
            <button type="button" className="btn primary" disabled={busy} onClick={saveAllEdits}>
              {busy ? "Saving..." : `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? "" : "s"}`}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="mv-error">{error}</div> : null}
      {success ? <div className="mv-success">{success}</div> : null}
      {!rows.length && !error ? (
        <div className="mv-success">
          The whitelist is empty, so <strong>delivery is currently unrestricted</strong> — every pincode is accepted at
          checkout. Add your first serviceable pincode below to start enforcing it.
        </div>
      ) : null}

      {bulkOpen ? (
        <div className="card" style={{ display: "grid", gap: 8 }}>
          <div>
            <label className="small">Bulk import — one per line as <code>pincode, area, city, district, state</code> (area onward optional)</label>
            <textarea
              className="input"
              rows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"175101, Kullu, Kullu, Kullu, Himachal Pradesh\n175125, Bhuntar, Bhuntar"}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn primary" disabled={busy} onClick={importBulk}>
              {busy ? "Importing..." : "Import pincodes"}
            </button>
            <button type="button" className="btn" onClick={() => { setBulkText(""); setBulkOpen(false); }}>Cancel</button>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>Add serviceable pincode</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <div>
            <label className="small">Pincode *</label>
            <input
              className="input"
              value={draft.pincode}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setDraft((prev) => ({ ...prev, pincode: normalizePincode(e.target.value) }))}
              placeholder="175101"
            />
          </div>
          <div>
            <label className="small">Area / locality</label>
            <input className="input" value={draft.area_name} onChange={(e) => setDraft((prev) => ({ ...prev, area_name: e.target.value }))} placeholder="Kullu" />
          </div>
          <div>
            <label className="small">City</label>
            <input className="input" value={draft.city} onChange={(e) => setDraft((prev) => ({ ...prev, city: e.target.value }))} placeholder="Kullu" />
          </div>
          <div>
            <label className="small">District</label>
            <input className="input" value={draft.district} onChange={(e) => setDraft((prev) => ({ ...prev, district: e.target.value }))} placeholder="Kullu" />
          </div>
          <div>
            <label className="small">State</label>
            <input className="input" value={draft.state} onChange={(e) => setDraft((prev) => ({ ...prev, state: e.target.value }))} placeholder="Himachal Pradesh" />
          </div>
          <div>
            <label className="small">Delivery fee (₹)</label>
            <input className="input" type="number" min="0" value={draft.delivery_fee} onChange={(e) => setDraft((prev) => ({ ...prev, delivery_fee: e.target.value }))} />
          </div>
          <div>
            <label className="small">Min order (₹)</label>
            <input className="input" type="number" min="0" value={draft.min_order_value} onChange={(e) => setDraft((prev) => ({ ...prev, min_order_value: e.target.value }))} />
          </div>
          <div>
            <label className="small">ETA (mins)</label>
            <input className="input" type="number" min="0" value={draft.eta_minutes} onChange={(e) => setDraft((prev) => ({ ...prev, eta_minutes: e.target.value }))} />
          </div>
          <div>
            <label className="small">Notes</label>
            <input className="input" value={draft.notes} onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Within 5 km delivery range" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <label className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={draft.food_enabled} onChange={(e) => setDraft((prev) => ({ ...prev, food_enabled: e.target.checked }))} />
            Food delivery
          </label>
          <label className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={draft.mart_enabled} onChange={(e) => setDraft((prev) => ({ ...prev, mart_enabled: e.target.checked }))} />
            Mart delivery
          </label>
          <label className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={draft.cod_enabled} onChange={(e) => setDraft((prev) => ({ ...prev, cod_enabled: e.target.checked }))} />
            Cash on delivery
          </label>
          <label className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft((prev) => ({ ...prev, active: e.target.checked }))} />
            Active
          </label>
          <button type="button" className="btn primary" disabled={busy} onClick={addPincode}>
            {busy ? "Saving..." : "Add pincode"}
          </button>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Pincode</th>
              <th>Area</th>
              <th>City</th>
              <th>State</th>
              <th>Food</th>
              <th>Mart</th>
              <th>Fee ₹</th>
              <th>Min ₹</th>
              <th>ETA</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const value = rowValue(row);
              const dirty = !!edits[row.id];
              return (
                <tr key={row.id} style={dirty ? { background: "rgba(13, 106, 69, 0.06)" } : undefined}>
                  <td style={{ fontWeight: 800 }}>{value.pincode}</td>
                  <td>
                    <input className="input" value={value.area_name} onChange={(e) => editRow(row, { area_name: e.target.value })} style={{ minWidth: 120 }} />
                  </td>
                  <td>
                    <input className="input" value={value.city} onChange={(e) => editRow(row, { city: e.target.value })} style={{ minWidth: 110 }} />
                  </td>
                  <td>
                    <input className="input" value={value.state} onChange={(e) => editRow(row, { state: e.target.value })} style={{ minWidth: 120 }} />
                  </td>
                  <td>
                    <input type="checkbox" checked={value.food_enabled} disabled={busy} onChange={() => toggleField(row, "food_enabled")} />
                  </td>
                  <td>
                    <input type="checkbox" checked={value.mart_enabled} disabled={busy} onChange={() => toggleField(row, "mart_enabled")} />
                  </td>
                  <td>
                    <input className="input" type="number" min="0" value={value.delivery_fee} onChange={(e) => editRow(row, { delivery_fee: e.target.value })} style={{ width: 84 }} />
                  </td>
                  <td>
                    <input className="input" type="number" min="0" value={value.min_order_value} onChange={(e) => editRow(row, { min_order_value: e.target.value })} style={{ width: 84 }} />
                  </td>
                  <td>
                    <input className="input" type="number" min="0" value={value.eta_minutes} onChange={(e) => editRow(row, { eta_minutes: e.target.value })} style={{ width: 74 }} />
                  </td>
                  <td>
                    <input type="checkbox" checked={value.active} disabled={busy} onChange={() => toggleField(row, "active")} />
                  </td>
                  <td>
                    <button type="button" className="btn danger small" disabled={busy} onClick={() => removePincode(row)}>Remove</button>
                  </td>
                </tr>
              );
            })}
            {!filteredRows.length ? (
              <tr><td colSpan={11} className="small">No pincodes match this filter.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
