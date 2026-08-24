@echo off
setlocal EnableExtensions EnableDelayedExpansion
title ExploreValley Admin

rem ===========================================================================
rem  ExploreValley Admin - launcher
rem
rem  Double-click this file, or run it from a terminal. It checks Node, installs
rem  dependencies the first time, makes sure .env exists and is filled in, then
rem  starts the server and opens the dashboard in your browser.
rem
rem  Flags:
rem    --install      reinstall dependencies even if node_modules is present
rem    --build        rebuild the UI and server bundle before starting
rem    --no-browser   start the server but do not open a browser
rem    --init         create a blank .env to fill in (new deployments only)
rem    --help         show this list
rem
rem  Press Ctrl+C in this window to stop the server.
rem ===========================================================================

rem Re-entry point: this script relaunches itself in a second window to wait for
rem the server to come up and then open the browser. Handled before anything else.
if /I "%~1"=="--open-when-ready" goto :open_when_ready

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "DO_INSTALL="
set "DO_BUILD="
set "OPEN_BROWSER=1"
set "DO_INIT="

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--install"    set "DO_INSTALL=1"
if /I "%~1"=="--build"      set "DO_BUILD=1"
if /I "%~1"=="--no-browser" set "OPEN_BROWSER="
if /I "%~1"=="--init"       set "DO_INIT=1"
if /I "%~1"=="--help"       goto usage
if /I "%~1"=="-h"           goto usage
if /I "%~1"=="/?"           goto usage
shift
goto parse_args
:args_done

echo.
echo  ===========================================================
echo    ExploreValley Admin
echo  ===========================================================
echo.

pushd "%ROOT%"
if errorlevel 1 (
  echo  [x] Could not enter the admin panel folder:
  echo      %ROOT%
  goto fail
)

if defined DO_INIT goto init_settings

rem --- Node -----------------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo  [x] Node.js is not installed, or not on PATH.
  echo.
  echo      Install the LTS build from https://nodejs.org/ and run this again.
  echo      This project needs Node 18 or newer.
  goto fail
)

for /f "tokens=*" %%V in ('node --version 2^>nul') do set "NODE_VERSION=%%V"
set "NODE_MAJOR=!NODE_VERSION:v=!"
for /f "tokens=1 delims=." %%M in ("!NODE_MAJOR!") do set "NODE_MAJOR=%%M"
if !NODE_MAJOR! LSS 18 (
  echo  [x] Node !NODE_VERSION! is too old. This project needs Node 18 or newer.
  echo      Install the LTS build from https://nodejs.org/ and run this again.
  goto fail
)
echo  [ok] Node !NODE_VERSION!

where npm >nul 2>&1
if errorlevel 1 (
  echo  [x] npm is not on PATH. Reinstall Node.js, which bundles it.
  goto fail
)

rem --- Settings: .llo -------------------------------------------------------
rem Settings live in .llo - base32-encoded key=value pairs. The server decodes
rem it directly at boot; nothing here needs a .env. scripts/env-llo.cjs owns
rem the format, and this only branches on its exit code:
rem   0 usable, 1 no .llo at all, 2 .llo present but incomplete.

if not exist ".llo" (
  if exist ".env" (
    echo  [..] Found .env but no .llo - encoding it now.
    echo.
    node scripts\env-llo.cjs encode
    if errorlevel 1 goto fail
    echo.
  ) else (
    rem A fresh clone lands here. .llo is deliberately not in the repository,
    rem so the answer is "put yours here", not "fill in a blank .env" - that
    rem only applies to someone standing up a brand new deployment.
    echo.
    echo  [x] No settings file ^(.llo^) in this folder.
    echo.
    echo      Copy the .llo you were given into:
    echo        %ROOT%
    echo.
    echo      It sits next to package.json. Then run this script again -
    echo      everything else is read straight out of it, and no .env is needed.
    echo.
    echo      Setting up a brand new deployment with no .llo to copy?
    echo        start-admin.bat --init
    goto fail_quiet
  )
)

