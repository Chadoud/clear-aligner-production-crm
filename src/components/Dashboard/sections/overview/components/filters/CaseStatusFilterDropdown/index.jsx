/**
 * CaseStatusFilterDropdown – multi-select checkbox dropdown for filtering
 * by patient case status (Beware, Case study, Awaiting acceptance, …).
 * Follows the same portal-anchored pattern as PaymentOverviewFiltersDropdown.
 */
import { createPortal } from "react-dom";
import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePortalDropdown } from "@/hooks";
import {
  CASE_STATUS_FILTER_CHECKBOXES,
  DEFAULT_CASE_STATUS_FILTER,
  getCaseStatusTriggerLabel,
} from "./config/constants";

export default function CaseStatusFilterDropdown({
  id,
  filter = DEFAULT_CASE_STATUS_FILTER,
  onFilterChange,
  className = "",
}) {
  const { t } = useTranslation();
  const { open, setOpen, triggerRef, menuRect, menuRef } = usePortalDropdown({
    minWidth: 220,
    gap: 6,
    placeAbove: "auto",
  });

  const triggerLabel = getCaseStatusTriggerLabel(filter, t);

  const total = CASE_STATUS_FILTER_CHECKBOXES.length;
  const checkedCount = CASE_STATUS_FILTER_CHECKBOXES.filter(
    (o) => filter?.[o.value] !== false
  ).length;
  const allSelected = checkedCount === total;
  const allIndeterminate = checkedCount > 0 && checkedCount < total;

  const allCheckboxRef = useRef(null);
  useEffect(() => {
    const el = allCheckboxRef.current;
    if (el) el.indeterminate = allIndeterminate;
  }, [allIndeterminate]);

  const handleToggleAll = (checked) => {
    if (!onFilterChange) return;
    onFilterChange(
      Object.fromEntries(
        CASE_STATUS_FILTER_CHECKBOXES.map((o) => [o.value, checked])
      )
    );
  };

  const handleToggle = (value) => {
    if (!onFilterChange) return;
    onFilterChange({ ...filter, [value]: filter?.[value] === false });
  };

  const panelContent =
    open && menuRect.width > 0 && typeof document !== "undefined" ? (
      <div
        ref={menuRef}
        className="cs-filter-dropdown-panel"
        role="dialog"
        aria-label={t("filters.caseStatusFilterAria")}
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
        <div className="cs-filter-dropdown-section">
          <span className="cs-filter-dropdown-section-title">
            {t("filters.caseStatusSectionTitle")}
          </span>
          <label className="cs-filter-dropdown-checkbox-label cs-filter-show-all">
            <input
              ref={allCheckboxRef}
              type="checkbox"
              checked={allSelected}
              onChange={(e) => handleToggleAll(e.target.checked)}
              aria-label={t("filters.caseStatusShowAllAria")}
              className="cs-filter-dropdown-checkbox"
            />
            <span>{t("filters.caseStatusAll")}</span>
          </label>
          <div className="cs-filter-dropdown-divider" role="presentation" />
          <div
            className="cs-filter-dropdown-checkboxes"
            role="group"
            aria-label={t("filters.caseStatusGroupAria")}
          >
            {CASE_STATUS_FILTER_CHECKBOXES.map((opt) => (
              <label
                key={opt.value}
                className="cs-filter-dropdown-checkbox-label"
              >
                <input
                  type="checkbox"
                  checked={filter?.[opt.value] !== false}
                  onChange={() => handleToggle(opt.value)}
                  aria-label={t("filters.caseStatusShowAria", {
                    label: t(opt.labelKey),
                  })}
                  className="cs-filter-dropdown-checkbox"
                />
                <span
                  className="cs-filter-status-dot"
                  style={{ background: opt.color }}
                  aria-hidden
                />
                <span>{t(opt.labelKey)}</span>
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
        className={`custom-dropdown-wrap form-control-width-md cs-filter-dropdown-wrap ${className}`.trim()}
        aria-expanded={open}
        aria-haspopup="dialog"
        id={id}
      >
        <button
          type="button"
          className="custom-dropdown-trigger"
          onClick={() => setOpen((o) => !o)}
          aria-label={t("filters.caseStatusFilterButtonAria")}
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
