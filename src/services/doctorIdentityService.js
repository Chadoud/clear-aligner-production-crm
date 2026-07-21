/**
 * Current doctor identity — reads from the JWT stored in sessionStorage by AuthContext.
 *
 * @module services/doctorIdentityService
 */

import { AUTH_USER_KEY } from "@/constants/authStorage";

/**
 * @typedef {{ id: string, name: string, cabinet: string }} DoctorIdentity
 */

/**
 * @returns {DoctorIdentity | null}
 */
export function getCurrentDoctorIdentity() {
  try {
    const raw = sessionStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user?.role !== "doctor") return null;
    return {
      id: String(user.cabinetId ?? user.id),
      name: user.fullName ?? user.username ?? user.email ?? "",
      cabinet: user.cabinetName ?? user.fullName ?? user.username ?? "",
    };
  } catch {
    return null;
  }
}
