/**
 * Shared hook for case-management tabs: raw patient by ref (docs, chat, replies, etc.).
 * Avoids repeating usePatientService + getRawPatientByRef in every tab.
 *
 * @param {string|null|undefined} ref - Patient ref
 * @returns {Object|null} Raw patient from JSON (with case_id, docs, chatMessages, …) or null
 */
import { useMemo } from "react";
import { usePatientService } from "./usePatientService.js";

export function useRawPatient(ref) {
  const { service: patientService } = usePatientService();
  return useMemo(
    () =>
      ref && patientService?.getRawPatientByRef
        ? patientService.getRawPatientByRef(ref)
        : null,
    [ref, patientService]
  );
}
