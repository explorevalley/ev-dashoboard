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
 * Operator-written cards at the front of a screen's sliding rail.
 *
 * The rail itself is built by the app out of the catalogue — a shelf's own copy,
 * the first photo it can find, a count. A row here is a card written by hand and
 * put in front of those, which is the whole point: the built-in cards are also
 * how a shopper moves between tabs and how Travel switches its filter, so they
 * are never replaced, only led.
 *
 * Unlike an ad banner, the app lays this out: the badge, headline, subtitle and
 * button all come from these fields, and `image_url` is a photo cropped into the
 * card's own shape rather than a finished creative.
 */

export const PROMO_CARDS_TABLE = "ev_promo_cards";

const UPLOAD_FOLDER = "images/promos";
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const APP_REFRESH_MINUTES = 15;

/** Only the three screens that have a rail at the top. */
const SCREENS = Object.freeze([
  { id: "home", label: "Home" },
  { id: "food", label: "Food" },
  { id: "travel", label: "Travel" }
]);

function screenLabel(id) {
  const hit = SCREENS.find((s) => s.id === safeText(id));
  return hit ? hit.label : safeText(id) || "—";
}

function emptyDraft(screen = "home") {
  return {
    id: "",
    screen,
    badge: "",
    title: "",
    subtitle: "",
    cta_label: "",
    image_url: "",
    background_color: "#0B5A3F",
    text_color: "#FFFFFF",
    link_target: "",
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
    badge: safeText(row?.badge),
    title: safeText(row?.title),
    // Not trimmed per-line: a newline in the value is respected by the app, so
    // the operator's line break has to survive the round trip.
    subtitle: row?.subtitle === undefined || row?.subtitle === null ? "" : String(row.subtitle),
    cta_label: safeText(row?.cta_label),
    image_url: safeText(row?.image_url),
    background_color: normalizeHexColor(row?.background_color),
    text_color: normalizeHexColor(row?.text_color, "#FFFFFF"),
    link_target: safeText(row?.link_target),
    active: row?.active !== false,
    starts_at: toLocalInput(row?.starts_at),
    ends_at: toLocalInput(row?.ends_at),
    sort_order: toInt(row?.sort_order, 0),
    notes: safeText(row?.notes)
  };
}

