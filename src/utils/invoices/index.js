/**
 * Invoice utilities barrel.
 * @module utils/invoices
 */

export {
  getInvoiceClient,
  getClientRef,
  prepareInvoiceData,
  hasMonthlyArrangementPlan,
  validateLabTreatmentDuration,
} from "./invoiceData.js";
export { formatTodayDDMMYYYY } from "../dates/dateUtils.js";
export {
  formatCHF,
  formatDateEnGB,
  formatInvoiceDateForDisplay,
  getFromSectionDateText,
  getSignatureDateText,
  roundToNearest5Cents,
  INVOICE_TEXTS,
} from "./invoiceFormatters.js";
export {
  generateDoctorInvoiceId,
  getDoctorBillDownloadFilename,
  getDoctorInvoiceIdForPreview,
} from "./doctorInvoiceId.js";
export {
  getInvoiceQuoteDisplay,
  getQuoteTargetStatus,
  isQuoteInvoice,
  QUOTE_STATUS_EN_ATTENTE,
  QUOTE_STATUS_IN_TREATMENT,
} from "./quoteHelpers.js";
export {
  INVOICE_STATUS_QUOTE,
  INVOICE_STATUS_IN_FABRICATION,
  INVOICE_STATUS_PAID,
} from "./invoiceStatusConstants.js";
export {
  generateNextInvoiceRef,
  getInvoiceRef,
  parseInvoiceRefNumber,
} from "./invoiceRef.js";
export {
  buildInvoiceTableRows,
  calculateInvoiceTotal,
  getInvoiceTotalMismatch,
  rowToPdfFormat,
  shouldExcludeFromTotal,
  shouldExcludeService,
  sumInvoiceRowTotals,
  VAT_RATE,
} from "./invoiceServiceHelpers.js";
export {
  computeVatBreakdown,
  resolveVatRate,
  SWISS_VAT_RATE,
  LAB_VAT_RATE,
} from "./vatBreakdown.js";
export { sumInstalments, computeDownPayment } from "./paymentPlan.js";
