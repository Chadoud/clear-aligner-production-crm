/**
 * Parsing and formatting for "entered" date (DD/MM/YYYY) used across the app.
 * @module utils/dates/enteredDate
 */

/**
 * Parse entered date string (DD/MM/YYYY) to Date. Returns null if invalid.
 * @param {string} entered - e.g. "25/12/2024" or "25/12/24"
 * @returns {Date|null}
 */
export function parseEnteredToDate(entered) {
  if (!entered) return null;
  const parts = String(entered).trim().split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (parts[2].length === 2) year += year < 50 ? 2000 : 1900;
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year))
    return null;
  const d = new Date(year, month, day);
  return d.getFullYear() === year &&
    d.getMonth() === month &&
    d.getDate() === day
    ? d
    : null;
}

/**
 * Get YYYY-MM from entered date string (DD/MM/YYYY). Returns null if invalid.
 * @param {string} entered
 * @returns {string|null} e.g. "2024-12"
 */
export function enteredToMonthKey(entered) {
  const d = parseEnteredToDate(entered);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
