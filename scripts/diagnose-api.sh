#!/usr/bin/env bash
# Quick API diagnostics — run when case-sheets fail.
# Usage: bash scripts/diagnose-api.sh

echo "=== API diagnostics ==="
echo ""

echo "1. Backend health (no auth):"
curl -s -o /dev/null -w "   GET /health → %{http_code}\n" http://localhost:4000/health 2>/dev/null || echo "   FAILED (backend not reachable)"

echo ""
echo "2. MySQL readiness (no auth):"
curl -s -o /dev/null -w "   GET /health/ready → %{http_code}\n" http://localhost:4000/health/ready 2>/dev/null || echo "   FAILED"
curl -s http://localhost:4000/health/ready 2>/dev/null | head -1
echo ""

echo "3. Case-sheets (requires JWT):"
echo "   GET /api/v1/case-sheets/:caseId → (needs Bearer token from login)"
echo "   If you see 401: log out and log back in."
echo "   If you see 500: check backend logs for MySQL errors."
echo ""

echo "4. Port 4000 in use?"
lsof -i :4000 2>/dev/null | head -3 || echo "   Nothing on 4000"
echo ""

echo "5. MySQL tunnel (port 3307)?"
lsof -i :3307 2>/dev/null | head -3 || echo "   Nothing on 3307 — run: bash scripts/mysql-tunnel.sh"
