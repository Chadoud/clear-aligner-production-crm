/**
 * Invoice Data Service
 *
 * Handles all invoice data operations including storage, retrieval, and updates.
 * When VITE_USE_API=true: uses backend API. Otherwise: localStorage.
 *
 * @module services/invoiceDataService
 */

export {
  notifyDoctorBillingGeneratedApi,
  notifyDoctorBillingPaidApi,
} from "@/repositories/InvoiceRepository.js";

export { loadInvoices, saveInvoices } from "./invoice/loadSave.js";
export { addInvoice, updateInvoice, deleteInvoice } from "./invoice/crud.js";
export {
  filterInvoicesByVisiblePatients,
  filterInvoicesByPatient,
  filterInvoicesForPatient,
  getInvoiceCountForPatient,
} from "./invoice/filters.js";
export {
  markInvoicesBilledForCaseRefs,
  unmarkInvoicesBilledForCaseRefs,
  markInvoicesPaidForCaseRefs,
  unmarkInvoicesPaidForCaseRefs,
} from "./invoice/billing.js";
