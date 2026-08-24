#!/usr/bin/env bash
#
# Pulls the latest ExploreValley Admin code from GitHub.
#
#   ./update.sh            fetch and fast-forward to the latest code
#   ./update.sh --reset    throw away local edits and match GitHub exactly
#   ./update.sh --status   show what version you are on, change nothing
#
# Your settings file (.llo) is never touched by an update — it is excluded from
# the repository, so it stays exactly as you left it.
#
# ---------------------------------------------------------------------------
# THIS SCRIPT DOES NOT STOP ANYONE PUSHING. It only avoids pushing, and points
# the push URL at a dead address so an accidental `git push` in this folder
# fails. Anyone determined can undo that in one command. If pushing must
# actually be prevented, that has to be set on GitHub itself — give people Read
# access rather than Write, and protect the main branch.
# ---------------------------------------------------------------------------

set -euo pipefail

REPO="https://github.com/explorevalley/ev-dashoboard.git"
BRANCH="main"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

MODE="pull"
case "${1:-}" in
  --reset)  MODE="reset" ;;
  --status) MODE="status" ;;
  -h|--help)
    sed -n '3,8p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
esac

echo
echo " ==========================================================="
echo "   ExploreValley Admin - update"
echo " ==========================================================="
echo

if ! command -v git >/dev/null 2>&1; then
  echo " [x] Git is not installed. Install it and run this again."
  exit 1
fi

if [ ! -d .git ]; then
  echo " [x] This folder is not a git checkout, so there is nothing to update."
  echo
  echo "     To set one up, run this in the folder you want it in:"
  echo "       git clone $REPO ev-admin"
  echo
  echo "     Then copy your .llo settings file into it and run: npm start"
  exit 1
fi

# Make an accidental push fail. Fetching still works.
git remote set-url --push origin "no-push://this-checkout-is-read-only" >/dev/null 2>&1 || true

echo " [ok] on branch $(git rev-parse --abbrev-ref HEAD)"

if ! git fetch origin "$BRANCH" --quiet; then
  echo " [x] Could not reach GitHub. Check this machine's internet connection."
  exit 1
fi

BEHIND="$(git rev-list --count "HEAD..origin/$BRANCH" 2>/dev/null || echo 0)"
AHEAD="$(git rev-list --count "origin/$BRANCH..HEAD" 2>/dev/null || echo 0)"

if [ "$BEHIND" = "0" ]; then
  echo " [ok] already up to date with GitHub"
else
  echo " [..] $BEHIND new commit(s) available"
fi
[ "$AHEAD" != "0" ] && echo " [warn] this folder has $AHEAD local commit(s) that are not on GitHub"

if [ "$MODE" = "status" ]; then
  echo
  git --no-pager log --oneline -5 "origin/$BRANCH"
  exit 0
fi

BEFORE="$(git rev-parse HEAD)"

if [ "$BEHIND" != "0" ]; then
  if [ "$MODE" = "reset" ]; then
    echo " [..] discarding local changes and matching GitHub exactly"
    git reset --hard "origin/$BRANCH"
  else
    echo " [..] updating"
    if ! git merge --ff-only "origin/$BRANCH"; then
      echo
      echo " [x] Could not fast-forward. This folder has local changes that"
      echo "     conflict with the update."
      echo
      echo "     To throw those away and match GitHub exactly:"
      echo "       ./update.sh --reset"
      echo
      echo "     Your .llo settings are NOT affected by that — they are not"
      echo "     part of the repository."
      exit 1
    fi
  fi
  echo " [ok] updated"
fi

AFTER="$(git rev-parse HEAD)"

# Reinstall only if the dependency list actually moved.
if [ "$BEFORE" != "$AFTER" ]; then
  if git diff --name-only "$BEFORE" "$AFTER" | grep -q '^package-lock\.json$'; then
    echo " [..] dependencies changed - reinstalling"
    npm install || echo " [warn] npm install reported a problem, see above"
  fi
fi

if [ ! -f .llo ]; then
  echo
  echo " [warn] No .llo settings file in this folder. The server will not start"
  echo "        without one. Copy the .llo you were given into:"
  echo "          $ROOT"
fi

echo
echo " Done. Start the dashboard with:  npm start"
echo
