/** Placeholder birth date when none is provided (DB requires a value). */
export const DEFAULT_BIRTH_DATE_YMD = "1980-01-01";

/** Legacy placeholder stored before DEFAULT_BIRTH_DATE_YMD. */
export const LEGACY_PLACEHOLDER_BIRTH_DATE_YMD = "1900-01-01";

/**
 * Normalize YYYY-MM-DD birth dates for forms and display.
 * Maps the old 1900 placeholder to 1980.
 * @param {string|null|undefined} ymd
 * @returns {string}
 */
export function normalizeBirthDateYmd(ymd) {
  const s = String(ymd ?? "")
    .trim()
    .slice(0, 10);
  if (!s) return "";
  if (s === LEGACY_PLACEHOLDER_BIRTH_DATE_YMD) return DEFAULT_BIRTH_DATE_YMD;
  return s;
}
