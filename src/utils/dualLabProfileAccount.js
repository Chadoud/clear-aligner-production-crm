/**
 * Dual Lab + Direct lab chat profiles.
 * Set VITE_DUAL_LAB_PROFILE_EMAIL in `.env` (lowercase email). Empty = feature off.
 */
export const DUAL_LAB_PROFILE_EMAIL = String(
  import.meta.env.VITE_DUAL_LAB_PROFILE_EMAIL ?? ""
)
  .trim()
  .toLowerCase();

export function isDualLabProfileLogin(login) {
  if (!DUAL_LAB_PROFILE_EMAIL) return false;
  return (
    String(login ?? "")
      .trim()
      .toLowerCase() === DUAL_LAB_PROFILE_EMAIL
  );
}

export function resolveProfileLogin(input) {
  const email = String(input?.email ?? input?.username ?? "").trim();
  return email;
}

export function isDualLabProfileAccount(input) {
  return isDualLabProfileLogin(resolveProfileLogin(input));
}
