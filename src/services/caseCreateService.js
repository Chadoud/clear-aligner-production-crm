/**
 * Single use-case service for creating a new case (company or doctor).
 * Persists to the backend API (MySQL database).
 *
 * @module services/caseCreateService
 */

import { apiClient } from "@/core/api/apiClientSingleton";
import { loadPatientData } from "./patient/patientDataRepository";
import { getAllPatients, getDoctorPatients } from "./patientDataService";

/**
 * @param {import("../domain/caseCreate").CaseCreateCommand} command
 * @returns {Promise<{ success: boolean, ref?: string, caseId?: number }>}
 */
export async function createCase(command) {
  const name = String(command?.name ?? "").trim();
  const ref = String(command?.ref ?? "").trim();
  const cabinet = String(command?.cabinet ?? "").trim();
  if (!name || !cabinet) {
    return { success: false };
  }

  try {
    const res = await apiClient.request("/api/v1/cases", {
      method: "POST",
      body: JSON.stringify({
        ref: ref || undefined,
        cabinet,
        firstName: command?.firstName ?? (name.split(" ")[0] || ""),
        lastName:
          command?.lastName ??
          (name.split(" ").slice(1).join(" ").trim() || name),
        email: command?.email ? String(command.email).trim() : undefined,
        address: command?.address ? String(command.address).trim() : undefined,
        phone: command?.phone ? String(command.phone).trim() : undefined,
        birthday: command?.birthday || undefined,
        title: command?.title != null ? command.title : undefined,
        strippingV2:
          command?.strippingV2 != null ? command.strippingV2 : undefined,
        treatments: Array.isArray(command?.treatments)
          ? command.treatments
          : undefined,
        treatmentComments: command?.treatmentComments || undefined,
      }),
    });

    const caseRef = res?.case?.ref ?? ref;
    const caseId = res?.case?.id;
    // Refresh patient list so the new case appears in ListOfCases
    await loadPatientData();
    return { success: true, ref: caseRef, caseId };
  } catch (err) {
    console.error("createCase failed:", err);
    return { success: false };
  }
}

/**
 * Fetch the suggested next ref for a new case in the given cabinet.
 * @param {string} cabinet - Cabinet name
 * @returns {Promise<string|null>} nextRef (e.g. "13" or "E13") or null on error
 */
export async function fetchNextRef(cabinet) {
  const name = String(cabinet ?? "").trim();
  if (!name) return null;
  try {
    const data = await apiClient.request(
      `/api/v1/cases/next-ref?cabinet=${encodeURIComponent(name)}`
    );
    return data?.nextRef ?? null;
  } catch (err) {
    console.error("fetchNextRef failed:", err);
    return null;
  }
}

/**
 * Cabinets available for new case: company = all from data, doctor = own only (by actor).
 * @param {'company'|'doctor'} scope
 * @param {{ cabinet?: string } | null} [actor] - When scope is doctor, filter by this actor
 * @returns {string[]}
 */
export function getAvailableCabinets(scope, actor) {
  const list =
    scope === "doctor" ? getDoctorPatients(undefined, actor) : getAllPatients();
  const cabinets = new Set();
  list.forEach((p) => {
    if (p.cabinet) cabinets.add(p.cabinet);
  });
  return Array.from(cabinets).sort();
}
