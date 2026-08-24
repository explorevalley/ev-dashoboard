import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LINK_TARGETS,
  STATUS_LABEL,
  derivePublicBase,
  formatWindow,
  fromLocalInput,
  makeRowId,
  normalizeHexColor,
  previewSrc,
  rowStatus,
  safeText,
  toInt,
  toLocalInput,
  uploadRejection,
  windowError
} from "./adsShared";

/**
 * Advertising banners for the customer app.
 *
 * One row of `ev_ad_banners` is one piece of artwork in one gap on one screen.
 * The app draws the advertiser's PNG and nothing else over it, so this panel
 * deliberately has no headline / subtitle / button-label fields: all copy has
 * to be inside the image.
 *
 * Reads and writes go through the same admin Supabase proxy every other
 * workspace uses, so the service-role key stays on the server.
 */

export const AD_BANNERS_TABLE = "ev_ad_banners";
export const AD_BANNER_STATS_TABLE = "ev_ad_banner_stats";

const UPLOAD_FOLDER = "images/ads";
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
/** Matches the app's refetch interval, quoted to the user so nobody hunts for a publish button. */
const APP_REFRESH_MINUTES = 15;

const SCREENS = Object.freeze([
  { id: "home", label: "Home" },
  { id: "food", label: "Food" },
  { id: "mart", label: "Mart" },
  { id: "travel", label: "Travel" },
  { id: "duty", label: "Duty" },
  { id: "bike", label: "Bike" }
]);

/**
 * What a "row" is on each screen, in the words whoever books the campaign uses.
 * Slot 1 is always the very top; slot N+1 sits under row N.
 */
const SCREEN_ROWS = Object.freeze({
  home: ["FreshMart", "Food Restaurants", "Hotels & Stays", "Rentals", "Duty Services"],
  mart: ["the 1st category rail", "the 2nd category rail", "the 3rd category rail", "the 4th category rail", "the 5th category rail", "the 6th category rail", "the 7th category rail", "the 8th category rail", "the 9th category rail"],
  food: ["the 1st town section", "the 2nd town section", "the 3rd town section", "the 4th town section"],
  travel: ["Tours", "Hotels", "Cottages"],
  duty: ["the 1st row of service cards", "the 2nd row of service cards", "the 3rd row of service cards"],
  bike: ["the first 4 bikes", "the next 4 bikes"]
});

/** A slot past the end is clamped by the app, so this is "at the bottom, always". */
const BOTTOM_SLOT = 99;

function screenLabel(id) {
  const hit = SCREENS.find((s) => s.id === safeText(id));
  return hit ? hit.label : safeText(id) || "—";
}

function slotOptionsForScreen(screen) {
  const rows = SCREEN_ROWS[safeText(screen)] || [];
  const options = [{ value: 1, label: `Top of ${screenLabel(screen)} — above everything` }];
  rows.forEach((row, index) => {
    options.push({ value: index + 2, label: `Under ${row}` });
  });
  options.push({ value: BOTTOM_SLOT, label: "At the bottom — whatever the screen looks like today" });
  return options;
}

function describeSlot(screen, slot) {
  const value = toInt(slot, 1);
  if (value >= BOTTOM_SLOT) return "At the bottom";
  const match = slotOptionsForScreen(screen).find((option) => option.value === value);
  return match ? match.label : `Slot ${value}`;
}

function emptyDraft(screen = "home") {
  return {
    id: "",
    screen,
    slot_index: 1,
    image_url: "",
    title: "",
    link_type: "none",
    link_target: "",
    advertiser: "",
    background_color: "#0B5A3F",
    active: true,
    starts_at: "",
    ends_at: "",
    sort_order: 0,
    notes: ""
  };
}

function draftFromRow(row) {
  return {
    id: safeText(row?.id),
    screen: safeText(row?.screen) || "home",
    slot_index: toInt(row?.slot_index, 1) || 1,
    image_url: safeText(row?.image_url),
    title: safeText(row?.title),
    link_type: safeText(row?.link_type) === "tab" ? "tab" : "none",
    link_target: safeText(row?.link_target),
    advertiser: safeText(row?.advertiser),
    background_color: normalizeHexColor(row?.background_color),
    active: row?.active !== false,
    starts_at: toLocalInput(row?.starts_at),
    ends_at: toLocalInput(row?.ends_at),
    sort_order: toInt(row?.sort_order, 0),
    notes: safeText(row?.notes)
  };
}

