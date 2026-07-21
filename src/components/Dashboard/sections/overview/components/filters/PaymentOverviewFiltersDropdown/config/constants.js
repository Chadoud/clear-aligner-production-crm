/** Default state: all payment statuses visible. */
export const DEFAULT_STATUS_FILTER = {
  leftToPay: true,
  paid: true,
  pending: true,
};

/** Checkbox options for payment status filter (multi-select). */
export const PAYMENT_STATUS_CHECKBOXES = [
  { value: "leftToPay", label: "Left to pay" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
];

export function getTriggerLabel(statusFilter) {
  const checked = PAYMENT_STATUS_CHECKBOXES.filter(
    (o) => statusFilter?.[o.value] !== false
  );
  if (checked.length === 0) return "None";
  if (checked.length === 3) return "All";
  if (checked.length === 1) return checked[0].label;
  return `Filters (${checked.length})`;
}
