#!/usr/bin/env bash
# Push design-lens to GitHub, then connect Railway or Render.
#
# Usage:
#   ./scripts/publish-github.sh                    # personal: github.com/YOU/design-lens
#   ./scripts/publish-github.sh trimble           # org: github.com/trimble/design-lens
#   GITHUB_HOST=github.trimble.com ./scripts/publish-github.sh trimble-mep
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ORG="${1:-}"
HOST="${GITHUB_HOST:-github.com}"
REPO_NAME="${GITHUB_REPO:-design-lens}"
BRANCH="${GITHUB_BRANCH:-main}"

if [[ -n "$ORG" ]]; then
  REMOTE_URL="https://${HOST}/${ORG}/${REPO_NAME}.git"
  WEB_URL="https://${HOST}/${ORG}/${REPO_NAME}"
else
  echo "No org specified — using personal account."
  echo "Set your GitHub username:"
  read -r USERNAME
  REMOTE_URL="https://${HOST}/${USERNAME}/${REPO_NAME}.git"
  WEB_URL="https://${HOST}/${USERNAME}/${REPO_NAME}"
fi

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
echo "── Create the empty repo on GitHub first (if it doesn't exist) ──"
echo "  ${WEB_URL}"
echo "  → New repository → name: ${REPO_NAME} → do NOT add README/gitignore"
echo ""
read -p "Repo created on GitHub? Press Enter to push…"

git push -u origin "$BRANCH"

echo ""
echo "✓ Pushed to ${WEB_URL}"
echo ""
echo "── Next: deploy on Railway (recommended) ──"
echo "  1. https://railway.app/new → Deploy from GitHub → select ${REPO_NAME}"
echo "  2. Add volume: mount path /app/public"
echo "  3. Generate domain → test /api/health"
echo ""
echo "── Or Render ──"
echo "  https://dashboard.render.com/blueprints → connect repo (uses render.yaml)"
echo ""
echo "See HOSTING.md for full details."
