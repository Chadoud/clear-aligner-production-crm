import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useDashboard } from "@/context/DashboardContext";
import { usePatientSheetNavigation } from "@/hooks/usePatientSheetNavigation";
import { fetchRealtimeConfig } from "@/services/realtimeService";
import { dispatchPatientsRefreshSoft } from "@/services/caseService";
import {
  loadPatientData,
  getVisiblePatients,
  getVisibleDoctorPatients,
} from "@/services/patientDataService";

export const DISCUSSION_STATS_REFRESH_EVENT = "discussion:refresh-stats";

type IncomingMessage = {
  caseId: number;
  channel: "general" | "doctor";
  patientName?: string | null;
  message?: {
    senderId?: number | string;
    senderName?: string | null;
    text?: string;
    timestamp?: string;
  };
};

function resolveSocketOrigin(crmSocketUrl: string): string {
  const trimmed = String(crmSocketUrl || "").trim();
  if (trimmed) return trimmed.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function lookupPatientName(
  caseId: number,
  scope: string,
  actor: { cabinet?: string; id?: number } | null
): string | null {
  const patients =
    scope === "doctor"
      ? getVisibleDoctorPatients(undefined, actor)
      : getVisiblePatients();
  const row = patients.find((p) => Number(p.case_id) === caseId);
  return row?.name || row?.ref || null;
}

/**
 * Real-time discussion toasts via CRM Socket.IO + mobile API lab feed.
 * Replaces slow-only polling for new chat messages.
 */
export function useDiscussionRealtimeToasts(): void {
  const { token, user } = useAuth();
  const { scope, actor, selectedPatient } = useDashboard();
  const toast = useToast();
  const { t } = useTranslation();
  const navigateToPatientSheet = usePatientSheetNavigation();
  const activeCaseIdRef = useRef<number | null>(null);

  useEffect(() => {
    const caseId = (selectedPatient as { case_id?: number } | null)?.case_id;
    activeCaseIdRef.current =
      caseId != null && Number.isFinite(Number(caseId)) ? Number(caseId) : null;
  }, [selectedPatient]);

  const showToast = useCallback(
    (payload: IncomingMessage) => {
      const caseId = Number(payload.caseId);
      const senderId = Number(payload.message?.senderId);
      if (!Number.isFinite(caseId) || caseId <= 0) return;
      if (
        user?.id != null &&
        Number.isFinite(senderId) &&
        senderId === user.id
      ) {
        return;
      }

      const actorForLookup =
        actor && typeof actor === "object"
          ? (actor as { cabinet?: string; id?: number })
          : null;

      const patientName =
        payload.patientName ||
        lookupPatientName(caseId, scope, actorForLookup) ||
        t("header.emDash");

      const channelLabel =
        payload.channel === "doctor"
          ? t("caseMgmt.discussion.tabDoctor")
          : t("caseMgmt.discussion.tabGeneral");

      const dedupeTs = payload.message?.timestamp || String(Date.now());

      toast.notification(
        t("toast.newDiscussionMessage", {
          patient: patientName,
          channel: channelLabel,
        }),
        {
          dedupeKey: `discussion-live:${caseId}:${dedupeTs}`,
          action: {
            label: t("toast.view"),
            onClick: () => {
              navigateToPatientSheet(
                {
                  case_id: caseId,
                  ref: String(caseId),
                  name: patientName,
                },
                { tab: "discussion" }
              );
            },
          },
        }
      );

      void loadPatientData().then(() => dispatchPatientsRefreshSoft());
      window.dispatchEvent(
        new CustomEvent(DISCUSSION_STATS_REFRESH_EVENT, { detail: { caseId } })
      );
    },
    [toast, t, user?.id, scope, actor, navigateToPatientSheet]
  );

  useEffect(() => {
    if (!token || !user) return undefined;

    let crmSocket: Socket | null = null;
    let mobileSocket: Socket | null = null;
    let cancelled = false;

    const connect = async () => {
      try {
        const cfg = await fetchRealtimeConfig();
        if (cancelled) return;

        const crmOrigin = resolveSocketOrigin(cfg.crmSocketUrl);
        if (crmOrigin) {
          crmSocket = io(crmOrigin, {
            auth: { token },
            path: "/socket.io",
            transports: ["websocket", "polling"],
          });
          crmSocket.on("crm:case:new-message", (data: IncomingMessage) => {
            showToast(data);
          });
        }

        const mobileUrl = String(cfg.mobileSocketUrl || "").replace(/\/$/, "");
        const mobileToken = String(cfg.mobileSocketToken || "").trim();
        if (mobileUrl && mobileToken) {
          mobileSocket = io(mobileUrl, {
            auth: { token: mobileToken },
            transports: ["websocket", "polling"],
          });
          mobileSocket.on(
            "case:new-message",
            (data: {
              caseId: number;
              channel: "general" | "doctor";
              message?: {
                senderId?: string;
                timestamp?: string;
                text?: string;
              };
            }) => {
              showToast({
                caseId: data.caseId,
                channel: data.channel,
                message: {
                  senderId: data.message?.senderId,
                  text: data.message?.text,
                  timestamp: data.message?.timestamp,
                },
              });
            }
          );
        }
      } catch (err) {
        console.warn("Discussion realtime connect failed:", err);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      crmSocket?.removeAllListeners();
      crmSocket?.disconnect();
      mobileSocket?.removeAllListeners();
      mobileSocket?.disconnect();
    };
  }, [token, user, showToast]);
}
