/**
 * PATCH patient demographics (tbl_case fields) via /api/v1/patients/:ref.
 * @module services/patient/patientDemographicsService
 */

import { apiClient } from "@/core/api/apiClientSingleton";

/**
 * @param {string} ref - Patient case ref
 * @param {Record<string, unknown>} body - API body (first_name, last_name, title, email, date_of_birth, address, phone, …)
 * @returns {Promise<{ ok?: boolean, patient?: unknown }>}
 */
export async function updatePatientDemographics(ref, body) {
  const r = String(ref ?? "").trim();
  if (!r) {
    throw new Error("Patient ref is required");
  }
  return apiClient.request(`/api/v1/patients/${encodeURIComponent(r)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
