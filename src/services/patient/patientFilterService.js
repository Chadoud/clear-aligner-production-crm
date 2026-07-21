/**
 * Patient filtering by visibility and scope (company vs doctor).
 * Consumes normalized lists; does not load data.
 *
 * @module services/patient/patientFilterService
 */

/** Case statuses to show in "all cases" (0–11, including in_treatment = 11). */
export const VISIBLE_CASE_STATUSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * @param {Array<{ case_status?: number|null }>} list
 * @param {number} [count]
 * @returns {Array<{ case_status?: number|null }>}
 */
export function filterVisible(list, count) {
  const filtered = list.filter((p) => {
    const s = p.case_status;
    if (s === undefined || s === null) return true;
    return VISIBLE_CASE_STATUSES.includes(Number(s));
  });
  return count != null && count > 0 ? filtered.slice(0, count) : filtered;
}

/**
 * @param {Array<{ ref?: string, cabinet?: string }>} list
 * @param {number} [count]
 * @param {{ cabinet?: string } | null} [actor]
 * @returns {Array<{ ref?: string, cabinet?: string }>}
 */
export function filterDoctorPatients(list, count, actor) {
  let out = list;
  if (actor && actor.cabinet != null && actor.cabinet !== "") {
    out = out.filter((p) => String(p.cabinet || "") === String(actor.cabinet));
  }
  return count != null && count > 0 ? out.slice(0, count) : out;
}

/**
 * @param {Array<{ case_status?: number|null, ref?: string, cabinet?: string }>} list
 * @param {number} [count]
 * @param {{ cabinet?: string } | null} [actor]
 */
export function filterVisibleDoctorPatients(list, count, actor) {
  const doctorList = filterDoctorPatients(list, undefined, actor);
  return filterVisible(doctorList, count);
}
