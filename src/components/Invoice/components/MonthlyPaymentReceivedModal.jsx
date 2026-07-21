/**
 * Confirm lump amount received for Direct monthly arrangement (allocated from first unpaid).
 */
import { useState, useEffect, useMemo } from "react";
import { getLumpAllocationPreviewLines } from "../config/generatedInvoicesHelpers";
import {
  formatChfInputString,
  roundToNearest5Cents,
} from "@/utils/invoices/invoiceFormatters.js";

function parseChfInput(raw) {
  if (raw == null || typeof raw !== "string") return NaN;
  const s = raw.trim().replace(",", ".");
  if (s === "") return NaN;
  return Number(s);
}

export default function MonthlyPaymentReceivedModal({
  monthLabel,
  defaultAmount,
  invoice,
  onCancel,
  onConfirm,
  busy = false,
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    setValue(formatChfInputString(defaultAmount));
    setError(null);
  }, [defaultAmount, monthLabel]);

  const previewLines = useMemo(() => {
    if (!invoice) return [];
    const n = parseChfInput(value);
    if (!Number.isFinite(n) || n <= 0) return [];
    return getLumpAllocationPreviewLines(invoice, n);
  }, [invoice, value]);

  const handleConfirm = () => {
    const n = parseChfInput(value);
    if (!Number.isFinite(n) || n < 0) {
      setError("Enter a valid amount (0 or more).");
      return;
    }
    setError(null);
    onConfirm(roundToNearest5Cents(n));
  };

  return (
    <div
      className="delete-confirm-modal"
      onClick={busy ? () => {} : onCancel}
      role="presentation"
    >
      <div
        className="delete-confirm-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-received-modal-title"
      >
        <div className="delete-confirm-header">
          <i className="fas fa-coins" aria-hidden />
          <h3 id="payment-received-modal-title">Amount received</h3>
        </div>
        <div className="delete-confirm-body">
          <p>
            <strong>{monthLabel}</strong> — enter the total amount received for
            this payment (CHF). The amount is applied in plan order from the{" "}
            <strong>first unpaid</strong> segment (down payment, then each month
            in sequence). This is not limited to the month shown above.
          </p>
          <label
            className="payment-received-modal__label"
            htmlFor="payment-received-input"
          >
            Amount (CHF)
          </label>
          <input
            id="payment-received-input"
            type="text"
            inputMode="decimal"
            className="payment-received-modal__input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            disabled={busy}
            autoComplete="off"
          />
          {error && (
            <p className="payment-received-modal__error" role="alert">
              {error}
            </p>
          )}
          {previewLines.length > 0 && (
            <div className="payment-received-modal__preview" aria-live="polite">
              <div className="payment-received-modal__preview-title">
                Allocation preview
              </div>
              <ul className="payment-received-modal__preview-list">
                {previewLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="delete-confirm-actions">
          <button
            type="button"
            className="btn-base btn-base--cancel"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-confirm-delete"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden /> Saving…
              </>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
