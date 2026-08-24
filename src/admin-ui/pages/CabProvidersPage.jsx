import React, { useMemo, useState } from "react";
import {
  FaCar,
  FaUserPlus,
  FaInbox,
  FaUsers,
  FaSearch,
  FaPhoneAlt,
  FaIdCard,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUserCircle,
  FaTable
} from "react-icons/fa";
import TaxiFaresWorkspace from "../components/TaxiFaresWorkspace";

function safeText(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function normalizeUsername(v) {
  return safeText(v).toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function parseRequestNotes(notes) {
  const text = safeText(notes);
  const out = {};
  text.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = safeText(line.slice(0, idx));
    const value = safeText(line.slice(idx + 1));
    if (key) out[key] = value;
  });
  return out;
}

function rowTimeValue(row) {
  const t = safeText(row?.createdAt || row?.created_at || row?.updatedAt || row?.updated_at || "");
  const ms = Date.parse(t);
  return Number.isFinite(ms) ? ms : 0;
}

function statusKind(status) {
  const s = safeText(status).toLowerCase();
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";
  if (s === "disabled") return "disabled";
  return "pending";
}

function statusLabel(status) {
  const s = safeText(status).toLowerCase();
  return s ? s : "pending";
}

function StatusPill({ status }) {
  const kind = statusKind(status);
  const Icon = kind === "approved" ? FaCheckCircle : kind === "rejected" ? FaTimesCircle : kind === "disabled" ? FaTimesCircle : FaClock;
  return (
    <span className={`cp-status-pill ${kind}`}>
      <Icon /> {statusLabel(status)}
    </span>
  );
}

function initials(text) {
  const matches = String(text || "").match(/\b\w/g) || [];
  return matches.slice(0, 2).join("").toUpperCase() || "?";
}

function tintColor(text) {
  const palette = ["#2f9d72", "#0ea5e9", "#a855f7", "#ec4899", "#f59e0b", "#ef4444", "#14b8a6", "#6366f1"];
  const code = String(text || "?").charCodeAt(0) || 0;
  return palette[code % palette.length];
}

