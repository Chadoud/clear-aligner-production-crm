import { ENGLISH_SHORT_MONTH_NAMES } from "@/utils/dates/englishShortMonthNames";

/** Format YYYY-MM to e.g. "Feb 2026". */
export function formatBillingMonth(month) {
  if (!month) return month;
  const [year, m] = month.split("-");
  return `${ENGLISH_SHORT_MONTH_NAMES[parseInt(m, 10) - 1] ?? m} ${year}`;
}
