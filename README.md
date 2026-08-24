# ExploreValley Admin — standalone

The admin dashboard and the API it calls, in one package. It talks straight to
Supabase, so neither the ExploreValley monorepo nor the customer-facing server
needs to be running.

## Run it

On Windows, double-click **`start-admin.bat`**. It checks Node, installs
dependencies the first time, validates your settings, starts the server and
opens the browser once the server is actually answering.

Or by hand:

```bash
npm install
cp .env.example .env      # fill in the four required values
npm run env:encode        # .env -> .llo, then delete the plain .env
npm start
```

Then open **`http://localhost:<PORT><ADMIN_UI_PATH>`** — `start-admin.bat`
prints the exact URLs for all five dashboards at startup, so you do not have to
work them out.

The five dashboards are separate URLs — the page renders differently depending
on which one it was served at:

| Dashboard | URL |
|---|---|
| Admin (everything) | `/admin` |
| FOOD \| MART \| DUTY | `/admin/food` |
| Travel | `/admin/travel` |
| Customer Support | `/admin/support` |
| Mart Vendor portal | `/admin/mart-vendor` |

The paths above are the defaults. `ADMIN_UI_PATH` moves the admin dashboard,
and `TRAVEL_UI_PATH`, `FOOD_UI_PATH`, `SUPPORT_UI_PATH` and
`MART_VENDOR_UI_PATH` move the scoped ones independently.

Sign in with a row from your `ev_dashboard_credentials` table, or with
`DASHBOARD_DEFAULT_USERNAME` / `DASHBOARD_DEFAULT_PASSWORD`. An account only
reaches the dashboards its `scope` column lists.

## Configuration

Settings live in **`.llo`** — the same `KEY=value` content a `.env` holds, but
base32-encoded. `.env.example` documents every key. Four are required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — the **service-role** key, not the anon key
- `JWT_SECRET`
- `ADMIN_ALLOWED_EMAIL`

The server refuses to start if any of them is missing, and tells you which.

### Editing settings

`.llo` is not meant to be edited by hand. Round-trip it:

```bash
npm run env:decode     # .llo -> .env
#   ... edit .env ...
npm run env:encode     # .env -> .llo  (verifies the round-trip before writing)
del .env               # remove the plain copy again
npm run env:check      # confirm .llo parses and has the required keys
```

`env:encode` refuses to write a `.llo` that does not decode back to exactly the
bytes it read, so a bad encode cannot silently replace good settings.

> **`.llo` is encoded, not encrypted.** Base32 needs no key to reverse —
> `npm run env:decode` is all it takes, for you or for anyone else holding the
> file. It keeps credentials from being readable at a glance, out of `cat` and
> editor previews, and away from tooling that pattern-matches on `.env`. It is
> not a substitute for file permissions, and `.llo` must stay out of version
> control exactly as `.env` did. `.gitignore` already excludes both.

If `.llo` is absent the server falls back to `.env` and says so at startup, so
a stale plain-text file can never be used without it being obvious.

## What's inside

```
start-admin.bat      Windows launcher — checks, installs, starts, opens browser
.llo                 your settings, base32-encoded (gitignored)
dist/server.js       the API server, prebuilt — this is what `npm start` runs
public/              the dashboard the browser loads (index.html, app.js, styles.css)
src/admin-ui/        React source for the dashboard
src/server/          the standalone server's own entry point
src/server/env.ts    reads and decodes .llo — replaces dotenv
vendor/              the ExploreValley route + service modules the API is built from
scripts/build-ui.cjs rebuilds public/app.js from src/admin-ui
scripts/env-llo.cjs  encode / decode / check settings between .env and .llo
```

`vendor/` is a copy of the modules the main ExploreValley server mounts, not a
reimplementation — the two behave identically because they are the same code.

## Changing it

```bash
npm run build:ui       # after editing src/admin-ui/**
npm run build:server   # after editing src/server/** or vendor/**
npm run build          # both
```

Restart the server after either — it reads `index.html` once at boot.

`build:ui` re-stamps `index.html` with a hash of the new assets. Leave that in:
`app.js` keeps the same URL on every build, so without the changing query
string a browser will serve the copy it cached and run old code against the
current API.

## What it needs from Supabase

The tables the main app already uses — `ev_food_vendors`, `ev_food_menu_items`,
`ev_mart_partners`, `ev_mart_products`, `ev_duty_services`, `ev_bookings`,
`ev_cab_bookings`, `ev_food_orders`, `ev_mart_orders`, `ev_dashboard_credentials`
and the rest. This package creates none of them; point it at a project that has
them. The dashboard reports a missing table by name rather than failing blankly.

## Notes and limits

- **No Telegram.** The main server notifies a Telegram channel on some order
  events. This build passes a no-op in its place, so those messages are not
  sent. Nothing else changes.
- **Image uploads** need `SUPABASE_STORAGE_BUCKET`. Without it the upload
  buttons return a clear error and the rest of the dashboard is unaffected.
- **The AI form assistant** needs `OPENAI_API_KEY` (or `OPENROUTER_API_KEY`).
  Without one those panels stay inert.
- **`runtime/` and `data/`** are created on first start. They hold a local
  fallback store that stays empty while Supabase is reachable.
- **Access control is the URL and the login.** There is no IP allowlist or SSO
  in front of it. If this is going anywhere public, put it behind your own
  proxy and set `ADMIN_UI_PATH` to something unguessable.
- **`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security.** Anyone who can
  read `.llo` can decode it and then read and write every row in the project.
  Base32 does not change that — keep the file off shared machines and out of
  version control. `.gitignore` already excludes `.llo` and `.env`.
