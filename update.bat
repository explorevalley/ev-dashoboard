@echo off
setlocal EnableExtensions EnableDelayedExpansion
title ExploreValley Admin - update

rem ===========================================================================
rem  Pulls the latest ExploreValley Admin code from GitHub.
rem
rem    update.bat            fetch and fast-forward to the latest code
rem    update.bat --reset    throw away local edits and match GitHub exactly
rem    update.bat --status   show what version you are on, change nothing
rem
rem  Your settings file (.llo) is never touched by an update - it is excluded
rem  from the repository, so it stays exactly as you left it.
rem
rem  ---------------------------------------------------------------------
rem  THIS SCRIPT DOES NOT STOP ANYONE PUSHING. It only avoids pushing, and
rem  points the push URL at a dead address so an accidental `git push` in this
rem  folder fails. Anyone determined can undo that in one command. If pushing
rem  must actually be prevented, that has to be set on GitHub itself - give
rem  people Read access rather than Write, and protect the main branch.
rem  ---------------------------------------------------------------------
rem ===========================================================================

set "REPO=https://github.com/explorevalley/ev-dashoboard.git"
set "BRANCH=main"

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "MODE=pull"
if /I "%~1"=="--reset"  set "MODE=reset"
if /I "%~1"=="--status" set "MODE=status"
if /I "%~1"=="--help"   goto usage
if /I "%~1"=="-h"       goto usage

echo.
echo  ===========================================================
echo    ExploreValley Admin - update
echo  ===========================================================
echo.

pushd "%ROOT%"
if errorlevel 1 ( echo  [x] Could not enter %ROOT% & goto fail )

where git >nul 2>&1
if errorlevel 1 (
  echo  [x] Git is not installed, or not on PATH.
  echo      Install it from https://git-scm.com/download/win and run this again.
  goto fail
)

if not exist ".git\" (
  echo  [x] This folder is not a git checkout, so there is nothing to update.
  echo.
  echo      To set one up, run this in the folder you want it in:
  echo        git clone %REPO% ev-admin
  echo.
  echo      Then copy your .llo settings file into it and run start-admin.bat.
  goto fail
)

rem --- Make an accidental push fail -----------------------------------------
rem Fetching still works; only the push address is dead.
git remote set-url --push origin "no-push://this-checkout-is-read-only" >nul 2>&1

rem --- Status ---------------------------------------------------------------
for /f "usebackq delims=" %%B in (`git rev-parse --abbrev-ref HEAD 2^>nul`) do set "CURRENT=%%B"
echo  [ok] on branch !CURRENT!

git fetch origin %BRANCH% --quiet
if errorlevel 1 (
  echo  [x] Could not reach GitHub. Check this machine's internet connection.
  goto fail
)

for /f "usebackq delims=" %%C in (`git rev-list --count HEAD..origin/%BRANCH% 2^>nul`) do set "BEHIND=%%C"
if not defined BEHIND set "BEHIND=0"
for /f "usebackq delims=" %%C in (`git rev-list --count origin/%BRANCH%..HEAD 2^>nul`) do set "AHEAD=%%C"
if not defined AHEAD set "AHEAD=0"

if "!BEHIND!"=="0" (
  echo  [ok] already up to date with GitHub
) else (
  echo  [..] !BEHIND! new commit^(s^) available
)
if not "!AHEAD!"=="0" (
  echo  [warn] this folder has !AHEAD! local commit^(s^) that are not on GitHub
)

if /I "%MODE%"=="status" (
  echo.
  git --no-pager log --oneline -5 origin/%BRANCH%
  goto done
)

if "!BEHIND!"=="0" if "%MODE%"=="pull" goto deps

rem --- Save a note of what changed, so we know whether to reinstall ---------
for /f "usebackq delims=" %%H in (`git rev-parse HEAD 2^>nul`) do set "BEFORE=%%H"

if /I "%MODE%"=="reset" (
  echo  [..] discarding local changes and matching GitHub exactly
  git reset --hard origin/%BRANCH%
  if errorlevel 1 ( echo  [x] reset failed & goto fail )
) else (
  echo  [..] updating
  git merge --ff-only origin/%BRANCH%
  if errorlevel 1 (
    echo.
    echo  [x] Could not fast-forward. This folder has local changes that
    echo      conflict with the update.
    echo.
    echo      To throw those away and match GitHub exactly:
    echo        update.bat --reset
    echo.
    echo      Your .llo settings are NOT affected by that - they are not part
    echo      of the repository.
    goto fail
  )
)

for /f "usebackq delims=" %%H in (`git rev-parse HEAD 2^>nul`) do set "AFTER=%%H"
echo  [ok] updated

rem --- Reinstall only if the dependency list actually moved -----------------
:deps
if defined BEFORE if defined AFTER (
  if not "!BEFORE!"=="!AFTER!" (
    git diff --name-only !BEFORE! !AFTER! 2>nul | findstr /L /C:"package-lock.json" >nul 2>&1
    if not errorlevel 1 (
      echo  [..] dependencies changed - reinstalling
      call npm install
      if errorlevel 1 echo  [warn] npm install reported a problem, see above
    )
  )
)

if not exist ".llo" (
  echo.
  echo  [warn] No .llo settings file in this folder. The server will not start
  echo         without one. Copy the .llo you were given into:
  echo           %ROOT%
)

:done
echo.
echo  Done. Start the dashboard with:  start-admin.bat
echo.
popd
pause
exit /b 0

:usage
echo.
echo  update.bat            fetch and fast-forward to the latest code
echo  update.bat --reset    discard local edits, match GitHub exactly
echo  update.bat --status   show version info only, change nothing
echo.
exit /b 0

:fail
popd 2>nul
echo.
pause
exit /b 1
