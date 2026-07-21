/**
 * Download filename helpers for invoice PDFs.
 * @module utils/pdf/pdfGeneratorInvoiceFilename
 */

/**
 * Build download filename. For invoice: Dr{Cabinet}-Invoice-{PatientName}-YYYY-MM-DD-[Sn].pdf when ref is parseable.
 * @param {string} type - 'invoice' | 'receipt' | 'arrangement'
 * @param {string} safeName - Sanitized client name
 * @param {string} [ref] - Invoice ref e.g. "Jacoby-2026-03-04-[S3]"
 * @returns {string}
 */
export function buildInvoiceDownloadFilename(type, safeName, ref) {
  if (type === "invoice" && ref && typeof ref === "string") {
    const parts = ref.split("-");
    if (parts.length >= 5) {
      const suffix = parts.pop();
      const date = parts.slice(-3).join("-");
      const doctorPart = parts.slice(0, -3).join("");
      const prefix = doctorPart.startsWith("Dr")
        ? doctorPart
        : `Dr${doctorPart}`;
      return `${prefix}-Invoice-${safeName}-${date}-${suffix}.pdf`;
    }
  }
  return `${type}_${safeName}_${Date.now()}.pdf`;
}
