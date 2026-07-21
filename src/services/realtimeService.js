import { apiClient } from "@/core/api/apiClientSingleton";

/**
 * @returns {Promise<{ crmSocketUrl: string, mobileSocketUrl: string, mobileSocketToken: string }>}
 */
export async function fetchRealtimeConfig() {
  return apiClient.request("/api/v1/realtime/config");
}
