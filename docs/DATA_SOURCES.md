# Data sources

Two modes:

1. **API on** (`VITE_USE_API=true`) — UI talks to Fastify / MySQL. This is what you want day to day.
2. **API off / dump helpers** — scripts can build fixtures like `patients.json` from a _local_ dump. Don’t commit production dumps.

## Documents

Metadata (name, size, type) comes from the DB/API. The actual files live on the API host under `UPLOADS_DIR` (default `data/uploads`). URL shape: `/data/uploads/{case_id}/{filename}` (same-origin; Vite proxies `/data` to the local API in development).

Optional `VITE_DOCS_BASE_URL` may set an absolute CRM origin for production builds. Broken image URLs should still leave the filename visible.

## Chat / discussion / suivi / plan

- `tbl_chat` — in-case chat
- `tbl_reply` (+ `reply_docs`) — discussion thread and attachments
- `tbl_suivi` — follow-up log → case suivi API
- `tbl_plan` — payment plan summary

In API mode these go through the matching `/api/v1` routes. See [API.md](API.md) and [DATA_LOADING.md](DATA_LOADING.md) for what loads on refresh.
