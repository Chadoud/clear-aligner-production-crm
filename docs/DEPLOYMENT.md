# Deploy

## Before you ship

- CI green on the commit you’re releasing
- Secrets only on the host (env), not in the repo
- You can reach MySQL from that host (`SOURCE_DB_URL`)
- Prod has real `JWT_SECRET` + `CORS_ORIGIN` (`NODE_ENV=production`)

## Build

```bash
npm ci
npm run build
cd backend && npm ci && npm run build
```

There are helper scripts (`deploy:vps`, `scripts/push-vps-from-local.sh`) if you set `VPS_*` yourself. Don’t commit real hosts/keys into those scripts.

## Steps

1. Put frontend `dist/` on the web root.
2. Put the backend build on the VPS (and install prod deps / use your image).
3. Check env: DB, JWT, CORS, SMTP, mobile keys as needed. Behind nginx, rely on production defaults `TRUST_PROXY=1` and `LISTEN_HOST=127.0.0.1` (API not bound to `0.0.0.0`).
4. Restart (`systemd` / pm2 / whatever you use).
5. Smoke: `/health`, `/health/ready`, login, open a case, peek an invoice.

Keep the previous build around so [ROLLBACK.md](ROLLBACK.md) is painless. Watch error rates ([MONITORING.md](MONITORING.md)).
