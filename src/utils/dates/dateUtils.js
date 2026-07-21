/**
 * Shared date formatting for display (dd/mm/yyyy).
 * @param {Date|string|number} d
 * @returns {string}
 */
export function formatDateDDMMYYYY(d) {
  if (d == null) return "";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const day = String(x.getDate()).padStart(2, "0");
  const month = String(x.getMonth() + 1).padStart(2, "0");
  const year = x.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Returns today's date as an ISO YYYY-MM-DD string (local time).
 * @returns {string}
 */
export function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

/** Today's date for invoice storage and display (DD/MM/YYYY). */
export function formatTodayDDMMYYYY() {
  return formatDateDDMMYYYY(new Date());
}