/** Mirrors the database constraints, so a save is never refused by the DB. */
function validateDraft(draft) {
  if (!SCREENS.some((s) => s.id === safeText(draft.screen))) return "Choose which screen this banner runs on.";
  if (toInt(draft.slot_index, 0) < 1) return "Slot must be 1 or higher.";
  if (!safeText(draft.image_url)) return "Upload the banner artwork (PNG).";
  if (draft.link_type !== "none" && draft.link_type !== "tab") return "Choose what a tap should do.";
  if (draft.link_type === "tab" && !LINK_TARGETS.some((x) => x.id === safeText(draft.link_target))) {
    return "Choose which section of the app the banner opens.";
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(safeText(draft.background_color))) return "Background colour must be a hex value like #0B5A3F.";
  return windowError(draft.starts_at, draft.ends_at);
}

function payloadFromDraft(draft) {
  return {
    id: safeText(draft.id) || makeRowId("ad"),
    screen: safeText(draft.screen),
    slot_index: toInt(draft.slot_index, 1) || 1,
    image_url: safeText(draft.image_url),
    title: safeText(draft.title),
    link_type: draft.link_type === "tab" ? "tab" : "none",
    // A target only means something for a tab link; anything else is served as
    // "does nothing", so it is stored empty rather than left stale.
    link_target: draft.link_type === "tab" ? safeText(draft.link_target) : "",
    advertiser: safeText(draft.advertiser),
    background_color: normalizeHexColor(draft.background_color),
    active: !!draft.active,
    starts_at: fromLocalInput(draft.starts_at),
    ends_at: fromLocalInput(draft.ends_at),
    sort_order: toInt(draft.sort_order, 0),
    notes: safeText(draft.notes)
  };
}

/** The 3:1 frame at roughly phone width, with the app's own "AD" pill drawn in. */
function BannerPreview({ imageUrl, background, publicBase, width = 380 }) {
  const src = previewSrc(imageUrl, publicBase);
  return (
    <div className="ad-preview-wrap" style={{ width }}>
      <div
        className="ad-preview-frame"
        style={{ background: normalizeHexColor(background), aspectRatio: "3 / 1" }}
      >
        {src ? (
          <img src={src} alt="" className="ad-preview-image" />
        ) : (
          <div className="ad-preview-empty small">PNG preview appears here</div>
        )}
        <span className="ad-preview-pill">AD</span>
      </div>
      <div className="small muted ad-preview-note">
        Shown full width at 3:1. The AD pill is drawn by the app — keep artwork clear of that corner.
      </div>
    </div>
  );
}

