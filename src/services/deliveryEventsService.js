/**
 * Delivery events (Open boxes) — upcoming deliveries for Dr patients.
 * @module services/deliveryEventsService
 */

import { apiClient } from "@/core/api/apiClientSingleton";

/**
 * Fetch delivery events (Open boxes notifications).
 * Backend scopes by cabinet for doctors via auth.
 * @returns {Promise<Array<{ id: number, name: string, text: string, date: string, cabinet: string, case_id: number }>>}
 */
export async function fetchDeliveryEvents() {
  try {
    const data = await apiClient.request("/api/v1/events/delivery", {
      timeoutMs: 10000,
    });
    return data?.events ?? [];
  } catch (err) {
    console.error("fetchDeliveryEvents failed:", err);
    return [];
  }
}
