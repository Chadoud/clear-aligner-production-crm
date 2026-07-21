/**
 * Patient Data Service — API-only facade.
 *
 * All data comes from the live database via backend /api/v1/patients.
 * The localStorage override system has been removed; the DB is the source of truth.
 *
 * @module services/patientDataService
 */

import { safeTrim } from "@/utils/shared/index.js";
import { apiClient } from "@/core/api/apiClientSingleton";
import {
  getBaseList,
  loadPatientData as repoLoadPatientData,
  fetchPatientByRef as repoFetchPatientByRef,
  fetchPatientByCaseId as repoFetchPatientByCaseId,
} from "./patient/patientDataRepository.js";
import {
  filterVisible,
  filterDoctorPatients,
  filterVisibleDoctorPatients,
  VISIBLE_CASE_STATUSES as VISIBLE_STATUSES,
} from "./patient/patientFilterService.js";
import {
  formatPatientForDisplay as presentationFormat,
  getTitleLabel as presentationGetTitleLabel,
} from "./patient/patientPresentationService.js";

export const VISIBLE_CASE_STATUSES = VISIBLE_STATUSES;

export const getTitleLabel = presentationGetTitleLabel;

export const loadPatientData = repoLoadPatientData;
export const fetchPatientByRef = repoFetchPatientByRef;
export const fetchPatientByCaseId = repoFetchPatientByCaseId;

/** @returns {Array} */
export const getAllPatients = (count) => {
  const base = getBaseList();
  return count != null && count > 0 ? base.slice(0, count) : base;
};

/** @returns {Array} */
export const getVisiblePatients = (count) => {
  return filterVisible(getBaseList(), count);
};

/** @returns {Array} */
export const getDoctorPatients = (count, actor) => {
  return filterDoctorPatients(getBaseList(), count, actor);
};

/** @returns {Array} */
export const getVisibleDoctorPatients = (count, actor) => {
  return filterVisibleDoctorPatients(getBaseList(), count, actor);
};

export const getPatientByIndex = (index = 0) => {
  const all = getBaseList();
  return index >= 0 && index < all.length ? all[index] : null;
};

export const getPatientByName = (name) => {
  return getBaseList().find((p) => p.name === name) ?? null;
};

export const getPatientByRef = (ref) => {
  const r = safeTrim(ref, "");
  if (r === "") return null;
  return getBaseList().find((p) => safeTrim(p.ref, "") === r) ?? null;
};

/** Look up by case_id (for /case-management/id/:caseId). Prefer case_id over ref. */
export const getPatientByCaseId = (caseId) => {
  if (caseId == null || !Number.isFinite(Number(caseId))) return null;
  const id = Number(caseId);
  return getBaseList().find((p) => p.case_id === id) ?? null;
};

/**
 * Alias of getPatientByRef — kept for invoice/billing callsites.
 * @returns {Object|null}
 */
export const getRawPatientByRef = getPatientByRef;

/**
 * Look up patient for an invoice by ref and/or case_id.
 * Tries ref first, then case_id as fallback (handles ref format mismatches).
 * @param {string|null} ref - Client ref from invoice (e.g. getInvoiceClient(inv)?.ref)
 * @param {number|null} caseId - case_id from invoice
 * @returns {Object|null}
 */
export const getPatientForInvoiceRef = (ref, caseId) => {
  const byRef = ref ? getRawPatientByRef(String(ref).trim()) : null;
  const byCaseId =
    caseId != null && Number.isFinite(Number(caseId))
      ? getPatientByCaseId(Number(caseId))
      : null;
  return byRef ?? byCaseId ?? null;
};

export const getPatientByRefForScope = (ref, scope, actor) => {
  const raw = getPatientByRef(ref);
  if (!raw) return null;
  if (scope === "company") return raw;
  if (!actor || !actor.cabinet) return null;
  return safeTrim(raw.cabinet, "") === safeTrim(actor.cabinet, "") ? raw : null;
};

/**
 * Persist patient/case updates to the backend (workflow + demographics).
 * @param {string} ref
 * @param {{
 *   case_status?: number,
 *   case_ref?: string,
 *   skip_status_email?: boolean,
 *   first_name?: string,
 *   last_name?: string,
 *   title?: number|null,
 *   email?: string|null,
 *   date_of_birth?: string|null,
 *   address?: string|null,
 *   phone?: string|null,
 * }} updates
 * @returns {Promise<boolean>}
 */
export const updatePatientByRef = async (ref, updates) => {
  if (!ref) return false;
  try {
    await apiClient.request(`/api/v1/patients/${encodeURIComponent(ref)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return true;
  } catch (err) {
    console.error("updatePatientByRef failed:", err);
    return false;
  }
};

/**
 * Accept price proposal: set status to In treatment, save delivery date, create Open boxes event.
 * @param {string} ref
 * @param {string} desiredDeliveryDate - YYYY-MM-DD
 * @returns {Promise<object|null>} Updated patient or null on error
 */
export const acceptPatientByRef = async (ref, desiredDeliveryDate) => {
  if (!ref || !desiredDeliveryDate) return null;
  try {
    const data = await apiClient.request(
      `/api/v1/patients/${encodeURIComponent(ref)}/accept`,
      {
        method: "POST",
        body: JSON.stringify({ desiredDeliveryDate }),
      }
    );
    return data?.patient ?? null;
  } catch (err) {
    console.error("acceptPatientByRef failed:", err);
    return null;
  }
};

export const formatPatientForDisplay = (patient) => presentationFormat(patient);
