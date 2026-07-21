# Data Loading on Page Refresh

Which providers and hooks hit the API on first load or refresh. Handy when debugging duplicate fetches.

## Provider Hierarchy (App Mount)

```
AuthProvider
  SettingsProvider
    BrandProvider
      ServicesProvider
        PatientServiceProvider
          ServicesBrandSync
            [children: InvoiceDataProvider when in /app]
```

## Providers That Fetch on Mount

### PatientServiceProvider

- **Location:** `src/context/PatientServiceContext.jsx`
- **When:** As soon as auth token is available
- **What:** `loadPatientData()` — fetches all patients via paginated API (1000 per page)
- **API:** `GET /api/v1/patients?limit=1000&offset=0&skip_count=1` (repeated until no more pages)
- **Listeners:** `patients:refresh` (full refetch), `patients:refresh-soft` (re-render from cache only)

### InvoiceDataProvider

- **Location:** `src/context/InvoiceDataContext.jsx`
- **When:** When inside `/app` and auth token is present
- **What:** `useInvoiceData(null, !!token)` — loads all invoices (no patient filter)
- **API:** `GET /api/v1/invoices` (or similar)

### ServicesBrandSync

- **Location:** `src/app/providers.tsx`
- **When:** When `brand` is set (Lab or Direct)
- **What:** `loadServicesForBrand(brand)` — fetches service catalog for the brand
- **API:** `GET /api/v1/services-overrides/:brand` or JSON file fallback

### useCabinetList

- **Location:** `src/hooks/useCabinetList.js`
- **When:** On first mount (Overview, case management, etc.)
- **What:** `loadCabinetsFromApi()` — fetches cabinet/doctor list
- **API:** `GET /api/v1/cabinets` (or similar)

## Additional Loads When Viewing a Case

When URL is `/case-management/id/:caseId`:

- **useSelectedPatientSync:** `fetchPatientByCaseId` (if not in cache), `markCaseAsSeen`
- **useCaseSheet:** `getCaseSheet(caseId)` → `GET /api/v1/case-sheets/:id` — **deferred** until user opens a tab that needs it (plan, stripping, treatment, followup, notes). Tabs like discussion, invoice, docs do not trigger the fetch.

## Custom Events

| Event                   | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `patients:refresh`      | Full patient list refetch (e.g. after delete, ref change)        |
| `patients:refresh-soft` | Re-render from cache without refetch (e.g. after markCaseAsSeen) |
| `invoices:refresh`      | Refetch invoices (e.g. after accept quote)                       |

## When to Use Full Refresh vs Soft Refresh

- **Full refresh (`dispatchPatientsRefresh`):** Use when the patient list data has changed on the server (delete, ref update, new case).
- **Soft refresh (`dispatchPatientsRefreshSoft`):** Use when only the local cache was updated optimistically (e.g. `case_notif` after markCaseAsSeen). Avoids redundant API calls.
