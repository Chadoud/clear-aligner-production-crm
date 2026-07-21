/**
 * Filter invoices by patient / visibility.
 * @module services/invoiceDataServiceFilters
 */

import { getInvoiceClient } from "@/utils/invoices/index.js";
import { normalizeIdentityValue } from "./matching.js";
import { loadInvoices } from "./loadSave.js";

/**
 * Filter invoices to those whose client matches visible patients.
 */
export const filterInvoicesByVisiblePatients = (invoices, visiblePatients) => {
  if (!Array.isArray(visiblePatients) || visiblePatients.length === 0)
    return [];
  const refs = new Set();
  const names = new Set();
  visiblePatients.forEach((p) => {
    const r = p?.ref != null ? normalizeIdentityValue(String(p.ref)) : "";
    const n = p?.name != null ? normalizeIdentityValue(String(p.name)) : "";
    if (r) refs.add(r);
    if (n) names.add(n);
  });
  return invoices.filter((invoice) => {
    const client = getInvoiceClient(invoice) || {};
    const invoiceRef = normalizeIdentityValue(client.ref);
    const invoiceName = normalizeIdentityValue(client.name);
    if (invoiceRef && refs.has(invoiceRef)) return true;
    if (invoiceName && names.has(invoiceName)) return true;
    return false;
  });
};

/**
 * Filter invoices by patient.
 */
export const filterInvoicesByPatient = (
  invoices,
  patientName,
  patientRef = ""
) => {
  const targetRef = normalizeIdentityValue(patientRef);
  const targetName = normalizeIdentityValue(patientName);

  if (!targetName && !targetRef) return [];

  return invoices.filter((invoice) => {
    const client = getInvoiceClient(invoice) || {};
    const invoiceRef = normalizeIdentityValue(client.ref);
    const invoiceName = normalizeIdentityValue(client.name);

    if (targetRef && invoiceRef) return invoiceRef === targetRef;
    if (targetName && invoiceName) return invoiceName === targetName;

    return false;
  });
};

/**
 * Filter invoices for a specific patient (case-scoped or ref/name).
 * When patient.case_id exists, filter by case_id; else by client ref/name.
 */
export const filterInvoicesForPatient = (allInvoices, patient) => {
  if (!Array.isArray(allInvoices)) return [];
  if (!patient) return [];
  const caseId = patient.case_id;
  if (caseId != null && Number.isFinite(caseId)) {
    return allInvoices.filter(
      (inv) => inv?.case_id != null && Number(inv.case_id) === Number(caseId)
    );
  }
  const name = patient?.name != null ? String(patient.name).trim() : "";
  const ref = patient?.ref != null ? String(patient.ref).trim() : "";
  return filterInvoicesByPatient(allInvoices, name, ref);
};

/**
 * Get invoice count for a patient
 * @returns {Promise<number>}
 */
export const getInvoiceCountForPatient = async (patientName) => {
  const invoices = await loadInvoices();
  return filterInvoicesByPatient(invoices, patientName).length;
};
