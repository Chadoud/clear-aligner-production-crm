/**
 * Case documents service: fetch and upload documents (photographies, radiographies, etc.) via API.
 */

import { apiClient } from "@/core/api/apiClientSingleton";

/**
 * Fetch documents for a case.
 *
 * @param {string|number} caseId - Case ID (tbl_case.case_id)
 * @returns {Promise<Array<{ type: string, filename: string, storedFilename: string, size?: string }>>}
 */
export async function getCaseDocs(caseId) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) return [];

  try {
    const res = await apiClient.request(
      `/api/v1/cases/${encodeURIComponent(id)}/docs`
    );
    return res?.docs ?? [];
  } catch {
    return [];
  }
}

/**
 * Upload a document for a case.
 *
 * @param {string|number} caseId - Case ID (tbl_case.case_id)
 * @param {File} file - File to upload (optional for docs-prives when message is provided)
 * @param {string} docType - photographies | radiographies | documents | empreinte-3d | docs-prives
 * @param {string} [message] - Optional message text (for docs-prives, stored with file or as note)
 * @returns {Promise<{ type: string, filename: string, storedFilename: string, size: string }>}
 */
export async function uploadCaseDoc(caseId, file, docType, message = "") {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");
  const isPrivate = docType === "docs-prives";
  if (!file && !(isPrivate && message))
    throw new Error("file or message is required");

  const formData = new FormData();
  formData.append("docType", docType || "documents");
  if (message) formData.append("message", message);
  if (file && file instanceof File) formData.append("file", file);

  const res = await apiClient.request(
    `/api/v1/cases/${encodeURIComponent(id)}/docs`,
    {
      method: "POST",
      body: formData,
      timeoutMs: 60000,
    }
  );
  return res?.doc ?? res;
}

/**
 * Delete a document for a case.
 *
 * @param {string|number} caseId - Case ID (tbl_case.case_id)
 * @param {string} storedFilename - Stored filename (docs_name)
 */
export async function deleteCaseDoc(caseId, storedFilename) {
  const id = caseId != null ? String(caseId).trim() : "";
  if (!id) throw new Error("caseId is required");
  if (!storedFilename || typeof storedFilename !== "string")
    throw new Error("storedFilename is required");

  await apiClient.request(
    `/api/v1/cases/${encodeURIComponent(id)}/docs/${encodeURIComponent(storedFilename)}`,
    { method: "DELETE" }
  );
}
