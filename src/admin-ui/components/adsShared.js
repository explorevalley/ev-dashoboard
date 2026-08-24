/**
 * Shared ground between the two advertising sections.
 *
 * Ad banners and promo cards are different objects — one is a finished artwork
 * dropped into a gap, the other is copy the app lays out — but they are booked
 * by the same person against the same campaign windows, the same in-app
 * destinations and the same storage bucket. Keeping those here is what stops
 * the two forms disagreeing about what a valid window or a live row is.
 */

/** Everywhere a tap may go. There is deliberately no destination outside the app. */
export const LINK_TARGETS = Object.freeze([
  { id: "home", label: "Home" },
  { id: "food", label: "Food" },
  { id: "mart", label: "Mart" },
  { id: "travel", label: "Travel" },
  { id: "taxi", label: "Taxi" },
  { id: "bike", label: "Bike" },
  { id: "services", label: "Duty (Services tab)" },
  { id: "orders", label: "My Orders" }
]);

export const STATUS_LABEL = Object.freeze({
  live: "Live now",
  scheduled: "Scheduled",
  expired: "Expired",
  paused: "Paused"
});

export function safeText(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

export function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** Local datetime for `<input type="datetime-local">`, or "" for an open bound. */
export function toLocalInput(value) {
  const raw = safeText(value);
  if (!raw) return "";
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

export function fromLocalInput(value) {
  const raw = safeText(value);
  if (!raw) return null;
  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

export function formatWindow(row) {
  const start = safeText(row?.starts_at);
  const end = safeText(row?.ends_at);
  const fmt = (v) => {
    const at = new Date(v);
    return Number.isNaN(at.getTime()) ? v : at.toLocaleDateString();
  };
  if (!start && !end) return "Always on";
  if (start && !end) return `From ${fmt(start)}`;
  if (!start && end) return `Until ${fmt(end)}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * live      — switched on and inside its window right now
 * scheduled — switched on, window not open yet
 * expired   — switched on, window closed
 * paused    — switched off, whatever the window says
 */
export function rowStatus(row, now = Date.now()) {
  if (!row?.active) return "paused";
  const start = safeText(row?.starts_at) ? new Date(row.starts_at).getTime() : null;
  const end = safeText(row?.ends_at) ? new Date(row.ends_at).getTime() : null;
  if (start && Number.isFinite(start) && now < start) return "scheduled";
  if (end && Number.isFinite(end) && now > end) return "expired";
  return "live";
}

export function normalizeHexColor(value, fallback = "#0B5A3F") {
  const raw = safeText(value);
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.slice(1).split("").map((c) => c + c).join("")}`.toUpperCase();
  }
  return fallback;
}

export function makeRowId(prefix) {
  const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
}

/**
 * A row may store a full public URL or a bare bucket path — the app resolves
 * both, so the preview has to as well. The browser side has no Supabase URL of
 * its own, so the base is read back out of any row that already carries a full
 * storage URL; uploads made here always return one.
 */
export function derivePublicBase(rows, field = "image_url") {
  for (const row of rows || []) {
    const raw = safeText(row?.[field]);
    const match = raw.match(/^(https?:\/\/.+\/storage\/v1\/object\/public\/[^/]+)\//i);
    if (match) return match[1];
  }
  return "";
}

export function previewSrc(imageUrl, publicBase) {
  const raw = safeText(imageUrl);
  if (!raw) return "";
  if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(raw)) return raw;
  const base = safeText(publicBase);
  if (base) return `${base.replace(/\/+$/, "")}/${raw.replace(/^\/+/, "")}`;
  // No base to resolve against yet: same-origin, which is visibly wrong rather
  // than silently blank, so a bad path is noticed while editing.
  return `/${raw.replace(/^\/+/, "")}`;
}

/** Shared window rule, so the two forms cannot disagree with the DB constraint. */
export function windowError(startsAt, endsAt) {
  const start = fromLocalInput(startsAt);
  const end = fromLocalInput(endsAt);
  if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
    return "The end of the campaign must be after its start.";
  }
  return "";
}

/** Upload guard shared by both forms; `accept` is a mime type. */
export function uploadRejection(file, accept, maxBytes) {
  if (!file) return "Choose a file.";
  if (accept && file.type !== accept) {
    return `That file is ${file.type || "an unknown type"}. Use ${accept.replace("image/", "").toUpperCase()}.`;
  }
  if (maxBytes && file.size > maxBytes) {
    return `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Keep it under ${Math.round(maxBytes / (1024 * 1024))} MB.`;
  }
  return "";
}
