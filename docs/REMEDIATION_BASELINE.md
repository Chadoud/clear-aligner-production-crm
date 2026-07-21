# Hardening notes

Priority when something’s on fire: auth / tenancy / secrets / deploy safety first, nice-to-have features later.

Anything that changes login, roles, cron/internal keys, or deploy scripts needs tests in the same PR.

## Ownership

Whoever changes the code owns the tests and the rollback story for that change. CI staying green is a shared bar for every PR.

## Worth watching in production

- 5xx rate and p95 latency
- Unusual spikes in 401/403
- CI flakes
- Frontend bundle size creeping up

## What’s already in place

- Principal on the request lifecycle
- Tenant scoping on the main patient/case/cabinet/user/chat/case-sheet paths
- Helmet, rate limit, shared error handler
- CI gates on front + back

See [SECURITY.md](SECURITY.md) and [MONITORING.md](MONITORING.md).
