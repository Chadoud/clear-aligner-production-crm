#!/usr/bin/env bash
# Set MOBILE_INTERNAL_API_KEY on the CRM VPS (must match the mobile API INTERNAL_API_KEY).
#
# Required env:
#   MOBILE_INTERNAL_API_KEY   value to write on the VPS
#   VPS_HOST
#   VPS_USER
#   VPS_REPO                  absolute path to the CRM checkout on the VPS
# Optional:
#   VPS_SSH_KEY
#   MOBILE_API_BASE_URL       default https://api.example.com (set your real API URL)
#
# Usage:
#   export MOBILE_INTERNAL_API_KEY=… VPS_HOST=… VPS_USER=… VPS_REPO=…
#   bash scripts/ops/set-vps-internal-key.sh

set -euo pipefail

require() {
  local name="$1"
  if [[ -z "${!name:-}" || "${!name}" == YOUR_* ]]; then
    echo "FAIL: set $name before running this script."
    exit 1
  fi
}

require MOBILE_INTERNAL_API_KEY
require VPS_HOST
require VPS_USER
require VPS_REPO

KEY="$MOBILE_INTERNAL_API_KEY"
MOBILE_API_BASE_URL="${MOBILE_API_BASE_URL:-https://api.example.com}"

SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)
if [[ -n "${VPS_SSH_KEY:-}" ]]; then
  if [[ ! -f "$VPS_SSH_KEY" ]]; then
    echo "FAIL: VPS_SSH_KEY not found: $VPS_SSH_KEY"
    exit 1
  fi
  chmod 600 "$VPS_SSH_KEY" 2>/dev/null || true
  SSH_OPTS+=(-i "$VPS_SSH_KEY")
fi
REMOTE="${VPS_USER}@${VPS_HOST}"

ssh "${SSH_OPTS[@]}" "$REMOTE" bash -s <<EOF
set -euo pipefail
ENV_FILE="${VPS_REPO}/backend/.env"
touch "\$ENV_FILE"
if grep -q '^MOBILE_INTERNAL_API_KEY=' "\$ENV_FILE"; then
  sed -i "s|^MOBILE_INTERNAL_API_KEY=.*|MOBILE_INTERNAL_API_KEY=${KEY}|" "\$ENV_FILE"
else
  echo "MOBILE_INTERNAL_API_KEY=${KEY}" >> "\$ENV_FILE"
fi
if grep -q '^MOBILE_API_BASE_URL=' "\$ENV_FILE"; then
  sed -i "s|^MOBILE_API_BASE_URL=.*|MOBILE_API_BASE_URL=${MOBILE_API_BASE_URL}|" "\$ENV_FILE"
else
  echo "MOBILE_API_BASE_URL=${MOBILE_API_BASE_URL}" >> "\$ENV_FILE"
fi
sudo systemctl restart "${SYSTEMD_UNIT:-crm-api}"
echo "CRM VPS: MOBILE_INTERNAL_API_KEY set, backend restarted"
grep -E '^(MOBILE_INTERNAL_API_KEY|MOBILE_API_BASE_URL)=' "\$ENV_FILE" | sed 's/=.*/=***/'
curl -sf http://127.0.0.1:4000/health && echo " — health OK" || echo "WARN: /health failed"
EOF
