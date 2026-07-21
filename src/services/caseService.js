/**
 * Case service: mark case as seen (clear beware notification).
 *
 * @module services/caseService
 */

import { apiClient } from "@/core/api/apiClientSingleton";
import { updatePatientInCache } from "./patient/patientDataRepository.js";

const REFRESH_EVENT = "patients:refresh";
const REFRESH_SOFT_EVENT = "patients:refresh-soft";
const INVOICES_REFRESH_EVENT = "invoices:refresh";

/**
 * Update case ref (patient reference).
 *
 * @param {string|number} caseId - Case ID (tbl_case.case_id)
 * @param {string} ref - New ref value
 * @returns {Promise<boolean>} true if successful
 */
export async function updateCaseRef(caseId, ref) {
  const id = caseId != null ? String(caseId).trim() : "";
  const trimmed = ref != null ? String(ref).trim() : "";
  if (!id || !trimmed) return false;
  try {
    await apiClient.request(`/api/v1/cases/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ ref: trimmed }),
    });
    return true;
  } catch (err) {
    console.error("updateCaseRef failed:", err);
    return false;
  }
}

/**
 * Mark a case as seen — clears case_notif so the beware alert disappears.
 *
 * @param {string|number} caseId - Case ID (tbl_case.case_id)
 * @returns {Promise<boolean>} true if successful
 */
export async function markCaseAsSeen(caseId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) return false;
  try {
    await apiClient.request(`/api/v1/cases/${encodeURIComponent(id)}/seen`, {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    return true;
  } catch (err) {
    console.error("markCaseAsSeen failed:", err);
    return false;
  }
}

/**
 * Optimistically clear beware for a case in the local patient cache.
 * Call immediately when user clicks the bell item so UI updates before refetch.
 */
export function clearBewareInCache(caseId) {
  updatePatientInCache(caseId, { case_notif: 0, case_notif_reason: 0 });
}

/**
 * Dispatch event to refresh patient list (so bell count updates after marking as seen).
 */
export function dispatchPatientsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
  }
}

/**
 * Dispatch soft refresh — triggers re-render from cache without refetch.
 * Use after optimistic cache update so bell updates immediately.
 */
export function dispatchPatientsRefreshSoft() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REFRESH_SOFT_EVENT));
  }
}

/**
 * @returns {string} Event name for patients refresh
 */
export function getPatientsRefreshEvent() {
  return REFRESH_EVENT;
}

/**
 * @returns {string} Event name for soft refresh (cache only)
 */
export function getPatientsRefreshSoftEvent() {
  return REFRESH_SOFT_EVENT;
}

/**
 * Dispatch event to refresh invoices (e.g. after accept converts quote to confirmed).
 */
export function dispatchInvoicesRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INVOICES_REFRESH_EVENT));
  }
}

/**
 * @returns {string} Event name for invoices refresh
 */
export function getInvoicesRefreshEvent() {
  return INVOICES_REFRESH_EVENT;
}

/**
 * Delete a case (patient) and all related data.
 *
 * @param {string|number} caseId - Case ID (tbl_case.case_id)
 * @returns {Promise<boolean>} true if successful
 */
export async function deleteCase(caseId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) return false;
  try {
    await apiClient.request(`/api/v1/cases/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    dispatchPatientsRefresh();
    return true;
  } catch (err) {
    console.error("deleteCase failed:", err);
    return false;
  }
}
