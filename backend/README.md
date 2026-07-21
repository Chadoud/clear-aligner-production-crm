# Clear Aligner Production CRM — API

Fastify + MySQL backend for the CRM UI.

## Setup

```bash
# from repo root
npm install
cd backend && npm install

cp .env.example .env
# set SOURCE_DB_URL, JWT_SECRET, CORS_ORIGIN at minimum
```

If MySQL is only reachable over SSH, open the tunnel from the repo root first (`scripts/mysql-tunnel.sh` — needs `SSH_USER`, `SSH_HOST`, `REMOTE_HOST`).

## Run

```bash
npm run dev          # from backend/  → http://localhost:4000
# or from root: npm run dev:backend
```

Health: `GET /health`, `GET /health/ready`.

## Build / test

```bash
# domain package must be built first (from repo root):
npm run build:domain

cd backend
npm run typecheck
npm run test:run
npm run build
```

`npm run lint` here reuses TypeScript (`tsc --noEmit`) so CI stays honest without a separate ESLint config.

Env reference: [`.env.example`](.env.example). API map: [../docs/API.md](../docs/API.md).

## Docker

No first-party Dockerfile is shipped. The API depends on the repo-root `packages/domain` workspace package, so container builds should start from the repository root (build domain, then backend).
