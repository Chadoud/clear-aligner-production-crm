/**
 * Quote, Paid, and Monthly payment toggles for an invoice card.
 *
 * @module components/Invoice/components/InvoiceCardToggles
 */

import ToggleLabel from "@/components/shared/ToggleLabel/ToggleLabel.jsx";

const TOGGLE_CLASSES = {
  label: "invoice-paid-toggle-label",
  text: "invoice-paid-toggle-text",
};

/**
 * @param {Object} props
 * @param {Object} props.invoice - Invoice object
 * @param {boolean} props.isQuote - Quote toggle state
 * @param {boolean} [props.isQuoteDisabled] - When true (e.g. case In treatment), Quote toggle is off and disabled
 * @param {boolean} props.isPaid - Paid toggle state
 * @param {boolean} [props.monthlyPaymentEnabled] - Monthly payment toggle (arrangement invoices only)
 * @param {function(Object, boolean): void} props.onQuoteToggle
 * @param {function(Object, boolean): void} props.onPaidToggle
 * @param {function(Object, boolean): void} [props.onMonthlyPaymentToggle]
 */
export default function InvoiceCardToggles({
  invoice,
  isQuote,
  isQuoteDisabled = false,
  isPaid,
  monthlyPaymentEnabled,
  onQuoteToggle,
  onPaidToggle,
  onMonthlyPaymentToggle,
}) {
  const hasMonthlyPlan =
    Array.isArray(invoice?.monthlyPaymentPlanRows) &&
    invoice.monthlyPaymentPlanRows.length > 0;

  return (
    <div className="invoice-paid-toggle-wrap">
      {hasMonthlyPlan && onMonthlyPaymentToggle && (
        <ToggleLabel
          label="Monthly payment"
          checked={Boolean(monthlyPaymentEnabled)}
          onChange={(checked) => onMonthlyPaymentToggle(invoice, checked)}
          labelClassName={TOGGLE_CLASSES.label}
          textClassName={TOGGLE_CLASSES.text}
        />
      )}
      <ToggleLabel
        label="Quote"
        checked={isQuote}
        onChange={(checked) =>
          !isQuoteDisabled && onQuoteToggle(invoice, checked)
        }
        disabled={isQuoteDisabled}
        labelClassName={TOGGLE_CLASSES.label}
        textClassName={TOGGLE_CLASSES.text}
      />
      <ToggleLabel
        label="Paid"
        checked={isPaid}
        onChange={(checked) => onPaidToggle(invoice, checked)}
        labelClassName={TOGGLE_CLASSES.label}
        textClassName={TOGGLE_CLASSES.text}
      />
    </div>
  );
}
