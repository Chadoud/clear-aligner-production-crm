/**
 * Case sheet persistence — live API (MySQL via backend).
 *
 * Keyed by case_id (tbl_case.case_id). Data is assembled from MySQL (traitements,
 * case_tooth, stripping tables, tbl_stripping_v2, etc.) via the case-sheets API.
 *
 * @module repositories/CaseSheetRepository
 */

import { apiClient } from "@/core/api/apiClientSingleton";
import { safeLogError } from "@/utils/safeLogError";

/** In-memory cache: caseId → Promise<Record> */
const cache = new Map();

/** Case sheet loads can wait on a busy local backend / MySQL tunnel. */
const CASE_SHEET_REQUEST_OPTS = { timeoutMs: 45000, retries: 1 };

/**
 * Invalidate cached case sheet so next getCaseSheet refetches from API.
 * Call when navigating to a case to ensure fresh data.
 *
 * @param {string} caseId - Case ID (numeric)
 */
export function invalidateCaseSheet(caseId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (id) cache.delete(id);
}

/**
 * Fetch the case sheet from the API. caseId = tbl_case.case_id.
 *
 * @param {string} caseId - Case ID (numeric)
 * @returns {Promise<Record<string, unknown>>}
 */
export function getCaseSheet(caseId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) return Promise.resolve({});

  if (!cache.has(id)) {
    const promise = apiClient
      .request(
        `/api/v1/case-sheets/${encodeURIComponent(id)}`,
        CASE_SHEET_REQUEST_OPTS
      )
      .then((res) => {
        const sheet = res?.data ?? res ?? {};
        return typeof sheet === "object" && !Array.isArray(sheet) ? sheet : {};
      })
      .catch((err) => {
        /** Do not drop a newer in-flight cache entry when an older request fails. */
        if (cache.get(id) === promise) {
          cache.delete(id);
        }
        safeLogError(err, "getCaseSheet failed");
        throw err;
      });
    cache.set(id, promise);
  }

  return cache.get(id);
}

/**
 * Persist case sheet updates to the server via PUT.
 *
 * @param {string} caseId - Case ID (numeric)
 * @param {Record<string, unknown>} updates
 * @returns {Promise<void>}
 */
export function saveCaseSheet(caseId, updates) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) return Promise.resolve();

  const previous = cache.get(id);
  const optimistic = (
    previous && typeof previous.then === "function"
      ? previous.then((existing) => ({ ...existing, ...updates }))
      : Promise.resolve({ ...updates })
  ).catch(() => ({ ...updates }));
  cache.set(id, optimistic);

  const putPromise = apiClient.request(
    `/api/v1/case-sheets/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
      ...CASE_SHEET_REQUEST_OPTS,
    }
  );

  return putPromise.catch((err) => {
    if (cache.get(id) === optimistic) {
      cache.delete(id);
    }
    safeLogError(err, "saveCaseSheet failed");
    throw err;
  });
}
