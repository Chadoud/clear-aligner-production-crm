import { getLineItemPaymentAmounts } from "./billingLineItemAmounts.js";

function groupKey(item) {
  const ref = String(item.caseRef ?? "").trim();
  if (ref) return `case:${ref}`;
  return `inv:${String(item.invoiceRef ?? "")}|${String(item.createdAt ?? "")}|${String(item.generatedDate ?? "")}`;
}

/**
 * One sub-row per patient (case ref); multiple invoices for the same patient are merged.
 */
export function groupSubRowsByPatient(row, getBillingState) {
  const flat = [...(row.lineItems ?? []), ...(row.pendingLineItems ?? [])];
  if (flat.length === 0) return [];

  const byKey = new Map();
  for (const item of flat) {
    const key = groupKey(item);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(item);
  }

  const order = [];
  const seen = new Set();
  for (const item of flat) {
    const key = groupKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  }

  return order.map((key) => {
    const items = byKey.get(key);
    if (items.length === 1) return items[0];

    let aggregateLeft = 0;
    let aggregatePaid = 0;
    let aggregatePending = 0;
    for (const it of items) {
      const { left, paid, pending } = getLineItemPaymentAmounts(
        it,
        row,
        getBillingState
      );
      aggregateLeft += left;
      aggregatePaid += paid;
      aggregatePending += pending;
    }

    const pickLatest = (a, b) => {
      const ta = a.createdAt || a.generatedDate || "";
      const tb = b.createdAt || b.generatedDate || "";
      return String(tb) > String(ta) ? b : a;
    };
    const latest = items.reduce(pickLatest, items[0]);
    const first = items[0];

    return {
      ...first,
      caseRef: first.caseRef,
      name: first.name,
      invoiceRef: `${items.length} invoices`,
      generatedDate: latest.generatedDate ?? first.generatedDate,
      createdAt: latest.createdAt ?? first.createdAt,
      isPatientAggregate: true,
      aggregateLeft,
      aggregatePaid,
      aggregatePending,
    };
  });
}
