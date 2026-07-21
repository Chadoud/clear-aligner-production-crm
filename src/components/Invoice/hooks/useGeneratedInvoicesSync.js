import { useEffect, useRef } from "react";
import { safeLogError } from "@/utils/safeLogError";
import { dispatchPatientsRefreshSoft } from "@/services/caseService";
import { updatePatientInCacheByRef } from "@/services/patient/patientDataRepository";
import { getInvoicesRefreshEvent } from "@/services/caseService";
import { shouldSkipInvoiceSync } from "@/services/patientInvoiceSyncGuard";
import {
  DELIVERED_DB_STATUS,
  REACTIVATION_DB_STATUS,
} from "@/utils/invoices/patientInvoiceSyncHelpers";
import { getTargetStatusFromMostRecentInvoice } from "../config/generatedInvoicesHelpers";

/**
 * Handles patient status sync from most recent invoice and refresh effects.
 */
export function useGeneratedInvoicesSync({
  invoices,
  patient,
  patientService,
  setSelectedPatient,
  refreshInvoices,
  invoiceUpdateTrigger = 0,
}) {
  const lastSyncRef = useRef({ patientRef: null, targetStatus: null });
  const prevTriggerRef = useRef(invoiceUpdateTrigger);
  if (prevTriggerRef.current !== invoiceUpdateTrigger) {
    prevTriggerRef.current = invoiceUpdateTrigger;
    lastSyncRef.current = { patientRef: null, targetStatus: null };
  }

  // Refresh when accept converts quote to confirmed (shared context refetches)
  useEffect(() => {
    const handler = () => refreshInvoices();
    window.addEventListener(getInvoicesRefreshEvent(), handler);
    return () => window.removeEventListener(getInvoicesRefreshEvent(), handler);
  }, [refreshInvoices]);

  // Sync patient status from most recent invoice
  useEffect(() => {
    if (
      !patient?.ref ||
      !patientService?.updatePatientByRef ||
      !setSelectedPatient
    )
      return;
    if (shouldSkipInvoiceSync(patient.ref)) return;
    const currentStatus =
      patient.case_status != null ? Number(patient.case_status) : null;
    if (currentStatus === REACTIVATION_DB_STATUS) return;
    const targetStatus = getTargetStatusFromMostRecentInvoice(invoices);
    if (targetStatus == null) return;
    if (currentStatus === targetStatus) return;
    if (
      lastSyncRef.current.patientRef === patient.ref &&
      lastSyncRef.current.targetStatus === targetStatus
    )
      return;
    lastSyncRef.current = { patientRef: patient.ref, targetStatus };
    let cancelled = false;
    (async () => {
      try {
        await patientService.updatePatientByRef(patient.ref, {
          case_status: targetStatus,
          ...(targetStatus === DELIVERED_DB_STATUS
            ? { skip_status_email: true }
            : {}),
        });
        if (cancelled) return;
        updatePatientInCacheByRef(patient.ref, { case_status: targetStatus });
        dispatchPatientsRefreshSoft();
        const updated = patientService?.formatPatientForDisplay?.({
          ...patient,
          case_status: targetStatus,
        }) ?? { ...patient, case_status: targetStatus };
        setSelectedPatient(updated);
      } catch (err) {
        safeLogError(err, "Sync patient status from invoice failed");
        lastSyncRef.current = { patientRef: null, targetStatus: null };
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    invoices,
    patient,
    patientService,
    setSelectedPatient,
    invoiceUpdateTrigger,
  ]);
}
