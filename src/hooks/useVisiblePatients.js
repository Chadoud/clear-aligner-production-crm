/**
 * Returns the list of patients visible for the current scope/actor
 * (company: all visible patients; doctor: visible patients for that doctor).
 * Returns [] while the API data is still loading.
 * @returns {Array} patients
 */
import { useDashboard } from "../context/DashboardContext";
import { usePatientService } from "./usePatientService";

export function useVisiblePatients() {
  const { scope, actor } = useDashboard();
  const {
    service: patientService,
    dataReady,
    refreshTrigger,
  } = usePatientService();

  // refreshTrigger is intentionally read to rerender consumers
  // after async patient cache updates.
  void refreshTrigger;
  if (!patientService || !dataReady) return [];
  return scope === "doctor"
    ? patientService.getVisibleDoctorPatients(undefined, actor)
    : patientService.getVisiblePatients();
}
