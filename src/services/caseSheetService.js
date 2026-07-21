/**
 * Case sheet service: load and save case sheet via the live API.
 * Uses case_id (tbl_case.case_id) as the canonical key.
 */

import {
  getCaseSheet as repoGet,
  saveCaseSheet as repoSave,
  invalidateCaseSheet as repoInvalidate,
} from "../repositories/CaseSheetRepository";

/**
 * Invalidate cached case sheet so next getCaseSheet refetches from API.
 * Call when navigating to a case to ensure fresh data.
 *
 * @param {string} caseId - Case ID (tbl_case.case_id)
 */
export function invalidateCaseSheet(caseId) {
  return repoInvalidate(caseId);
}

/**
 * @param {string} caseId - Case ID (tbl_case.case_id)
 * @returns {Promise<Object>}
 */
export function getCaseSheet(caseId) {
  return repoGet(caseId);
}

/**
 * @param {string} caseId - Case ID (tbl_case.case_id)
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export function updateCaseSheet(caseId, updates) {
  return repoSave(caseId, updates);
}