export default function CabProvidersPage({ snapshot, onReload, TABLES, http }) {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestDrafts, setRequestDrafts] = useState({});
  const [driverDrafts, setDriverDrafts] = useState({});
  const [activeTab, setActiveTab] = useState("rate_lists");
  const [driverSearch, setDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("all");
  const [expandedDriverId, setExpandedDriverId] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    username: "",
    password: "",
    phone: "",
    email: "",
    vehicleType: "ordinary",
    carName: "",
    vehicleNumber: "",
    licenseNumber: "",
    notes: ""
  });

  const tablesByName = useMemo(() => {
    const map = new Map();
    (snapshot?.tables || []).forEach((t) => map.set(t?.name, t));
    return map;
  }, [snapshot]);

  const requests = useMemo(() => {
    const rows = tablesByName.get(TABLES.DRIVER_REG_REQUESTS)?.rows || [];
    return [...rows].sort((a, b) => rowTimeValue(b) - rowTimeValue(a));
  }, [tablesByName, TABLES]);

  const rateLists = useMemo(() => {
    const rows = tablesByName.get(TABLES.TAXI_FARES)?.rows || [];
    return [...rows].sort((a, b) => rowTimeValue(b) - rowTimeValue(a));
  }, [tablesByName, TABLES]);

  const drivers = useMemo(() => {
    return tablesByName.get(TABLES.DRIVERS)?.rows || [];
  }, [tablesByName, TABLES]);

  const driverVehicles = useMemo(() => {
    return tablesByName.get(TABLES.DRIVER_VEHICLES)?.rows || [];
  }, [tablesByName, TABLES]);

  const vehicleByDriverId = useMemo(() => {
    const map = new Map();
    (driverVehicles || []).forEach((v) => {
      const driverId = safeText(v?.driverId || v?.driver_id);
      if (driverId) map.set(driverId, v);
    });
    return map;
  }, [driverVehicles]);

  const driverByReqId = useMemo(() => {
    const map = new Map();
    (drivers || []).forEach((d) => {
      const reqId = safeText(d?.registrationRequestId || d?.registration_request_id);
      if (reqId) map.set(reqId, d);
    });
    return map;
  }, [drivers]);

  const stats = useMemo(() => {
    const pendingRequests = requests.filter((r) => statusKind(r?.status) === "pending").length;
    const approvedDrivers = drivers.filter((d) => statusKind(d?.status) === "approved").length;
    const totalDrivers = drivers.length;
    const luxuryDrivers = drivers.filter((d) => {
      const v = vehicleByDriverId.get(safeText(d?.id)) || {};
      const t = safeText(v?.vehicleType || v?.viechle_cat).toLowerCase();
      return t && t !== "ordinary";
    }).length;
    return { pendingRequests, approvedDrivers, totalDrivers, luxuryDrivers, rateLists: rateLists.length };
  }, [requests, drivers, vehicleByDriverId, rateLists]);

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    return drivers.filter((d) => {
      if (driverStatusFilter !== "all" && statusKind(d?.status) !== driverStatusFilter) return false;
      if (!q) return true;
      const v = vehicleByDriverId.get(safeText(d?.id)) || {};
      const haystack = [d?.name, d?.username, d?.phone, d?.email, v?.vehicleNumber, v?.carName, v?.model]
        .map((x) => safeText(x).toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [drivers, driverSearch, driverStatusFilter, vehicleByDriverId]);

  async function submitCreateDriver(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const payload = {
      ...createForm,
      username: normalizeUsername(createForm.username)
    };
    if (!payload.name || !payload.username || !payload.password || !payload.phone || !payload.vehicleNumber || !payload.licenseNumber) {
      setErr("Name, username, password, phone, vehicle number and license number are required.");
      return;
    }
    setBusy(true);
    try {
      await http("/api/driver/admin/create", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setMsg("Driver created and approved.");
      setCreateForm({
        name: "",
        username: "",
        password: "",
        phone: "",
        email: "",
        vehicleType: "ordinary",
        carName: "",
        vehicleNumber: "",
        licenseNumber: "",
        notes: ""
      });
      setActiveTab("drivers");
      await onReload?.();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  async function reviewRequest(row, action) {
    const requestId = safeText(row?.id);
    if (!requestId) return;
    const draft = requestDrafts[requestId] || {};
    const username = normalizeUsername(draft.username);
    const password = safeText(draft.password);
    const reason = safeText(draft.reason);

    setErr("");
    setMsg("");
    if (action === "approve" && (!username || !password)) {
      setErr("Username and password are required to approve a request.");
      return;
    }
    setBusy(true);
    try {
      await http(`/api/driver/registrations/${encodeURIComponent(requestId)}/review`, {
        method: "POST",
        body: JSON.stringify({
          action,
          username,
          password,
          reason
        })
      });
      setMsg(action === "approve" ? "Driver request approved." : "Driver request rejected.");
      await onReload?.();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  function driverDraftFor(row) {
    const id = safeText(row?.id);
    const cached = driverDrafts[id];
    if (cached) return cached;
    const vehicle = vehicleByDriverId.get(id) || {};
    return {
      name: safeText(row?.name),
      username: normalizeUsername(row?.username),
      phone: safeText(row?.phone),
      email: safeText(row?.email),
      status: safeText(row?.status || "approved"),
      active: row?.active !== false,
      vehicleType: safeText(vehicle?.vehicleType || vehicle?.viechle_cat || "ordinary"),
      carName: safeText(vehicle?.model || vehicle?.carName || ""),
      vehicleNumber: safeText(vehicle?.vehicleNumber || ""),
      licenseNumber: "",
      notes: "",
      password: ""
    };
  }

  async function saveDriver(row) {
    const id = safeText(row?.id);
    if (!id) return;
    const draft = driverDraftFor(row);
    setErr("");
    setMsg("");
    if (!safeText(draft.name) || !normalizeUsername(draft.username) || !safeText(draft.phone)) {
      setErr("Driver name, username, and phone are required.");
      return;
    }
    setBusy(true);
    try {
      await http(`/api/admin/drivers/${encodeURIComponent(id)}/update`, {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          username: normalizeUsername(draft.username)
        })
      });
      setMsg(`Driver ${safeText(draft.name)} updated.`);
      setDriverDrafts((p) => ({ ...p, [id]: { ...draft, password: "" } }));
      await onReload?.();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cp-page">
      <div className="cp-header">
        <div className="cp-header-text">
          <h2><FaCar /> Cab Providers</h2>
          <p>Manage taxi stand rate lists, driver accounts, registration requests, and onboard new partners.</p>
        </div>
      </div>

      <div className="cp-stat-grid">
        <div className="cp-stat-card cp-accent-green">
          <div className="cp-stat-label">Total Drivers</div>
          <div className="cp-stat-value">{stats.totalDrivers}</div>
          <div className="cp-stat-icon"><FaUsers /></div>
        </div>
        <div className="cp-stat-card cp-accent-blue">
          <div className="cp-stat-label">Approved</div>
          <div className="cp-stat-value">{stats.approvedDrivers}</div>
          <div className="cp-stat-icon"><FaCheckCircle /></div>
        </div>
        <div className="cp-stat-card cp-accent-amber">
          <div className="cp-stat-label">Pending Requests</div>
          <div className="cp-stat-value">{stats.pendingRequests}</div>
          <div className="cp-stat-icon"><FaInbox /></div>
        </div>
        <div className="cp-stat-card cp-accent-purple">
          <div className="cp-stat-label">Taxi Fares</div>
          <div className="cp-stat-value">{stats.rateLists}</div>
          <div className="cp-stat-icon"><FaTable /></div>
        </div>
      </div>

      {msg ? <div className="cp-banner success"><FaCheckCircle /> {msg}</div> : null}
      {err ? <div className="cp-banner error"><FaTimesCircle /> {err}</div> : null}

      <div className="cp-tabs">
        <button type="button" className={`cp-tab ${activeTab === "rate_lists" ? "active" : ""}`} onClick={() => setActiveTab("rate_lists")}>
          <FaTable /> Taxi Fares <span className="cp-tab-count">{stats.rateLists}</span>
        </button>
        <button type="button" className={`cp-tab ${activeTab === "drivers" ? "active" : ""}`} onClick={() => setActiveTab("drivers")}>
          <FaUsers /> Drivers <span className="cp-tab-count">{drivers.length}</span>
        </button>
        <button type="button" className={`cp-tab ${activeTab === "requests" ? "active" : ""}`} onClick={() => setActiveTab("requests")}>
          <FaInbox /> Requests <span className="cp-tab-count">{stats.pendingRequests}</span>
        </button>
        <button type="button" className={`cp-tab ${activeTab === "add" ? "active" : ""}`} onClick={() => setActiveTab("add")}>
          <FaUserPlus /> Add Driver
        </button>
      </div>

      {activeTab === "rate_lists" ? (
        <div className="cp-section">
          <TaxiFaresWorkspace rateLists={rateLists} http={http} onReload={onReload} />
        </div>
      ) : null}

      {activeTab === "drivers" ? (
        <div className="cp-section">
          <div className="cp-toolbar">
            <div className="cp-search">
              <FaSearch />
              <input
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                placeholder="Search by name, username, phone, vehicle..."
              />
            </div>
            <div className="cp-filter-group">
              {["all", "approved", "pending", "rejected", "disabled"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`cp-filter-chip ${driverStatusFilter === s ? "active" : ""}`}
                  onClick={() => setDriverStatusFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="cp-result-count">{filteredDrivers.length} of {drivers.length}</div>
          </div>

          {filteredDrivers.length ? (
            <div className="cp-table-wrap">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th className="col-driver">Driver</th>
                    <th>Username</th>
                    <th>Phone</th>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map((d) => {
                    const id = safeText(d?.id);
                    const draft = driverDraftFor(d);
                    const tint = tintColor(draft.name || id);
                    const isExpanded = expandedDriverId === id;
                    return (
                      <React.Fragment key={id}>
                        <tr className={`cp-row ${isExpanded ? "expanded" : ""}`}>
                          <td className="col-driver">
                            <div className="cp-cell-driver">
                              <div className="cp-avatar sm" style={{ background: `linear-gradient(135deg, ${tint} 0%, ${tint}cc 100%)` }}>
                                {initials(draft.name || draft.username || "Driver")}
                              </div>
                              <div className="cp-cell-driver-text">
                                <div className="cp-cell-name">{safeText(d?.name) || "Driver"}</div>
                                <div className="cp-cell-sub">{safeText(id).slice(0, 14)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="cp-mono">@{safeText(d?.username) || <span className="cp-dim">—</span>}</td>
                          <td className="cp-mono">{safeText(d?.phone) || <span className="cp-dim">—</span>}</td>
                          <td className="cp-mono">{safeText(draft.vehicleNumber) || <span className="cp-dim">—</span>}</td>
                          <td><span className="cp-chip muted">{safeText(draft.vehicleType) || "ordinary"}</span></td>
                          <td><StatusPill status={d?.status} /></td>
                          <td className="col-actions">
                            <button
                              type="button"
                              className="btn small"
                              onClick={() => setExpandedDriverId(isExpanded ? "" : id)}
                            >
                              {isExpanded ? "Close" : "Edit"}
                            </button>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="cp-expand-row">
                            <td colSpan={7}>
                              <div className="cp-expand-panel">
                                <div className="cp-form-grid">
                                  <div className="cp-field"><label>Name</label><input className="cp-input" value={safeText(draft.name)} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], name: e.target.value } }))} /></div>
                                  <div className="cp-field"><label>Username</label><input className="cp-input" value={safeText(draft.username)} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], username: normalizeUsername(e.target.value) } }))} /></div>
                                  <div className="cp-field"><label>Phone</label><input className="cp-input" value={safeText(draft.phone)} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], phone: e.target.value } }))} /></div>
                                  <div className="cp-field"><label>Email</label><input className="cp-input" value={safeText(draft.email)} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], email: e.target.value } }))} /></div>
                                  <div className="cp-field"><label>Status</label><select className="cp-input" value={safeText(draft.status || "approved")} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], status: e.target.value } }))}><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option><option value="disabled">disabled</option></select></div>
                                  <div className="cp-field"><label>Active</label><select className="cp-input" value={draft.active === false ? "false" : "true"} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], active: e.target.value === "true" } }))}><option value="true">active</option><option value="false">inactive</option></select></div>
                                  <div className="cp-field"><label>Vehicle Type</label><select className="cp-input" value={safeText(draft.vehicleType || "ordinary")} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], vehicleType: e.target.value } }))}><option value="ordinary">ordinary</option><option value="luxury">luxury</option><option value="suv">suv</option><option value="traveller">traveller</option></select></div>
                                  <div className="cp-field"><label>Car Name</label><input className="cp-input" value={safeText(draft.carName)} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], carName: e.target.value } }))} /></div>
                                  <div className="cp-field"><label>Vehicle Number</label><input className="cp-input" value={safeText(draft.vehicleNumber)} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], vehicleNumber: e.target.value } }))} /></div>
                                  <div className="cp-field"><label>License Number</label><input className="cp-input" value={safeText(draft.licenseNumber)} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], licenseNumber: e.target.value } }))} /></div>
                                  <div className="cp-field"><label>New Password (optional)</label><input className="cp-input" type="password" value={safeText(draft.password)} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], password: e.target.value } }))} /></div>
                                  <div className="cp-field full"><label>Notes</label><input className="cp-input" value={safeText(draft.notes)} onChange={(e) => setDriverDrafts((p) => ({ ...p, [id]: { ...driverDraftFor(d), ...p[id], notes: e.target.value } }))} /></div>
                                </div>
                                <div className="cp-card-footer">
                                  <button type="button" className="btn small" onClick={() => setExpandedDriverId("")}>Cancel</button>
                                  <button type="button" className="btn small primary" disabled={busy} onClick={() => saveDriver(d)}>Save Driver</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cp-empty">
              <FaUserCircle />
              <div className="cp-empty-title">{drivers.length ? "No drivers match this filter" : "No drivers yet"}</div>
              <div className="cp-empty-text">{drivers.length ? "Try a different search or status filter." : "Add a driver from the Add Driver tab to get started."}</div>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "requests" ? (
        <div className="cp-section">
          {requests.length ? (
            <div className="cp-driver-list">
              {requests.map((r) => {
                const reqId = safeText(r?.id);
                const linkedDriver = driverByReqId.get(reqId) || {};
                const draft = requestDrafts[reqId] || {};
                const status = safeText(r?.status || "pending").toLowerCase();
                const requestType = safeText(r?.vehicleType).toLowerCase() === "phone_change_request" ? "phone_change" : "registration";
                const requestMeta = parseRequestNotes(r?.notes);
                const tint = tintColor(safeText(r?.name) || reqId);
                return (
                  <div key={reqId} className="cp-driver-card">
                    <div className="cp-driver-head">
                      <div className="cp-driver-identity">
                        <div className="cp-avatar" style={{ background: `linear-gradient(135deg, ${tint} 0%, ${tint}cc 100%)` }}>
                          {initials(safeText(r?.name) || "Driver")}
                        </div>
                        <div className="cp-driver-meta">
                          <div className="cp-driver-name">
                            {requestType === "phone_change" ? `Phone Change · ${safeText(r?.name) || "Driver"}` : (safeText(r?.name) || "Driver Request")}
                          </div>
                          <div className="cp-driver-sub">{requestType === "phone_change" ? "Verify and update phone in driver record" : "Awaiting review"}</div>
                          <div className="cp-driver-chips">
                            {requestType === "phone_change" ? (
                              <>
                                <span className="cp-chip"><FaPhoneAlt /> {safeText(requestMeta.currentPhone) || safeText(r?.vehicleNumber) || "-"} → {safeText(requestMeta.requestedPhone) || safeText(r?.phone) || "-"}</span>
                                {safeText(requestMeta.username) || safeText(linkedDriver?.username) ? <span className="cp-chip muted">@{safeText(requestMeta.username) || safeText(linkedDriver?.username)}</span> : null}
                              </>
                            ) : (
                              <>
                                {safeText(r?.phone) ? <span className="cp-chip"><FaPhoneAlt /> {safeText(r?.phone)}</span> : null}
                                {safeText(r?.vehicleNumber) ? <span className="cp-chip"><FaCar /> {safeText(r?.vehicleNumber)}</span> : null}
                                {safeText(r?.licenseNumber) ? <span className="cp-chip"><FaIdCard /> {safeText(r?.licenseNumber)}</span> : null}
                                {safeText(r?.vehicleType) ? <span className="cp-chip muted">{safeText(r?.vehicleType)}</span> : null}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <StatusPill status={status} />
                    </div>

                    {status === "pending" && requestType !== "phone_change" ? (
                      <>
                        <div className="cp-form-grid">
                          <div className="cp-field">
                            <label>Username</label>
                            <input className="cp-input" value={safeText(draft.username)} onChange={(e) => setRequestDrafts((p) => ({ ...p, [reqId]: { ...p[reqId], username: normalizeUsername(e.target.value) } }))} placeholder="set_username" />
                          </div>
                          <div className="cp-field">
                            <label>Password</label>
                            <input className="cp-input" type="password" value={safeText(draft.password)} onChange={(e) => setRequestDrafts((p) => ({ ...p, [reqId]: { ...p[reqId], password: e.target.value } }))} placeholder="set_password" />
                          </div>
                          <div className="cp-field full">
                            <label>Rejection Reason (if rejecting)</label>
                            <input className="cp-input" value={safeText(draft.reason)} onChange={(e) => setRequestDrafts((p) => ({ ...p, [reqId]: { ...p[reqId], reason: e.target.value } }))} />
                          </div>
                        </div>
                        <div className="cp-card-footer">
                          <button className="btn small primary" type="button" disabled={busy} onClick={() => reviewRequest(r, "approve")}>
                            <FaCheckCircle /> Approve
                          </button>
                          <button className="btn small danger" type="button" disabled={busy} onClick={() => reviewRequest(r, "reject")}>
                            <FaTimesCircle /> Reject
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cp-empty">
              <FaInbox />
              <div className="cp-empty-title">No driver requests</div>
              <div className="cp-empty-text">Pending registration and phone-change requests will appear here.</div>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "add" ? (
        <div className="cp-section">
          <form className="cp-add-card" onSubmit={submitCreateDriver}>
            <div className="cp-add-head">
              <div>
                <div className="cp-add-title"><FaUserPlus /> New driver</div>
                <div className="cp-add-sub">Admin sets the driver's username and password. The driver cannot change the username later.</div>
              </div>
              <button className="btn primary" type="submit" disabled={busy}>{busy ? "Creating..." : "Create Driver"}</button>
            </div>

            <div className="cp-form-section">
              <div className="cp-form-section-title">Identity</div>
              <div className="cp-form-grid">
                <div className="cp-field"><label>Name *</label><input className="cp-input" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required /></div>
                <div className="cp-field"><label>Username *</label><input className="cp-input" value={createForm.username} onChange={(e) => setCreateForm((p) => ({ ...p, username: normalizeUsername(e.target.value) }))} placeholder="driver_username" required /></div>
                <div className="cp-field"><label>Password *</label><input className="cp-input" type="password" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} required /></div>
                <div className="cp-field"><label>Phone *</label><input className="cp-input" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+9198..." required /></div>
                <div className="cp-field"><label>Email</label><input className="cp-input" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} /></div>
              </div>
            </div>

            <div className="cp-form-section">
              <div className="cp-form-section-title">Vehicle</div>
              <div className="cp-form-grid">
                <div className="cp-field">
                  <label>Vehicle Type</label>
                  <select className="cp-input" value={createForm.vehicleType} onChange={(e) => setCreateForm((p) => ({ ...p, vehicleType: e.target.value }))}>
                    <option value="ordinary">Ordinary</option>
                    <option value="luxury">Luxury</option>
                    <option value="suv">SUV</option>
                    <option value="traveller">Traveller</option>
                  </select>
                </div>
                <div className="cp-field"><label>Car Name</label><input className="cp-input" value={createForm.carName} onChange={(e) => setCreateForm((p) => ({ ...p, carName: e.target.value }))} /></div>
                <div className="cp-field"><label>Vehicle Number *</label><input className="cp-input" value={createForm.vehicleNumber} onChange={(e) => setCreateForm((p) => ({ ...p, vehicleNumber: e.target.value }))} required /></div>
                <div className="cp-field"><label>License Number *</label><input className="cp-input" value={createForm.licenseNumber} onChange={(e) => setCreateForm((p) => ({ ...p, licenseNumber: e.target.value }))} required /></div>
                <div className="cp-field full"><label>Notes</label><textarea className="cp-input cp-textarea" rows={2} value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} /></div>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
