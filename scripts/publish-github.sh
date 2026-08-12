#!/usr/bin/env bash
# Push design-lens to a NEW GitHub repo (separate from myrepo or other projects).
#
# Usage:
#   ./scripts/publish-github.sh                    # github.com/nawaz-md-trmb/design-lens
#   ./scripts/publish-github.sh YOUR_ORG           # github.com/YOUR_ORG/design-lens
#   GITHUB_HOST=github.trimble.com ./scripts/publish-github.sh trimble
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ORG="${1:-nawaz-md-trmb}"
HOST="${GITHUB_HOST:-github.com}"
REPO_NAME="${GITHUB_REPO:-design-lens}"
BRANCH="${GITHUB_BRANCH:-main}"

REMOTE_URL="https://${HOST}/${ORG}/${REPO_NAME}.git"
WEB_URL="https://${HOST}/${ORG}/${REPO_NAME}"

echo ""
echo "Target repo: ${WEB_URL}"
echo ""

if git remote get-url origin &>/dev/null; then
  echo "Remote 'origin' already exists:"
  git remote get-url origin
  read -p "Replace it? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Keeping existing remote."
  else
    git remote remove origin
    git remote add origin "$REMOTE_URL"
  fi
else
  git remote add origin "$REMOTE_URL"
fi

echo ""
echo "── Create a NEW empty repo on GitHub (do not use myrepo) ──"
echo "  1. Open: https://${HOST}/new"
echo "  2. Owner: ${ORG}"
echo "  3. Repository name: ${REPO_NAME}"
echo "  4. Leave empty — no README, no .gitignore, no license"
echo "  5. Create repository"
echo ""
echo "  Repo URL: ${WEB_URL}"
echo ""
read -p "Empty repo created? Press Enter to push…"

git push -u origin "$BRANCH"

echo ""
echo "✓ Pushed to ${WEB_URL}"
echo ""
echo "── Run locally (free) ──"
echo "  npm install && npm run setup && npm run dev   # http://localhost:3100"
echo "  docker compose up --build                     # http://localhost:3000"
echo ""
echo "See HOSTING.md — paid cloud (Render/Railway) is optional."
