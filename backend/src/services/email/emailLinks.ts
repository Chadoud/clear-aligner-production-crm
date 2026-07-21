/**
 * Deep links into the CRM web app (must match `src/routes/AppRoutes.jsx` + `sectionConfig.js`).
 * Uses `APP_BASE_URL` from env (see `config.appBaseUrl`).
 */
import { config } from "../../config.js";

function base(): string {
  return config.appBaseUrl.replace(/\/$/, "");
}

/** Lab / company user — case sheet */
export function crmCompanyCaseUrl(caseId: number): string {
  return `${base()}/app/company/case-management/id/${caseId}`;
}

/** Doctor / cabinet user — case sheet (patient) */
export function crmDoctorCaseUrl(caseId: number): string {
  return `${base()}/app/doctor/case-management/id/${caseId}`;
}

/**
 * Doctor / cabinet user — case sheet opened directly on the Invoices tab.
 * `tab=invoice-generated` matches `caseManagementTabs.js` (the "Invoices" tab
 * where generated invoices/quotes are listed). Used for invoice emails.
 */
export function crmDoctorCaseInvoiceUrl(caseId: number): string {
  return `${base()}/app/doctor/case-management/id/${caseId}?tab=invoice-generated`;
}

export function crmDoctorDoctorsBillingUrl(): string {
  return `${base()}/app/doctor/doctors-billing`;
}

export function crmLoginUrl(): string {
  return `${base()}/login`;
}