node scripts\env-llo.cjs check --quiet
if errorlevel 2 (
  echo.
  echo      To fix: npm run env:decode, edit .env, npm run env:encode, del .env
  goto fail_quiet
)
if errorlevel 1 (
  echo.
  echo  [x] .llo is missing or unreadable.
  goto fail_quiet
)

echo  [ok] settings loaded from .llo

rem --- Dependencies ---------------------------------------------------------
if defined DO_INSTALL (
  echo  [..] Reinstalling dependencies, as asked. This takes a few minutes.
  echo.
  call npm install
  if errorlevel 1 goto install_failed
  echo.
  echo  [ok] Dependencies installed
) else (
  rem Probing a real dependency, not just the folder - a half-finished or
  rem interrupted install leaves node_modules present but unusable.
  if not exist "node_modules\express\package.json" (
    echo  [..] Installing dependencies. This takes a few minutes.
    echo.
    call npm install
    if errorlevel 1 goto install_failed
    echo.
    echo  [ok] Dependencies installed
  ) else (
    echo  [ok] Dependencies present
  )
)

rem --- Optional rebuild -----------------------------------------------------
if defined DO_BUILD (
  echo  [..] Rebuilding UI and server bundle
  echo.
  call npm run build
  if errorlevel 1 (
    echo.
    echo  [x] Build failed. See the output above.
    goto fail
  )
  echo.
  echo  [ok] Build complete
)

if not exist "dist\server.js" (
  echo  [warn] dist\server.js is missing - building it now.
  echo.
  call npm run build
  if errorlevel 1 (
    echo.
    echo  [x] Build failed. See the output above.
    goto fail
  )
  echo.
  echo  [ok] Build complete
)

rem --- Where the dashboard will be ------------------------------------------
rem .llo is base32, so findstr cannot read it. env-llo.cjs decodes and prints
rem the one value asked for, and it only answers for non-secret keys - the URL
rem the launcher prints stays in step with what the server actually binds,
rem without any credential passing through a batch variable.
set "PORT=8090"
set "ADMIN_UI_PATH=/admin"
for /f "usebackq delims=" %%V in (`node scripts\env-llo.cjs get PORT 2^>nul`) do set "PORT=%%V"
for /f "usebackq delims=" %%V in (`node scripts\env-llo.cjs get ADMIN_UI_PATH 2^>nul`) do set "ADMIN_UI_PATH=%%V"

rem The four scoped dashboards default to sitting under ADMIN_UI_PATH, but each
rem can be overridden to somewhere else entirely. Read the overrides so the URLs
rem printed below are the ones the server actually mounts.
set "TRAVEL_UI_PATH=!ADMIN_UI_PATH!/travel"
set "FOOD_UI_PATH=!ADMIN_UI_PATH!/food"
set "SUPPORT_UI_PATH=!ADMIN_UI_PATH!/support"
set "MART_VENDOR_UI_PATH=!ADMIN_UI_PATH!/mart-vendor"
for /f "usebackq delims=" %%V in (`node scripts\env-llo.cjs get TRAVEL_UI_PATH 2^>nul`) do set "TRAVEL_UI_PATH=%%V"
for /f "usebackq delims=" %%V in (`node scripts\env-llo.cjs get FOOD_UI_PATH 2^>nul`) do set "FOOD_UI_PATH=%%V"
for /f "usebackq delims=" %%V in (`node scripts\env-llo.cjs get SUPPORT_UI_PATH 2^>nul`) do set "SUPPORT_UI_PATH=%%V"
for /f "usebackq delims=" %%V in (`node scripts\env-llo.cjs get MART_VENDOR_UI_PATH 2^>nul`) do set "MART_VENDOR_UI_PATH=%%V"

set "BASE=http://localhost:!PORT!"
set "ADMIN_URL=!BASE!!ADMIN_UI_PATH!"
set "HEALTH_URL=http://127.0.0.1:!PORT!/healthz"

