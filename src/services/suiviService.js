/**
 * Follow-up (tbl_suivi) — API for patient follow-up log.
 * @module services/suiviService
 */

import { apiClient } from "@/core/api/apiClientSingleton";

/**
 * @param {string|number} caseId - Case ID or ref
 * @returns {Promise<Array<{ id: number, text: string, type: number, date: string, user?: string }>>}
 */
export async function fetchSuivi(caseId) {
  if (caseId == null || String(caseId).trim() === "") return [];
  try {
    const data = await apiClient.request(
      `/api/v1/cases/${encodeURIComponent(String(caseId))}/suivi`
    );
    return data?.suivi ?? [];
  } catch (err) {
    console.error("fetchSuivi failed:", err);
    return [];
  }
}

/**
 * @param {string|number} caseId
 * @param {{ text: string, type?: number, date?: string }} entry
 * @returns {Promise<number|null>} New suivi id or null
 */
export async function addSuivi(caseId, entry) {
  if (caseId == null || String(caseId).trim() === "") return null;
  const text = String(entry?.text ?? "").trim();
  if (!text) return null;
  try {
    const data = await apiClient.request(
      `/api/v1/cases/${encodeURIComponent(String(caseId))}/suivi`,
      {
        method: "POST",
        body: JSON.stringify({
          text,
          type: entry.type ?? 0,
          date: entry.date,
        }),
      }
    );
    return data?.id ?? null;
  } catch (err) {
    console.error("addSuivi failed:", err);
    return null;
  }
}

/**
 * @param {string|number} caseId
 * @param {number} suiviId
 * @returns {Promise<boolean>}
 */
export async function deleteSuivi(caseId, suiviId) {
  if (caseId == null || suiviId == null) return false;
  try {
    await apiClient.request(
      `/api/v1/cases/${encodeURIComponent(String(caseId))}/suivi/${encodeURIComponent(String(suiviId))}`,
      { method: "DELETE" }
    );
    return true;
  } catch (err) {
    console.error("deleteSuivi failed:", err);
    return false;
  }
}
