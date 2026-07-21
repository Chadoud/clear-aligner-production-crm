import { CASE_STATUS_OPTIONS } from "@/utils/cases/index.js";

/** Checkbox options for the case status filter — derived from the single source of truth. */
export const CASE_STATUS_FILTER_CHECKBOXES = CASE_STATUS_OPTIONS.map((o) => ({
  value: o.id,
  labelKey: o.labelKey,
  color: o.color,
}));

/** All statuses set to visible — use as initial state and for "reset". */
export const DEFAULT_CASE_STATUS_FILTER = Object.fromEntries(
  CASE_STATUS_OPTIONS.map((o) => [o.id, true])
);

/** True when at least one status has been hidden by the user. */
export function isCaseStatusFilterActive(filter) {
  return CASE_STATUS_FILTER_CHECKBOXES.some((o) => filter?.[o.value] === false);
}

/**
 * @param {Record<string, boolean>|null|undefined} filter
 * @param {(key: string, opts?: { count?: number }) => string} t - i18n `t`
 */
export function getCaseStatusTriggerLabel(filter, t) {
  const total = CASE_STATUS_FILTER_CHECKBOXES.length;
  const checked = CASE_STATUS_FILTER_CHECKBOXES.filter(
    (o) => filter?.[o.value] !== false
  );
  if (checked.length === 0) return t("filters.caseStatusNone");
  if (checked.length === total) return t("filters.caseStatusAll");
  if (checked.length === 1) return t(checked[0].labelKey);
  return t("filters.caseStatusN", { count: checked.length });
}
