/**
 * Services overrides persistence — API when VITE_USE_API=true, else getAppStorage.
 * @module repositories/ServicesOverrideRepository
 */

import { getAppStorage } from "../core/storage/appStorage";
import { apiClient } from "../core/api/apiClientSingleton.js";
import { isApiEnabled } from "../config/api";
import { safeLogError } from "@/utils/safeLogError";

/**
 * Get services for a brand (each service has point_value).
 * @param {string} brand
 * @returns {Promise<{ services?: Array }>}
 */
export async function getServicesOverrides(brand) {
  if (isApiEnabled) {
    try {
      return await apiClient.request(
        `/api/v1/services-overrides/${encodeURIComponent(brand)}`
      );
    } catch (err) {
      safeLogError(err, "Services API load failed");
      return {};
    }
  }

  const storage = getAppStorage();
  const services = storage.get(`services_${brand}`);
  return {
    services: Array.isArray(services) ? services : undefined,
  };
}

/**
 * Save services for a brand (with point_value per service).
 * @param {string} brand
 * @param {{ services?: Array }} data
 */
export async function setServicesOverrides(brand, data) {
  if (isApiEnabled) {
    try {
      await apiClient.request(
        `/api/v1/services-overrides/${encodeURIComponent(brand)}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );
    } catch (err) {
      safeLogError(err, "Services API save failed");
      throw err;
    }
    return;
  }

  const storage = getAppStorage();
  if (data.services != null) {
    storage.set(`services_${brand}`, data.services);
  }
}
