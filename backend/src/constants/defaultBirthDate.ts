/** Placeholder birth date when none is provided (DB requires a value). */
export const DEFAULT_CASE_BIRTH_DATE = "1980-01-01";

/** Legacy placeholder stored before DEFAULT_CASE_BIRTH_DATE. */
export const LEGACY_PLACEHOLDER_BIRTH_DATE = "1900-01-01";

/**
 * Normalize YYYY-MM-DD birth dates from the DB for API responses.
 */
export function normalizeBirthDateYmd(
  ymd: string | null | undefined
): string | null {
  const s = String(ymd ?? "")
    .trim()
    .slice(0, 10);
  if (!s || s.startsWith("0000-00-00")) return null;
  if (s === LEGACY_PLACEHOLDER_BIRTH_DATE) return DEFAULT_CASE_BIRTH_DATE;
  return s;
}
