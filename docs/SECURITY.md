# Security

How auth and secrets actually work in this CRM. Keep this in sync if you change auth or env vars.

## Rules of thumb

- Secrets stay in env (or a vault). Only `*.env.example` is in git.
- The UI can hide buttons; the API is what enforces access.
- In production, missing `JWT_SECRET` (and friends) should fail startup — don’t ship with the dev default.

## Login / passwords

- Login hits MySQL user rows via the Fastify auth routes.
- Passwords are **bcrypt only** (`bcryptjs`, full `$2a$` / `$2b$` / `$2y$` hashes). Non-bcrypt stored values are rejected.
- Successful login returns a JWT. The React app keeps it in `sessionStorage` and sends `Authorization: Bearer …`.
- Forgot-password goes through SMTP and links to the CRM page `/reset-password?token=...`. If SMTP isn’t configured, that path returns 503.

Also used:

- `API_KEY` / `X-API-Key` — server-to-server
- `CRON_SECRET` / `X-Cron-Secret` — scheduled jobs
- `MOBILE_INTERNAL_API_KEY` (+ matching JWT secrets) — CRM ↔ mobile API (optional)

Frontend `AuthContext` restores the session for UX. Anything that matters still needs a JWT the auth guard accepts.

## Roles / tenancy

Principals are mainly `company` or `doctor`. Policies live under `backend/src/security/policies`; repositories also filter by tenant. There are a few delegated-access helpers for sidebar / case edge cases.

If you change billing or case mutations, add or update tests under `backend/tests` (auth-guard, access, invoices).

## HTTP stack

Fastify is wired with Helmet, CORS (`CORS_ORIGIN` required in prod), global rate limiting, and a shared error handler that shouldn’t dump stack traces to clients.

### Rate limiting

- **Global:** ~300 requests / minute per client IP (CORS `OPTIONS` skipped; `/health`, `/health/ready`, `/api/v1/status` exempt).
- **Auth (stricter, dual counters):** login and password-reset routes enforce **per-IP** and **per-email** (or per reset-token hash) limits independently via a small in-process limiter (`rateLimitPolicy.ts`). Either trip returns `429` with a uniform message — no hint which dimension fired. (Chaining two `@fastify/rate-limit` hooks on one request does not work — the plugin skips the second run.)
- Auth limits run in `preHandler` so email/token keys see the parsed body.
- **`TRUST_PROXY`:** in production the default is `1` hop so `req.ip` uses `X-Forwarded-For` from nginx. Dev defaults to off. Only safe if the API is bound to localhost behind the proxy.
- **`LISTEN_HOST`:** production default `127.0.0.1` so Node is not reachable from the internet; nginx on the same host proxies to it. Dev default `0.0.0.0`.
- Store is **in-memory per process**. Keep a **single** Node/API process (e.g. PM2 `instances: 1`). Multi-instance needs a shared store (Redis) — not bundled here.

## Env secrets you’ll care about

`SOURCE_DB_URL`, `JWT_SECRET`, `MOBILE_JWT_SECRET`, `SMTP_*`, `MOBILE_INTERNAL_API_KEY`, `CRON_SECRET`, `API_KEY`, `TRUST_PROXY`, `LISTEN_HOST`.

Copy from `backend/.env.example`. Rotate anything that ever leaked in an old repo history.

## Data

Don’t commit dumps, patient exports, or upload trees. Dev against the API or a local anonymised DB. Case documents and profile images are stored on the API host (`UPLOADS_DIR` / `PROFILE_DIR`) and served by this CRM.

## Logging

API uses Pino. Don’t log passwords, tokens, or full patient payloads.

Issues on a live system: report privately, don’t file a public issue with exploit details.