export default function AdBannersWorkspace({
  snapshot,
  onReload,
  onUpsert,
  onPatch,
  onDelete,
  adminApiForm,
  initialScreen = ""
}) {
  const [screenFilter, setScreenFilter] = useState(safeText(initialScreen));
  const [statusFilter, setStatusFilter] = useState("");
  const [mode, setMode] = useState("list");
  const [draft, setDraft] = useState(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const fileInputRef = useRef(null);

  const banners = useMemo(() => {
    const table = Array.isArray(snapshot?.tables)
      ? snapshot.tables.find((item) => item?.name === AD_BANNERS_TABLE)
      : null;
    const rows = Array.isArray(table?.rows) ? table.rows.slice() : [];
    return rows.sort((a, b) => {
      const screenDiff = safeText(a?.screen).localeCompare(safeText(b?.screen));
      if (screenDiff !== 0) return screenDiff;
      const slotDiff = toInt(a?.slot_index, 0) - toInt(b?.slot_index, 0);
      if (slotDiff !== 0) return slotDiff;
      return toInt(a?.sort_order, 0) - toInt(b?.sort_order, 0);
    });
  }, [snapshot]);

  /**
   * The stats view may not be exposed yet. Treating that as zeroes keeps the
   * list usable rather than blanking the whole workspace over a report column.
   */
  const statsById = useMemo(() => {
    const table = Array.isArray(snapshot?.tables)
      ? snapshot.tables.find((item) => item?.name === AD_BANNER_STATS_TABLE)
      : null;
    const rows = Array.isArray(table?.rows) ? table.rows : [];
    const map = new Map();
    rows.forEach((row) => {
      const id = safeText(row?.banner_id || row?.id);
      if (!id) return;
      map.set(id, {
        impressions: toInt(row?.impressions, 0),
        clicks: toInt(row?.clicks, 0),
        impressions7d: toInt(row?.impressions_7d, 0),
        clicks7d: toInt(row?.clicks_7d, 0)
      });
    });
    return map;
  }, [snapshot]);

  const statsFor = (id) =>
    statsById.get(safeText(id)) || { impressions: 0, clicks: 0, impressions7d: 0, clicks7d: 0 };

  const publicBase = useMemo(() => derivePublicBase(banners), [banners]);

  const visibleBanners = useMemo(() => {
    return banners.filter((row) => {
      if (screenFilter && safeText(row?.screen) !== screenFilter) return false;
      if (statusFilter && rowStatus(row) !== statusFilter) return false;
      return true;
    });
  }, [banners, screenFilter, statusFilter]);

  /**
   * Other banners already live in the slot being edited. They are not a
   * conflict — the app turns them into a carousel — but whoever is booking the
   * placement should know they are sharing it before they save.
   */
  const slotCompanions = useMemo(() => {
    if (mode === "list") return [];
    const screen = safeText(draft.screen);
    const slot = toInt(draft.slot_index, 1);
    return banners.filter((row) =>
      safeText(row?.id) !== safeText(draft.id) &&
      safeText(row?.screen) === screen &&
      toInt(row?.slot_index, 0) === slot &&
      rowStatus(row) === "live"
    );
  }, [banners, draft.screen, draft.slot_index, draft.id, mode]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const patchDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const openCreate = () => {
    setError("");
    setDraft(emptyDraft(screenFilter || "home"));
    setMode("create");
  };

  const openEdit = (row) => {
    setError("");
    setDraft(draftFromRow(row));
    setMode("edit");
  };

  /** Same creative, new placement: the id is dropped so a save inserts a row. */
  const openDuplicate = (row) => {
    setError("");
    setDraft({ ...draftFromRow(row), id: "", title: `${safeText(row?.title) || "Banner"} (copy)` });
    setMode("create");
  };

  const closeForm = () => {
    setMode("list");
    setError("");
    setDraft(emptyDraft());
  };

  const uploadArtwork = async (file) => {
    if (!file) return;
    if (typeof adminApiForm !== "function") {
      setError("Uploads are unavailable in this build.");
      return;
    }
    // Checked on the file itself rather than the extension, so a renamed JPEG
    // is caught before it reaches the bucket.
    const rejection = uploadRejection(file, "image/png", MAX_UPLOAD_BYTES);
    if (rejection) {
      setError(rejection);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("folder", UPLOAD_FOLDER);
      const json = await adminApiForm("/api/admin/upload-image", { method: "POST", body: fd });
      const url = safeText(json?.url || json?.path);
      if (!url) throw new Error("UPLOAD_FAILED");
      patchDraft({ image_url: url });
      setNotice("Artwork uploaded.");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const onDropArtwork = (event) => {
    event.preventDefault();
    const file = event?.dataTransfer?.files?.[0];
    if (file) void uploadArtwork(file);
  };

  const save = async () => {
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onUpsert(AD_BANNERS_TABLE, [payloadFromDraft(draft)]);
      await onReload();
      setNotice(`Saved. Phones pick this up within about ${APP_REFRESH_MINUTES} minutes.`);
      closeForm();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row) => {
    setBusy(true);
    setError("");
    try {
      // Pausing a banner flips one boolean. Rebuilding the whole payload from
      // the row meant the toggle also rewrote its artwork, copy, schedule and
      // placement from the last snapshot.
      const rowId = safeText(row?.id);
      if (onPatch && rowId) {
        await onPatch(AD_BANNERS_TABLE, rowId, { active: !row?.active });
      } else {
        await onUpsert(AD_BANNERS_TABLE, [{ ...payloadFromDraft(draftFromRow(row)), active: !row?.active }]);
      }
      await onReload();
      setNotice(row?.active ? "Banner paused." : "Banner switched on.");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const removeBanner = async (row) => {
    setBusy(true);
    setError("");
    try {
      await onDelete(AD_BANNERS_TABLE, safeText(row?.id), "id", "DELETE");
      await onReload();
      setConfirmDeleteId("");
      setNotice("Banner deleted.");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const totals = useMemo(() => {
    return visibleBanners.reduce(
      (acc, row) => {
        const stats = statsFor(row?.id);
        acc.impressions += stats.impressions;
        acc.clicks += stats.clicks;
        if (rowStatus(row) === "live") acc.live += 1;
        return acc;
      },
      { impressions: 0, clicks: 0, live: 0 }
    );
  }, [visibleBanners, statsById]);

  const ctr = (clicks, impressions) =>
    impressions > 0 ? `${((clicks / impressions) * 100).toFixed(1)}%` : "—";

  if (mode !== "list") {
    const slotOptions = slotOptionsForScreen(draft.screen);
    const slotIsCustom = !slotOptions.some((option) => option.value === toInt(draft.slot_index, 1));
    return (
      <div className="card ad-banner-form">
        <div className="row mb-8">
          <h3 className="m-0">{mode === "edit" ? "Edit banner" : "New banner"}</h3>
          <div className="actions">
            <button type="button" className="btn small ghost" onClick={closeForm} disabled={busy}>Cancel</button>
            <button type="button" className="btn small primary" onClick={save} disabled={busy}>
              {busy ? "Saving..." : "Save banner"}
            </button>
          </div>
        </div>

        {error ? <div className="warn mb-8">{error}</div> : null}

        <div className="grid-2">
          <div>
            <div className="field">
              <label>Artwork (PNG, 1200×400)</label>
              <div
                className="ad-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDropArtwork}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="small">Drop a PNG here, or click to choose one.</div>
                <div className="small muted">Landscape 3:1. Transparency is fine — the background colour shows through.</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                className="hidden-input"
                onChange={(e) => {
                  const file = e?.target?.files?.[0];
                  if (file) void uploadArtwork(file);
                  if (e?.target) e.target.value = "";
                }}
              />
            </div>

            <div className="field">
              <label>Image URL or path</label>
              <input
                className="input"
                value={draft.image_url}
                onChange={(e) => patchDraft({ image_url: e.target.value })}
                placeholder="images/ads/banner.png"
              />
              <div className="small muted">
                Uploading fills this in. A bare path works too — the app resolves both.
              </div>
            </div>

            <div className="field">
              <label>Background colour</label>
              <div className="row">
                <input
                  type="color"
                  value={normalizeHexColor(draft.background_color)}
                  onChange={(e) => patchDraft({ background_color: e.target.value })}
                />
                <input
                  className="input"
                  value={draft.background_color}
                  onChange={(e) => patchDraft({ background_color: e.target.value })}
                  placeholder="#0B5A3F"
                />
              </div>
              <div className="small muted">Sits behind a transparent PNG, and in the letterbox around one.</div>
            </div>
          </div>

          <div>
            <BannerPreview
              imageUrl={draft.image_url}
              background={draft.background_color}
              publicBase={publicBase}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Screen</label>
            <select
              className="input"
              value={draft.screen}
              onChange={(e) => patchDraft({ screen: e.target.value, slot_index: 1 })}
            >
              {SCREENS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Where on that screen</label>
            <select
              className="input"
              value={slotIsCustom ? "custom" : String(toInt(draft.slot_index, 1))}
              onChange={(e) => {
                if (e.target.value === "custom") return;
                patchDraft({ slot_index: toInt(e.target.value, 1) });
              }}
            >
              {slotOptions.map((option) => (
                <option key={option.value} value={String(option.value)}>{option.label}</option>
              ))}
              {slotIsCustom ? <option value="custom">Slot {toInt(draft.slot_index, 1)} (custom)</option> : null}
            </select>
            <div className="small muted">
              A slot past the end of the screen is not dropped — the app moves it to the last position.
            </div>
          </div>
        </div>

        {slotCompanions.length ? (
          <div className="warn mb-8">
            {slotCompanions.length === 1 ? "1 live banner already sits" : `${slotCompanions.length} live banners already sit`}
            {" "}in {screenLabel(draft.screen)} · {describeSlot(draft.screen, draft.slot_index)} —
            {" "}{slotCompanions.map((row) => safeText(row?.title) || safeText(row?.advertiser) || safeText(row?.id)).join(", ")}.
            {" "}They will share the gap as a carousel, ordered by sort order.
          </div>
        ) : null}

        <div className="grid-2">
          <div className="field">
            <label>Internal name</label>
            <input
              className="input"
              value={draft.title}
              onChange={(e) => patchDraft({ title: e.target.value })}
              placeholder="Diwali — Himalayan Coffee"
            />
            <div className="small muted">Never drawn in the app. For finding this row again.</div>
          </div>

          <div className="field">
            <label>Advertiser</label>
            <input
              className="input"
              value={draft.advertiser}
              onChange={(e) => patchDraft({ advertiser: e.target.value })}
              placeholder="Who bought it"
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>When tapped</label>
            <select
              className="input"
              value={draft.link_type}
              onChange={(e) => patchDraft({ link_type: e.target.value, link_target: e.target.value === "tab" ? draft.link_target : "" })}
            >
              <option value="none">Does nothing</option>
              <option value="tab">Open a section of the app</option>
            </select>
            <div className="small muted">A banner never opens a browser, dials or messages — by design.</div>
          </div>

          <div className="field">
            <label>Section to open</label>
            <select
              className="input"
              value={draft.link_target}
              disabled={draft.link_type !== "tab"}
              onChange={(e) => patchDraft({ link_target: e.target.value })}
            >
              <option value="">Choose a section…</option>
              {LINK_TARGETS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Starts</label>
            <input
              className="input"
              type="datetime-local"
              value={draft.starts_at}
              onChange={(e) => patchDraft({ starts_at: e.target.value })}
            />
            <div className="small muted">Leave empty to start straight away.</div>
          </div>

          <div className="field">
            <label>Ends</label>
            <input
              className="input"
              type="datetime-local"
              value={draft.ends_at}
              onChange={(e) => patchDraft({ ends_at: e.target.value })}
            />
            <div className="small muted">
              {draft.ends_at ? "Stops automatically at this time." : "Empty = runs until you stop it."}
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Slide order in the slot</label>
            <input
              className="input"
              type="number"
              value={draft.sort_order}
              onChange={(e) => patchDraft({ sort_order: toInt(e.target.value, 0) })}
            />
            <div className="small muted">Lower runs first when a slot holds several banners.</div>
          </div>

          <div className="field">
            <label>Live</label>
            <select
              className="input"
              value={draft.active ? "yes" : "no"}
              onChange={(e) => patchDraft({ active: e.target.value === "yes" })}
            >
              <option value="yes">On — serve inside the campaign window</option>
              <option value="no">Off — never serve</option>
            </select>
          </div>
        </div>

        <div className="field full">
          <label>Booking notes</label>
          <textarea
            className="input"
            rows={3}
            value={draft.notes}
            onChange={(e) => patchDraft({ notes: e.target.value })}
            placeholder="Anything the next person needs to know about this campaign."
          />
        </div>

        <div className="small muted">
          There is no publish step. A saved change reaches phones within about {APP_REFRESH_MINUTES} minutes.
        </div>
      </div>
    );
  }

  return (
    <div className="ad-banners-workspace">
      <div className="card mb-8">
        <div className="row mb-8">
          <h3 className="m-0">Ad Banners</h3>
          <div className="actions">
            <button type="button" className="btn small" onClick={() => onReload?.()} disabled={busy}>Refresh</button>
            <button type="button" className="btn small primary" onClick={openCreate} disabled={busy}>New banner</button>
          </div>
        </div>

        <div className="small muted mb-8">
          Banners are served by screen and position. An empty slot renders nothing at all in the app —
          no box, no gap — so a screen with no campaign is normal. Changes go live within about {APP_REFRESH_MINUTES} minutes;
          there is no publish button.
        </div>

        <div className="row mb-8 ad-filter-row">
          <button
            type="button"
            className={`tab${screenFilter === "" ? " active" : ""}`}
            onClick={() => setScreenFilter("")}
          >
            All screens
          </button>
          {SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`tab${screenFilter === s.id ? " active" : ""}`}
              onClick={() => setScreenFilter(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="row mb-8 ad-filter-row">
          <button
            type="button"
            className={`tab${statusFilter === "" ? " active" : ""}`}
            onClick={() => setStatusFilter("")}
          >
            Any status
          </button>
          {Object.keys(STATUS_LABEL).map((key) => (
            <button
              key={key}
              type="button"
              className={`tab${statusFilter === key ? " active" : ""}`}
              onClick={() => setStatusFilter(key)}
            >
              {STATUS_LABEL[key]}
            </button>
          ))}
        </div>

        <div className="small">
          {visibleBanners.length} banner{visibleBanners.length === 1 ? "" : "s"} · {totals.live} live ·
          {" "}{totals.impressions.toLocaleString()} impressions · {totals.clicks.toLocaleString()} clicks ·
          {" "}CTR {ctr(totals.clicks, totals.impressions)}
        </div>
      </div>

      {error ? <div className="warn mb-8">{error}</div> : null}
      {notice ? <div className="small mb-8">{notice}</div> : null}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Artwork</th>
                <th>Placement</th>
                <th>Advertiser</th>
                <th>Window</th>
                <th>Status</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th>Last 7 days</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleBanners.length === 0 ? (
                <tr>
                  <td colSpan={10} className="small muted">
                    No banners match this filter. Nothing is broken — an empty slot simply renders nothing in the app.
                  </td>
                </tr>
              ) : visibleBanners.map((row) => {
                const stats = statsFor(row?.id);
                const status = rowStatus(row);
                const src = previewSrc(row?.image_url, publicBase);
                return (
                  <tr key={safeText(row?.id)}>
                    <td>
                      <div
                        className="ad-thumb"
                        style={{ background: normalizeHexColor(row?.background_color) }}
                      >
                        {src ? <img src={src} alt="" className="ad-thumb-image" /> : <span className="small">—</span>}
                      </div>
                      <div className="small muted">{safeText(row?.title) || "Untitled"}</div>
                    </td>
                    <td>
                      <div>{screenLabel(row?.screen)}</div>
                      <div className="small muted">{describeSlot(row?.screen, row?.slot_index)}</div>
                      <div className="small muted">
                        {safeText(row?.link_type) === "tab"
                          ? `Opens ${safeText(row?.link_target) || "—"}`
                          : "Does nothing on tap"}
                      </div>
                    </td>
                    <td>{safeText(row?.advertiser) || "—"}</td>
                    <td className="small">{formatWindow(row)}</td>
                    <td>
                      <span className={`badge${status === "live" ? " green" : status === "paused" || status === "expired" ? " warn" : ""}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td>{stats.impressions.toLocaleString()}</td>
                    <td>{stats.clicks.toLocaleString()}</td>
                    <td>{ctr(stats.clicks, stats.impressions)}</td>
                    <td className="small">
                      {stats.impressions7d.toLocaleString()} imp · {stats.clicks7d.toLocaleString()} clicks
                    </td>
                    <td>
                      <div className="actions">
                        <button type="button" className="btn xs" onClick={() => openEdit(row)} disabled={busy}>Edit</button>
                        <button type="button" className="btn xs" onClick={() => toggleActive(row)} disabled={busy}>
                          {row?.active ? "Pause" : "Activate"}
                        </button>
                        <button type="button" className="btn xs" onClick={() => openDuplicate(row)} disabled={busy}>Duplicate</button>
                        {confirmDeleteId === safeText(row?.id) ? (
                          <>
                            <button type="button" className="btn xs danger" onClick={() => removeBanner(row)} disabled={busy}>
                              Confirm
                            </button>
                            <button type="button" className="btn xs ghost" onClick={() => setConfirmDeleteId("")} disabled={busy}>
                              Keep
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn xs danger"
                            onClick={() => setConfirmDeleteId(safeText(row?.id))}
                            disabled={busy}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      {confirmDeleteId === safeText(row?.id) ? (
                        <div className="small warn">Deleting also removes its impression and click history.</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-8">
        <div className="small muted">
          Impressions are counted once per artwork per app session, so read them as
          &ldquo;sessions that saw it&rdquo; rather than times on screen.
        </div>
      </div>
    </div>
  );
}
