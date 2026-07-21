/**
 * Second A4 page: patient mobile app login.
 *
 * Username format (post-migration): FirstName.LASTNAME.CaseRef  e.g. "Jane.DOE.1001"
 * Password: 12-char random alphanum, bcrypt-12 hashed in DB.
 *
 * The plaintext is stored on tbl_case.mob_app_password and included on invoice payloads
 * as case_mob_app_password so the CRM always shows it.
 *
 * mob_app_password_once is still supported for the first API response after provisioning.
 *
 * Backward-compat fallback: for cases provisioned before this migration
 * (tbl_case.username still NULL), the username is derived from the patient
 * name and the password falls back to the case ID (legacy behaviour).
 */
import { getInvoiceClient } from "./invoiceData.js";
import {
  INVOICE_STATUS_IN_FABRICATION,
  INVOICE_STATUS_PAID,
} from "./invoiceStatusConstants.js";

/**
 * @param {object} data - Invoice payload
 * @param {string} [documentType] - 'invoice' | 'quote' | 'arrangement' | 'receipt'
 * @returns {boolean}
 */
export function shouldAppendMobAppCredentialsPage(
  data,
  documentType = "invoice"
) {
  if (!data) return false;
  if (documentType !== "invoice") return false;
  const status = Number(data.invoiceStatus);
  const isActiveInvoice =
    status === INVOICE_STATUS_IN_FABRICATION || status === INVOICE_STATUS_PAID;
  if (!Number.isFinite(status) || !isActiveInvoice) {
    return false;
  }
  const caseId = data.case_id ?? data.caseId;
  if (caseId == null || String(caseId).trim() === "") return false;
  if (!Number.isFinite(Number(caseId))) return false;
  const client = getInvoiceClient(data);
  const name = String(client?.name ?? "").trim();
  if (!name) return false;
  return true;
}

/**
 * @param {object} data - Invoice payload
 * @returns {{ username: string, password: string }}
 */
export function getMobAppCredentialsDisplay(data) {
  const client = getInvoiceClient(data);
  const caseId = data?.case_id ?? data?.caseId;

  // ── Username ──────────────────────────────────────────────────────────────
  // Post-migration: stored on tbl_case as "FirstName.LASTNAME.CaseRef".
  // Legacy fallback: plain patient name from invoice client.
  const username =
    (data?.case_username != null ? String(data.case_username).trim() : "") ||
    String(client?.name ?? "").trim();

  // ── Password ──────────────────────────────────────────────────────────────
  let password = "";
  if (
    data?.case_mob_app_password != null &&
    String(data.case_mob_app_password).trim() !== ""
  ) {
    password = String(data.case_mob_app_password).trim();
  } else if (data?.mob_app_password_once != null) {
    password = String(data.mob_app_password_once).trim();
  } else if (data?.case_username == null) {
    password =
      caseId != null && String(caseId).trim() !== "" ? String(caseId) : "";
  }

  return { username, password };
}
