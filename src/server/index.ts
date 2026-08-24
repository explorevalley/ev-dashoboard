/**
 * Standalone ExploreValley admin server.
 *
 * Serves the dashboard UI and the /api routes it calls, and nothing else. It
 * talks straight to Supabase, so it does not need the ExploreValley monorepo
 * or the customer-facing API to be running.
 *
 * Everything below is the same router code the main server mounts - it is
 * bundled in at build time rather than reimplemented, so the two cannot drift.
 */
// Must be first: sets up the working directory the vendored services expect.
import "./bootstrap";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import { adminRouter } from "../../vendor/server/routes/admin";
import { martVendorRouter } from "../../vendor/server/routes/martVendor";
import { deliveryRouter } from "../../vendor/server/routes/delivery";
import { driverRouter } from "../../vendor/server/routes/driver";

const PORT = Number(process.env.PORT || 8090);
const HOST = String(process.env.HOST || "0.0.0.0");

function normalizePath(raw: string) {
  const value = String(raw || "").trim();
  if (!value || value === "/") return "";
  return value.startsWith("/") ? value.replace(/\/+$/, "") : `/${value.replace(/\/+$/, "")}`;
}

// Where each dashboard lives. Defaults are readable because this build is
// meant to run behind your own access control (a VPN, an SSO proxy, or simply
// a laptop); set ADMIN_UI_PATH to something unguessable if you expose it.
const ADMIN_UI_PATH = normalizePath(process.env.ADMIN_UI_PATH || "/admin");
const ADMIN_TRAVEL_PATH = normalizePath(process.env.TRAVEL_UI_PATH || `${ADMIN_UI_PATH}/travel`);
const ADMIN_FOOD_PATH = normalizePath(process.env.FOOD_UI_PATH || `${ADMIN_UI_PATH}/food`);
const ADMIN_SUPPORT_PATH = normalizePath(process.env.SUPPORT_UI_PATH || `${ADMIN_UI_PATH}/support`);
const ADMIN_MART_VENDOR_PATH = normalizePath(process.env.MART_VENDOR_UI_PATH || `${ADMIN_UI_PATH}/mart-vendor`);

