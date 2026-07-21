/**
 * Sanitized error logging — avoids logging full err objects (stack traces, PII).
 * Logs message, status (for ApiError), and optional context only.
 *
 * @param {unknown} err - Caught error (do not log directly)
 * @param {string} [context] - Optional context (e.g. "Patient API load")
 */
export function safeLogError(err, context = "") {
  const msg = err?.message ?? String(err ?? "Unknown error");
  const status = err?.status ?? err?.statusCode ?? null;
  const prefix = context ? `${context}: ` : "";
  const statusPart = status != null ? ` (status ${status})` : "";
  console.error(`${prefix}${msg}${statusPart}`);
}
