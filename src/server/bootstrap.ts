/**
 * Runs before anything else is imported.
 *
 * The vendored services resolve their local fallback store and backup folder
 * relative to the working directory - `process.cwd()/../data` - because in the
 * monorepo the server process starts from `server/`. Rather than edit those
 * files (which would fork them from the code the main server runs), recreate
 * the same shape here: chdir into `runtime/` so `../data` lands inside this
 * package.
 *
 * With Supabase configured the local store is only a fallback, so these
 * folders normally stay empty.
 */
import fs from "fs";
import path from "path";
import { loadEnvironment } from "./env";

const packageRoot = path.resolve(__dirname, "..");

// Settings come from `.llo` - base32-encoded key=value pairs, see ./env.ts.
// This replaces `dotenv/config` and must run before anything reads
// process.env, which is why bootstrap is imported first in index.ts.
const envSource = loadEnvironment(packageRoot);
if (envSource) {
  console.log(`[ev-admin] settings loaded from ${envSource.file}, ${envSource.keys} keys`);
}

const runtimeDir = path.join(packageRoot, "runtime");
const dataDir = path.join(packageRoot, "data");

fs.mkdirSync(runtimeDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });
process.chdir(runtimeDir);
