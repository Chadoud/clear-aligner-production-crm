/**
 * User notes — private per-user notes on cases.
 * Uses tbl_user_notes via /api/v1/cases/:caseId/notes.
 */

import { apiClient } from "@/core/api/apiClientSingleton";

/**
 * Fetch current user's notes for a case.
 *
 * @param {string|number} caseId - Case ID (tbl_case.case_id)
 * @returns {Promise<{ caseId: number, notes: Array }>}
 */
export async function getNotes(caseId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) return { caseId: 0, notes: [] };

  const url = `/api/v1/cases/${encodeURIComponent(id)}/notes`;
  const res = await apiClient.request(url);
  const notes = res?.notes ?? [];
  return { caseId: res?.caseId ?? parseInt(id, 10), notes };
}

/**
 * Create a new note.
 *
 * @param {string|number} caseId - Case ID
 * @param {string} noteText - Note content
 * @returns {Promise<{ note: { noteId, caseIdx, userIdx, noteText, createdAt, updatedAt } }>}
 */
export async function createNote(caseId, noteText) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");

  const url = `/api/v1/cases/${encodeURIComponent(id)}/notes`;
  const res = await apiClient.request(url, {
    method: "POST",
    body: JSON.stringify({ noteText }),
  });
  return res;
}

/**
 * Update an existing note.
 *
 * @param {string|number} caseId - Case ID
 * @param {number} noteId - Note ID
 * @param {string} noteText - Updated content
 * @returns {Promise<{ ok: boolean }>}
 */
export async function updateNote(caseId, noteId, noteText) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");

  const url = `/api/v1/cases/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`;
  const res = await apiClient.request(url, {
    method: "PUT",
    body: JSON.stringify({ noteText }),
  });
  return res;
}

/**
 * Delete a note.
 *
 * @param {string|number} caseId - Case ID
 * @param {number} noteId - Note ID
 * @returns {Promise<{ ok: boolean }>}
 */
export async function deleteNote(caseId, noteId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");

  const url = `/api/v1/cases/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`;
  const res = await apiClient.request(url, { method: "DELETE" });
  return res;
}
