# Setting up the ExploreValley Admin dashboard

Two things are needed and they arrive separately:

1. **The code** — cloned from GitHub (these instructions).
2. **The settings file, `.llo`** — sent to you directly. It is deliberately not
   in the repository, because it holds live credentials.

Without the `.llo` the server will not start. If you have not been given one,
ask before going further.

---

## 1. Install Node.js and Git

- **Node.js 18 or newer** — the LTS build from <https://nodejs.org/>, defaults are fine.
- **Git** — <https://git-scm.com/downloads>.

Then open a **new** terminal (a new one — installers only update PATH for
terminals opened afterwards) and check both:

```
node --version
git --version
```

---

## 2. Clone the repository

```bash
git clone https://github.com/explorevalley/ev-dashoboard.git ev-admin
cd ev-admin
```

Put it somewhere plain like `C:\ev-admin`. Avoid OneDrive, Dropbox or any
synced folder — `node_modules` is ~150 MB of small files and sync clients
struggle with it.

---

## 3. Add your `.llo` settings file

Copy the `.llo` you were given into the root of the folder, next to
`package.json`:

```
ev-admin/
  .llo              <-- here
  package.json
  start-admin.bat
  ...
```

`.llo` is excluded from the repository, so it is never overwritten by an
update and never uploaded by accident.

---

## 4. Start it

**Windows** — double-click **`start-admin.bat`**.

The first run installs dependencies. That takes a few minutes and needs an
internet connection; it will look like it has stalled, but it has not. Later
runs start in seconds.

**macOS / Linux**

```bash
npm install
npm start
```

---

## 5. Open the dashboard

The launcher prints the URLs and opens your browser. If you started it by hand,
the server prints them too.

**Do not guess the address.** The port and paths come from the `.llo` and are
not the obvious defaults. There are five separate dashboards; the page renders
differently depending on which one served it.

Sign in with the username and password you were given. Your account only
reaches the dashboards it has been granted.

---

## 6. Check it is really working

- Startup should say `settings loaded from .llo`. If it says `.env` instead,
  the `.llo` is not in the right place.
- Visiting `/healthz` on the port it printed should return
  `{"ok":true,"service":"ev-admin"}`.

If the dashboard loads but every list is empty, the server is running and
cannot reach Supabase — check that machine's internet connection.

---

## Getting later updates

```
update.bat            (Windows)
./update.sh           (macOS / Linux)
```

That fetches the latest code and reinstalls dependencies only if they actually
changed. Your `.llo` is never touched.

If it reports that it cannot fast-forward, something in your copy has been
edited. To discard those edits and match GitHub exactly:

```
update.bat --reset
./update.sh --reset
```

Your settings survive that — `.llo` is not part of the repository.

`update.bat --status` shows what version you are on without changing anything.

---

## This is a read-only copy

You can pull updates; you are not expected to push changes back. The update
scripts point the push address at a dead URL so an accidental `git push` fails
rather than doing something unexpected.

If you have a change that should go in, send it to the maintainer rather than
pushing.

---

## Please read before putting this on a network

- **There is no IP allowlist and no SSO.** The unguessable URL and the login
  are the only things in front of it.
- **It listens on every network interface by default**, so anyone who can reach
  the machine can reach the login page. To restrict it to your machine only,
  ask for `HOST=127.0.0.1` to be set in your `.llo`.
- **`.llo` holds a Supabase service-role key**, which bypasses database
  row-level security. It is base32-encoded, and encoding is *not* encryption —
  one command decodes it. Anyone who can read the file can read and write every
  row in the database. Keep it off shared machines, do not email it around, and
  never commit it.

---

## Troubleshooting

**"Node.js is not installed, or not on PATH"**
Node is missing, or you are in a terminal that was open before you installed
it. Open a new terminal.

**Server exits saying settings are missing**
The `.llo` is not in the folder root, or is the wrong file. It sits next to
`package.json`.

**`npm install` fails**
Usually no internet or a proxy. Retry with `start-admin.bat --install`.

**"Port already in use"**
Something else on the machine holds that port. Ask for a different `PORT` in
your `.llo`.

**Page loads with no styling, console shows MIME type errors**
You are running a stale build. Run `npm run build`, then restart.

**A dashboard URL returns 404**
Wrong address. Use exactly what the launcher printed — the paths are long and
differ from one another by only a few characters.
