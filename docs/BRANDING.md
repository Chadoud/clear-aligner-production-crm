# Branding

Swap these placeholders before any live deployment.

## Assets

| Asset | Path |
| --- | --- |
| Logo (PNG) | `public/assets/brand/logo.png` |
| Logo (SVG) | `public/assets/brand/logo.svg` |
| QR payment placeholder | `public/assets/brand/qrPlaceholder.png` |
| Favicon | `public/favicon.png` |

## Display name

| Knob | Where |
| --- | --- |
| Frontend app name | `.env` → `VITE_APP_NAME` |
| UI / email labels | `src/config/brandLabels.js`, `backend/src/utils/brandLabels.ts` |
| Email From name | `backend/.env` → `FROM_NAME` |

## Organisation contact (invoices / emails)

Set in `backend/.env`:

- `ORG_CONTACT_EMAIL`
- `ORG_CONTACT_PHONE`
- `ORG_CONTACT_ADDRESS` (`Name\|Street\|Postal City\|Country`)
- `ORG_CONTACT_WEBSITE`
- `APP_BASE_URL` (links in transactional email)

## Catalogs

Lab vs Direct pricing catalogs live in:

- `public/services.json` / `public/services-lab.json` (frontend defaults)
- `tbl_services_lab` / `tbl_services_direct` (API overrides after first write)

## Dual lab profile (optional)

If one login should switch Lab/Direct catalogs, set matching:

- `DIRECT_CABINET_ID` / `VITE_DIRECT_CABINET_ID`
- `DUAL_LAB_PROFILE_EMAIL` / `VITE_DUAL_LAB_PROFILE_EMAIL`
