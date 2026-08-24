import React, { useEffect, useMemo, useState } from "react";
import * as FaIcons from "react-icons/fa";
import { downloadCsv } from "./csvExport";

const DEFAULT_DUTY_ICON = "FaTools";
const ICON_GALLERY_LIMIT = 160;

// The customer app renders duty icons through AppIcon, which only resolves
// FontAwesome ("Fa...") names for duty services, so the picker stays on Fa icons.
const ICON_OPTIONS = Object.keys(FaIcons)
  .filter((key) => /^Fa[A-Z][A-Za-z0-9]*$/.test(key))
  .sort((a, b) => a.localeCompare(b));

const ICON_OPTION_SET = new Set(ICON_OPTIONS);

const DUTY_CATEGORY_OPTIONS = [
  { id: "repairs_installation", label: "Repairs" },
  { id: "home_projects", label: "Home Projects" },
  { id: "cleaning_care", label: "Cleaning & Care" },
  { id: "moving_mobility", label: "Moving & Mobility" },
  { id: "events_lifestyle", label: "Events & Lifestyle" }
];

function safeText(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function slugifyId(value) {
  const slug = safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return slug || `duty_${Date.now().toString(36)}`;
}

function sanitizeIconName(value, fallback = DEFAULT_DUTY_ICON) {
  const icon = safeText(value);
  if (!icon) return fallback;
  if (!/^Fa[A-Z][A-Za-z0-9]*$/.test(icon)) return fallback;
  return icon;
}

function isKnownIcon(value) {
  return ICON_OPTION_SET.has(safeText(value));
}

function IconPreview({ name, size = 18, color = "#2f9d72" }) {
  const iconName = sanitizeIconName(name, "");
  const IconComp = iconName ? FaIcons[iconName] : null;
  if (!IconComp) return <span aria-hidden="true">?</span>;
  return <IconComp size={size} color={color} />;
}

function categoryLabelFromId(value) {
  const raw = safeText(value);
  if (!raw) return "";
  const preset = DUTY_CATEGORY_OPTIONS.find((option) => option.id === raw);
  if (preset) return preset.label;
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [""];
  const next = value.map((item) => safeText(item));
  return next.length ? next : [""];
}

function normalizeProviders(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (!list.length) {
    return [{
      id: `provider_${Date.now().toString(36)}`,
      name: "",
      phone_numbers: [""],
      locations: [""]
    }];
  }
  return list.map((provider, index) => ({
    id: safeText(provider?.id) || `provider_${index + 1}`,
    name: safeText(provider?.name),
    phone_numbers: normalizeStringArray(Array.isArray(provider?.phone_numbers) ? provider.phone_numbers : provider?.phoneNumbers),
    locations: normalizeStringArray(provider?.locations),
  }));
}

function normalizeDutyRow(row) {
  return {
    id: safeText(row?.id),
    name: safeText(row?.name),
    description: safeText(row?.description),
    category_id: safeText(row?.category_id || row?.categoryId) || "repairs_installation",
    icon: safeText(row?.icon) || DEFAULT_DUTY_ICON,
    rating: safeText(row?.rating) || "4.5",
    response_time_mins: safeText(row?.response_time_mins || row?.responseTimeMins) || "30",
    sort_order: safeText(row?.sort_order || row?.sortOrder) || "100",
    active: row?.active !== false,
    providers: normalizeProviders(row?.providers),
  };
}

const EMPTY_DRAFT = normalizeDutyRow({});

function formatDutyWorkspaceError(err) {
  const raw = String(err?.message || err || "").trim();
  if (!raw) return "Could not save duty.";
  if (
    raw.includes("PGRST205") ||
    raw.includes("public.ev_duty_services") ||
    raw.includes("Could not find the table")
  ) {
    return "Supabase table `public.ev_duty_services` is missing. Create it first, then save again.";
  }
  return raw;
}

function starsText(value) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return { filled: "\u2605".repeat(filled), empty: "\u2605".repeat(5 - filled) };
}

