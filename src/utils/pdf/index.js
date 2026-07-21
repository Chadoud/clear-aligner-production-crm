/**
 * PDF utilities barrel — import from here for stable public APIs.
 * Invoice/receipt/arrangement: pdfGeneratorInvoice.js
 * Doctor bill: pdfGeneratorDoctorBill.js
 * Doctor invoice: pdfGeneratorDoctorInvoice.js
 * Doctor bill from HTML preview: doctorBillHtmlToPdf.js
 */
export { resolveAssetPath, resolveBrandAssets } from "./sharedPdfConfig.js";
export {
  generateDoctorBillPdfFromPreviewElement,
  generateInvoicePreviewHtmlPdfBase64,
  waitForDoctorBillPreviewMounted,
} from "./doctorBillHtmlToPdf.js";
export {
  generatePDF,
  buildInvoiceDownloadFilename,
} from "./pdfGeneratorInvoice.js";
export {
  generateDoctorBillPDF,
  previewDoctorBillPDF,
} from "./pdfGeneratorDoctorBill.js";
export {
  generateDoctorInvoicePDF,
  generateDoctorInvoicePDFAsBlob,
} from "./pdfGeneratorDoctorInvoice.js";
