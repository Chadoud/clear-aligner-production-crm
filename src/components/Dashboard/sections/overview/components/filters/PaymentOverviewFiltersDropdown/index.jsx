/**
 * PaymentOverviewFiltersDropdown – "Invoices" filter for Payment overview section:
 * dropdown with payment status checkboxes (All + Left to pay / Paid / Pending).
 * Uses shared useDropdownPortalPosition so the panel stays anchored on scroll.
 */

import { createPortal } from "react-dom";
import { useRef, useEffect } from "react";
import { usePortalDropdown } from "@/hooks";
import {
  PAYMENT_STATUS_CHECKBOXES,
  DEFAULT_STATUS_FILTER,
  getTriggerLabel,
} from "./config/constants";

export default function PaymentOverviewFiltersDropdown({
  id,
  statusFilter = DEFAULT_STATUS_FILTER,
  onStatusFilterChange,
  className = "",
}) {
  const { open, setOpen, triggerRef, menuRect, menuRef } = usePortalDropdown({
    minWidth: 240,
    gap: 6,
    placeAbove: "auto",
  });

  const triggerLabel = getTriggerLabel(statusFilter);

  const allSelected =
    statusFilter.leftToPay !== false &&
    statusFilter.paid !== false &&
    statusFilter.pending !== false;
  const anySelected =
    statusFilter.leftToPay !== false ||
    statusFilter.paid !== false ||
    statusFilter.pending !== false;
  const allIndeterminate = anySelected && !allSelected;

  const allCheckboxRef = useRef(null);
  useEffect(() => {
    const el = allCheckboxRef.current;
    if (el) el.indeterminate = allIndeterminate;
  }, [allIndeterminate]);

  const handleToggleAll = (checked) => {
    if (!onStatusFilterChange) return;
    onStatusFilterChange({
      leftToPay: checked,
      paid: checked,
      pending: checked,
    });
  };

  const handleStatusToggle = (value) => {
    if (!onStatusFilterChange) return;
    onStatusFilterChange({
      ...statusFilter,
      [value]: !statusFilter[value],
    });
  };

  const panelContent =
    open && menuRect.width > 0 && typeof document !== "undefined" ? (
      <div
        ref={menuRef}
        className="payment-overview-filters-dropdown-panel"
        role="dialog"
        aria-label="Payment status and exclusion filters"
        style={{
          position: "fixed",
          ...(menuRect.placement === "above"
            ? { bottom: menuRect.bottom }
            : { top: menuRect.top }),
          left: menuRect.left,
          width: menuRect.width,
          zIndex: 10000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="payment-overview-filters-dropdown-section">
          <span className="payment-overview-filters-dropdown-section-title">
            Payment status
          </span>
          <label className="payment-overview-filters-dropdown-checkbox-label payment-overview-filters-show-all">
            <input
              ref={allCheckboxRef}
              type="checkbox"
              checked={allSelected}
              onChange={(e) => handleToggleAll(e.target.checked)}
              aria-label="Show all payment statuses"
              className="payment-overview-filters-dropdown-checkbox"
            />
            <span>All</span>
          </label>
          <div
            className="payment-overview-filters-dropdown-divider"
            role="presentation"
          />
          <div
            className="payment-overview-filters-dropdown-checkboxes"
            role="group"
            aria-label="Payment status"
          >
            {PAYMENT_STATUS_CHECKBOXES.map((opt) => (
              <label
                key={opt.value}
                className="payment-overview-filters-dropdown-checkbox-label"
              >
                <input
                  type="checkbox"
                  checked={statusFilter[opt.value] !== false}
                  onChange={() => handleStatusToggle(opt.value)}
                  aria-label={`Show ${opt.label}`}
                  className="payment-overview-filters-dropdown-checkbox"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={`custom-dropdown-wrap form-control-width-md payment-overview-filters-dropdown-wrap ${className}`.trim()}
        aria-expanded={open}
        aria-haspopup="dialog"
        id={id}
      >
        <button
          type="button"
          className="custom-dropdown-trigger"
          onClick={() => setOpen((o) => !o)}
          aria-label="Invoice filters: payment status and exclusions"
        >
          <span className="custom-dropdown-trigger-text">{triggerLabel}</span>
          <span
            className={`custom-dropdown-chevron ${open ? "custom-dropdown-chevron-open" : ""}`}
            aria-hidden
          >
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M1 1l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>
      {typeof document !== "undefined" &&
        createPortal(panelContent, document.body)}
    </>
  );
}
