/**
 * Numeric columns for payment overview sub-rows (aligned with DoctorBillingSubRow display).
 */

export function getLineItemPaymentAmounts(item, row, getBillingState) {
  const billingState = getBillingState
    ? getBillingState(row.doctorName, item.caseRef, null, item)
    : null;

  const left =
    billingState === "Pending"
      ? 0
      : item.amount != null && item.amountPaid != null
        ? Math.max(0, Number(item.amount) - Number(item.amountPaid))
        : 0;

  const paid =
    item.amountPaid != null
      ? Number(item.amountPaid)
      : item.amount != null
        ? Number(item.amount)
        : 0;

  const pending =
    billingState === "Pending" && item.amount != null ? Number(item.amount) : 0;

  return { left, paid, pending, billingState };
}
