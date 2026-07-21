import { useMemo } from "react";
import {
  getDoctorBillingByMonth,
  getDoctorBilledByMonth,
  getDoctorPaidByMonth,
  getDoctorBillingAllByMonth,
} from "../config/billingUtils";

/**
 * @param {object} params
 * @param {string} params.viewMode
 * @param {string} params.selectedMonth
 * @param {{ from: string, to: string } | null} params.dateRange
 * @param {boolean} params.dataReady
 * @param {unknown[]} params.allInvoices
 * @param {boolean} params.isCompany
 * @param {{ id?: unknown, cabinet?: unknown, name?: unknown } | null | undefined} params.actor
 */
export function useDoctorsBillingAggregates({
  viewMode,
  selectedMonth,
  dateRange,
  dataReady,
  allInvoices,
  isCompany,
  actor,
}) {
  const billingGroupsRaw = useMemo(
    () =>
      !dataReady
        ? []
        : viewMode === "all"
          ? getDoctorBillingAllByMonth(selectedMonth, allInvoices, dateRange)
          : viewMode === "paid"
            ? getDoctorPaidByMonth(selectedMonth, allInvoices, dateRange)
            : viewMode === "billed"
              ? getDoctorBilledByMonth(selectedMonth, allInvoices, dateRange)
              : getDoctorBillingByMonth(selectedMonth, allInvoices, dateRange),
    [viewMode, selectedMonth, allInvoices, dateRange, dataReady]
  );

  const billingData = useMemo(() => {
    if (isCompany) return billingGroupsRaw;
    const norm = (v) =>
      String(v ?? "")
        .trim()
        .toLowerCase();
    const actorCabinetId = Number(actor?.id);
    const actorCabinet = norm(actor?.cabinet);
    const actorName = norm(actor?.name);
    const invoiceCabinetById = new Map(
      (allInvoices ?? []).map((inv) => [
        String(inv?.id ?? ""),
        Number(inv?.cabinet_id ?? inv?.cabinetId),
      ])
    );
    return billingGroupsRaw.filter((g) => {
      const groupName = norm(g?.doctorName);
      if (!groupName) return false;
      if (actorCabinet && groupName === actorCabinet) return true;
      if (actorName && groupName === actorName) return true;
      if (Number.isFinite(actorCabinetId)) {
        return (g?.lineItems ?? []).some((item) => {
          const cid = invoiceCabinetById.get(String(item?.invoiceId ?? ""));
          return Number.isFinite(cid) && cid === actorCabinetId;
        });
      }
      return false;
    });
  }, [
    isCompany,
    actor?.id,
    actor?.cabinet,
    actor?.name,
    billingGroupsRaw,
    allInvoices,
  ]);

  const summary = useMemo(() => {
    const doctorCount = billingData.length;
    const totalAmount = billingData.reduce((s, g) => s + g.totalAmount, 0);
    return { doctorCount, totalAmount };
  }, [billingData]);

  return { billingData, summary };
}
