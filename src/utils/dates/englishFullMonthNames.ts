/**
 * English full month names (January–December) for calendars and invoice month labels.
 */
export const ENGLISH_FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** e.g. "March 2026" */
export function formatMonthYearEnFull(d: Date): string {
  return `${ENGLISH_FULL_MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
