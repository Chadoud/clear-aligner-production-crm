/**
 * Shared payment-plan math used by invoice/receipt helpers.
 */
export function sumInstalments(rows, fallbackMonthlyAmount = 0) {
  return (rows || []).reduce(
    (sum, row) =>
      sum + (Number(row?.amount) || Number(fallbackMonthlyAmount) || 0),
    0
  );
}

export function computeDownPayment(totalPrice, rows, monthlyAmount = 0) {
  const total = Number(totalPrice) || 0;
  const instalmentsTotal = sumInstalments(rows, monthlyAmount);
  return Math.max(0, total - instalmentsTotal);
}
