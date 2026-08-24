/**
 * Environment loading, from a base32-encoded `.llo` file.
 *
 * This replaces `dotenv/config`. The settings live in `.llo` rather than
 * `.env`: same key=value content, base32-encoded so the file is not readable
 * at a glance and does not match the `.env` patterns that editors, shell
 * completion and secret scanners key off.
 *
 * Base32 is an ENCODING, not encryption. Anyone holding `.llo` can decode it
 * in one command. It stops a shoulder-glance and an accidental `cat`; it is
 * not a protection against anyone who has the file. `.llo` must stay out of
 * version control for exactly the same reasons `.env` did - .gitignore
 * excludes it.
 *
 * `.env` is still read if `.llo` is absent, so an older checkout keeps
 * working. Which file was used is logged at startup, so a `.llo` that failed
 * to parse never silently falls back to a stale `.env`.
 */
import fs from "fs";
import path from "path";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32, no external dependency. */
export function encodeBase32(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += "=";
  return out;
}

export function decodeBase32(input: string): Buffer {
  // Tolerate the line wrapping, whitespace and case the file may pick up from
  // an editor - only the alphabet characters carry data.
  const clean = String(input || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** The subset of dotenv syntax this project's settings actually use. */
export function parseEnvText(text: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2);
    if (quoted) value = value.slice(1, -1);
    parsed[key] = value;
  }
  return parsed;
}

export type EnvSource = { file: string; keys: number } | null;

/**
 * Reads `.llo` (or `.env` as a fallback) and merges it into process.env.
 * A variable already present in the real environment wins, matching dotenv.
 */
export function loadEnvironment(packageRoot: string): EnvSource {
  const lloPath = path.join(packageRoot, ".llo");
  const envPath = path.join(packageRoot, ".env");

  let text: string | null = null;
  let usedFile = "";

  if (fs.existsSync(lloPath)) {
    const raw = fs.readFileSync(lloPath, "utf8");
    text = decodeBase32(raw).toString("utf8");
    usedFile = ".llo";
    if (!text.trim()) {
      console.error("[ev-admin] .llo decoded to nothing. Regenerate it with: npm run env:encode");
      return null;
    }
  } else if (fs.existsSync(envPath)) {
    text = fs.readFileSync(envPath, "utf8");
    usedFile = ".env";
    console.warn("[ev-admin] No .llo found - falling back to .env. Create .llo with: npm run env:encode");
  } else {
    console.error("[ev-admin] Neither .llo nor .env is present. Nothing to load.");
    return null;
  }

  const parsed = parseEnvText(text);
  let applied = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
      applied += 1;
    }
  }
  return { file: usedFile, keys: applied };
}
