import React, { useEffect, useMemo, useState } from "react";
import { FaCopy, FaGlobeAsia, FaRedo, FaSave, FaServer, FaTachometerAlt } from "react-icons/fa";

function defaultDashboardControls() {
  return {
    platformEnabled: true,
    forceOpsPage: false,
    opsPageOnError: true,
    opsMessage: "Ops! Service temporarily unavailable. Please try again shortly.",
    appTabs: {
      travel: true,
      taxi: true,
      bike: true,
      food: true,
      mart: true,
      services: true
    },
    vendorDashboards: {
      admin: true,
      travel: true,
      food: true,
      support: true,
      mart_vendor: true
    }
  };
}

function normalizeControls(raw) {
  const d = defaultDashboardControls();
  const src = raw && typeof raw === "object" ? raw : {};
  const appTabs = src.appTabs && typeof src.appTabs === "object" ? src.appTabs : {};
  const vendorDashboards = src.vendorDashboards && typeof src.vendorDashboards === "object" ? src.vendorDashboards : {};
  return {
    platformEnabled: src.platformEnabled !== false,
    forceOpsPage: src.forceOpsPage === true,
    opsPageOnError: src.opsPageOnError !== false,
    opsMessage: String(src.opsMessage || d.opsMessage),
    appTabs: {
      travel: appTabs.travel !== false,
      taxi: appTabs.taxi !== false,
      bike: appTabs.bike !== false,
      food: appTabs.food !== false,
      mart: appTabs.mart !== false,
      services: appTabs.services !== false
    },
    vendorDashboards: {
      admin: vendorDashboards.admin !== false,
      travel: vendorDashboards.travel !== false,
      food: vendorDashboards.food !== false,
      support: vendorDashboards.support !== false,
      mart_vendor: vendorDashboards.mart_vendor !== false
    }
  };
}

