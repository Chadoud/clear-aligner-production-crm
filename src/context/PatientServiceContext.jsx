import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getPatientsRefreshEvent,
  getPatientsRefreshSoftEvent,
} from "../services/caseService.js";
import { useAuth } from "./AuthContext";

const PatientServiceContext = createContext(null);

let patientServiceModule = null;
let loadDataPromise = null;

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    patientServiceModule = null;
    loadDataPromise = null;
  });
}

export function PatientServiceProvider({ children }) {
  const { token } = useAuth();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!patientServiceModule) {
        try {
          patientServiceModule =
            await import("../services/patientDataService.js");
        } catch (error) {
          console.error("Failed to load patient service:", error);
          if (!cancelled) setLoading(false);
          return;
        }
      }

      if (cancelled) return;
      setService(patientServiceModule);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Reload patient data as soon as auth token becomes available,
  // so dashboard metrics populate immediately after login without manual refresh.
  useEffect(() => {
    let cancelled = false;

    const loadForSession = async () => {
      if (!service) return;
      if (!token) {
        setDataReady(true);
        return;
      }
      setDataReady(false);
      setLoading(true);
      loadDataPromise = service.loadPatientData();
      try {
        await loadDataPromise;
      } catch {
        // loadPatientData handles/logs internally
      } finally {
        if (!cancelled) {
          setLoading(false);
          setDataReady(true);
          setRefreshTrigger((t) => t + 1);
        }
      }
    };

    loadForSession();
    return () => {
      cancelled = true;
    };
  }, [service, token]);

  useEffect(() => {
    const handleRefresh = async () => {
      if (!patientServiceModule || !token) return;
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
  }, [token]);

  const value = useMemo(
    () => ({
      service,
      loading: loading || !dataReady,
      dataReady,
      refreshTrigger,
    }),
    [service, loading, dataReady, refreshTrigger]
  );

  return (
    <PatientServiceContext.Provider value={value}>
      {children}
    </PatientServiceContext.Provider>
  );
}

/**
 * Returns the patient service context value, or null when called outside the
 * provider. The null return is intentional: usePatientService uses it to
 * activate the legacy fallback path when the provider is absent.
 */
export function usePatientServiceContext() {
  return useContext(PatientServiceContext);
}
