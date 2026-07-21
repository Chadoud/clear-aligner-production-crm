/**
 * Syncs selectedPatient from URL (patientRef) or first patient in list when on case-management list.
 * Used by Dashboard so selection logic lives in one place.
 * Marks case as seen when viewing it so beware alert disappears.
 */

import { useEffect } from "react";
import { useDashboard } from "../context/DashboardContext";
import { usePatientService } from "./usePatientService.js";
import {
  markCaseAsSeen,
  clearBewareInCache,
  dispatchPatientsRefreshSoft,
} from "../services/caseService.js";

/**
 * @param {string|null} patientRefFromQuery
 * @param {boolean} isCaseIdFromPath - true when URL is /case-management/id/:caseId (lookup by case_id)
 * @param {string} section
 * @param {string} caseTab
 * @param {boolean} isDoctor
 * @param {{ cabinet?: string, id?: number } | null} actor
 */
export function useSelectedPatientSync(
  patientRefFromQuery,
  isCaseIdFromPath,
  section,
  caseTab,
  isDoctor,
  actor
) {
  const { setSelectedPatient } = useDashboard();
  const { service: patientService, dataReady } = usePatientService();

  useEffect(() => {
    if (!patientRefFromQuery || !patientService) return;

    const run = async () => {
      const cabinetId = isDoctor && actor?.id ? Number(actor.id) : null;

      let raw = null;
      if (isCaseIdFromPath) {
        // Path-based case ID: /id/6309 — lookup by case_id only (avoids wrong patient when ref is numeric)
        const caseId = parseInt(patientRefFromQuery, 10);
        if (Number.isFinite(caseId)) {
          raw =
            dataReady && patientService.getPatientByCaseId
              ? patientService.getPatientByCaseId(caseId)
              : null;
          if (
            raw &&
            isDoctor &&
            actor?.cabinet &&
            raw.cabinet !== actor.cabinet
          ) {
            raw = null; // Doctor scope: must be in actor's cabinet
          }
          if (!raw && patientService.fetchPatientByCaseId) {
            raw = await patientService.fetchPatientByCaseId(caseId, cabinetId);
          }
        }
      } else {
        // Query param patientRef: lookup by ref
        raw = dataReady
          ? isDoctor
            ? patientService.getPatientByRefForScope(
                patientRefFromQuery,
                "doctor",
                actor
              )
            : patientService.getPatientByRef(patientRefFromQuery)
          : null;
        if (!raw && patientService.fetchPatientByRef) {
          raw = await patientService.fetchPatientByRef(
            patientRefFromQuery,
            cabinetId
          );
        }
      }

      if (raw) {
        setSelectedPatient(patientService.formatPatientForDisplay(raw));
        const caseId =
          raw.case_id ??
          (isCaseIdFromPath ? parseInt(patientRefFromQuery, 10) : null);
        if (caseId != null && Number.isFinite(caseId)) {
          const ok = await markCaseAsSeen(caseId);
          if (ok) {
            clearBewareInCache(caseId);
            dispatchPatientsRefreshSoft();
          }
        }
      }
    };

    run();
  }, [
    patientRefFromQuery,
    isCaseIdFromPath,
    patientService,
    dataReady,
    setSelectedPatient,
    isDoctor,
    actor,
  ]);

  const { selectedPatient } = useDashboard();

  useEffect(() => {
    if (patientRefFromQuery) return;
    if (section !== "case-management" || caseTab !== "list") return;
    if (patientService && dataReady && !selectedPatient) {
      const list = isDoctor
        ? patientService.getDoctorPatients(undefined, actor)
        : patientService.getAllPatients();
      const patient = list[0] ?? null;
      if (patient) {
        setSelectedPatient(patientService.formatPatientForDisplay(patient));
      }
    }
  }, [
    patientRefFromQuery,
    section,
    caseTab,
    patientService,
    dataReady,
    setSelectedPatient,
    isDoctor,
    selectedPatient,
    actor,
  ]);
}