export default function DutyServicesWorkspace({
  snapshot,
  TABLES,
  onUpsert,
  onDelete,
  onReload
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // In-page confirmation rather than window.confirm: a browser that has
  // suppressed dialogs for this tab returns false from confirm() without
  // showing anything, which turns the Delete button into a no-op the admin
  // cannot diagnose.
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(() => {
    const table = Array.isArray(snapshot?.tables)
      ? snapshot.tables.find((item) => item?.name === TABLES.DUTY_SERVICES)
      : null;
    const out = Array.isArray(table?.rows) ? table.rows.slice() : [];
    out.sort((a, b) => {
      const as = Number(a?.sort_order ?? a?.sortOrder ?? 9999);
      const bs = Number(b?.sort_order ?? b?.sortOrder ?? 9999);
      if (as !== bs) return as - bs;
      return safeText(a?.name).localeCompare(safeText(b?.name));
    });
    return out;
  }, [TABLES.DUTY_SERVICES, snapshot]);

  const filteredRows = useMemo(() => {
    const q = safeText(query).toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const providerBlob = Array.isArray(row?.providers)
        ? row.providers.map((provider) => JSON.stringify(provider)).join(" ")
        : "";
      return `${safeText(row?.name)} ${safeText(row?.description)} ${safeText(row?.category_id)} ${providerBlob}`.toLowerCase().includes(q);
    });
  }, [query, rows]);

  const categoryOptions = useMemo(() => {
    const byId = new Map();
    DUTY_CATEGORY_OPTIONS.forEach((option) => {
      byId.set(option.id, { id: option.id, label: option.label });
    });
    rows.forEach((row) => {
      const id = safeText(row?.category_id || row?.categoryId);
      if (!id || byId.has(id)) return;
      byId.set(id, { id, label: categoryLabelFromId(id) });
    });
    const draftCategoryId = safeText(draft.category_id);
    if (draftCategoryId && !byId.has(draftCategoryId)) {
      byId.set(draftCategoryId, { id: draftCategoryId, label: categoryLabelFromId(draftCategoryId) });
    }
    return Array.from(byId.values());
  }, [rows, draft.category_id]);

  // Customer ratings, read from ev_reviews and grouped by the duty service the
  // review was left against.
  const reviewsByServiceId = useMemo(() => {
    const table = Array.isArray(snapshot?.tables)
      ? snapshot.tables.find((item) => item?.name === TABLES.REVIEWS || item?.name === "ev_reviews")
      : null;
    const rows = Array.isArray(table?.rows) ? table.rows : [];
    const map = new Map();
    rows.forEach((row) => {
      const status = safeText(row?.status).toLowerCase();
      if (status && status !== "published") return;
      const serviceId = safeText(row?.item_id || row?.itemId || row?.service_id || row?.serviceId);
      const rating = Number(row?.rating);
      if (!serviceId || !Number.isFinite(rating) || rating <= 0) return;
      const bucket = map.get(serviceId) || { total: 0, count: 0, latest: "" };
      bucket.total += rating;
      bucket.count += 1;
      const at = safeText(row?.updated_at || row?.created_at);
      if (at > bucket.latest) bucket.latest = at;
      map.set(serviceId, bucket);
    });
    return map;
  }, [snapshot, TABLES.REVIEWS]);

  const ratingFor = (serviceId) => {
    const bucket = reviewsByServiceId.get(safeText(serviceId));
    if (!bucket || !bucket.count) return null;
    return {
      average: bucket.total / bucket.count,
      count: bucket.count,
      latest: bucket.latest
    };
  };

  const draftRating = ratingFor(draft.id);

  // Icons already saved in the duty services `icon` column, most used first.
  const iconsInUse = useMemo(() => {
    const counts = new Map();
    rows.forEach((row) => {
      const icon = sanitizeIconName(row?.icon, "");
      if (!icon) return;
      counts.set(icon, (counts.get(icon) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([icon, count]) => ({ icon, count }))
      .sort((a, b) => (b.count - a.count) || a.icon.localeCompare(b.icon));
  }, [rows]);

  const filteredIcons = useMemo(() => {
    const q = safeText(iconQuery).toLowerCase();
    if (!q) return ICON_OPTIONS;
    return ICON_OPTIONS.filter((name) => name.toLowerCase().includes(q));
  }, [iconQuery]);

  const draftIcon = safeText(draft.icon);
  const iconIsValid = isKnownIcon(draftIcon);

  useEffect(() => {
    if (selectedId === "__new__") return;
    if (selectedId && rows.some((row) => safeText(row?.id) === selectedId)) return;
    if (rows.length) {
      setSelectedId(safeText(rows[0]?.id));
      return;
    }
    setSelectedId("__new__");
  }, [rows, selectedId]);

  useEffect(() => {
    if (selectedId === "__new__") {
      setDraft(EMPTY_DRAFT);
      return;
    }
    const hit = rows.find((row) => safeText(row?.id) === selectedId);
    setDraft(hit ? normalizeDutyRow(hit) : EMPTY_DRAFT);
  }, [rows, selectedId]);

  const updateProvider = (providerIndex, updater) => {
    setDraft((prev) => {
      const providers = prev.providers.slice();
      const current = providers[providerIndex] || normalizeProviders([])[0];
      providers[providerIndex] = typeof updater === "function"
        ? updater(current)
        : { ...current, ...updater };
      return { ...prev, providers };
    });
  };

  const updateProviderArrayItem = (providerIndex, key, itemIndex, value) => {
    updateProvider(providerIndex, (provider) => {
      const nextItems = Array.isArray(provider[key]) ? provider[key].slice() : [""];
      nextItems[itemIndex] = value;
      return { ...provider, [key]: nextItems };
    });
  };

  const addProviderArrayItem = (providerIndex, key) => {
    updateProvider(providerIndex, (provider) => ({
      ...provider,
      [key]: [...(Array.isArray(provider[key]) ? provider[key] : []), ""]
    }));
  };

  const removeProviderArrayItem = (providerIndex, key, itemIndex) => {
    updateProvider(providerIndex, (provider) => {
      const current = Array.isArray(provider[key]) ? provider[key] : [];
      const next = current.filter((_, idx) => idx !== itemIndex);
      return { ...provider, [key]: next.length ? next : [""] };
    });
  };

  const addProvider = () => {
    setDraft((prev) => ({
      ...prev,
      providers: [
        ...prev.providers,
        {
          id: `provider_${Date.now().toString(36)}_${prev.providers.length + 1}`,
          name: "",
          phone_numbers: [""],
          locations: [""]
        }
      ]
    }));
  };

  const removeProvider = (providerIndex) => {
    setDraft((prev) => {
      const providers = prev.providers.filter((_, idx) => idx !== providerIndex);
      return { ...prev, providers: providers.length ? providers : normalizeProviders([]) };
    });
  };

  const pickIcon = (iconName) => {
    setDraft((prev) => ({ ...prev, icon: iconName }));
    setError("");
    setSuccess("");
  };

  const addCategory = () => {
    const label = safeText(newCategoryName);
    if (!label) {
      setError("Category name is required.");
      return;
    }
    const categoryId = slugifyId(label);
    setDraft((prev) => ({ ...prev, category_id: categoryId }));
    setNewCategoryName("");
    setError("");
    setSuccess(`Category selected: ${categoryLabelFromId(categoryId)}`);
  };

  const saveDuty = async () => {
    const name = safeText(draft.name);
    if (!name) {
      setError("Duty name is required.");
      return;
    }
    const icon = safeText(draft.icon) || DEFAULT_DUTY_ICON;
    if (!isKnownIcon(icon)) {
      setError(`Unknown icon "${icon}". Pick one from the icon gallery below.`);
      setIconPickerOpen(true);
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const row = {
        id: safeText(draft.id) || slugifyId(name),
        name,
        description: safeText(draft.description),
        category_id: safeText(draft.category_id) || "repairs_installation",
        icon,
        rating: Number(draft.rating || 0) || 4.5,
        response_time_mins: Math.max(1, Number(draft.response_time_mins || 0) || 30),
        sort_order: Math.max(0, Number(draft.sort_order || 0) || 100),
        active: draft.active !== false,
        providers: draft.providers
          .map((provider, index) => ({
            id: safeText(provider.id) || `provider_${index + 1}`,
            name: safeText(provider.name),
            phone_numbers: normalizeStringArray(provider.phone_numbers).map((value) => safeText(value)).filter(Boolean),
            locations: normalizeStringArray(provider.locations).map((value) => safeText(value)).filter(Boolean),
          }))
          .filter((provider) => provider.name || provider.phone_numbers.length || provider.locations.length),
      };
      await onUpsert(TABLES.DUTY_SERVICES, [row]);
      await onReload();
      setSelectedId(row.id);
      setSuccess(`Saved duty: ${row.name}`);
    } catch (err) {
      setError(formatDutyWorkspaceError(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteDuty = async (id) => {
    const dutyId = safeText(id || draft.id);
    if (!dutyId) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await onDelete(TABLES.DUTY_SERVICES, dutyId, "id", "DELETE");
      await onReload();
      setSelectedId("__new__");
      setSuccess("Duty deleted.");
    } catch (err) {
      setError(formatDutyWorkspaceError(err));
    } finally {
      setBusy(false);
    }
  };

  const exportDutyCsv = () => {
    const rowsForCsv = filteredRows.map((row) => ({
      id: safeText(row?.id),
      name: safeText(row?.name),
      description: safeText(row?.description),
      category_id: safeText(row?.category_id || row?.categoryId),
      icon: safeText(row?.icon),
      rating: Number(row?.rating || 0) || 0,
      response_time_mins: Number(row?.response_time_mins || row?.responseTimeMins || 0) || 0,
      sort_order: Number(row?.sort_order || row?.sortOrder || 0) || 0,
      active: row?.active !== false ? "true" : "false",
      providers: JSON.stringify(Array.isArray(row?.providers) ? row.providers : [])
    }));
    downloadCsv("duty-services.csv", rowsForCsv, ["id", "name", "description", "category_id", "icon", "rating", "response_time_mins", "sort_order", "active", "providers"]);
  };

  return (
    <div className="duty-workspace">
      <div className="card duty-toolbar">
        <div className="filters">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search duty, provider, or location..."
            style={{ minWidth: 260 }}
          />
          <div className="badge">{rows.length} duties</div>
          <button type="button" className="btn" onClick={() => { setSelectedId("__new__"); setError(""); setSuccess(""); }}>Add Duty</button>
          <button type="button" className="btn" onClick={exportDutyCsv} disabled={!filteredRows.length}>Export CSV</button>
        </div>
      </div>

      {error ? <div className="mv-error">{error}</div> : null}
      {!rows.length && !error ? (
        <div className="mv-success">
          No duty rows found yet. If saving fails, create the Supabase table <code>public.ev_duty_services</code> first and then reload this page.
        </div>
      ) : null}
      {success ? <div className="mv-success">{success}</div> : null}

      <div className="duty-split">
        <div className="card duty-list">
          {filteredRows.map((row) => {
            const dutyId = safeText(row?.id);
            const providerCount = Array.isArray(row?.providers) ? row.providers.length : 0;
            const active = selectedId === dutyId;
            const dutyName = safeText(row?.name) || dutyId;
            const initials = (dutyName.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase() || "?";
            const rowIcon = sanitizeIconName(row?.icon, "");
            const rowRating = ratingFor(row?.id);
            const RowIconComp = rowIcon ? FaIcons[rowIcon] : null;
            return (
              <button
                key={dutyId}
                className={`duty-list-item ${active ? "is-active" : ""}`}
                onClick={() => { setSelectedId(dutyId); setError(""); setSuccess(""); }}
              >
                <span className="duty-list-avatar" aria-hidden="true" title={rowIcon || initials}>
                  {RowIconComp ? <RowIconComp size={17} color="#ffffff" /> : initials}
                </span>
                <span className="duty-list-text">
                  <span className="duty-list-name">{dutyName}</span>
                  <span className="duty-list-meta">
                    {safeText(row?.category_id || "repairs_installation")} · {providerCount} pro{providerCount === 1 ? "" : "s"}
                    {rowRating ? (
                      <span className="duty-list-rating"> · {"\u2605"}{rowRating.average.toFixed(1)} ({rowRating.count})</span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
          {!filteredRows.length ? <div className="small duty-list-empty">No duties match this search.</div> : null}
        </div>

        <div className="card duty-detail">
          <div className="duty-detail-head">
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#163127" }}>{safeText(draft.name) || "New Duty"}</div>
              <div className="small">Manage duty details, rating, response time, and assigned professionals.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn primary" disabled={busy} onClick={saveDuty}>{busy ? "Saving..." : "Save Duty"}</button>
              <button type="button" className="btn danger" disabled={busy || !safeText(draft.id)} onClick={() => setDeleteTarget({ id: safeText(draft.id), name: safeText(draft.name) })}>Delete</button>
            </div>
          </div>

          <div className="duty-detail-body">

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <div>
              <label className="small">Duty Name</label>
              <input className="input" value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Plumber" />
            </div>
            <div>
              <label className="small">Duty ID</label>
              <input className="input" value={draft.id} onChange={(e) => setDraft((prev) => ({ ...prev, id: e.target.value }))} placeholder="Auto-generated from name" />
            </div>
            <div>
              <label className="small">Category</label>
              <select className="input" value={draft.category_id} onChange={(e) => setDraft((prev) => ({ ...prev, category_id: e.target.value }))}>
                {categoryOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="small">Icon</label>
              <div className="duty-icon-field">
                <span className={`duty-icon-preview ${iconIsValid ? "" : "is-invalid"}`} title={draftIcon || DEFAULT_DUTY_ICON}>
                  <IconPreview name={draftIcon} size={20} color="#ffffff" />
                </span>
                <input
                  className="input"
                  value={draft.icon}
                  onChange={(e) => setDraft((prev) => ({ ...prev, icon: e.target.value }))}
                  list="duty-icon-options"
                  placeholder="FaWrench"
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIconPickerOpen((prev) => !prev)}
                >
                  {iconPickerOpen ? "Close" : "Browse"}
                </button>
              </div>
              {draftIcon && !iconIsValid ? (
                <div className="small duty-icon-warn">Unknown icon name — the app will fall back to {DEFAULT_DUTY_ICON}.</div>
              ) : null}
            </div>
            <div>
              <label className="small">Rating</label>
              <input className="input" type="number" step="0.1" min="0" max="5" value={draft.rating} onChange={(e) => setDraft((prev) => ({ ...prev, rating: e.target.value }))} />
            </div>
            <div>
              <label className="small">Response Time (mins)</label>
              <input className="input" type="number" min="1" value={draft.response_time_mins} onChange={(e) => setDraft((prev) => ({ ...prev, response_time_mins: e.target.value }))} />
            </div>
            <div>
              <label className="small">Sort Order</label>
              <input className="input" type="number" min="0" value={draft.sort_order} onChange={(e) => setDraft((prev) => ({ ...prev, sort_order: e.target.value }))} />
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
                <input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft((prev) => ({ ...prev, active: e.target.checked }))} />
                Active duty
              </label>
            </div>
          </div>

          <div className="duty-icon-panel">
            <div className="duty-icon-panel-head">
              <div className="small" style={{ fontWeight: 800, margin: 0 }}>Icons in use</div>
              <div className="small">{iconsInUse.length} saved icon{iconsInUse.length === 1 ? "" : "s"} across {rows.length} duties</div>
            </div>
            <div className="duty-icon-chips">
              {iconsInUse.map(({ icon, count }) => (
                <button
                  key={icon}
                  type="button"
                  className={`duty-icon-chip ${draftIcon === icon ? "is-active" : ""}`}
                  onClick={() => pickIcon(icon)}
                  title={`${icon} · used by ${count} dut${count === 1 ? "y" : "ies"}`}
                >
                  <IconPreview name={icon} size={15} />
                  <span className="duty-icon-chip-name">{icon.replace(/^Fa/, "")}</span>
                  <span className="duty-icon-chip-count">{count}</span>
                </button>
              ))}
              {!iconsInUse.length ? <span className="small">No icons saved in the duty table yet.</span> : null}
            </div>

            {iconPickerOpen ? (
              <div className="duty-icon-gallery">
                <input
                  className="input"
                  value={iconQuery}
                  onChange={(e) => setIconQuery(e.target.value)}
                  placeholder="Search icon gallery (wrench, bolt, broom...)"
                />
                <div className="duty-icon-grid">
                  {filteredIcons.slice(0, ICON_GALLERY_LIMIT).map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`duty-icon-tile ${draftIcon === name ? "is-active" : ""}`}
                      onClick={() => pickIcon(name)}
                      title={name}
                    >
                      <IconPreview name={name} size={18} />
                    </button>
                  ))}
                </div>
                <div className="small">
                  {!filteredIcons.length
                    ? "No icons match this search."
                    : filteredIcons.length > ICON_GALLERY_LIMIT
                      ? `Showing ${ICON_GALLERY_LIMIT} of ${filteredIcons.length} icons — refine the search to see more.`
                      : `${filteredIcons.length} icon${filteredIcons.length === 1 ? "" : "s"}`}
                </div>
              </div>
            ) : null}
          </div>

          <div className="duty-rating-panel">
            {draftRating ? (
              <>
                <span className="duty-rating-score">
                  {draftRating.average.toFixed(1)}<span>/ 5</span>
                </span>
                <span className="duty-rating-stars">
                  {starsText(draftRating.average).filled}
                  <span className="is-empty">{starsText(draftRating.average).empty}</span>
                </span>
                <span className="small">
                  {draftRating.count} customer rating{draftRating.count === 1 ? "" : "s"}
                  {draftRating.latest ? ` · last ${safeText(draftRating.latest).slice(0, 10)}` : ""}
                </span>
              </>
            ) : (
              <span className="small">
                No customer ratings yet for this duty. The Rating field above is the catalog value shown in the app.
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "end" }}>
            <div>
              <label className="small">Add Category</label>
              <input
                className="input"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Electrical Works"
              />
            </div>
            <button type="button" className="btn" onClick={addCategory}>Add Category</button>
          </div>

          <div>
            <label className="small">Description</label>
            <textarea
              className="input"
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this duty covers..."
            />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#163127" }}>Professionals</div>
              <button type="button" className="btn" onClick={addProvider}>Add Professional</button>
            </div>
            {draft.providers.map((provider, providerIndex) => (
              <div key={provider.id || providerIndex} style={{ border: "1px solid #dbe7e1", borderRadius: 16, padding: 14, display: "grid", gap: 12, background: "#fcfffd" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div className="small" style={{ fontWeight: 800 }}>Professional #{providerIndex + 1}</div>
                  <button type="button" className="btn danger" onClick={() => removeProvider(providerIndex)}>Remove</button>
                </div>
                <div>
                  <label className="small">Name</label>
                  <input className="input" value={provider.name} onChange={(e) => updateProvider(providerIndex, { name: e.target.value })} placeholder="Professional name" />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <label className="small" style={{ margin: 0 }}>Phone Numbers</label>
                    <button type="button" className="btn" onClick={() => addProviderArrayItem(providerIndex, "phone_numbers")}>Add Phone</button>
                  </div>
                  {provider.phone_numbers.map((phone, phoneIndex) => (
                    <div key={`${provider.id}_phone_${phoneIndex}`} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8 }}>
                      <input className="input" value={phone} onChange={(e) => updateProviderArrayItem(providerIndex, "phone_numbers", phoneIndex, e.target.value)} placeholder="+91..." />
                      <button type="button" className="btn danger" onClick={() => removeProviderArrayItem(providerIndex, "phone_numbers", phoneIndex)}>Remove</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <label className="small" style={{ margin: 0 }}>Locations</label>
                    <button type="button" className="btn" onClick={() => addProviderArrayItem(providerIndex, "locations")}>Add Location</button>
                  </div>
                  {provider.locations.map((location, locationIndex) => (
                    <div key={`${provider.id}_location_${locationIndex}`} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8 }}>
                      <input className="input" value={location} onChange={(e) => updateProviderArrayItem(providerIndex, "locations", locationIndex, e.target.value)} placeholder="Kullu, Bhuntar..." />
                      <button type="button" className="btn danger" onClick={() => removeProviderArrayItem(providerIndex, "locations", locationIndex)}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>

      <datalist id="duty-icon-options">
        {ICON_OPTIONS.map((name) => <option key={name} value={name} />)}
      </datalist>
      {deleteTarget ? (
        <div className="modal-backdrop" onClick={() => (busy ? null : setDeleteTarget(null))}>
          <div className="modal card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mt-0">Delete duty</h3>
            <div className="small">
              Delete <strong>{deleteTarget.name || deleteTarget.id}</strong>? The service and its provider
              contacts stop appearing in the app.
            </div>
            <div className="small mt-8"><strong>ID:</strong> {deleteTarget.id}</div>
            <div className="mt-12 flex-gap10">
              <button
                className="btn danger"
                disabled={busy}
                onClick={async () => {
                  const id = deleteTarget.id;
                  setDeleteTarget(null);
                  await deleteDuty(id);
                }}
              >
                {busy ? "Deleting..." : "Yes, delete"}
              </button>
              <button className="btn" disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
