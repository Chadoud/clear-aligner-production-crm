/**
 * Shared navigation to patient sheet (case-management with selected patient and tab).
 * Used by Header search and RightSidebar to avoid duplicated logic.
 */

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "../context/DashboardContext";
import { usePatientService } from "./usePatientService";
import { ROUTES } from "../routes/sectionConfig";
import {
  normalizeCaseManagementTab,
  getLastCaseTab,
  setLastCaseTab,
} from "../constants/caseManagementTabs";
import {
  canAccessCaseTab,
  DEFAULT_DOCTOR_ALLOWED_TAB,
} from "../utils/cases/index.js";
import { recordPatientConsulted } from "../constants/recentConsultedPatients.js";

function resolvePatientCaseId(patient, patientService) {
  const direct = patient?.case_id;
  if (direct != null && Number.isFinite(Number(direct))) {
    return Number(direct);
  }
  const ref = patient?.ref ? String(patient.ref).trim() : "";
  if (!ref || !patientService) return null;
  const raw =
    patientService.getPatientByRef?.(ref) ??
    patientService.getRawPatientByRef?.(ref);
  const fromList = raw?.case_id;
  return fromList != null && Number.isFinite(Number(fromList))
    ? Number(fromList)
    : null;
}

/**
 * Returns a function to navigate to the patient sheet with optional tab.
 * Sets selectedPatient and navigates to case-management with ?tab=...&patientRef=...
 * For doctor scope, redirects company-only tab to an allowed tab.
 */
export function usePatientSheetNavigation() {
  const navigate = useNavigate();
  const { setSelectedPatient, scope } = useDashboard();
  const { service: patientService } = usePatientService();

  return useCallback(
    (patient, options = {}) => {
      if (!patient) return;
      const ref = patient.ref ? String(patient.ref).trim() : "";
      const caseId = resolvePatientCaseId(patient, patientService);
      if (caseId == null && !ref) return;
      const tabFromOptions = options.tab;
      let tab = normalizeCaseManagementTab(
        tabFromOptions ?? getLastCaseTab() ?? "plan"
      );
      if (scope === "doctor" && !canAccessCaseTab(scope, tab)) {
        tab = DEFAULT_DOCTOR_ALLOWED_TAB;
      }
      if (tabFromOptions) {
        setLastCaseTab(tab);
      }
      const rawForDisplay =
        ref && patientService
          ? (patientService.getPatientByRef?.(ref) ??
            patientService.getRawPatientByRef?.(ref))
          : null;
      const displayPatient =
        patientService && rawForDisplay && !Array.isArray(rawForDisplay.info)
          ? patientService.formatPatientForDisplay(rawForDisplay)
          : patientService && !Array.isArray(patient.info)
            ? patientService.formatPatientForDisplay(patient)
            : patient;
      setSelectedPatient(displayPatient);
      recordPatientConsulted(displayPatient, scope);
      const caseUrl =
        scope === "doctor"
          ? caseId != null
            ? ROUTES.doctorCaseManagementCase(caseId)
            : ROUTES.doctorCaseManagementList
          : caseId != null
            ? ROUTES.caseManagementCase(caseId)
            : ROUTES.caseManagementList;
      const params = new URLSearchParams({ tab });
      if (caseId == null && ref) {
        params.set("patientRef", ref);
      }
      const url = `${caseUrl}?${params.toString()}`;
      navigate(url, { replace: true });
    },
    [navigate, setSelectedPatient, patientService, scope]
  );
}
