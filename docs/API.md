# API

Not a full OpenAPI dump — the route files under `backend/src` win if this page is stale.

## Frontend

- `ApiClient` (`src/core/api/ApiClient.ts`) — `request()`, retries, attaches Bearer token from `sessionStorage`
- `VITE_USE_API` (`src/config/api.js`) — off = more local/fixture behaviour
- Storage / logging / feature flags live under `src/core/`

Login token comes from `/api/v1/auth/login`.

## Backend basics

- Almost everything: `/api/v1/…`
- Health: `GET /health`, `GET /health/ready`
- Auth guard covers `/api/v1/*` except login, password reset, status, a couple of public media paths, and cron (cron uses its own secret)
- Lists usually take `limit` / `offset`; many take `q` or other filters

Wired in `backend/src/http/routes/v1.ts`.

## Where to look for routes

| Area                   | Mostly in                                |
| ---------------------- | ---------------------------------------- |
| Auth                   | `modules/auth/http/routes`               |
| Patients               | `routes/v1/patients.ts`                  |
| Cases (+ docs, suivi)  | `routes/v1/cases.ts`, `casesSplit/`      |
| Cabinets               | `routes/v1/cabinets.ts`                  |
| Invoices               | `routes/v1/invoices.ts`                  |
| Chat / replies         | `chat.ts`, `replies.ts`                  |
| Users / rights         | `users.ts`, `usersSplit/`                |
| Services overrides     | `servicesOverrides.ts`                   |
| Treatment plan         | `treatmentPlan.ts`                       |
| Profile                | `profileMedia.ts`, `profileOverrides.ts` |
| Realtime               | `realtime.ts`                            |
| Mobile / internal      | `internal.ts`                            |
| Cron billing reminders | `cronDoctorBillingReminders.ts`          |

Case-sheet logic also sits in `modules/case-sheets/`.

## Headers

- Browser: `Authorization: Bearer <jwt>`
- Machines: `X-API-Key` / mobile internal key as configured
- Cron: `X-Cron-Secret`

Local setup is in the [root README](../README.md).
