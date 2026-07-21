/**
 * Access guards for scope-based permissions (company vs doctor).
 * Use in routing and UI to enforce doctor-only visibility and tab restrictions.
 *
 * @module utils/cases/accessGuards
 */

/** Tab ids that only company scope can access (Create invoice). */
const COMPANY_ONLY_TAB_IDS = ["invoice"];

/**
 * @param {"company"|"doctor"} scope
 * @param {string} tabId - Case management tab id
 * @returns {boolean} true if the scope can access this tab
 */
export function canAccessCaseTab(scope, tabId) {
  if (scope === "company") return true;
  if (!tabId) return true;
  return !COMPANY_ONLY_TAB_IDS.includes(tabId);
}

/**
 * @param {"company"|"doctor"} scope
 * @param {{ cabinet?: string } | null} actor - For doctor: { id, name, cabinet }; for company can be null
 * @param {{ cabinet?: string }} patient - Normalized patient with cabinet
 * @returns {boolean} true if the scope/actor can access this patient
 */
export function canAccessPatient(scope, actor, patient) {
  if (scope === "company") return true;
  if (!actor || !patient) return false;
  return String(patient.cabinet || "") === String(actor.cabinet || "");
}

/** First tab id that doctors are allowed to open (for redirect when landing on company-only tab). */
export const DEFAULT_DOCTOR_ALLOWED_TAB = "plan";
