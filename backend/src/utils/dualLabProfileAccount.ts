/**
 * Dual Lab + Direct lab chat profiles.
 * Set DUAL_LAB_PROFILE_EMAIL in backend/.env. Empty = feature off.
 */
export const DUAL_LAB_PROFILE_EMAIL = String(
  process.env.DUAL_LAB_PROFILE_EMAIL ?? ""
)
  .trim()
  .toLowerCase();

export function isDualLabProfileLogin(
  login: string | null | undefined
): boolean {
  if (!DUAL_LAB_PROFILE_EMAIL) return false;
  return (
    String(login ?? "")
      .trim()
      .toLowerCase() === DUAL_LAB_PROFILE_EMAIL
  );
}

export function isDualLabProfileAccount(input: {
  login?: string | null;
  email?: string | null;
  username?: string | null;
}): boolean {
  const login = String(
    input.login ?? input.email ?? input.username ?? ""
  ).trim();
  return isDualLabProfileLogin(login);
}
