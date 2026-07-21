# Contributing

This repository is a **CRM template for clear-aligner production labs**. Treat changes with the same care you would for a real CRM deployment: small PRs, no secrets, no real patient data in fixtures.

## Branches

`feat/…`, `fix/…`, `chore/…`, `refactor/…` — keep names clear and PRs focused.

## Before you ask for review

Root:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Backend:

```bash
cd backend
npm run lint
npm run typecheck
npm run test:run
npm run build
```

CI runs the same gates. Red CI = don’t merge.

## Tests

- Unit / component: next to the file, or under `src/test/` (Vitest + Testing Library)
- API: `backend/tests/`
- Smoke e2e: `e2e/` (Playwright) — local only; CI does not run Playwright

If you touch auth, tenancy, or billing, add tests. Never put real patient data or secrets in fixtures.

## Code layout reminders

- Components → `services/`, not straight to `@/core/api` or repositories.
- Logic shared by UI + API → `@aligner-crm/domain`, then `npm run build:domain`.
- PDFs → `@/utils/pdf`.

See [ARCHITECTURE.md](ARCHITECTURE.md) if you’re unsure where something belongs.

## Auth / deploy changes

Touching JWT, roles, cron keys, or deploy scripts? Update tests, don’t hardcode hosts/secrets, and skim [SECURITY.md](SECURITY.md).

If setup or behaviour changes, update the matching doc in the same PR.
