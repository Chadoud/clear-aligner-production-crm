/**
 * Resolve doctorInfo for invoice from cabinet_id when doctorInfo is missing.
 * Used when rendering invoice preview/PDF — fetches cabinet from tbl_cabinet.
 *
 * @module hooks/useResolvedDoctorInfo
 */

import { useState, useEffect } from "react";
import { resolveDoctorInfoForInvoice } from "@/data/cabinets";

/**
 * @param {Object} invoice - Invoice with optional cabinet_id and doctorInfo
 * @returns {{ data: Object, loading: boolean }} Resolved invoice data and loading state
 */
export function useResolvedDoctorInfo(invoice) {
  const [resolved, setResolved] = useState(invoice);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invoice) {
      setResolved(null);
      return;
    }
    const needsResolve =
      invoice.brand === "Lab" &&
      !invoice.doctorInfo &&
      (invoice.cabinet_id != null || invoice.cabinetId != null);
    if (!needsResolve) {
      setResolved(invoice);
      setLoading(false);
      return;
    }
    setLoading(true);
    resolveDoctorInfoForInvoice(invoice)
      .then((merged) => {
        setResolved(merged);
      })
      .catch(() => {
        setResolved(invoice);
      })
      .finally(() => {
        setLoading(false);
      });
    // Stable identity would re-fetch too often; granular deps below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    invoice?.id,
    invoice?.cabinet_id,
    invoice?.cabinetId,
    invoice?.doctorInfo,
    invoice?.receiptPaymentAmount,
    invoice?.receiptPaymentDate,
  ]);

  return { data: resolved, loading };
}
