# Database (template)

Owned SQL for local evaluation and CI.

| File | Purpose |
| --- | --- |
| `001_core_schema.sql` | Core tables the API expects to already exist |
| `002_runtime_tables.sql` | Satellite tables (also auto-created by the API) |
| `seed/001_demo_seed.sql` | Anonymized demo cabinets, users, cases, quotes |

## Commands (from repo root)

```bash
docker compose up -d          # MySQL on localhost:3306
cp backend/.env.example backend/.env
npm run db:setup              # apply schema + seed
npm run db:reset              # drop/recreate database, then setup
```

## Demo logins

| Email | Password | Role |
| --- | --- | --- |
| `lab@example.com` | `Doctor123!` | Lab (`company`) — full nav (no `user_rights` rows) |
| `doctor@example.com` | `Doctor123!` | Doctor — overview + case rights |

`tbl_sidebar.sidebar_name_en` values must match `rightName` strings in `src/components/Dashboard/Sidebar/config/navSections.js`. Wrong names + non-empty `user_rights` hide the entire sidebar.

`SOURCE_DB_URL` defaults in `backend/.env.example` match Compose MySQL.

After changing seed SQL, run `npm run db:reset` (plain `db:setup` re-applies seed deletes for ACL, but a full reset is safest).
