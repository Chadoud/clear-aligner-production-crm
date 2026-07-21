#!/usr/bin/env bash
# Full VPS deploy: backend (build + restart) + frontend (build + nginx).
# Run on server from repo root: bash scripts/ops/deploy-vps-all.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=== 1/2 Backend ==="
cd "$ROOT/backend"
UNIT="${SYSTEMD_UNIT:-crm-api}"
npm ci
npm run build
echo "Restart backend: sudo systemctl restart $UNIT"
sudo systemctl restart "$UNIT"

cd "$ROOT"
echo ""
echo "=== 2/2 Frontend ==="
bash scripts/ops/deploy-vps-frontend.sh
