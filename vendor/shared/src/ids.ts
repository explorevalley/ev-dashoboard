/**
 * Display name used when a customer has not told us their name.
 *
 * Never falls back to the phone number or email — those are personal
 * identifiers and end up rendered in the UI and in vendor-facing order
 * notifications. The 4-character suffix is derived from `seed` (the user id or
 * phone), so the same customer always gets the same handle instead of a new one
 * on every profile write.
 */
export function defaultDisplayName(seed?: string | null) {
  const text = String(seed ?? "").trim();
  if (!text) {
    return `user${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`;
  }
  // FNV-1a: tiny, dependency-free, and stable across server and client.
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `user${hash.toString(36).slice(-4).padStart(4, "0")}`;
}

/** True when `value` is a phone number / email being used as a display name. */
export function isPlaceholderDisplayName(value: any, phone?: string | null, email?: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (text.toLowerCase() === "user") return true;
  const digits = text.replace(/\D/g, "");
  // "+919876543210", "9876543210" — a name that is only digits/phone punctuation.
  if (digits.length >= 8 && /^[+\d\s()-]+$/.test(text)) return true;
  const phoneDigits = String(phone ?? "").replace(/\D/g, "");
  if (phoneDigits && digits && digits.endsWith(phoneDigits.slice(-10))) return true;
  if (email && text.toLowerCase() === String(email).trim().toLowerCase()) return true;
  return false;
}

export function makeId(prefix: string) {
  // Avoid predictable IDs (timestamp + short random) to reduce enumeration risk.
  // Use Web Crypto if available (browser), else Node crypto.
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) {
    return `${prefix}_${g.crypto.randomUUID().replace(/-/g, "")}`;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { randomUUID } = require("crypto") as { randomUUID: () => string };
    if (typeof randomUUID === "function") {
      return `${prefix}_${randomUUID().replace(/-/g, "")}`;
    }
  } catch {
    // ignore
  }
  // Last-resort fallback (older JS runtimes): still include more entropy than before.
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`;
}