function validateDraft(draft) {
  if (!SCREENS.some((s) => s.id === safeText(draft.screen))) return "Choose which rail this card leads.";
  // The app can draw a card from copy alone or from artwork alone, but an empty
  // one would render as a blank tile at the front of the rail.
  if (!safeText(draft.title) && !safeText(draft.image_url)) {
    return "A card needs a headline, a photo, or both.";
  }
  if (safeText(draft.link_target) && !LINK_TARGETS.some((x) => x.id === safeText(draft.link_target))) {
    return "That destination is not one of the app's own sections.";
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(safeText(draft.background_color))) return "Card colour must be a hex value like #0B5A3F.";
  if (!/^#[0-9a-fA-F]{6}$/.test(safeText(draft.text_color))) return "Text colour must be a hex value like #FFFFFF.";
  return windowError(draft.starts_at, draft.ends_at);
}

function payloadFromDraft(draft) {
  return {
    id: safeText(draft.id) || makeRowId("promo"),
    screen: safeText(draft.screen),
    badge: safeText(draft.badge),
    title: safeText(draft.title),
    subtitle: String(draft.subtitle ?? ""),
    cta_label: safeText(draft.cta_label),
    image_url: safeText(draft.image_url),
    background_color: normalizeHexColor(draft.background_color),
    text_color: normalizeHexColor(draft.text_color, "#FFFFFF"),
    link_target: safeText(draft.link_target),
    active: !!draft.active,
    starts_at: fromLocalInput(draft.starts_at),
    ends_at: fromLocalInput(draft.ends_at),
    sort_order: toInt(draft.sort_order, 0),
    notes: safeText(draft.notes)
  };
}

/**
 * The card as the app draws it: a narrow tile, copy over the fill, the photo
 * cropped into the corner behind it. Deliberately not the wide banner frame —
 * these two things fail in different ways and need different previews.
 */
export function PromoCardPreview({ draft, publicBase, width = 190 }) {
  const src = previewSrc(draft?.image_url, publicBase);
  const ink = normalizeHexColor(draft?.text_color, "#FFFFFF");
  const subtitleLines = String(draft?.subtitle ?? "").split(/\r?\n/).filter(Boolean).slice(0, 2);
  return (
    <div className="promo-preview-wrap" style={{ width }}>
      <div className="promo-preview-card" style={{ background: normalizeHexColor(draft?.background_color) }}>
        {src ? <img src={src} alt="" className="promo-preview-photo" /> : null}
        <div className="promo-preview-body">
          {safeText(draft?.badge) ? (
            <span className="promo-preview-badge" style={{ color: ink, borderColor: ink }}>
              {safeText(draft.badge)}
            </span>
          ) : null}
          <div className="promo-preview-title" style={{ color: ink }}>
            {safeText(draft?.title) || "Headline"}
          </div>
          {subtitleLines.length ? (
            <div className="promo-preview-subtitle" style={{ color: ink }}>
              {subtitleLines.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          ) : null}
          {safeText(draft?.cta_label) ? (
            <span className="promo-preview-cta" style={{ color: normalizeHexColor(draft?.background_color) }}>
              {safeText(draft.cta_label)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="small muted promo-preview-note">
        Roughly how the app draws it. The photo is cropped into the card's shape — use a landscape
        photo, not a picture with words on it.
      </div>
    </div>
  );
}

export default function PromoCardsWorkspace({ snapshot, onReload, onUpsert, onPatch, onDelete, adminApiForm }) {
  const [screenFilter, setScreenFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [mode, setMode] = useState("list");
  const [draft, setDraft] = useState(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const fileInputRef = useRef(null);

  const cards = useMemo(() => {
    const table = Array.isArray(snapshot?.tables)
      ? snapshot.tables.find((item) => item?.name === PROMO_CARDS_TABLE)
      : null;
    const rows = Array.isArray(table?.rows) ? table.rows.slice() : [];
    return rows.sort((a, b) => {
      const screenDiff = safeText(a?.screen).localeCompare(safeText(b?.screen));
      if (screenDiff !== 0) return screenDiff;
      const orderDiff = toInt(a?.sort_order, 0) - toInt(b?.sort_order, 0);
      if (orderDiff !== 0) return orderDiff;
      return safeText(a?.id).localeCompare(safeText(b?.id));
    });
  }, [snapshot]);

  const publicBase = useMemo(() => derivePublicBase(cards), [cards]);

  const visibleCards = useMemo(() => cards.filter((row) => {
    if (screenFilter && safeText(row?.screen) !== screenFilter) return false;
    if (statusFilter && rowStatus(row) !== statusFilter) return false;
    return true;
  }), [cards, screenFilter, statusFilter]);

  /** How many written cards already lead this rail, so the order is predictable. */
  const railCompanions = useMemo(() => {
    if (mode === "list") return [];
    return cards.filter((row) =>
      safeText(row?.id) !== safeText(draft.id) &&
      safeText(row?.screen) === safeText(draft.screen) &&
      rowStatus(row) === "live"
    );
  }, [cards, draft.screen, draft.id, mode]);

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

  const openDuplicate = (row) => {
    setError("");
    setDraft({ ...draftFromRow(row), id: "", title: `${safeText(row?.title) || "Card"} (copy)` });
    setMode("create");
  };

  const closeForm = () => {
    setMode("list");
    setError("");
    setDraft(emptyDraft());
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    if (typeof adminApiForm !== "function") {
      setError("Uploads are unavailable in this build.");
      return;
    }
    // Any web image is fine here: unlike a banner this is a photo the app crops,
    // so a JPEG is usually the right choice.
    const tooBig = uploadRejection(file, "", MAX_UPLOAD_BYTES);
    if (tooBig) {
      setError(tooBig);
      return;
    }
    if (!/^image\//.test(String(file.type || ""))) {
      setError("Choose an image file.");
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
      setNotice("Photo uploaded.");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
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
      await onUpsert(PROMO_CARDS_TABLE, [payloadFromDraft(draft)]);
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
      // Pausing a card flips one boolean. Rebuilding the whole payload from
      // the row meant the toggle also rewrote its artwork, copy, schedule and
      // placement from the last snapshot.
      const rowId = safeText(row?.id);
      if (onPatch && rowId) {
        await onPatch(PROMO_CARDS_TABLE, rowId, { active: !row?.active });
      } else {
        await onUpsert(PROMO_CARDS_TABLE, [{ ...payloadFromDraft(draftFromRow(row)), active: !row?.active }]);
      }
      await onReload();
      setNotice(row?.active ? "Card paused." : "Card switched on.");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const removeCard = async (row) => {
    setBusy(true);
    setError("");
    try {
      await onDelete(PROMO_CARDS_TABLE, safeText(row?.id), "id", "DELETE");
      await onReload();
      setConfirmDeleteId("");
      setNotice("Card deleted.");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  if (mode !== "list") {
    return (
      <div className="card promo-card-form">
        <div className="row mb-8">
          <h3 className="m-0">{mode === "edit" ? "Edit promo card" : "New promo card"}</h3>
          <div className="actions">
            <button type="button" className="btn small ghost" onClick={closeForm} disabled={busy}>Cancel</button>
            <button type="button" className="btn small primary" onClick={save} disabled={busy}>
              {busy ? "Saving..." : "Save card"}
            </button>
          </div>
        </div>

        {error ? <div className="warn mb-8">{error}</div> : null}

        <div className="grid-2">
          <div>
            <div className="field">
              <label>Rail</label>
              <select className="input" value={draft.screen} onChange={(e) => patchDraft({ screen: e.target.value })}>
                {SCREENS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <div className="small muted">
                Written cards lead the rail; the app's own cards stay behind them and are never replaced.
              </div>
            </div>

            <div className="field">
              <label>Badge</label>
              <input
                className="input"
                value={draft.badge}
                onChange={(e) => patchDraft({ badge: e.target.value })}
                placeholder="FESTIVAL"
              />
              <div className="small muted">The small label across the top. Leave empty for none.</div>
            </div>

            <div className="field">
              <label>Headline</label>
              <input
                className="input"
                value={draft.title}
                onChange={(e) => patchDraft({ title: e.target.value })}
                placeholder="Kullu Dussehra is here"
              />
            </div>

            <div className="field">
              <label>Subtitle</label>
              <textarea
                className="input"
                rows={2}
                value={draft.subtitle}
                onChange={(e) => patchDraft({ subtitle: e.target.value })}
                placeholder={"One or two short lines.\nA line break here is kept."}
              />
              <div className="small muted">Two lines at most reach the card; a newline is respected.</div>
            </div>

            <div className="field">
              <label>Button text</label>
              <input
                className="input"
                value={draft.cta_label}
                onChange={(e) => patchDraft({ cta_label: e.target.value })}
                placeholder="SEE WHAT IS ON"
              />
            </div>
          </div>

          <div>
            <PromoCardPreview draft={draft} publicBase={publicBase} />

            <div className="field mt-8">
              <label>Photo</label>
              <div
                className="ad-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e?.dataTransfer?.files?.[0];
                  if (file) void uploadPhoto(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="small">Drop a landscape photo here, or click to choose one.</div>
                <div className="small muted">Roughly 4:3. A photo, not a picture with words on it — the words are the fields on the left.</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden-input"
                onChange={(e) => {
                  const file = e?.target?.files?.[0];
                  if (file) void uploadPhoto(file);
                  if (e?.target) e.target.value = "";
                }}
              />
            </div>

            <div className="field">
              <label>Photo URL or path</label>
              <input
                className="input"
                value={draft.image_url}
                onChange={(e) => patchDraft({ image_url: e.target.value })}
                placeholder="images/promos/dussehra.jpg"
              />
            </div>
          </div>
        </div>

        {railCompanions.length ? (
          <div className="warn mb-8">
            {railCompanions.length === 1 ? "1 written card already leads" : `${railCompanions.length} written cards already lead`}
            {" "}the {screenLabel(draft.screen)} rail —
            {" "}{railCompanions.map((row) => safeText(row?.title) || safeText(row?.badge) || safeText(row?.id)).join(", ")}.
            {" "}They run in sort order, ahead of the app's own cards.
          </div>
        ) : null}

        <div className="grid-2">
          <div className="field">
            <label>Card colour</label>
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
              />
            </div>
          </div>

          <div className="field">
            <label>Text colour</label>
            <div className="row">
              <input
                type="color"
                value={normalizeHexColor(draft.text_color, "#FFFFFF")}
                onChange={(e) => patchDraft({ text_color: e.target.value })}
              />
              <input
                className="input"
                value={draft.text_color}
                onChange={(e) => patchDraft({ text_color: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>When tapped</label>
            <select
              className="input"
              value={draft.link_target}
              onChange={(e) => patchDraft({ link_target: e.target.value })}
            >
              <option value="">Does nothing</option>
              {LINK_TARGETS.map((x) => <option key={x.id} value={x.id}>{`Open ${x.label}`}</option>)}
            </select>
            <div className="small muted">A card only ever moves the shopper inside the app.</div>
          </div>

          <div className="field">
            <label>Order in the rail</label>
            <input
              className="input"
              type="number"
              value={draft.sort_order}
              onChange={(e) => patchDraft({ sort_order: toInt(e.target.value, 0) })}
            />
            <div className="small muted">Lower comes first. All written cards still sit ahead of the app's own.</div>
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
              {draft.ends_at ? "Comes off the rail at this time." : "Empty = runs until you stop it."}
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Live</label>
            <select
              className="input"
              value={draft.active ? "yes" : "no"}
              onChange={(e) => patchDraft({ active: e.target.value === "yes" })}
            >
              <option value="yes">On — show inside the campaign window</option>
              <option value="no">Off — never show</option>
            </select>
          </div>

          <div className="field">
            <label>Booking notes</label>
            <input
              className="input"
              value={draft.notes}
              onChange={(e) => patchDraft({ notes: e.target.value })}
              placeholder="Anything the next person needs to know."
            />
          </div>
        </div>

        <div className="small muted">
          No publish step — a saved change reaches phones within about {APP_REFRESH_MINUTES} minutes.
        </div>
      </div>
    );
  }

  return (
    <div className="promo-cards-workspace">
      <div className="card mb-8">
        <div className="row mb-8">
          <h3 className="m-0">Promo cards</h3>
          <div className="actions">
            <button type="button" className="btn small" onClick={() => onReload?.()} disabled={busy}>Refresh</button>
            <button type="button" className="btn small primary" onClick={openCreate} disabled={busy}>New card</button>
          </div>
        </div>

        <div className="small muted mb-8">
          These cards lead the sliding rail at the top of Home, Travel and Food. The app's own cards —
          the shelves, the counts, the Travel filters — stay behind them and are never replaced,
          because those cards are also how a shopper moves between tabs. Promo cards have no slot and
          no click tracking; that is only on ad banners.
        </div>

        <div className="row mb-8 ad-filter-row">
          <button type="button" className={`tab${screenFilter === "" ? " active" : ""}`} onClick={() => setScreenFilter("")}>
            All rails
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
          <button type="button" className={`tab${statusFilter === "" ? " active" : ""}`} onClick={() => setStatusFilter("")}>
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
          {visibleCards.length} card{visibleCards.length === 1 ? "" : "s"} ·
          {" "}{visibleCards.filter((row) => rowStatus(row) === "live").length} leading a rail now
        </div>
      </div>

      {error ? <div className="warn mb-8">{error}</div> : null}
      {notice ? <div className="small mb-8">{notice}</div> : null}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Card</th>
                <th>Rail</th>
                <th>Copy</th>
                <th>Tap</th>
                <th>Window</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleCards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="small muted">
                    No promo cards here. The rail still works — it falls back to the app's own cards.
                  </td>
                </tr>
              ) : visibleCards.map((row) => {
                const status = rowStatus(row);
                return (
                  <tr key={safeText(row?.id)}>
                    <td>
                      <PromoCardPreview draft={row} publicBase={publicBase} width={130} />
                    </td>
                    <td>{screenLabel(row?.screen)}</td>
                    <td>
                      <div>{safeText(row?.title) || <span className="muted">No headline</span>}</div>
                      {safeText(row?.badge) ? <div className="small muted">{safeText(row.badge)}</div> : null}
                      {safeText(row?.cta_label) ? <div className="small muted">Button: {safeText(row.cta_label)}</div> : null}
                    </td>
                    <td className="small">
                      {safeText(row?.link_target)
                        ? `Opens ${safeText(row.link_target)}`
                        : "Does nothing"}
                    </td>
                    <td className="small">{formatWindow(row)}</td>
                    <td>{toInt(row?.sort_order, 0)}</td>
                    <td>
                      <span className={`badge${status === "live" ? " green" : status === "paused" || status === "expired" ? " warn" : ""}`}>
                        {STATUS_LABEL[status]}
                      </span>
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
                            <button type="button" className="btn xs danger" onClick={() => removeCard(row)} disabled={busy}>Confirm</button>
                            <button type="button" className="btn xs ghost" onClick={() => setConfirmDeleteId("")} disabled={busy}>Keep</button>
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
