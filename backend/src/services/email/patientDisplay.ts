/**
 * Patient display names for emails — aligned with legacy case_title (Mr/Mrs).
 * case_title: 0 = unspecified, 1 = Mr, 2 = Mrs (see caseRepository.Case).
 */
export function formatPatientDisplayName(
  title: number | null | undefined,
  firstName: string,
  lastName: string
): string {
  const prefix = title === 1 ? "Mr" : title === 2 ? "Mrs" : "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return [prefix, name].filter(Boolean).join(" ").trim() || name || "—";
}
