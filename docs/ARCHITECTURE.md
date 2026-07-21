# Architecture

Rough map of **Clear Aligner Production CRM**. Setup is in the [root README](../README.md).

## Pieces

```
React (Vite)  --JWT-->  Fastify API  -->  MySQL
                 |              |
                 |              +--> SMTP
                 |              +--> local disk (/data/uploads, /data/profile)
                 +--> Socket.IO bridge --> mobile API (optional)
```

Day-to-day users are lab (`company`) and doctor accounts. Case documents and profile images are served by this API (same-origin `/data/...` and `/api/v1/media/profile/...`).

## Where code lives

**`packages/domain`** — pure TypeScript (pricing, excluded service codes). Vite points at `src/` in dev; the API uses the built `dist/`. After you change it: `npm run build:domain`.

**`src/`** — React app. Important folders:

- `components/` — dashboard, invoices, settings, shared UI
- `services/` — what components should call (ESLint pushes you away from raw `@/core/api`)
- `core/` — API client, auth keys, errors, logging
- `hooks/`, `pages/`, `utils/invoices/`, `utils/pdf/`

Dashboard lazy-loads heavy sections — keep doing that for large new panels.

**`backend/src/`**

- `http/` + `routes/v1/` — HTTP surface and auth hook
- `modules/` — auth, case-sheets, …
- `services/` — email, profile sync
- `repositories/` — SQL
- `security/` + `auth/` — JWT, policies

## Conventions that save pain

- PDFs: import from `@/utils/pdf`, don’t reinvent asset paths in random components.
- Invoice math on the UI: prefer `src/utils/invoices/` helpers instead of copying quote/paid rules.
- Email HTML: reuse the layout helpers under `backend/src/services/email/`.

More: [API.md](API.md), [SECURITY.md](SECURITY.md), [DATA_SOURCES.md](DATA_SOURCES.md).