function ToggleRow({ label, hint, value, onChange }) {
  return (
    <label className="dc-toggle-row">
      <div className="dc-toggle-copy">
        <span className="dc-toggle-label">{label}</span>
        {hint ? <span className="dc-toggle-hint">{hint}</span> : null}
      </div>
      <input className="dc-toggle-input" type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function UrlRow({ label, value, onCopy }) {
  return (
    <div className="dc-url-row">
      <div className="dc-url-copy">
        <div className="dc-url-label">{label}</div>
        <div className="dc-url-value">{value || "—"}</div>
      </div>
      <button className="btn small" type="button" onClick={() => onCopy(value)} disabled={!value}>
        <FaCopy /> Copy
      </button>
    </div>
  );
}

export default function DashboardControlsWorkspace({ snapshot, onReload, onUpsert, TABLES, safeJsonParse, http, section = "all" }) {
  const byName = useMemo(() => new Map((snapshot?.tables || []).map((t) => [t.name, t])), [snapshot?.generatedAt]);
  const settingsRow = useMemo(() => {
    const rows = byName.get(TABLES.SETTINGS)?.rows || [];
    return Array.isArray(rows) && rows[0] ? rows[0] : { id: "main", currency: "INR", tax_rules: {}, pricing_tiers: [], page_slugs: {} };
  }, [byName, TABLES.SETTINGS]);

  const [controls, setControls] = useState(defaultDashboardControls());
  const [dashboardUrls, setDashboardUrls] = useState({
    admin: "",
    travel: "",
    food: "",
    support: "",
    mart_vendor: "",
    driver: "",
    food_vendor: ""
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copiedLabel, setCopiedLabel] = useState("");

  useEffect(() => {
    const taxRules = (settingsRow?.tax_rules && typeof settingsRow.tax_rules === "object")
      ? settingsRow.tax_rules
      : (safeJsonParse(settingsRow?.tax_rules || "") || {});
    const raw = (taxRules?.dashboardControls && typeof taxRules.dashboardControls === "object")
      ? taxRules.dashboardControls
      : ((taxRules?.dashboard_controls && typeof taxRules.dashboard_controls === "object") ? taxRules.dashboard_controls : {});
    setControls(normalizeControls(raw));
  }, [settingsRow, safeJsonParse]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof http === "function") {
          const payload = await http("/api/admin/ui/paths");
          const abs = payload?.absolute && typeof payload.absolute === "object" ? payload.absolute : {};
          if (mounted) {
            setDashboardUrls({
              admin: String(abs?.admin || ""),
              travel: String(abs?.travel || ""),
              food: String(abs?.food || ""),
              support: String(abs?.support || ""),
              mart_vendor: String(abs?.mart_vendor || ""),
              driver: String(abs?.driver || ""),
              food_vendor: String(abs?.food_vendor || "")
            });
          }
          return;
        }
      } catch {
        // fallback below
      }
      if (typeof window !== "undefined") {
        const origin = String(window.location.origin || "");
        const currentPath = String(window.location.pathname || "/");
        if (mounted) {
          setDashboardUrls({
            admin: `${origin}${currentPath}`,
            travel: `${origin}${currentPath}/travel`,
            food: `${origin}${currentPath}/food`,
            support: `${origin}${currentPath}/support`,
            mart_vendor: `${origin}${currentPath}/mart-vendor`,
            driver: `${origin}/driver`,
            food_vendor: `${origin}/restaurant-vendor`
          });
        }
      }
    })();
    return () => { mounted = false; };
  }, [http]);

  const setTab = (k, v) => setControls((p) => ({ ...p, appTabs: { ...p.appTabs, [k]: !!v } }));
  const setVendorDash = (k, v) => setControls((p) => ({ ...p, vendorDashboards: { ...p.vendorDashboards, [k]: !!v } }));

  const appEnabledCount = Object.values(controls.appTabs || {}).filter(Boolean).length;
  const dashboardEnabledCount = Object.values(controls.vendorDashboards || {}).filter(Boolean).length;
  const totalUrlCount = Object.values(dashboardUrls || {}).filter((v) => String(v || "").trim()).length;
  const tableStats = useMemo(() => {
    const rows = Array.isArray(snapshot?.tables) ? snapshot.tables : [];
    return rows
      .map((t) => ({
        name: String(t?.name || ""),
        rowCount: Array.isArray(t?.rows) ? t.rows.length : 0
      }))
      .filter((t) => t.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [snapshot?.tables, snapshot?.generatedAt]);

  const showControls = section === "all" || section === "controls";
  const showUrls = section === "all" || section === "urls";
  const showTables = section === "all" || section === "tables";

  const copyUrl = async (value) => {
    const text = String(value || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLabel("URL copied");
      setTimeout(() => setCopiedLabel(""), 1400);
    } catch {
      setCopiedLabel("Copy failed");
      setTimeout(() => setCopiedLabel(""), 1600);
    }
  };

  const saveControls = async () => {
    const existingTaxRules = (settingsRow?.tax_rules && typeof settingsRow.tax_rules === "object")
      ? settingsRow.tax_rules
      : (safeJsonParse(settingsRow?.tax_rules || "") || {});
    const row = {
      ...settingsRow,
      id: settingsRow?.id || "main",
      tax_rules: {
        ...(existingTaxRules || {}),
        dashboardControls: normalizeControls(controls)
      }
    };
    setBusy(true);
    setMsg("");
    try {
      await onUpsert(TABLES.SETTINGS, [row]);
      await onReload();
      setMsg("Saved dashboard and ops controls.");
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dc-shell mt-12">
      <div className="dc-top-cards">
        <article className="dc-top-card">
          <div className="dc-top-icon"><FaTachometerAlt /></div>
          <div className="dc-top-copy">
            <div className="dc-top-label">App Modules</div>
            <div className="dc-top-value">{appEnabledCount}/6</div>
            <div className="dc-top-note">Enabled in consumer app</div>
          </div>
        </article>
        <article className="dc-top-card">
          <div className="dc-top-icon"><FaGlobeAsia /></div>
          <div className="dc-top-copy">
            <div className="dc-top-label">Dashboards</div>
            <div className="dc-top-value">{dashboardEnabledCount}/5</div>
            <div className="dc-top-note">Currently active</div>
          </div>
        </article>
        <article className="dc-top-card">
          <div className={`dc-top-icon ${controls.platformEnabled ? "ok" : "warn"}`}><FaServer /></div>
          <div className="dc-top-copy">
            <div className="dc-top-label">Platform Mode</div>
            <div className="dc-top-value">{controls.platformEnabled ? "Online" : "Ops Only"}</div>
            <div className="dc-top-note">{totalUrlCount} dashboard URLs available</div>
          </div>
        </article>
      </div>

      <div className="dc-hero">
        <div>
          <h3 className="m-0">Dashboard Controls</h3>
          <div className="small mt-6">Manage global availability, module visibility, and URL access points from one place.</div>
        </div>
        <div className="dc-hero-stats">
          <span className="dc-pill"><FaTachometerAlt /> Modules {appEnabledCount}/6</span>
          <span className="dc-pill"><FaGlobeAsia /> Dashboards {dashboardEnabledCount}/5</span>
          <span className={`dc-pill ${controls.platformEnabled ? "ok" : "warn"}`}><FaServer /> {controls.platformEnabled ? "Platform ON" : "Platform OFF"}</span>
        </div>
      </div>

      <div className="dc-grid">
        {showControls ? (
          <section className="dc-card">
            <h4 className="m-0">Platform Safety</h4>
            <div className="dc-stack mt-10">
              <ToggleRow label="Enable Entire Platform" hint="Master switch for all dashboards and consumer app." value={controls.platformEnabled} onChange={(v) => setControls((p) => ({ ...p, platformEnabled: !!v }))} />
              <ToggleRow label="Force Ops Page For Everyone" hint="Immediately route all users to Ops fallback screen." value={controls.forceOpsPage} onChange={(v) => setControls((p) => ({ ...p, forceOpsPage: !!v }))} />
              <ToggleRow label="Show Ops Page On Server Errors" hint="Render fallback UI when backend returns service errors." value={controls.opsPageOnError} onChange={(v) => setControls((p) => ({ ...p, opsPageOnError: !!v }))} />
              <div className="field full">
                <label>Ops Message</label>
                <textarea className="textarea" value={controls.opsMessage} onChange={(e) => setControls((p) => ({ ...p, opsMessage: e.target.value }))} />
              </div>
            </div>
          </section>
        ) : null}

        {showControls ? (
          <section className="dc-card">
            <h4 className="m-0">Consumer App Modules</h4>
            <div className="dc-stack mt-10">
              <ToggleRow label="Travel" value={controls.appTabs.travel} onChange={(v) => setTab("travel", v)} />
              <ToggleRow label="Taxi" value={controls.appTabs.taxi} onChange={(v) => setTab("taxi", v)} />
              <ToggleRow label="Bike" value={controls.appTabs.bike} onChange={(v) => setTab("bike", v)} />
              <ToggleRow label="Food" value={controls.appTabs.food} onChange={(v) => setTab("food", v)} />
              <ToggleRow label="Mart" value={controls.appTabs.mart} onChange={(v) => setTab("mart", v)} />
              <ToggleRow label="Duty/Services" value={controls.appTabs.services} onChange={(v) => setTab("services", v)} />
            </div>
          </section>
        ) : null}

        {showControls ? (
          <section className="dc-card">
            <h4 className="m-0">Vendor & Admin Dashboards</h4>
            <div className="dc-stack mt-10">
              <ToggleRow label="Admin Dashboard" value={controls.vendorDashboards.admin} onChange={(v) => setVendorDash("admin", v)} />
              <ToggleRow label="Travel Dashboard" value={controls.vendorDashboards.travel} onChange={(v) => setVendorDash("travel", v)} />
              <ToggleRow label="FOOD | MART | DUTY" value={controls.vendorDashboards.food} onChange={(v) => setVendorDash("food", v)} />
              <ToggleRow label="Support Dashboard" value={controls.vendorDashboards.support} onChange={(v) => setVendorDash("support", v)} />
              <ToggleRow label="Mart Vendor Dashboard" value={controls.vendorDashboards.mart_vendor} onChange={(v) => setVendorDash("mart_vendor", v)} />
            </div>
          </section>
        ) : null}

        {showUrls ? (
          <section className="dc-card dc-card-full">
            <h4 className="m-0">Dashboard URLs</h4>
            <div className="small mt-6">Use these direct links for each panel. Copy and share with your ops team.</div>
            <div className="dc-stack mt-10">
              <UrlRow label="Admin Dashboard URL" value={dashboardUrls.admin} onCopy={copyUrl} />
              <UrlRow label="Travel Dashboard URL" value={dashboardUrls.travel} onCopy={copyUrl} />
              <UrlRow label="FOOD | MART | DUTY URL" value={dashboardUrls.food} onCopy={copyUrl} />
              <UrlRow label="Support Dashboard URL" value={dashboardUrls.support} onCopy={copyUrl} />
              <UrlRow label="Mart Vendor Dashboard URL" value={dashboardUrls.mart_vendor} onCopy={copyUrl} />
              <UrlRow label="Driver Dashboard URL" value={dashboardUrls.driver} onCopy={copyUrl} />
              <UrlRow label="Food Vendor Dashboard URL" value={dashboardUrls.food_vendor} onCopy={copyUrl} />
            </div>
          </section>
        ) : null}

        {showTables ? (
          <section className="dc-card dc-card-full">
            <h4 className="m-0">Connected Tables</h4>
            <div className="small mt-6">Live table list from the current backend snapshot.</div>
            <div className="table-wrap mt-10">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Table Name</th>
                    <th>Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {tableStats.map((t, idx) => (
                    <tr key={t.name}>
                      <td>{idx + 1}</td>
                      <td>{t.name}</td>
                      <td>{t.rowCount}</td>
                    </tr>
                  ))}
                  {!tableStats.length ? <tr><td colSpan={3} className="small">No tables found in snapshot.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      <div className="flex-gap10-wrap mt-12">
        {showControls ? <button className="btn primary" onClick={saveControls} disabled={busy}><FaSave /> {busy ? "Saving..." : "Save Controls"}</button> : null}
        <button className="btn" onClick={onReload} disabled={busy}><FaRedo /> Reload</button>
      </div>
      {copiedLabel ? <div className="small mt-10">{copiedLabel}</div> : null}
      {msg ? <div className="small mt-10">{msg}</div> : null}
    </div>
  );
}
