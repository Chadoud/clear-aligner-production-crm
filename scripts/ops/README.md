# Private deploy helpers

These scripts are **not** required to evaluate the template locally.

They assume you already operate a VPS (nginx, systemd unit, rsync). Configure via env vars such as `VPS_HOST`, `VPS_USER`, `VPS_REPO`, `WEB_ROOT`, `SYSTEMD_UNIT` (default `crm-api`).

| Script | Purpose |
| --- | --- |
| `deploy-vps-frontend.sh` | Build frontend and rsync to web root |
| `deploy-vps-all.sh` | Backend build/restart + frontend deploy |
| `push-vps-from-local.sh` | Push backend artifact from a workstation |
| `set-vps-internal-key.sh` | Set mobile internal API key on the host |

Local template path: `docker compose up -d` → `npm run db:setup` → `npm run dev:all` (see root README).
