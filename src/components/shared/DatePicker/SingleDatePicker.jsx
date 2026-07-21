/**
 * SingleDatePicker – single date selection.
 * Supports direct keyboard input (dd.mm.yyyy / dd/mm/yyyy) AND calendar popover.
 */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import CalendarSinglePopover from "./CalendarSinglePopover";
import "./SingleDatePicker.css";

/** YYYY-MM-DD → dd.mm.yyyy display string */
function toDisplay(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

/** Free-text → YYYY-MM-DD, or null if invalid */
function parseTyped(text) {
  const t = text.trim().replace(/[/-]/g, ".");
  const parts = t.split(".");
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (
    isNaN(d) ||
    isNaN(m) ||
    isNaN(y) ||
    d < 1 ||
    d > 31 ||
    m < 1 ||
    m > 12 ||
    y < 1900 ||
    y > 2100
  )
    return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  )
    return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function SingleDatePicker({
  value,
  onChange,
  placeholder = "dd.mm.yyyy",
  label,
  id,
  allowFuture = false,
  disabled = false,
  defaultViewYmd,
  displayFormat, // kept for API compatibility, ignored (always dd.mm.yyyy)
  className = "",
}) {
  void displayFormat;

  const [open, setOpen] = useState(false);
  // Local text state: keeps what the user is typing; syncs from value on external change.
  const [inputText, setInputText] = useState(() => toDisplay(value));
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync display text when the external value changes (e.g. calendar pick).
  useEffect(() => {
    setInputText(toDisplay(value));
  }, [value]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest(".calendar-single-popover")
      ) {
        setOpen(false);
      }
    };
    const onEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  /** Try to commit what the user typed. */
  const commitText = () => {
    if (!inputText.trim()) {
      onChange("");
      return;
    }
    const parsed = parseTyped(inputText);
    if (parsed) {
      onChange(parsed);
      setInputText(toDisplay(parsed));
    } else {
      // Restore the last valid value.
      setInputText(toDisplay(value));
    }
  };

  const handleCalendarSelect = (ymd) => {
    onChange(ymd);
    setOpen(false);
  };

  const popoverContent =
    open && typeof document !== "undefined" ? (
      <CalendarSinglePopover
        value={value}
        onSelect={handleCalendarSelect}
        onClose={() => setOpen(false)}
        anchorRef={containerRef}
        allowFuture={allowFuture}
        defaultViewYmd={defaultViewYmd}
      />
    ) : null;

  return (
    <div
      ref={containerRef}
      className={`single-date-picker ${className}`.trim()}
    >
      {label && (
        <label htmlFor={id} className="single-date-picker-label">
          {label}
        </label>
      )}
      <div
        className={`single-date-picker-trigger ${open ? "single-date-picker-trigger--open" : ""} ${disabled ? "single-date-picker-trigger--disabled" : ""}`}
      >
        <i
          className="fas fa-calendar-alt single-date-picker-icon"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="single-date-picker-input"
          value={inputText}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label || "Date"}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText();
            }
            if (e.key === "Escape") {
              setInputText(toDisplay(value));
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          className="single-date-picker-cal-btn"
          disabled={disabled}
          aria-label="Open calendar"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <i className="fas fa-chevron-down" aria-hidden />
        </button>
      </div>
      {typeof document !== "undefined" &&
        createPortal(popoverContent, document.body)}
    </div>
  );
}
