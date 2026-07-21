/**
 * Single place for case status counts and filtered lists.
 * Use everywhere (Overview, ListOfCases, DoctorPortal) to avoid duplicated logic.
 *
 * Beware/Attention filter: uses case_notif (same as old app).
 * - Lab (company): case_notif = 2 (doctor replied)
 * - Doctor: case_notif = 1 (lab replied)
 *
 * @module services/caseStatusMetrics
 */

import { caseStatusToUiId, CASE_STATUS_OPTIONS } from "@/utils/cases/index.js";

/** Status id for "all" used in list filters. */
export const ALL_STATUS_ID = "all";

/** case_notif value for beware when scope is company (lab sees doctor replies). */
const BEWARE_NOTIF_LAB = 2;
/** case_notif value for beware when scope is doctor (doctor sees lab replies). */
const BEWARE_NOTIF_DOCTOR = 1;

/**
 * @param {Array<{ case_status?: number|null, case_notif?: number|null }>} patients - Normalized patients
 * @param {{ scope?: string }} [opts] - Optional. scope: "company" | "doctor" for beware count (case_notif)
 * @returns {{ total: number, counts: Record<string, number> }} total and per-status counts
 */
export function computeStatusCounts(patients, opts = {}) {
  const counts = { [ALL_STATUS_ID]: patients.length };
  CASE_STATUS_OPTIONS.forEach((o) => {
    counts[o.id] = 0;
  });
  patients.forEach((p) => {
    const uiId = caseStatusToUiId(p.case_status);
    if (counts[uiId] != null) counts[uiId] += 1;
  });
  // Beware uses case_notif (1=notify doctor, 2=notify lab), not case_status
  if (opts.scope != null) {
    const notifForBeware =
      opts.scope === "company" ? BEWARE_NOTIF_LAB : BEWARE_NOTIF_DOCTOR;
    counts.beware = patients.filter(
      (p) => Number(p.case_notif) === notifForBeware
    ).length;
  }
  return { total: patients.length, counts };
}

/**
 * @param {Array<{ case_status?: number|null, case_notif?: number|null, [key: string]: unknown }>} patients
 * @param {string} statusId - UI status id or "all"
 * @param {{ scope?: string }} [opts] - Optional. scope for beware filter (case_notif)
 * @returns {Array<{ caseStatus: string, [key: string]: unknown }>} patients with caseStatus attached, filtered by statusId
 */
export function filterPatientsByStatus(patients, statusId, opts = {}) {
  const list = patients.map((p) => ({
    ...p,
    caseStatus: caseStatusToUiId(p.case_status),
  }));
  if (statusId === ALL_STATUS_ID || !statusId) return list;
  if (statusId === "beware") {
    const notifForBeware =
      opts.scope === "company" ? BEWARE_NOTIF_LAB : BEWARE_NOTIF_DOCTOR;
    return list.filter((p) => Number(p.case_notif) === notifForBeware);
  }
  return list.filter((c) => c.caseStatus === statusId);
}

/**
 * @param {Array<{ case_status?: number|null }>} patients
 * @returns {Array<{ caseStatus: string, [key: string]: unknown }>} same patients with caseStatus attached for UI
 */
export function attachCaseStatus(patients) {
  return patients.map((p) => ({
    ...p,
    caseStatus: caseStatusToUiId(p.case_status),
  }));
}
