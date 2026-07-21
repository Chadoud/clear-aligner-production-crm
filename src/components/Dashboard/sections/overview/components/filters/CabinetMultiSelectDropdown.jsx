/**
 * CabinetMultiSelectDropdown – Doctor/cabinet filter for the Overview.
 *
 * Header quick-selects:
 *   • Select all  — toggles every cabinet
 *   • Dr          — toggles all cabinets except internal lab cabinets
 *   • Intern      — toggles only internal lab cabinets
 *
 * The panel also includes a search input to filter the list.
 */

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePortalDropdown } from "@/hooks";

const INTERN_KEYWORDS = ["lab", "direct"];

const isInternCabinet = (name) =>
  INTERN_KEYWORDS.some((k) =>
    String(name ?? "")
      .toLowerCase()
      .includes(k)
  );

function getTriggerLabel(selectedSet, cabinetOptions) {
  if (!selectedSet || selectedSet.size === 0) return "All cabinets";
  if (selectedSet.size >= cabinetOptions.length) return "All cabinets";
  if (selectedSet.size === 1) return [...selectedSet][0];
  return `${selectedSet.size} cabinets`;
}

/** Attaches the indeterminate property which can't be set via JSX. */
function useIndeterminate(ref, value) {
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = value;
  }, [ref, value]);
}

export default function CabinetMultiSelectDropdown({
  id,
  cabinetOptions = [],
  selectedCabinets = new Set(),
  onSelectionChange,
  className = "",
}) {
  const { open, setOpen, triggerRef, menuRect, menuRef } = usePortalDropdown({
    minWidth: 280,
    gap: 6,
    placeAbove: "auto",
  });

  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  // Auto-focus search and clear query when panel opens/closes.
  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [open]);

  /** null means "not yet initialised" → treat as all selected. */
  const effectiveSelected = useMemo(
    () =>
      selectedCabinets == null ? new Set(cabinetOptions) : selectedCabinets,
    [selectedCabinets, cabinetOptions]
  );

  // Partition cabinets into intern vs doctor groups.
  const { internCabinets, drCabinets } = useMemo(() => {
    const intern = cabinetOptions.filter(isInternCabinet);
    const dr = cabinetOptions.filter((n) => !isInternCabinet(n));
    return { internCabinets: intern, drCabinets: dr };
  }, [cabinetOptions]);

  // Filtered list for the panel (search query applied).
  const filteredOptions = query.trim()
    ? cabinetOptions.filter((name) =>
        String(name ?? "")
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : cabinetOptions;

  // ── Individual toggle ────────────────────────────────────────────────────
  const handleToggle = useCallback(
    (name) => {
      if (!onSelectionChange) return;
      const next = new Set(effectiveSelected);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      onSelectionChange(next);
    },
    [effectiveSelected, onSelectionChange]
  );

  // ── Group toggles ────────────────────────────────────────────────────────
  const toggleGroup = useCallback(
    (group, addAll) => {
      if (!onSelectionChange) return;
      const next = new Set(effectiveSelected);
      if (addAll) {
        group.forEach((n) => next.add(n));
      } else {
        group.forEach((n) => next.delete(n));
      }
      onSelectionChange(next);
    },
    [effectiveSelected, onSelectionChange]
  );

  // ── Select all ───────────────────────────────────────────────────────────
  const handleSelectAll = useCallback(
    (checked) => {
      if (!onSelectionChange) return;
      onSelectionChange(checked ? new Set(cabinetOptions) : new Set());
    },
    [cabinetOptions, onSelectionChange]
  );

  // ── Derived checked / indeterminate states ───────────────────────────────
  const allSelected =
    cabinetOptions.length > 0 &&
    cabinetOptions.every((c) => effectiveSelected.has(c));
  const someSelected = effectiveSelected.size > 0;
  const selectAllIndeterminate = someSelected && !allSelected;

  const allDrSelected =
    drCabinets.length > 0 && drCabinets.every((c) => effectiveSelected.has(c));
  const someDrSelected = drCabinets.some((c) => effectiveSelected.has(c));
  const drIndeterminate = someDrSelected && !allDrSelected;

  const allInternSelected =
    internCabinets.length > 0 &&
    internCabinets.every((c) => effectiveSelected.has(c));
  const someInternSelected = internCabinets.some((c) =>
    effectiveSelected.has(c)
  );
  const internIndeterminate = someInternSelected && !allInternSelected;

  const selectAllRef = useRef(null);
  const drRef = useRef(null);
  const internRef = useRef(null);

  useIndeterminate(selectAllRef, selectAllIndeterminate);
  useIndeterminate(drRef, drIndeterminate);
  useIndeterminate(internRef, internIndeterminate);

  const triggerLabel = getTriggerLabel(effectiveSelected, cabinetOptions);

  const panelContent =
    open &&
    menuRect.width > 0 &&
    typeof document !== "undefined" &&
    cabinetOptions.length > 0 ? (
      <div
        ref={menuRef}
        className="payment-overview-filters-dropdown-panel cabinet-multiselect-dropdown-panel"
        role="dialog"
        aria-label="Select cabinets to display"
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
        {/* Search */}
        <div className="cabinet-multiselect-search">
          <input
            ref={searchRef}
            type="search"
            className="cabinet-multiselect-search-input"
            placeholder="Search doctor / cabinet…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search cabinets"
          />
        </div>

        <div
          className="payment-overview-filters-dropdown-divider"
          role="presentation"
        />

        {/* Quick-select row: Select all | Dr | Intern */}
        <div className="cabinet-multiselect-quick-selects">
          <label className="cabinet-multiselect-quick-label">
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              aria-label="Select all cabinets"
              className="payment-overview-filters-dropdown-checkbox"
            />
            <span>All</span>
          </label>

          {drCabinets.length > 0 && (
            <label className="cabinet-multiselect-quick-label">
              <input
                type="checkbox"
                ref={drRef}
                checked={allDrSelected}
                onChange={(e) => toggleGroup(drCabinets, e.target.checked)}
                aria-label="Select all doctor cabinets"
                className="payment-overview-filters-dropdown-checkbox"
              />
              <span>Dr</span>
            </label>
          )}

          {internCabinets.length > 0 && (
            <label className="cabinet-multiselect-quick-label">
              <input
                type="checkbox"
                ref={internRef}
                checked={allInternSelected}
                onChange={(e) => toggleGroup(internCabinets, e.target.checked)}
                aria-label="Select internal lab cabinets"
                className="payment-overview-filters-dropdown-checkbox"
              />
              <span>Intern</span>
            </label>
          )}
        </div>

        <div
          className="payment-overview-filters-dropdown-divider"
          role="presentation"
        />

        {/* Individual cabinet list */}
        <div
          className="payment-overview-filters-dropdown-checkboxes cabinet-multiselect-list"
          role="group"
          aria-label="Cabinets"
        >
          {filteredOptions.length === 0 ? (
            <span className="cabinet-multiselect-no-results">No matches</span>
          ) : (
            filteredOptions.map((name, index) => (
              <label
                key={`cabinet-opt-${index}-${String(name)}`}
                className="payment-overview-filters-dropdown-checkbox-label"
              >
                <input
                  type="checkbox"
                  checked={effectiveSelected.has(name)}
                  onChange={() => handleToggle(name)}
                  aria-label={`Show ${name}`}
                  className="payment-overview-filters-dropdown-checkbox"
                />
                <span>{name}</span>
              </label>
            ))
          )}
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
          aria-label="Select cabinets to display"
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
