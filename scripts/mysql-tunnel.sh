#!/usr/bin/env bash
# SSH tunnel: localhost:LOCAL_PORT → REMOTE_HOST:REMOTE_PORT via SSH_USER@SSH_HOST
#
# Required:
#   SSH_USER
#   SSH_HOST
# Optional:
#   LOCAL_PORT   (default 3307)
#   REMOTE_HOST  (default: set explicitly; no product hostname baked in)
#   REMOTE_PORT  (default 3306)
#
# Usage:
#   export SSH_USER=… SSH_HOST=… REMOTE_HOST=…
#   bash scripts/mysql-tunnel.sh
#
# Tip — ~/.ssh/config:
#   Host my-db-tunnel
#     HostName YOUR_SSH_HOST
#     User YOUR_SSH_USER
#     IdentityFile ~/.ssh/id_rsa

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

if [[ -z "${SSH_USER:-}" || "$SSH_USER" == YOUR_SSH_USER ]]; then
  echo "FAIL: set SSH_USER"
  exit 1
fi
if [[ -z "${SSH_HOST:-}" || "$SSH_HOST" == YOUR_SSH_HOST ]]; then
  echo "FAIL: set SSH_HOST"
  exit 1
fi
if [[ -z "${REMOTE_HOST:-}" ]]; then
  echo "FAIL: set REMOTE_HOST (MySQL host as seen from the SSH server)"
  exit 1
fi

LOCAL_PORT="${LOCAL_PORT:-3307}"
REMOTE_PORT="${REMOTE_PORT:-3306}"

lsof -ti:"${LOCAL_PORT}" | xargs kill -9 2>/dev/null || true

echo "Opening tunnel: localhost:${LOCAL_PORT} → ${REMOTE_HOST}:${REMOTE_PORT}"
echo "Press Ctrl+C to close."
echo ""

ssh \
  -o StrictHostKeyChecking=accept-new \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -N \
  -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
  "${SSH_USER}@${SSH_HOST}"
