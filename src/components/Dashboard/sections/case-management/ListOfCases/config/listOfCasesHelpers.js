import { CASE_STATUS_OPTIONS } from "@/utils/cases/index.js";
import { ALL_STATUS_ID } from "@/services/caseStatusMetrics";

/** Status filter options: "all cases" plus each case status (i18n keys). */
export const STATUS_OPTIONS = [
  { id: ALL_STATUS_ID, labelKey: "caseList.allCases" },
  ...CASE_STATUS_OPTIONS.map((o) => ({ id: o.id, labelKey: o.labelKey })),
];

export function formatCaseDate(entered) {
  if (!entered) return "—";
  const d = entered.split("/");
  if (d.length === 3) return `${d[0]}/${d[1]}/${d[2].slice(-2)}`;
  return entered;
}
