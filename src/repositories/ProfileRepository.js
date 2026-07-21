/**
 * Profile overrides persistence — API when VITE_USE_API=true, else localStorage.
 * @module repositories/ProfileRepository
 */

import { apiClient } from "../core/api/apiClientSingleton.js";
import { isApiEnabled } from "../config/api";
import { safeLogError } from "@/utils/safeLogError";

const STORAGE_KEY_PREFIX = "lab_profile_";

function storageKey(scope, doctorId) {
  if (scope === "doctor" && doctorId) {
    return `${STORAGE_KEY_PREFIX}doctor_${doctorId}`;
  }
  return `${STORAGE_KEY_PREFIX}company`;
}

/**
 * Get profile overrides. When API on, fetches from backend (uses auth context).
 * @param {"company"|"doctor"} scope
 * @param {string} [doctorId]
 * @returns {Promise<Record<string, string>>}
 */
export async function getProfileOverrides(scope, doctorId) {
  if (isApiEnabled) {
    try {
      const res = await apiClient.request("/api/v1/profile-overrides");
      return {
        overrides: res?.overrides ?? {},
        profileImage: res?.profileImage ?? null,
        profileImageUrl: res?.profileImageUrl ?? null,
        direct: res?.direct ?? null,
      };
    } catch (err) {
      safeLogError(err, "Profile overrides API load failed");
      return {
        overrides: {},
        profileImage: null,
        profileImageUrl: null,
        direct: null,
      };
    }
  }

  try {
    const raw = localStorage.getItem(storageKey(scope, doctorId));
    if (!raw)
      return { overrides: {}, profileImage: null, profileImageUrl: null };
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? {
          overrides: parsed.overrides ?? parsed,
          profileImage: parsed.profileImage ?? null,
          profileImageUrl: parsed.profileImageUrl ?? null,
        }
      : { overrides: {}, profileImage: null, profileImageUrl: null };
  } catch {
    return { overrides: {}, profileImage: null, profileImageUrl: null };
  }
}

/**
 * Save profile overrides.
 * @param {"company"|"doctor"} scope
 * @param {string} [doctorId]
 * @param {Record<string, string>} overrides
 * @returns {Promise<void>}
 */
export async function setProfileOverrides(scope, doctorId, overrides) {
  if (isApiEnabled) {
    try {
      await apiClient.request("/api/v1/profile-overrides", {
        method: "PUT",
        body: JSON.stringify(overrides || {}),
      });
    } catch (err) {
      safeLogError(err, "Profile overrides API save failed");
      throw err;
    }
    return;
  }

  try {
    localStorage.setItem(
      storageKey(scope, doctorId),
      JSON.stringify(overrides || {})
    );
  } catch (e) {
    safeLogError(e, "Profile save failed");
  }
}
