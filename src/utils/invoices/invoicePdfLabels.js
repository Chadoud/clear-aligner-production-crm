import { normalizeUiLocale } from "./documentTitles.js";

const LABELS = {
  en: {
    from: "FROM",
    to: "TO:",
    patient: "PATIENT:",
    emailPrefix: "Email:",
    bornOnPrefix: "Born on",
    datePrefix: "Date:",
    idPrefix: "ID:",
    treatment: "TREATMENT",
    treatmentPaid: "TREATMENT (PAID)",
    duration: "Duration",
    steps: "Steps",
    monthsSuffix: "months",
    tableQty: "Qty",
    tableCode: "Code",
    tableDescription: "Description",
    tableVpt: "VPt",
    tablePoints: "Points",
    tableTotalPoints: "T. Points",
    tableTotal: "Total",
    tableQuantity: "Quantity",
    tableService: "Service",
    paymentReceived: "PAYMENT RECEIVED",
    total: "TOTAL",
    ttcSuffix: "TTC",
    remainingBalance: "Remaining Balance",
    arrangementSection: "MONTHLY PAYMENT ARRANGEMENT",
    estimatedTreatmentDuration: "Estimated treatment duration",
    treatmentPrice: "Treatment price",
    numberOfMonthlyPayments: "Number of monthly payments",
    downPayment: "Down payment",
    remainingBalanceDue: "Remaining balance due",
    monthlyPayment: "Monthly payment",
    dueDate: "Due date",
    amount: "Amount",
    noMonthlyRows: "No monthly payment rows available.",
    panoramiqueNote:
      "* The panoramic radiography and the mandatory dental consultation must be carried out with your treating dentist in order to validate your simulation and treatment.",
    dateAndPlacePrefix: "Date & Place:",
    placeGeneva: "Geneva",
    signature: "Signature",
    receiptPaymentReceived: "Payment received",
    receiptDate: "Date",
    receiptRemainingBalance: "Remaining balance",
    fullyPaid: "Fully paid",
    doctorBillTitle: "BILL",
    patientName: "Patient name",
    ref: "Ref",
    invoiceDate: "Invoice date",
    noPatients: "No patients",
    mobAppAccessTitle: "PATIENT APP ACCESS",
    mobAppIntro:
      "Use these credentials to sign in to the patient mobile application.",
    username: "Username",
    password: "Password",
    mobAppProvisioning: "Preparing credentials…",
    subtotalExclVat: "Subtotal excl. VAT",
    totalInclVat: "TOTAL incl. VAT",
    vatPrefix: "VAT",
  },
  fr: {
    from: "DE",
    to: "À :",
    patient: "PATIENT :",
    emailPrefix: "E-mail :",
    bornOnPrefix: "Né(e) le",
    datePrefix: "Date :",
    idPrefix: "N° :",
    treatment: "TRAITEMENT",
    treatmentPaid: "TRAITEMENT (PAYÉ)",
    duration: "Durée",
    steps: "Étapes",
    monthsSuffix: "mois",
    tableQty: "Qté",
    tableCode: "Code",
    tableDescription: "Description",
    tableVpt: "VPt",
    tablePoints: "Points",
    tableTotalPoints: "Pt. tot.",
    tableTotal: "Total",
    tableQuantity: "Quantité",
    tableService: "Prestation",
    paymentReceived: "PAIEMENT REÇU",
    total: "TOTAL",
    ttcSuffix: "TTC",
    remainingBalance: "Solde restant",
    arrangementSection: "PLAN DE PAIEMENT MENSUEL",
    estimatedTreatmentDuration: "Durée estimée du traitement",
    treatmentPrice: "Prix du traitement",
    numberOfMonthlyPayments: "Nombre de mensualités",
    downPayment: "Acompte",
    remainingBalanceDue: "Solde restant dû",
    monthlyPayment: "Mensualité",
    dueDate: "Date d'échéance",
    amount: "Montant",
    noMonthlyRows: "Aucune échéance mensuelle disponible.",
    panoramiqueNote:
      "* La radiographie panoramique et la consultation dentaire obligatoire doivent être effectuées chez votre dentiste traitant afin de valider votre simulation et votre traitement.",
    dateAndPlacePrefix: "Date et lieu :",
    placeGeneva: "Genève",
    signature: "Signature",
    receiptPaymentReceived: "Paiement reçu",
    receiptDate: "Date",
    receiptRemainingBalance: "Solde restant",
    fullyPaid: "Intégralement payé",
    doctorBillTitle: "FACTURE",
    patientName: "Nom du patient",
    ref: "Réf.",
    invoiceDate: "Date de facture",
    noPatients: "Aucun patient",
    mobAppAccessTitle: "ACCÈS APPLICATION PATIENT",
    mobAppIntro:
      "Utilisez ces identifiants pour vous connecter à l'application mobile patient.",
    username: "Nom d'utilisateur",
    password: "Mot de passe",
    mobAppProvisioning: "Préparation des identifiants…",
    subtotalExclVat: "Sous-total HT",
    totalInclVat: "TOTAL TTC",
    vatPrefix: "TVA",
  },
};

/**
 * All localized invoice/PDF copy for a UI locale.
 * @param {string} [locale]
 */
export function getInvoicePdfLabels(locale) {
  const lng = normalizeUiLocale(locale);
  return LABELS[lng];
}

/**
 * @param {string} email
 * @param {string} [locale]
 */
export function formatEmailLine(email, locale) {
  const labels = getInvoicePdfLabels(locale);
  return `${labels.emailPrefix} ${email}`;
}

/**
 * @param {string} born
 * @param {string} [locale]
 */
export function formatBornOnLine(born, locale) {
  const labels = getInvoicePdfLabels(locale);
  return `${labels.bornOnPrefix} ${born}`;
}

/**
 * @param {string|number} count
 * @param {string} [locale]
 */
export function formatMonthsCount(count, locale) {
  const labels = getInvoicePdfLabels(locale);
  return `${count} ${labels.monthsSuffix}`;
}

/**
 * @param {string} id
 * @param {string} [locale]
 */
export function formatIdLine(id, locale) {
  const labels = getInvoicePdfLabels(locale);
  return `${labels.idPrefix} ${id}`;
}

/**
 * @param {string} pct
 * @param {string} [locale]
 */
export function formatVatLine(pct, locale) {
  const labels = getInvoicePdfLabels(locale);
  const lng = normalizeUiLocale(locale);
  const raw = String(pct);
  const displayPct = lng === "fr" ? raw.replace(".", ",") : raw;
  return `${labels.vatPrefix} (${displayPct}%)`;
}
