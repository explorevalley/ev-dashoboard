#!/usr/bin/env node
/**
 * Converts settings between plain `.env` and base32 `.llo`.
 *
 * The server reads `.llo`. This is how you edit it:
 *
 *   node scripts/env-llo.cjs decode     .llo  -> .env      (edit .env)
 *   node scripts/env-llo.cjs encode     .env  -> .llo      (then delete .env)
 *   node scripts/env-llo.cjs check      report on both, without writing
 *
 * Base32 is an encoding, not encryption - `decode` needs no key and neither
 * does anyone else who has the file. Keep `.llo` out of version control.
 */
const fs = require("fs");
const path = require("path");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const LLO_PATH = path.join(ROOT, ".llo");
const LINE_WIDTH = 76;

function encodeBase32(input) {
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

function decodeBase32(input) {
  const clean = String(input || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
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

function parseEnvText(text) {
  const parsed = {};
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

/** Wrapped so the file is a readable block rather than one enormous line. */
function wrap(text, width) {
  const lines = [];
  for (let i = 0; i < text.length; i += width) lines.push(text.slice(i, i + width));
  return lines.join("\n") + "\n";
}

function keySummary(text) {
  const keys = Object.keys(parseEnvText(text));
  const filled = keys.filter((k) => parseEnvText(text)[k] !== "").length;
  return `${keys.length} keys, ${filled} with a value`;
}

function doEncode() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error("[x] No .env to encode. Run `decode` first if you only have .llo.");
    process.exit(1);
  }
  const plain = fs.readFileSync(ENV_PATH, "utf8");
  const encoded = encodeBase32(plain);

  // Never write a .llo that does not decode back to exactly what went in.
  const roundTrip = decodeBase32(encoded).toString("utf8");
  if (roundTrip !== plain) {
    console.error("[x] Round-trip check failed - .llo not written. Nothing was changed.");
    process.exit(1);
  }

  fs.writeFileSync(LLO_PATH, wrap(encoded, LINE_WIDTH), "utf8");
  console.log(`[ok] .env -> .llo   ${keySummary(plain)}, ${plain.length} bytes in, ${encoded.length} base32 chars out`);
  console.log("[ok] round-trip verified");
  console.log("");
  console.log("     .env still exists in plain text. Delete it once you are happy:");
  console.log("       del .env          (or)   rm .env");
}

function doDecode() {
  if (!fs.existsSync(LLO_PATH)) {
    console.error("[x] No .llo to decode.");
    process.exit(1);
  }
  const encoded = fs.readFileSync(LLO_PATH, "utf8");
  const plain = decodeBase32(encoded).toString("utf8");
  if (!plain.trim()) {
    console.error("[x] .llo decoded to nothing. It may be truncated or corrupt.");
    process.exit(1);
  }
  if (fs.existsSync(ENV_PATH)) {
    console.error("[x] .env already exists. Move or delete it first so nothing is overwritten.");
    process.exit(1);
  }
  fs.writeFileSync(ENV_PATH, plain, "utf8");
  console.log(`[ok] .llo -> .env   ${keySummary(plain)}`);
  console.log("");
  console.log("     Edit .env, then run `npm run env:encode` and delete .env again.");
}

const REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET", "ADMIN_ALLOWED_EMAIL"];
const PLACEHOLDERS = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "your_service_role_key"
};

/**
 * Exit code carries the verdict so start-admin.bat can branch on it:
 *   0  .llo present and usable
 *   1  no .llo at all
 *   2  .llo present but a required key is missing or still a placeholder
 * `--quiet` suppresses the normal report, leaving only problems.
 */
function doCheck(quiet) {
  const hasEnv = fs.existsSync(ENV_PATH);
  const hasLlo = fs.existsSync(LLO_PATH);
  const say = (msg) => { if (!quiet) console.log(msg); };

  say(`.env   ${hasEnv ? "present" : "absent"}`);
  say(`.llo   ${hasLlo ? "present" : "absent"}`);

  if (!hasLlo) {
    if (hasEnv) console.log("[x] No .llo. Create it from your .env with:  npm run env:encode");
    else console.log("[x] Neither .llo nor .env is present.");
    process.exit(1);
  }

  const plain = decodeBase32(fs.readFileSync(LLO_PATH, "utf8")).toString("utf8");
  if (!plain.trim()) {
    console.log("[x] .llo decoded to nothing - it may be truncated or corrupt.");
    process.exit(2);
  }
  say(`       decodes to ${keySummary(plain)}`);

  const parsed = parseEnvText(plain);
  const missing = REQUIRED.filter((k) => !String(parsed[k] || "").trim());
  const placeholder = Object.keys(PLACEHOLDERS).filter((k) => parsed[k] === PLACEHOLDERS[k]);

  if (missing.length) console.log(`[x] .llo is missing a value for: ${missing.join(", ")}`);
  if (placeholder.length) console.log(`[x] .llo still has the example placeholder for: ${placeholder.join(", ")}`);
  if (!missing.length && !placeholder.length) say("       all four required keys present");

  if (hasEnv) {
    const envPlain = fs.readFileSync(ENV_PATH, "utf8");
    if (envPlain === plain) say("       .env and .llo match");
    else console.log("[warn] .env and .llo DIFFER. The server reads .llo - run `npm run env:encode` to sync.");
    console.log("[warn] .env is present in plain text. Delete it once .llo is working.");
  }

  if (missing.length || placeholder.length) process.exit(2);
  process.exit(0);
}

/**
 * Prints one setting, for start-admin.bat to build the dashboard URL with.
 * Restricted to keys that are not secrets, so this stays a lookup for
 * non-sensitive config rather than a general way to dump credentials to a
 * console or a log.
 */
const READABLE = new Set([
  "PORT", "HOST", "ADMIN_UI_PATH",
  "TRAVEL_UI_PATH", "FOOD_UI_PATH", "SUPPORT_UI_PATH", "MART_VENDOR_UI_PATH"
]);

function doGet(key) {
  const name = String(key || "").trim().toUpperCase();
  if (!READABLE.has(name)) process.exit(1);
  const source = fs.existsSync(LLO_PATH)
    ? decodeBase32(fs.readFileSync(LLO_PATH, "utf8")).toString("utf8")
    : (fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "");
  const value = parseEnvText(source)[name];
  if (value === undefined || value === "") process.exit(1);
  process.stdout.write(value);
  process.exit(0);
}

const command = String(process.argv[2] || "").toLowerCase();
const quiet = process.argv.includes("--quiet");
if (command === "encode") doEncode();
else if (command === "decode") doDecode();
else if (command === "get") doGet(process.argv[3]);
else if (command === "check") doCheck(quiet);
else {
  console.log("Usage:");
  console.log("  node scripts/env-llo.cjs encode          .env -> .llo");
  console.log("  node scripts/env-llo.cjs decode          .llo -> .env");
  console.log("  node scripts/env-llo.cjs check [--quiet] report; exit 0 ok, 1 no .llo, 2 bad .llo");
  process.exit(1);
}
