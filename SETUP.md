# Setting this up on another machine

The `ev-admin` folder is self-contained. Everything it needs is here except
`node_modules`, which is installed in step 2.

---

## 1. Install Node.js

Node **18 or newer**. Download the LTS build from <https://nodejs.org/> and
install it with the defaults.

Check it worked — open a new terminal (a new one; the installer only updates
PATH for terminals opened afterwards) and run:

```
node --version
```

You should see `v18.x` or higher. If the command is not recognised, Node is not
on PATH — reinstall and make sure "Add to PATH" is ticked.

---

## 2. Put the folder somewhere sensible

Unzip `ev-admin-portable.zip`. You get a single `ev-admin` folder — move it
wherever you want it to live, for example `C:\ev-admin` or `D:\apps\ev-admin`.

Avoid OneDrive, Dropbox or any synced folder. `node_modules` is ~150 MB of
small files and sync clients choke on it.

---

## 3. Start it

**Windows** — double-click **`start-admin.bat`**.

The first run installs dependencies, which takes a few minutes and needs an
internet connection. It will look like it has frozen; it has not. Every run
after this one starts in a couple of seconds.

**macOS or Linux** — there is no launcher, so run it by hand:

```bash
cd ev-admin
npm install
npm start
```

---

## 4. Open the dashboard

`start-admin.bat` prints the URLs and opens the browser for you. If you started
it by hand, the server prints them too. Do not guess them — the port and paths
come from the `.llo` settings file and are not the defaults.

There are five separate dashboards; the page renders differently depending on
which URL served it.

Sign in with an account from the `ev_dashboard_credentials` table in Supabase.
An account only reaches the dashboards its `scope` column lists.

---

## 5. Check it is actually working

Two things prove the whole chain is up:

- The startup output says `settings loaded from .llo`. If it says `.env`
  instead, the `.llo` file did not come across.
- Visit `/healthz` on the port it printed. You should get
  `{"ok":true,"service":"ev-admin"}`.

If a dashboard loads but every list is empty, the server is running but cannot
reach Supabase — check the machine's internet access first.

---

## Settings

All configuration lives in **`.llo`**, which came with the folder. It is
base32-encoded, so it is not directly editable. To change something:

```bash
npm run env:decode     # .llo -> .env
#   ... edit .env in any text editor ...
npm run env:encode     # .env -> .llo
del .env               # (rm .env on macOS/Linux)
npm run env:check      # confirm it parses
```

`env:encode` refuses to write a `.llo` that does not decode back to exactly
what it read, so a bad edit cannot silently destroy your settings.

The two you are most likely to want:

- `PORT` — change it if something else on the machine already uses that port.
- `ADMIN_UI_PATH` — the long unguessable path the dashboard is served at.

---

## Troubleshooting

**"Node.js is not installed, or not on PATH"**
Node is missing, or you are in a terminal opened before installing it. Open a
new terminal and try again.

**`npm install` fails**
Usually no internet, or a proxy. If it fails on a native module, run
`start-admin.bat --install` to retry from clean. On Windows the image library
ships a prebuilt binary, so build tools are normally not needed.

**"Port already in use" / server exits immediately**
Something else holds the port. Change `PORT` in the settings (see above), or
stop the other process.

**Page loads but has no styling, console shows MIME type errors**
You are running an old `dist/server.js`. Run `npm run build` and restart.

**Dashboard 404s**
Wrong URL. Use the ones the launcher printed, exactly — the paths are long and
differ from each other by a few characters in the middle.

---

## Before you put this on a network

Read the "Notes and limits" section of `README.md`. The short version:

- There is no IP allowlist and no SSO in front of this. The unguessable URL and
  the login are the only things protecting it.
- The server listens on **all network interfaces** by default, so anyone who
  can reach the machine can reach the dashboard. Set `HOST=127.0.0.1` to
  restrict it to that machine only.
- `.llo` contains a Supabase **service-role key**, which bypasses row-level
  security. Base32 is an encoding, not encryption — `npm run env:decode` is all
  anyone needs. Whoever can read the folder can read and write every row in the
  project. Keep it off shared machines, and never commit it.
