/** @param {string} message */
function isGenericRequestFailedMessage(message) {
  return /^Request failed for \//.test(String(message ?? "").trim());
}

/**
 * @param {unknown} err
 * @returns {number | undefined}
 */
function readErrorStatus(err) {
  if (!err || typeof err !== "object") return undefined;
  if ("status" in err && typeof err.status === "number") return err.status;
  if ("statusCode" in err && typeof err.statusCode === "number") {
    return err.statusCode;
  }
  return undefined;
}

/**
 * @param {unknown} err
 * @param {string} [fallback]
 * @param {Record<number, string>} [statusMessages] — optional i18n labels keyed by HTTP status
 * @returns {string}
 */
export function getApiUserMessage(err, fallback = "", statusMessages = {}) {
  let raw = "";
  if (err && typeof err === "object") {
    if (
      "userMessage" in err &&
      typeof err.userMessage === "string" &&
      err.userMessage &&
      !isGenericRequestFailedMessage(err.userMessage)
    ) {
      raw = err.userMessage;
    } else if (
      "message" in err &&
      typeof err.message === "string" &&
      err.message &&
      !isGenericRequestFailedMessage(err.message)
    ) {
      raw = err.message;
    }
  }

  if (raw) return raw;

  const status = readErrorStatus(err);
  if (status != null && statusMessages[status]) {
    return statusMessages[status];
  }

  return fallback;
}
