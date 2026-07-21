# Branding checklist

Swap these placeholders before any live deployment. Evaluation with the demo seed does not require this.

## 1. Assets

| Asset                  | Path                                    |
| ---------------------- | --------------------------------------- |
| Logo (PNG)             | `public/assets/brand/logo.png`          |
| Logo (SVG)             | `public/assets/brand/logo.svg`          |
| Wave / chrome (SVG)    | `public/assets/brand/downWave.svg`      |
| QR payment placeholder | `public/assets/brand/qrPlaceholder.png` |
| Favicon                | `public/favicon.png`                    |

Ship solid-color placeholders by default so invoice PDF / tab icon never 404.

## 2. Display names

| Knob                        | Where                                                       |
| --------------------------- | ----------------------------------------------------------- |
| Frontend app name           | `.env` → `VITE_APP_NAME`                                    |
| Product label (UI)          | `src/config/brandLabels.js` → `PRODUCT_DISPLAY_NAME`        |
| Product label (emails/API)  | `backend/src/utils/brandLabels.ts` → `PRODUCT_DISPLAY_NAME` |
| Catalog labels Lab / Direct | same `brandLabels` files (`brandDisplayName`)               |
| Email From name             | `backend/.env` → `FROM_NAME`                                |

Keep FE and BE `PRODUCT_DISPLAY_NAME` in sync (CI drift test).

## 3. Organisation contact (invoices / emails)

Set in `backend/.env`:

- `ORG_CONTACT_EMAIL`
- `ORG_CONTACT_PHONE`
- `ORG_CONTACT_ADDRESS` (`Name\|Street\|Postal City\|Country`)
- `ORG_CONTACT_WEBSITE`
- `APP_BASE_URL` (links in transactional email)
- `LAB_NOTIFICATION_EMAIL`

## 4. Optional dual catalog

If one login should switch Lab/Direct catalogs:

- `DIRECT_CABINET_ID` / `VITE_DIRECT_CABINET_ID`
- `DUAL_LAB_PROFILE_EMAIL` / `VITE_DUAL_LAB_PROFILE_EMAIL`

Local demo seed does not enable dual profile by default.

## 5. Quick verify

```bash
npm run dev:all
# Login page shows product name / logo
# Create invoice → Preview → QR placeholder image loads
```