echo.
echo  -----------------------------------------------------------
echo    Dashboards
echo  -----------------------------------------------------------
echo    Admin, everything      !ADMIN_URL!
echo    FOOD / MART / DUTY     !BASE!!FOOD_UI_PATH!
echo    Travel                 !BASE!!TRAVEL_UI_PATH!
echo    Customer Support       !BASE!!SUPPORT_UI_PATH!
echo    Mart Vendor portal     !BASE!!MART_VENDOR_UI_PATH!
echo  -----------------------------------------------------------
echo.
echo    Sign in with a row from ev_dashboard_credentials, or with
echo    DASHBOARD_DEFAULT_USERNAME / DASHBOARD_DEFAULT_PASSWORD.
echo.
echo    Press Ctrl+C to stop the server.
echo.

rem --- Open the browser once the server answers -----------------------------
if defined OPEN_BROWSER (
  start "Opening dashboard" /min cmd /c ""%~f0" --open-when-ready "!ADMIN_URL!" "!HEALTH_URL!""
)

rem --- Run ------------------------------------------------------------------
echo  [..] Starting server on port !PORT!
echo.
call npm start

rem npm start only returns once the server has stopped.
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo  [x] The server stopped with exit code %EXIT_CODE%.
  echo      Scroll up for the reason. A bad Supabase key, a port already in
  echo      use, and a half-finished npm install are the usual causes. For the
  echo      last one, run:  start-admin.bat --install
) else (
  echo  [ok] Server stopped.
)
popd
echo.
pause
exit /b %EXIT_CODE%

rem ===========================================================================
:install_failed
echo.
echo  [x] npm install failed. See the output above.
echo.
echo      If it broke on a native module such as sharp, installing the Visual
echo      Studio Build Tools usually fixes it. Otherwise try deleting
echo      node_modules and running this script again with --install.
goto fail

:init_settings
if exist ".llo" (
  echo  [x] A .llo already exists here. Nothing to initialise.
  echo      To change it:  npm run env:decode, edit .env, npm run env:encode
  goto fail_quiet
)
if not exist ".env.example" (
  echo  [x] .env.example is missing, so there is no template to start from.
  goto fail_quiet
)
if exist ".env" (
  echo  [warn] .env already exists - leaving it alone and opening it.
) else (
  copy /y ".env.example" ".env" >nul
  echo  [ok] .env created from .env.example
)
echo.
echo      Fill in these four values:
echo.
echo        SUPABASE_URL
echo        SUPABASE_SERVICE_ROLE_KEY    the service-role key, not the anon key
echo        JWT_SECRET                   any long random string
echo        ADMIN_ALLOWED_EMAIL
echo.
echo      Then run start-admin.bat again. It encodes .env into .llo, after
echo      which you should delete the plain .env.
echo.
start "" notepad ".env"
goto fail_quiet

:usage
echo.
echo  ExploreValley Admin - launcher
echo.
echo    start-admin.bat                 install if needed, then start
echo    start-admin.bat --install       reinstall dependencies first
echo    start-admin.bat --build         rebuild UI and server bundle first
echo    start-admin.bat --no-browser    start without opening a browser
echo    start-admin.bat --init          create a blank .env to fill in
echo    start-admin.bat --help          this list
echo.
exit /b 0

:fail
popd 2>nul
echo.
pause
exit /b 1

:fail_quiet
popd 2>nul
echo.
pause
exit /b 1

rem ===========================================================================
rem  Second entry point. Runs in its own minimised window: polls /healthz until
rem  the server answers, then opens the dashboard. Gives up after 90 seconds so
rem  a failed start does not leave a window spinning.
rem ===========================================================================
:open_when_ready
set "URL=%~2"
set "HEALTH=%~3"

where curl.exe >nul 2>&1
if errorlevel 1 (
  rem No curl - cannot poll, so just wait a beat and hope the server is up.
  >nul timeout /t 5 /nobreak
  start "" "%URL%"
  exit /b 0
)

set /a TRIES=0
:owr_loop
set /a TRIES+=1
if !TRIES! GTR 90 exit /b 0
curl.exe -s -f -o NUL --max-time 2 "%HEALTH%" >nul 2>&1
if not errorlevel 1 (
  start "" "%URL%"
  exit /b 0
)
>nul timeout /t 1 /nobreak
goto owr_loop
