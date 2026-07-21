import { useState, useCallback, useEffect } from "react";

/**
 * @param {object} params
 * @param {boolean} params.isCompany
 * @param {Array<{ doctorName: string }>} params.billingData
 */

export function useDoctorsBillingExpansion({ isCompany, billingData }) {
  const [expandedDoctors, setExpandedDoctors] = useState(() => new Set());

  useEffect(() => {
    if (isCompany) return;
    setExpandedDoctors(new Set(billingData.map((g) => g.doctorName)));
  }, [isCompany, billingData]);

  const toggleExpand = useCallback((doctorName) => {
    setExpandedDoctors((prev) => {
      const next = new Set(prev);
      if (next.has(doctorName)) next.delete(doctorName);
      else next.add(doctorName);
      return next;
    });
  }, []);

  return { expandedDoctors, toggleExpand };
}
