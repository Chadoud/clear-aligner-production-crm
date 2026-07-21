/**
 * Patient data loading — API only (live MySQL DB via backend).
 *
 * @module services/patient/patientDataRepository
 */

import { normalize } from "./patientNormalizationService.js";
import { apiClient } from "@/core/api/apiClientSingleton";
import { AUTH_USER_KEY } from "@/constants/authStorage";
import { safeLogError } from "@/utils/safeLogError";

let patientListCache = null;
/** Deduplicates concurrent loadPatientData() calls — resolves to the same fetch. */
let activeLoadPromise = null;

/**
 * Read the cabinet_id of the currently logged-in doctor from sessionStorage.
 * Returns null for company users.
 * @returns {number|null}
 */
function getLoggedInCabinetId() {
  try {
    const raw = sessionStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.role === "doctor" && user.cabinetId
      ? Number(user.cabinetId)
      : null;
  } catch {
    return null;
  }
}

/**
 * Fetch all patients from the API using paginated requests.
 * Doctors automatically get only their cabinet's patients.
 * @returns {Promise<Array>}
 */
async function fetchAllPatients() {
  const PAGE_SIZE = 1000;
  const cabinetId = getLoggedInCabinetId();
  const cabinetFilter = cabinetId ? `&cabinet_id=${cabinetId}` : "";

  let offset = 0;
  let all = [];

  let hasMore = true;
  while (hasMore) {
    const data = await apiClient.request(
      `/api/v1/patients?limit=${PAGE_SIZE}&offset=${offset}&skip_count=1${cabinetFilter}`,
      { timeoutMs: 30000, retries: 1 }
    );
    const page = data.patients ?? [];
    all = all.concat(page.map((p) => normalize(p, p.cabinet)));
    hasMore = page.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return all;
}

/**
 * Fetch all patients from the API and populate the cache.
 * Concurrent calls share the same in-flight request instead of firing independently.
 * @returns {Promise<void>}
 */
export function loadPatientData() {
  if (activeLoadPromise) return activeLoadPromise;

  patientListCache = null;
  activeLoadPromise = fetchAllPatients()
    .then((data) => {
      patientListCache = data;
    })
    .catch((e) => {
      safeLogError(e, "Patient API load failed");
      patientListCache = [];
    })
    .finally(() => {
      activeLoadPromise = null;
    });

  return activeLoadPromise;
}

/**
 * Returns the cached patient list. Empty array until loadPatientData() completes.
 * @returns {Array}
 */
export function getBaseList() {
  return patientListCache ?? [];
}

/**
 * Fetch a single patient by ref from the API.
 * Used when patient is not in the preloaded list (e.g. on page reload).
 * @param {string} ref - Patient ref (e.g. "12345")
 * @param {number|null} [cabinetId] - For doctors: only return if patient is in this cabinet
 * @returns {Promise<Object|null>} Normalized patient or null
 */
export async function fetchPatientByRef(ref, cabinetId = null) {
  if (!ref || String(ref).trim() === "") return null;
  const cabinetParam =
    cabinetId != null && Number.isFinite(cabinetId)
      ? `?cabinet_id=${cabinetId}`
      : "";
  try {
    const data = await apiClient.request(
      `/api/v1/patients/${encodeURIComponent(String(ref).trim())}${cabinetParam}`
    );
    const raw = data?.patient;
    if (!raw) return null;
    return normalize(raw, raw.cabinet);
  } catch {
    return null;
  }
}

/**
 * Fetch a single patient by case_id (for /case-management/id/:caseId).
 * Uses case_id lookup to avoid wrong patient when ref is numeric.
 */
export async function fetchPatientByCaseId(caseId, cabinetId = null) {
  if (caseId == null || !Number.isFinite(Number(caseId))) return null;
  const cabinetParam =
    cabinetId != null && Number.isFinite(cabinetId)
      ? `?cabinet_id=${cabinetId}`
      : "";
  try {
    const data = await apiClient.request(
      `/api/v1/patients/by-case-id/${encodeURIComponent(String(caseId))}${cabinetParam}`
    );
    const raw = data?.patient;
    if (!raw) return null;
    return normalize(raw, raw.cabinet);
  } catch {
    return null;
  }
}

/**
 * Optimistically update a patient in the cache (e.g. set case_notif = 0 when marked as seen).
 * Call after markCaseAsSeen succeeds so the bell updates immediately without waiting for refetch.
 */
export function updatePatientInCache(caseId, updates) {
  if (!patientListCache || caseId == null) return;
  const id = Number(caseId);
  if (!Number.isFinite(id)) return;
  const idx = patientListCache.findIndex((p) => p.case_id === id);
  if (idx >= 0) {
    patientListCache = [...patientListCache];
    patientListCache[idx] = { ...patientListCache[idx], ...updates };
  }
}

/**
 * Optimistically update a patient in the cache by ref (e.g. case_status when invoice quote toggles).
 * Use with dispatchPatientsRefreshSoft so UI updates without full refetch.
 */
export function updatePatientInCacheByRef(ref, updates) {
  if (!patientListCache || !ref || String(ref).trim() === "") return;
  const r = String(ref).trim();
  const idx = patientListCache.findIndex(
    (p) => p.ref != null && String(p.ref).trim() === r
  );
  if (idx >= 0) {
    patientListCache = [...patientListCache];
    patientListCache[idx] = { ...patientListCache[idx], ...updates };
  }
}

/** Clear the cache (used in tests). */
export function _clearCache() {
  patientListCache = null;
  activeLoadPromise = null;
}
