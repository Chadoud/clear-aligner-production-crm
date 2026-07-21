/**
 * CustomSelect – non-native dropdown styled like the website.
 * Supports optional search filtering.
 * Menu is rendered in a portal so it is never clipped by overflow.
 */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePortalDropdown } from "@/hooks";

/**
 * @param {Object} props
 * @param {Array<{ value: string, label: string }>} props.options
 * @param {string} props.value - current value
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {string} [props.id]
 * @param {string} [props['aria-label']]
 * @param {string} [props.className] - wrapper class
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.searchable] - enable search filter (default true when ≥6 options)
 */
export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select",
  id,
  "aria-label": ariaLabel,
  className = "",
  disabled = false,
  searchable,
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef(null);
  const listboxId = id ? `${id}-listbox` : undefined;
  const { open, setOpen, triggerRef, menuRect, menuRef } = usePortalDropdown({
    gap: 6,
    placeAbove: "auto",
  });

  // Auto-enable search when there are enough options (unless explicitly set).
  const isSearchable =
    searchable !== undefined ? searchable : options.length >= 6;

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  // Auto-focus search input when dropdown opens (preventScroll avoids scroll-into-view lag).
  useEffect(() => {
    if (open && isSearchable && searchRef.current) {
      searchRef.current.focus({ preventScroll: true });
    }
    if (!open) {
      setQuery("");
      setActiveIndex(-1);
    }
  }, [open, isSearchable]);

  useEffect(() => {
    if (!open) return;
    const selectedIdx = filteredOptions.findIndex((o) => o.value === value);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
  }, [open, value, filteredOptions]);

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filteredOptions.length - 1);
      return;
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const activeOption = filteredOptions[activeIndex];
      if (activeOption) handleSelect(activeOption);
    }
  };

  const menuContent =
    open && menuRect.width > 0 && typeof document !== "undefined" ? (
      <div
        ref={menuRef}
        className="custom-dropdown-menu custom-dropdown-menu-portal"
        role="listbox"
        id={listboxId}
        aria-label={ariaLabel || "Options"}
        style={{
          position: "fixed",
          ...(menuRect.placement === "above"
            ? { bottom: menuRect.bottom }
            : { top: menuRect.top }),
          left: menuRect.left,
          width: menuRect.width,
          zIndex: 10000,
        }}
      >
        {isSearchable && (
          <div className="custom-dropdown-search-wrap">
            <i
              className="fas fa-search custom-dropdown-search-icon"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="text"
              className="custom-dropdown-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search options"
            />
          </div>
        )}
        <ul className="custom-dropdown-list" role="presentation">
          {filteredOptions.length === 0 ? (
            <li className="custom-dropdown-no-results">No results</li>
          ) : (
            filteredOptions.map((opt, index) => (
              <li
                id={`${id || "custom-select"}-opt-${opt.value}`}
                key={opt.value}
                role="option"
                aria-selected={value === opt.value}
              >
                <button
                  type="button"
                  className={`custom-dropdown-item ${value === opt.value ? "custom-dropdown-item--selected" : ""} ${activeIndex === index ? "custom-dropdown-item--active" : ""}`}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div
      ref={triggerRef}
      className={`custom-dropdown-wrap custom-dropdown-no-arrow ${className}`.trim()}
      aria-expanded={open}
      aria-haspopup="listbox"
      role="combobox"
      aria-label={ariaLabel}
      aria-controls={listboxId}
      aria-activedescendant={
        open && activeIndex >= 0 && filteredOptions[activeIndex]
          ? `${id || "custom-select"}-opt-${filteredOptions[activeIndex].value}`
          : undefined
      }
      id={id}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
      >
        <span className="custom-dropdown-trigger-text">{displayLabel}</span>
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
      {typeof document !== "undefined" &&
        createPortal(menuContent, document.body)}
    </div>
  );
}
