import { getInitialUiLocale, i18n } from "@/i18n";

/** @typedef {'en'|'fr'} UiLocale */

const TITLES = {
  en: {
    default: {
      quote: "QUOTATION",
      invoice: "INVOICE",
      receipt: "RECEIPT",
      arrangement: "PAYMENT ARRANGEMENT",
    },
    Lab: {
      quote: "QUOTE",
      invoice: "BULLETIN",
      receipt: "RECEIPT",
      arrangement: "PAYMENT ARRANGEMENT",
    },
  },
  fr: {
    default: {
      quote: "DEVIS",
      invoice: "FACTURE",
      receipt: "REÇU",
      arrangement: "PLAN DE PAIEMENT MENSUEL",
    },
    Lab: {
      quote: "DEVIS",
      invoice: "BULLETIN",
      receipt: "REÇU",
      arrangement: "PLAN DE PAIEMENT MENSUEL",
    },
  },
};

/** @deprecated Use locale-aware maps via getViewTitle */
export const DOCUMENT_TYPE_VIEW_TITLE = TITLES.en.default;

/** @deprecated Use locale-aware maps via getViewTitle */
export const LAB_DOCUMENT_TYPE_VIEW_TITLE = TITLES.en.Lab;

/**
 * @param {string} [locale]
 * @returns {UiLocale}
 */
export function normalizeUiLocale(locale) {
  const raw =
    locale ??
    (i18n.isInitialized ? i18n.language : null) ??
    getInitialUiLocale();
  return String(raw).startsWith("fr") ? "fr" : "en";
}

/** Active UI locale (browser session). */
export function getActiveUiLocale() {
  return normalizeUiLocale();
}

/**
 * Ensure invoice/PDF payloads carry the active UI locale for headless generation.
 * @param {object} [data]
 * @param {string} [locale]
 */
export function withUiLocale(data, locale) {
  const lng = normalizeUiLocale(locale ?? getActiveUiLocale());
  if (!data || typeof data !== "object") return { uiLocale: lng };
  return { ...data, uiLocale: data.uiLocale ?? lng };
}

/**
 * Preview/PDF title by document type, brand, and UI locale.
 * @param {string} [documentType]
 * @param {string} [brand]
 * @param {string} [locale]
 * @returns {string}
 */
export function getViewTitle(documentType, brand, locale) {
  const lng = normalizeUiLocale(locale);
  const map = brand === "Lab" ? TITLES[lng].Lab : TITLES[lng].default;
  return map[documentType] || map.invoice;
}
