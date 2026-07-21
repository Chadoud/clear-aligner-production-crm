/**
 * Shared coercion utilities for consistent string/number handling.
 * @module utils/shared/coercion
 */

/**
 * @param {unknown} value
 * @param {string} [defaultValue]
 * @returns {string}
 */
export function safeString(value, defaultValue = "") {
  if (value == null) return defaultValue;
  return String(value);
}

/**
 * @param {unknown} value
 * @param {string} [defaultValue]
 * @returns {string}
 */
export function safeTrim(value, defaultValue = "") {
  if (value == null) return defaultValue;
  const s = String(value).trim();
  return s === "" ? defaultValue : s;
}

/**
 * @param {unknown} value
 * @param {number|null} [defaultValue]
 * @returns {number|null}
 */
export function safeNumber(value, defaultValue = null) {
  if (value == null) return defaultValue;
  const n = Number(value);
  return Number.isNaN(n) ? defaultValue : n;
}
