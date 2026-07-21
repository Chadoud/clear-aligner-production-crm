/**
 * Returns the list of patients that require attention ("Beware").
 *
 * Uses case_notif:
 * - Lab (company): case_notif = 2 (doctor replied in Discussion)
 * - Doctor: case_notif = 1 (lab replied in Discussion or created invoice)
 * Beware appears when a reply is posted or invoice is created, disappears when seen.
 * Direct patients are excluded (internal patients, no need to notify).
 * Lab never sees case_notif=1 (they did the action, no self-notify).
 * Discussion notifications require last_chat_at; new invoice (case_notif_reason=1) does not.
 *
 * @module hooks/useBewarePatients
 */

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "../context/DashboardContext";
import { useVisiblePatients } from "./useVisiblePatients";
import { INVOICE_CREATED_REASON } from "@/components/Dashboard/Header/utils/formatters";

function isDirectCabinet(name) {
  return String(name ?? "")
    .toLowerCase()
    .includes("direct");
}

/**
 * @returns {Array<{ name: string, ref: string, cabinet: string, case_notif?: number }>}
 */
export function useBewarePatients() {
  const { user } = useAuth();
  const { scope } = useDashboard();
  const patients = useVisiblePatients();
  const isLab = user?.role === "company";

  return useMemo(() => {
    const notifForScope = scope === "company" ? 2 : 1;
    // Lab never sees "lab replied" (case_notif=1) — they did it, no self-notify
    if (isLab && notifForScope === 1) return [];
    return patients.filter((p) => {
      if (Number(p.case_notif) !== notifForScope) return false;
      if (isDirectCabinet(p.cabinet)) return false;
      // New invoice: show even without last_chat_at (no reply is inserted)
      if (p.case_notif_reason === INVOICE_CREATED_REASON) return true;
      // Discussion: require last_chat_at (emission timestamp)
      return Boolean(p.last_chat_at);
    });
  }, [patients, scope, isLab]);
}
