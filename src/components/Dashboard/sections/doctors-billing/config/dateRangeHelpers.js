/**
 * Format a Date as YYYY-MM-DD.
 */
function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Default date range for "date range" filter: from 1 month ago to today.
 */
export function getDefaultDateRangeForBilling() {
  const today = new Date();
  const from = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    today.getDate()
  );
  return { from: toYMD(from), to: toYMD(today) };
}
