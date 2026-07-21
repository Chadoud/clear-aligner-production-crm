#!/usr/bin/env bash
# Build CRM locally and rsync to a VPS (frontend + backend).
#
# Required env:
#   VPS_HOST       SSH host
#   VPS_USER       SSH user
#   VPS_REPO       Absolute path to the app checkout on the VPS
#   VPS_WEB_ROOT   Absolute path to the static web root on the VPS
# Optional:
#   VPS_SSH_KEY    Path to SSH private key
#   VPS_STAGING_DIR  Remote staging dir for the frontend bundle (default: $HOME/_crm_deploy/dist on remote)
#
# Example:
#   export VPS_HOST=… VPS_USER=… VPS_REPO=… VPS_WEB_ROOT=…
#   bash scripts/push-vps-from-local.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

require() {
  local name="$1"
  if [[ -z "${!name:-}" || "${!name}" == YOUR_* ]]; then
    echo "FAIL: set $name before running this script."
    exit 1
  fi
}

require VPS_HOST
require VPS_USER
require VPS_REPO
require VPS_WEB_ROOT

# Staging dir on the VPS (absolute). Defaults next to the repo checkout.
VPS_STAGING_DIR="${VPS_STAGING_DIR:-${VPS_REPO}/../_crm_deploy/dist}"

SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)
if [[ -n "${VPS_SSH_KEY:-}" ]]; then
  if [[ ! -f "$VPS_SSH_KEY" ]]; then
    echo "FAIL: VPS_SSH_KEY not found: $VPS_SSH_KEY"
    exit 1
  fi
  chmod 600 "$VPS_SSH_KEY" 2>/dev/null || true
  SSH_OPTS+=(-i "$VPS_SSH_KEY")
fi

RSYNC_SSH="ssh ${SSH_OPTS[*]}"
REMOTE="${VPS_USER}@${VPS_HOST}"

echo "=== Build frontend ==="
npm run build

echo ""
echo "=== Build backend ==="
(cd backend && npm run build)

echo ""
echo "=== Test SSH ==="
ssh "${SSH_OPTS[@]}" "$REMOTE" "echo OK — connected as \$(whoami)@\$(hostname)"

echo ""
echo "=== Stage frontend → ${VPS_STAGING_DIR} ==="
ssh "${SSH_OPTS[@]}" "$REMOTE" "mkdir -p '${VPS_STAGING_DIR}'"
rsync -az --delete --omit-dir-times --no-times -e "$RSYNC_SSH" \
  "$ROOT/dist/" "${REMOTE}:${VPS_STAGING_DIR}/"

echo ""
echo "=== Publish frontend → ${VPS_WEB_ROOT} (sudo) ==="
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "sudo rsync -a --delete '${VPS_STAGING_DIR}/' '${VPS_WEB_ROOT}/' && sudo chown -R www-data:www-data '${VPS_WEB_ROOT}'"

echo ""
echo "=== Backend dist + package files → ${VPS_REPO}/backend/ ==="
rsync -az --omit-dir-times --no-times -e "$RSYNC_SSH" \
  "$ROOT/backend/dist/" "${REMOTE}:${VPS_REPO}/backend/dist/"
rsync -az --omit-dir-times --no-times -e "$RSYNC_SSH" \
  "$ROOT/backend/package.json" "$ROOT/backend/package-lock.json" \
  "${REMOTE}:${VPS_REPO}/backend/"

echo ""
echo "=== Install deps + restart on VPS ==="
ssh "${SSH_OPTS[@]}" "$REMOTE" bash -s <<EOF
set -euo pipefail
cd "${VPS_REPO}/backend"
npm ci --omit=dev
UNIT="${SYSTEMD_UNIT:-crm-api}"
if systemctl is-active --quiet "$UNIT" 2>/dev/null; then
  sudo systemctl restart "$UNIT"
  echo "Restarted $UNIT"
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart all || true
  echo "Restarted pm2"
else
  echo "WARN: restart backend manually (systemctl or pm2)"
fi
curl -sf "http://127.0.0.1:4000/health" && echo " — backend health OK" || echo "WARN: /health check failed"
EOF

echo ""
echo "=== Done ==="
echo "Hard-refresh CRM in browser."
