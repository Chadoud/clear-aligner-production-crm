import { apiClient } from "@/core/api/apiClientSingleton";

/**
 * @param {File} file
 * @param {"default"|"direct"} [context]
 * @returns {Promise<{ profileImage: string|null, profileImageUrl: string|null }>}
 */
export async function uploadProfilePhoto(file, context = "default") {
  const formData = new FormData();
  formData.append("profile_image", file);
  const query = context === "direct" ? "?context=direct" : "";
  return apiClient.request(`/api/v1/profile-overrides/photo${query}`, {
    method: "POST",
    body: formData,
    timeoutMs: 60000,
  });
}

/**
 * @param {"default"|"direct"} [context]
 * @returns {Promise<{ profileImage: string|null, profileImageUrl: string|null }>}
 */
export async function removeProfilePhoto(context = "default") {
  const query = context === "direct" ? "?context=direct" : "";
  return apiClient.request(`/api/v1/profile-overrides/photo${query}`, {
    method: "DELETE",
  });
}
