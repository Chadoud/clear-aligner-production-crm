import { useEffect, useState } from "react";
import { usePatientServiceContext } from "../context/PatientServiceContext.jsx";
import { safeLogError } from "@/utils/safeLogError";
import {
  getPatientsRefreshEvent,
  getPatientsRefreshSoftEvent,
} from "../services/caseService.js";

let patientServiceModule = null;
let loadDataPromise = null;

function useLegacyPatientService(enabled) {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      if (!patientServiceModule) {
        try {
          patientServiceModule =
            await import("../services/patientDataService.js");
        } catch (error) {
          safeLogError(error, "Failed to load patient service");
          if (!cancelled) setLoading(false);
          return;
        }
      }

      if (cancelled) return;
      setService(patientServiceModule);
      setLoading(false);
      if (!loadDataPromise) {
        loadDataPromise = patientServiceModule.loadPatientData();
      }
      try {
        await loadDataPromise;
      } catch {
        // ignored
      }
      if (!cancelled) setDataReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const handleRefresh = async () => {
      if (!patientServiceModule) return;
      loadDataPromise = patientServiceModule.loadPatientData();
      try {
        await loadDataPromise;
      } catch {
        // ignore
      }
      setRefreshTrigger((t) => t + 1);
    };
    const handleRefreshSoft = () => setRefreshTrigger((t) => t + 1);
    window.addEventListener(getPatientsRefreshEvent(), handleRefresh);
    window.addEventListener(getPatientsRefreshSoftEvent(), handleRefreshSoft);
    return () => {
      window.removeEventListener(getPatientsRefreshEvent(), handleRefresh);
      window.removeEventListener(
        getPatientsRefreshSoftEvent(),
        handleRefreshSoft
      );
    };
  }, [enabled]);

  return { service, loading: loading || !dataReady, dataReady, refreshTrigger };
}

/**
 * Shared patient service state from a single app-level provider.
 * @returns {{ service: Object|null, loading: boolean, dataReady: boolean, refreshTrigger: number }}
 */
export const usePatientService = () => {
  const ctx = usePatientServiceContext();
  const fallback = useLegacyPatientService(!ctx);
  return ctx ?? fallback;
};
