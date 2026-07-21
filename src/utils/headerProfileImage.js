import { resolveProfileImageUrl } from "./profileImageUrl";

/**
 * Header avatar URLs — default Lab photo first, Direct portrait as fallback
 * for dual lab accounts (see VITE_DUAL_LAB_PROFILE_EMAIL).
 * @param {{ profileImage?: string|null, profileImageUrl?: string|null, directProfileImage?: string|null, directProfileImageUrl?: string|null } | null | undefined} user
 * @returns {{ primary: string|null, fallback: string|null }}
 */
export function pickHeaderProfileImageUrls(user) {
  if (!user) return { primary: null, fallback: null };

  const primary =
    user.profileImageUrl || resolveProfileImageUrl(user.profileImage) || null;
  const direct =
    user.directProfileImageUrl ||
    resolveProfileImageUrl(user.directProfileImage) ||
    null;

  const fallback = direct && direct !== primary ? direct : null;
  return { primary, fallback };
}
