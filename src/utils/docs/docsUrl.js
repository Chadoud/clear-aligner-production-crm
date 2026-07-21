/**
 * Build document/image URLs for case attachments.
 * Prefer same-origin `/data/uploads/...` (Vite → local API in dev; nginx → API in prod).
 * Optional `VITE_DOCS_BASE_URL` may point at the CRM origin when assets are absolute.
 */

/** Display name for a doc: prefers filename (original/title) over storedFilename (hash). */
export function getDocDisplayName(doc) {
  return doc?.filename || doc?.storedFilename || "—";
}

export function getDocsBaseUrl() {
  if (import.meta.env.DEV) {
    return ""; // Use proxy path /data/... in dev
  }
  const url = import.meta.env.VITE_DOCS_BASE_URL;
  return typeof url === "string" ? url.replace(/\/$/, "") : "";
}

/**
 * Discussion attachments: same-origin /data/… (nginx → CRM API).
 * Avoids cross-origin audio playback issues on the CRM host.
 */
export function getDiscussionDocsBaseUrl() {
  return "";
}

/**
 * Build full URL for a case document.
 * When base is empty, returns relative path /data/uploads/... .
 * When base is set, returns absolute URL.
 */
export function buildDocUrl(base, caseId, storedFilename) {
  if (caseId == null || !storedFilename) return null;
  const path = `/data/uploads/${caseId}/${storedFilename}`;
  return base ? `${base}${path}` : path;
}