const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET", "ADMIN_ALLOWED_EMAIL"];
const missing = REQUIRED_ENV.filter((name) => !String(process.env[name] || "").trim());
if (missing.length) {
  console.error(`[ev-admin] Missing required environment: ${missing.join(", ")}`);
  console.error("[ev-admin] Copy .env.example to .env and fill it in, then start again.");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// A no-op stand-in for the Telegram bot the main server passes in. This build
// has no bot; the routes that would notify a channel simply do not.
const silentBot = { sendMessage: async () => undefined } as any;

app.use("/api/admin", adminRouter);
app.use("/api/mart-vendor", martVendorRouter());
app.use("/api/delivery", deliveryRouter(silentBot, []));
app.use("/api/driver", driverRouter());

// The bundle lives in dist/, so the package root is one level up.
const packageRoot = path.resolve(__dirname, "..");
const publicDir = path.join(packageRoot, "public");
const indexFile = path.join(publicDir, "index.html");
const staticOptions = { index: false, redirect: false } as const;

let indexTemplate = "";
try {
  indexTemplate = fs.readFileSync(indexFile, "utf8");
} catch {
  indexTemplate = "";
}

/**
 * The bundle decides which dashboard to render from the URL it was served at,
 * so the scope is injected into the page rather than guessed client-side.
 */
function sendIndexWithScope(res: any, scope: "admin" | "travel" | "food" | "support" | "mart_vendor") {
  if (!indexTemplate) return res.sendFile(indexFile);
  const dashboardPaths = {
    admin: ADMIN_UI_PATH,
    travel: ADMIN_TRAVEL_PATH,
    food: ADMIN_FOOD_PATH,
    support: ADMIN_SUPPORT_PATH,
    mart_vendor: ADMIN_MART_VENDOR_PATH
  };
  const inject =
    `<script>` +
    `window.__EV_DASHBOARD_SCOPE=${JSON.stringify(scope)};` +
    `window.__EV_DASHBOARD_PATHS=${JSON.stringify(dashboardPaths)};` +
    `window.__EV_DASHBOARD_CANONICAL_PATH=${JSON.stringify(dashboardPaths[scope])};` +
    `</script>`;
  // index.html references its assets relatively (`./styles.css`), and the
  // static middleware is mounted at the dashboard path rather than at the
  // root. A browser resolves `./` against the page's *parent* directory, so on
  // a page served at /a/b/c it asks for /a/b/styles.css - one segment above
  // where the assets actually are - and gets index.html back, which is what
  // produces the "MIME type ('text/html') is not a supported stylesheet"
  // error. Only a trailing slash makes the relative form work, and links to a
  // dashboard rarely carry one.
  //
  // Rewriting the asset URLs to absolute removes the dependency on the
  // trailing slash and on how deep the current route is.
  const basePath = dashboardPaths[scope] || "";
  const withAbsoluteAssets = indexTemplate.replace(
    /\b(href|src)="\.\//g,
    `$1="${basePath}/`
  );

  const marker = "</head>";
  const html = withAbsoluteAssets.includes(marker)
    ? withAbsoluteAssets.replace(marker, `  ${inject}\n${marker}`)
    : `${inject}\n${withAbsoluteAssets}`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

[ADMIN_UI_PATH, ADMIN_TRAVEL_PATH, ADMIN_FOOD_PATH, ADMIN_SUPPORT_PATH, ADMIN_MART_VENDOR_PATH]
  .filter((p, i, all) => p && all.indexOf(p) === i)
  .forEach((mountPath) => app.use(mountPath, express.static(publicDir, staticOptions)));

// Order matters. The scoped dashboards default to paths *underneath*
// ADMIN_UI_PATH, and `${ADMIN_UI_PATH}/*` matches those too - registered first
// it would answer /admin/food with the full admin dashboard. The specific
// paths go in ahead of the catch-all.
app.get([ADMIN_TRAVEL_PATH, `${ADMIN_TRAVEL_PATH}/`, `${ADMIN_TRAVEL_PATH}/*`], (_req, res) => sendIndexWithScope(res, "travel"));
app.get([ADMIN_FOOD_PATH, `${ADMIN_FOOD_PATH}/`, `${ADMIN_FOOD_PATH}/*`], (_req, res) => sendIndexWithScope(res, "food"));
app.get([ADMIN_SUPPORT_PATH, `${ADMIN_SUPPORT_PATH}/`, `${ADMIN_SUPPORT_PATH}/*`], (_req, res) => sendIndexWithScope(res, "support"));
app.get([ADMIN_MART_VENDOR_PATH, `${ADMIN_MART_VENDOR_PATH}/`, `${ADMIN_MART_VENDOR_PATH}/*`], (_req, res) => sendIndexWithScope(res, "mart_vendor"));
app.get([ADMIN_UI_PATH || "/", `${ADMIN_UI_PATH}/`, `${ADMIN_UI_PATH}/*`], (_req, res) => sendIndexWithScope(res, "admin"));

app.get("/healthz", (_req, res) => res.json({ ok: true, service: "ev-admin" }));
app.get("/", (_req, res) => res.redirect(ADMIN_UI_PATH || "/admin"));

app.listen(PORT, HOST, () => {
  const base = `http://localhost:${PORT}`;
  console.log("ExploreValley admin (standalone)");
  console.log(`  Admin        ${base}${ADMIN_UI_PATH}`);
  console.log(`  Food|Mart|Duty ${base}${ADMIN_FOOD_PATH}`);
  console.log(`  Travel       ${base}${ADMIN_TRAVEL_PATH}`);
  console.log(`  Support      ${base}${ADMIN_SUPPORT_PATH}`);
  console.log(`  Mart vendor  ${base}${ADMIN_MART_VENDOR_PATH}`);
});
