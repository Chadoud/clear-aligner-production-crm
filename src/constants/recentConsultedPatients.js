/**
 * Recently consulted patients — session order for the right sidebar list.
 * @module constants/recentConsultedPatients
 */

import { AUTH_USER_KEY } from "./authStorage.js";
import { parseEnteredToDate } from "@/utils/dates/enteredDate.js";

export const RECENT_CONSULTED_PATIENTS_KEY = "lab:recentConsultedPatients";
export const RECENT_CONSULTED_CHANGED_EVENT = "lab:recentConsultedChanged";
const MAX_RECENT = 100;

function getScopeStorageKey(scope = "company") {
  let userId = "";
  if (typeof sessionStorage !== "undefined") {
    try {
      const raw = sessionStorage.getItem(AUTH_USER_KEY);
      if (raw) {
        const user = JSON.parse(raw);
        userId = user?.id != null ? String(user.id) : "";
      }
    } catch {
      // ignore
    }
  }
  return `${RECENT_CONSULTED_PATIENTS_KEY}:${scope}:${userId}`;
}

/** Stable key for a patient row (ref preferred, else case_id). */
export function getPatientConsultKey(patient) {
  const ref = patient?.ref ? String(patient.ref).trim() : "";
  if (ref) return ref;
  const caseId = patient?.case_id;
  if (caseId != null && Number.isFinite(Number(caseId))) {
    return `case:${Number(caseId)}`;
  }
  return "";
}

function readRecentList(scope) {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(getScopeStorageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecentList(scope, list) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(getScopeStorageKey(scope), JSON.stringify(list));
}

function dispatchRecentConsultedChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RECENT_CONSULTED_CHANGED_EVENT));
}

/**
 * Move patient to the front of the recent-consulted list for this scope/user.
 * @param {{ ref?: string, case_id?: number }} patient
 * @param {string} [scope]
 */
export function recordPatientConsulted(patient, scope = "company") {
  const key = getPatientConsultKey(patient);
  if (!key) return;
  const list = readRecentList(scope).filter((entry) => entry.key !== key);
  list.unshift({ key, at: Date.now() });
  writeRecentList(scope, list.slice(0, MAX_RECENT));
  dispatchRecentConsultedChanged();
}

/** @returns {Map<string, number>} lower rank = more recently consulted */
export function getRecentConsultedOrderMap(scope = "company") {
  const map = new Map();
  readRecentList(scope).forEach((entry, index) => {
    if (entry?.key) map.set(entry.key, index);
  });
  return map;
}

function compareByEnteredDesc(a, b) {
  const dateA = parseEnteredToDate(a.entered);
  const dateB = parseEnteredToDate(b.entered);
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  return dateB.getTime() - dateA.getTime();
}

/**
 * Sort patients: active patient first, then last consulted, then entered date.
 * @param {Array} patients
 * @param {string} [scope]
 * @param {{ ref?: string, case_id?: number }|null} [activePatient] - currently open case
 * @returns {Array}
 */
export function sortPatientsByLastConsulted(
  patients,
  scope = "company",
  activePatient = null
) {
  const order = getRecentConsultedOrderMap(scope);
  const activeKey = activePatient ? getPatientConsultKey(activePatient) : "";
  return [...patients].sort((a, b) => {
    const keyA = getPatientConsultKey(a);
    const keyB = getPatientConsultKey(b);
    if (activeKey) {
      if (keyA === activeKey && keyB !== activeKey) return -1;
      if (keyB === activeKey && keyA !== activeKey) return 1;
    }
    const rankA = order.has(keyA) ? order.get(keyA) : Number.MAX_SAFE_INTEGER;
    const rankB = order.has(keyB) ? order.get(keyB) : Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return compareByEnteredDesc(a, b);
  });
}
