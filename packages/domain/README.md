# `@aligner-crm/domain`

Shared pure TS used by the CRM UI and the Fastify API (pricing helpers, excluded service codes, etc.). Keep it free of React/Fastify imports.

- Dev (Vite): resolves to this package’s `src/`
- Prod API: uses built `dist/` via `file:../packages/domain`

After changing `src/`:

```bash
npm run build:domain
```

Do that before a backend production build if `dist/` is stale.
