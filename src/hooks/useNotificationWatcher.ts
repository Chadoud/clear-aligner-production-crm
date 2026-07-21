import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { useToast } from "@/context/ToastContext";
import {
  getBewareNotificationReason,
  getBewareTab,
} from "@/components/Dashboard/Header/utils/formatters";
import {
  clearBewareInCache,
  dispatchPatientsRefresh,
  dispatchPatientsRefreshSoft,
} from "@/services/caseService";
import { markCaseAsSeen } from "@/services/caseService";
import {
  loadPatientData,
  getVisiblePatients,
  getVisibleDoctorPatients,
} from "@/services/patientDataService";
import { fetchDeliveryEvents } from "@/services/deliveryEventsService";
import { usePatientSheetNavigation } from "@/hooks/usePatientSheetNavigation";
import {
  buildDeliveryIdSet,
  detectNewDeliveryEvents,
  detectPatientNotificationChanges,
  type PatientNotificationChange,
} from "@/utils/notificationSnapshot";

const POLL_INTERVAL_MS = 20_000;

export function useNotificationWatcher(): void {
  const { token, user } = useAuth();
  const { scope, actor } = useDashboard();
  const toast = useToast();
  const { t } = useTranslation();
  const navigateToPatientSheet = usePatientSheetNavigation();

  const patientSnapshotRef = useRef<Map<string, string>>(new Map());
  const deliveryIdsRef = useRef<Set<number>>(new Set());
  const baselineReadyRef = useRef(false);
  const pollingRef = useRef(false);

  const isLab = user?.role === "company";

  const openPatientNotification = useCallback(
    async (change: PatientNotificationChange) => {
      const patient = change.patient;
      const caseId = patient.case_id;
      if (caseId != null) {
        clearBewareInCache(caseId);
        dispatchPatientsRefreshSoft();
        const ok = await markCaseAsSeen(caseId);
        if (ok) dispatchPatientsRefresh();
      }
      navigateToPatientSheet(patient, { tab: getBewareTab(patient) });
    },
    [navigateToPatientSheet]
  );

  const showPatientNotificationToast = useCallback(
    (change: PatientNotificationChange) => {
      const patient = change.patient;
      const patientName = patient.name || patient.ref || t("header.emDash");
      const caseKey = String(patient.case_id ?? patient.ref ?? "");
      let message: string;

      if (change.kind === "invoice") {
        message = t("toast.newInvoice", { patient: patientName });
      } else {
        const reason = getBewareNotificationReason(scope, patient);
        message = t("toast.newMessage", { patient: patientName, reason });
      }

      toast.notification(message, {
        dedupeKey: `patient-notif:${caseKey}:${change.kind}`,
        action: {
          label: t("toast.view"),
          onClick: () => {
            void openPatientNotification(change);
          },
        },
      });
    },
    [toast, t, scope, openPatientNotification]
  );

  const poll = useCallback(async () => {
    if (!token || pollingRef.current) return;
    pollingRef.current = true;
    try {
      await loadPatientData();
      dispatchPatientsRefreshSoft();

      const patients =
        scope === "doctor"
          ? getVisibleDoctorPatients(undefined, actor)
          : getVisiblePatients();

      const { changes, next } = detectPatientNotificationChanges(
        patientSnapshotRef.current,
        patients,
        scope,
        isLab
      );

      const deliveryEvents = await fetchDeliveryEvents();
      const newDeliveries = detectNewDeliveryEvents(
        deliveryIdsRef.current,
        deliveryEvents,
        baselineReadyRef.current
      );

      if (!baselineReadyRef.current) {
        patientSnapshotRef.current = next;
        deliveryIdsRef.current = buildDeliveryIdSet(deliveryEvents);
        baselineReadyRef.current = true;
        return;
      }

      patientSnapshotRef.current = next;
      deliveryIdsRef.current = buildDeliveryIdSet(deliveryEvents);

      for (const change of changes) {
        showPatientNotificationToast(change);
      }

      for (const ev of newDeliveries) {
        const event = deliveryEvents.find((item) => item.id === ev.id);
        if (!event) continue;
        const patientName = event.name || t("header.emDash");
        toast.notification(t("toast.newDelivery", { patient: patientName }), {
          dedupeKey: `delivery:${event.id}`,
          action: {
            label: t("toast.view"),
            onClick: () => {
              navigateToPatientSheet(
                {
                  case_id: event.case_id,
                  ref: String(event.case_id),
                  name: event.name,
                  cabinet: event.cabinet,
                },
                {}
              );
            },
          },
        });
      }
    } catch (err) {
      console.error("Notification poll failed:", err);
    } finally {
      pollingRef.current = false;
    }
  }, [
    token,
    scope,
    actor,
    isLab,
    showPatientNotificationToast,
    toast,
    t,
    navigateToPatientSheet,
  ]);

  useEffect(() => {
    if (!token) {
      baselineReadyRef.current = false;
      patientSnapshotRef.current = new Map();
      deliveryIdsRef.current = new Set();
      return undefined;
    }

    void poll();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          void poll();
        }
      }, POLL_INTERVAL_MS);
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void poll();
        startInterval();
      } else {
        stopInterval();
      }
    };

    if (document.visibilityState === "visible") {
      startInterval();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token, poll]);
}
