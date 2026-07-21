/**
 * DateRangePicker – From/To date selection with custom calendar popover.
 * To cannot be before From. Preset buttons: 1M, 2M, 3M, 6M, 1Y, 2Y.
 */

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import CalendarRangePopover from "./CalendarRangePopover";
import "./DateRangePicker.css";

const PRESETS = [
  { label: "1M", months: 1 },
  { label: "2M", months: 2 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "2Y", months: 24 },
];

function getPresetRange(monthsAgo) {
  const today = new Date();
  const from = new Date(
    today.getFullYear(),
    today.getMonth() - monthsAgo,
    today.getDate()
  );
  const toYMD = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: toYMD(from), to: toYMD(today) };
}

function formatDisplayDate(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * @param {Object} props
 * @param {string} props.dateFrom - YYYY-MM-DD
 * @param {string} props.dateTo - YYYY-MM-DD
 * @param {(v: string) => void} props.onDateFromChange
 * @param {(v: string) => void} props.onDateToChange
 */
export default function DateRangePicker({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}) {
  const [open, setOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const containerRef = useRef(null);
  const presetsRef = useRef(null);

  const handleSelect = (from, to) => {
    onDateFromChange(from);
    onDateToChange(to);
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest(".calendar-range-popover")
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

  useEffect(() => {
    if (!presetsOpen) return;
    const onDocClick = (e) => {
      if (
        presetsRef.current &&
        !presetsRef.current.contains(e.target) &&
        !containerRef.current?.contains(e.target)
      ) {
        setPresetsOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [presetsOpen]);

  const popoverContent =
    open && typeof document !== "undefined" ? (
      <CalendarRangePopover
        dateFrom={dateFrom}
        dateTo={dateTo}
        onSelect={handleSelect}
        onClose={() => setOpen(false)}
        anchorRef={containerRef}
      />
    ) : null;

  const handlePresetClick = (months) => {
    const { from, to } = getPresetRange(months);
    onDateFromChange(from);
    onDateToChange(to);
    setPresetsOpen(false);
  };

  return (
    <div ref={containerRef} className="date-range-picker">
      <div className="date-range-picker-row">
        <div
          className={`date-range-picker-trigger ${open ? "date-range-picker-trigger--open" : ""}`}
          onClick={() => setOpen((o) => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((o) => !o);
            }
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Select date range"
        >
          <div className="date-range-picker-field">
            <span className="date-range-picker-label">From</span>
            <span className="date-range-picker-value">
              <i
                className="fas fa-calendar-alt date-range-picker-icon"
                aria-hidden
              />
              {formatDisplayDate(dateFrom) || "Select date"}
            </span>
          </div>
          <span className="date-range-picker-separator" aria-hidden>
            →
          </span>
          <div className="date-range-picker-field">
            <span className="date-range-picker-label">To</span>
            <span className="date-range-picker-value">
              <i
                className="fas fa-calendar-alt date-range-picker-icon"
                aria-hidden
              />
              {formatDisplayDate(dateTo) || "Select date"}
            </span>
          </div>
        </div>
        <div ref={presetsRef} className="date-range-picker-presets-wrap">
          <button
            type="button"
            className="date-range-picker-presets-btn"
            onClick={(e) => {
              e.stopPropagation();
              setPresetsOpen((o) => !o);
            }}
            aria-label="Quick presets"
            aria-expanded={presetsOpen}
            aria-haspopup="listbox"
          >
            <i className="fas fa-clock" aria-hidden />
          </button>
          {presetsOpen && (
            <div className="date-range-picker-presets-dropdown">
              {PRESETS.map(({ label, months }) => (
                <button
                  key={label}
                  type="button"
                  className="date-range-picker-preset-item"
                  onClick={() => handlePresetClick(months)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {typeof document !== "undefined" &&
        createPortal(popoverContent, document.body)}
    </div>
  );
}
