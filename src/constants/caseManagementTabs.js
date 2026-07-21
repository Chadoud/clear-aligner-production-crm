/**
 * Single source of truth for case-management tab ids and config.
 * Tabs are grouped into sections. Used by routing, Tabs component, and patient-sheet navigation.
 * Visible labels use `labelKey` (react-i18next) — see `caseTabs.*` / `caseSections.*` in locale files.
 */

import { CASE_MANAGEMENT_LAST_TAB_KEY } from "./authStorage";

/** Flat list of all tab ids for validation and routing */
export const CASE_MANAGEMENT_TAB_IDS = [
  "plan",
  "stripping",
  "treatment",
  "invoice",
  "invoice-generated",
  "docs-prives",
  "followup",
  "discussion",
  "notes",
  "dossier-patient",
  "photographie",
  "radiographie",
  "documents",
  "empreinte-3d",
];

/** Sections with their tabs. Order defines section order and default tab per section. */
export const CASE_MANAGEMENT_SECTIONS = [
  {
    id: "treatment",
    labelKey: "caseSections.treatment",
    icon: "fas fa-teeth",
    tabs: [
      {
        id: "plan",
        labelKey: "caseTabs.strippingPlan",
        icon: "far fa-file-alt",
      },
      {
        id: "stripping",
        labelKey: "caseTabs.doctorInstructions",
        icon: "fas fa-layer-group",
      },
      {
        id: "treatment",
        labelKey: "caseTabs.treatment",
        icon: "fas fa-question",
      },
    ],
  },
  {
    id: "documents",
    labelKey: "caseSections.documents",
    icon: "fas fa-folder-open",
    tabs: [
      {
        id: "photographie",
        labelKey: "caseTabs.photography",
        icon: "fas fa-camera",
      },
      { id: "radiographie", labelKey: "caseTabs.xray", icon: "fas fa-x-ray" },
      {
        id: "documents",
        labelKey: "caseTabs.documents",
        icon: "fas fa-file-alt",
      },
      { id: "empreinte-3d", labelKey: "caseTabs.model3d", icon: "fas fa-cube" },
    ],
  },
  {
    id: "followup",
    labelKey: "caseSections.followup",
    icon: "fas fa-clipboard-list",
    tabs: [
      {
        id: "followup",
        labelKey: "caseTabs.patientFollowup",
        icon: "fas fa-clipboard-list",
      },
      {
        id: "discussion",
        labelKey: "caseTabs.discussion",
        icon: "fas fa-comments",
      },
      { id: "notes", labelKey: "caseTabs.notes", icon: "fas fa-sticky-note" },
      {
        id: "docs-prives",
        labelKey: "caseTabs.privateDocs",
        icon: "fas fa-lock",
      },
    ],
  },
  {
    id: "payment",
    labelKey: "caseSections.payment",
    icon: "fas fa-file-invoice-dollar",
    tabs: [
      {
        id: "invoice",
        labelKey: "caseTabs.createInvoice",
        icon: "fas fa-file-invoice",
      },
      {
        id: "invoice-generated",
        labelKey: "caseTabs.invoices",
        icon: "fas fa-file-invoice-dollar",
      },
    ],
  },
];

/** Flat list for backward compatibility (e.g. accessGuards, tests) */
export const CASE_MANAGEMENT_TABS = CASE_MANAGEMENT_SECTIONS.flatMap((s) =>
  s.tabs.map((t) => ({ ...t, sectionId: s.id }))
);

export function getLastCaseTab() {
  if (typeof sessionStorage === "undefined") return null;
  const t = sessionStorage.getItem(CASE_MANAGEMENT_LAST_TAB_KEY);
  return t && isValidCaseManagementTab(t) ? t : null;
}

export function setLastCaseTab(tabId) {
  if (typeof sessionStorage === "undefined" || !tabId) return;
  if (isValidCaseManagementTab(tabId)) {
    sessionStorage.setItem(CASE_MANAGEMENT_LAST_TAB_KEY, tabId);
  }
}

export function isValidCaseManagementTab(tabId) {
  return CASE_MANAGEMENT_TAB_IDS.includes(tabId);
}

/** Legacy tab ids that map to current tabs */
const LEGACY_TAB_MAP = {
  "autres-documents": "documents",
  "historique-discussion": "discussion",
  "discussion-notes": "notes",
  chat: "plan",
  "dossier-patient": "dossier-patient",
  dossier_du_patient: "dossier-patient",
  radiographie: "radiographie",
  photographie: "photographie",
  file: "invoice",
  delivery: "invoice",
  "prop-tarifaire": "invoice",
  "prop-prix": "invoice",
  payment: "invoice",
};

export function normalizeCaseManagementTab(tabId) {
  if (!tabId) return "plan";
  const mapped = LEGACY_TAB_MAP[tabId];
  if (mapped) return mapped;
  if (isValidCaseManagementTab(tabId)) return tabId;
  return "plan";
}

/** Payment tab when opening a patient from billing / overview payment tables. */
export function getBillingTablePatientSheetTab() {
  return "invoice-generated";
}

/** Get the section that contains the given tab id */
export function getSectionForTab(tabId) {
  return CASE_MANAGEMENT_SECTIONS.find((s) =>
    s.tabs.some((t) => t.id === tabId)
  );
}

/** Get the default tab id for a section */
export function getDefaultTabForSection(sectionId) {
  const section = CASE_MANAGEMENT_SECTIONS.find((s) => s.id === sectionId);
  return section?.tabs?.[0]?.id ?? "plan";
}

/**
 * Tab ids that require lazy-loaded content (invoice forms).
 * Used by CaseManagementContent for Suspense boundaries.
 */
export const CASE_MANAGEMENT_LAZY_TAB_IDS = ["invoice", "invoice-generated"];

/**
 * Tab ids that require case sheet data (treatment plan, stripping, follow-up, notes).
 * Used to defer case sheet API fetch until user opens one of these tabs.
 */
export const CASE_MANAGEMENT_CASE_SHEET_TAB_IDS = [
  "plan",
  "stripping",
  "treatment",
  "followup",
  "notes",
];
