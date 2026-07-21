import { formatVatLine, getInvoicePdfLabels } from "./invoicePdfLabels.js";

/**
 * Localized VAT breakdown row labels.
 * @param {string} [locale]
 * @returns {{ subtotalExclVat: string, totalInclVat: string, formatVatLine: (pct: string|number) => string }}
 */
export function getVatLabels(locale) {
  const copy = getInvoicePdfLabels(locale);
  return {
    subtotalExclVat: copy.subtotalExclVat,
    totalInclVat: copy.totalInclVat,
    formatVatLine: (pct) => formatVatLine(pct, locale),
  };
}
