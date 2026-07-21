/**
 * Single source of truth for case status: DB mapping, UI ids, i18n label keys, and chart colors.
 * Use this module everywhere (Overview, ListOfCases, cabinets, DoctorPortal) to avoid duplication.
 * Resolve labels in UI with `t(option.labelKey)` or use {@link getCaseStatusLabel} (uses global i18n when initialized).
 *
 * @module utils/cases/caseStatus
 */

import { i18n } from "@/i18n";

const DB_TO_UI = {
  0: "no_follow_up",
  1: "beware",
  2: "beware",
  3: "case_study",
  4: "en_attente",
  5: "in_fabrication",
  6: "pause",
  7: "delivered",
  8: "no_follow_up",
  9: "no_follow_up",
  10: "reactivation",
  11: "in_treatment",
};

const DEFAULT_UI_STATUS = "no_follow_up";

/**
 * DB case_status values that map to "Beware" (legacy: status 1, 2).
 * Note: The "Beware" / beware filter in the case list uses case_notif (1=notify doctor, 2=notify lab),
 * not case_status. These DB values exist for cases stored with status 1 or 2.
 */
export const BEWARE_DB_STATUSES = [1, 2];

/** English fallbacks when i18n is not initialized (tests, early boot). */
const CASE_STATUS_FALLBACK_EN = {
  beware: "Beware",
  case_study: "Case study",
  en_attente: "Awaiting acceptance",
  in_fabrication: "In fabrication",
  in_treatment: "In treatment",
  reactivation: "Reactivation",
  pause: "Pause",
  delivered: "Delivered",
  no_follow_up: "No follow-up",
};

/** Display order and i18n keys for patient status progress bars (Overview chart). */
export const CASE_STATUS_OPTIONS = [
  { id: "beware", labelKey: "caseStatus.beware", color: "#eab308" },
  { id: "case_study", labelKey: "caseStatus.case_study", color: "#6366f1" },
  { id: "en_attente", labelKey: "caseStatus.en_attente", color: "#f59e0b" },
  {
    id: "in_fabrication",
    labelKey: "caseStatus.in_fabrication",
    color: "#3b82f6",
  },
  { id: "in_treatment", labelKey: "caseStatus.in_treatment", color: "#2563eb" },
  { id: "reactivation", labelKey: "caseStatus.reactivation", color: "#0ea5e9" },
  { id: "pause", labelKey: "caseStatus.pause", color: "#8b5cf6" },
  { id: "delivered", labelKey: "caseStatus.delivered", color: "#10b981" },
  { id: "no_follow_up", labelKey: "caseStatus.no_follow_up", color: "#64748b" },
];

/**
 * @param {string} [uiStatusId] - UI status id (e.g. "case_study")
 * @returns {string} Display label or the id if unknown
 */
export function getCaseStatusLabel(uiStatusId) {
  if (uiStatusId == null || uiStatusId === "") return "—";
  const opt = CASE_STATUS_OPTIONS.find((o) => o.id === uiStatusId);
  if (!opt) return String(uiStatusId);
  try {
    if (i18n.isInitialized) {
      return String(i18n.t(opt.labelKey));
    }
  } catch {
    /* ignore */
  }
  return CASE_STATUS_FALLBACK_EN[uiStatusId] ?? String(uiStatusId);
}

/**
 * @param {number|string|undefined|null} dbStatus - case_status from DB/JSON
 * @returns {string} UI status id
 */
export function caseStatusToUiId(dbStatus) {
  if (dbStatus === undefined || dbStatus === null) return DEFAULT_UI_STATUS;
  const n = Number(dbStatus);
  if (Number.isNaN(n)) return DEFAULT_UI_STATUS;
  return DB_TO_UI[n] ?? DEFAULT_UI_STATUS;
}

/** UI status id → canonical DB case_status (for saving overrides). */
const UI_TO_DB = {
  beware: 2,
  case_study: 3,
  en_attente: 4,
  in_fabrication: 5,
  in_treatment: 11,
  reactivation: 10,
  pause: 6,
  delivered: 7,
  no_follow_up: 8,
};

/**
 * @param {string} uiStatusId - UI status id (e.g. "case_study")
 * @returns {number} DB case_status value for persistence
 */
export function uiStatusToDbStatus(uiStatusId) {
  if (uiStatusId == null || uiStatusId === "") return undefined;
  return UI_TO_DB[uiStatusId];
}
