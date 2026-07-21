#!/usr/bin/env bash
# Build CRM SPA and publish to nginx web root on the VPS.
# Run on the server from repo root: bash scripts/ops/deploy-vps-frontend.sh
#
# Case docs are same-origin `/data/uploads/...` via the API.
# Optional: VITE_DOCS_BASE_URL=https://crm.example.com for absolute asset URLs.
# Set WEB_ROOT to the nginx (or other) static root on this machine.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ -z "${WEB_ROOT:-}" ]]; then
  echo "FAIL: set WEB_ROOT to the absolute static web root on this host."
  exit 1
fi
ENV_FILE="$ROOT/.env"

echo "=== CRM frontend deploy → $WEB_ROOT ==="

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source <(grep -E '^VITE_DOCS_BASE_URL=' "$ENV_FILE" | sed 's/\r$//' || true)
  set +a
fi

if [[ -n "${VITE_DOCS_BASE_URL:-}" ]]; then
  echo "Docs base (optional absolute): $VITE_DOCS_BASE_URL"
else
  echo "Docs base: same-origin /data/uploads (recommended)"
fi
echo ""
echo "=== npm run build ==="
npm run build

echo ""
echo "=== rsync dist/ → $WEB_ROOT ==="
sudo rsync -a --delete "$ROOT/dist/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"

echo ""
echo "=== Done ==="
echo "Hard-refresh the CRM in your browser (Cmd+Shift+R)."
echo "Image URLs: /data/uploads/{caseId}/{filename} (proxied to the API)."
