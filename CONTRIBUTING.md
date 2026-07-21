# Contributing

This repository is a **CRM template for clear-aligner production labs**. Keep PRs small and run the quality gates before review.

Details (branches, tests, architecture rules): [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

Quick check from the repo root:

```bash
npm run lint && npm run typecheck && npm run test:run && npm run build
cd backend && npm run lint && npm run typecheck && npm run test:run && npm run build
```

Playwright (`npm run test:e2e`) needs Compose MySQL + `npm run db:setup` (or `db:reset`). CI runs the same journeys in the `e2e-smoke` job.
