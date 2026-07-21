/**
 * CalendarSinglePopover – single date selection, same design as Doctor Billing calendar.
 * One month grid, blue highlight for selected date, Clear/Today/Done.
 */

import { useState, useMemo } from "react";
import { ENGLISH_FULL_MONTH_NAMES as MONTH_NAMES } from "@/utils/dates/englishFullMonthNames";
import { buildCalendarMonthRows } from "@/utils/dates/calendarGrid.js";
import "./CalendarSinglePopover.css";
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * @param {Object} props
 * @param {string} props.value - YYYY-MM-DD
 * @param {(v: string) => void} props.onSelect
 * @param {() => void} props.onClose
 * @param {React.RefObject} props.anchorRef
 * @param {boolean} [props.allowFuture] - if true, future dates are selectable
 */
export default function CalendarSinglePopover({
  value,
  onSelect,
  onClose,
  anchorRef,
  allowFuture = false,
  defaultViewYmd,
}) {
  const today = toYMD(new Date());
  const valueDate = parseYMD(value);
  const defaultViewDate = parseYMD(defaultViewYmd);

  const [month, setMonth] = useState(() => {
    if (valueDate)
      return { year: valueDate.getFullYear(), month: valueDate.getMonth() };
    if (defaultViewDate)
      return {
        year: defaultViewDate.getFullYear(),
        month: defaultViewDate.getMonth(),
      };
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const grid = useMemo(
    () => buildCalendarMonthRows(month.year, month.month),
    [month.year, month.month]
  );

  const navMonth = (delta) => {
    const d = new Date(month.year, month.month + delta, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const isSelected = (ymd) => ymd === value;
  const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
  const isFuture = (ymd) => !allowFuture && ymd > today;

  const handleDateClick = (ymd) => {
    if (isFuture(ymd)) return;
    onSelect(ymd);
  };

  const handleClear = () => onSelect("");
  const handleToday = () => onSelect(today);
  const handleDone = () => onClose();

  const rect = anchorRef?.current?.getBoundingClientRect();
  const style = rect
    ? {
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        zIndex: 10000,
      }
    : {};

  return (
    <div
      className="calendar-single-popover"
      style={style}
      role="dialog"
      aria-label="Select date"
    >
      <div className="calendar-single-popover-header">
        <button
          type="button"
          className="calendar-single-popover-nav"
          onClick={() => navMonth(-1)}
          aria-label="Previous month"
        >
          <i className="fas fa-chevron-left" />
        </button>
        <span className="calendar-single-popover-month">
          {MONTH_NAMES[month.month]} {month.year}
        </span>
        <button
          type="button"
          className="calendar-single-popover-nav"
          onClick={() => navMonth(1)}
          aria-label="Next month"
        >
          <i className="fas fa-chevron-right" />
        </button>
      </div>

      <div className="calendar-single-popover-grid">
        <div className="calendar-single-days-row">
          {DAYS.map((d) => (
            <span key={d} className="calendar-single-day-header">
              {d}
            </span>
          ))}
        </div>
        {grid.map((row, ri) => (
          <div key={ri} className="calendar-single-days-row">
            {row.map(({ date, currentMonth }) => {
              const ymd = toYMD(date);
              const selected = isSelected(ymd);
              const weekend = isWeekend(date);
              const isToday = ymd === today;
              const future = isFuture(ymd);
              return (
                <button
                  key={ymd}
                  type="button"
                  className={`calendar-single-cell ${!currentMonth ? "other-month" : ""} ${selected ? "selected" : ""} ${weekend ? "weekend" : ""} ${isToday ? "today" : ""} ${future ? "disabled" : ""}`}
                  onClick={() => handleDateClick(ymd)}
                  disabled={future}
                  aria-label={`${date.toLocaleDateString()}${selected ? " (selected)" : ""}${future ? " (disabled)" : ""}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="calendar-single-popover-footer">
        <button
          type="button"
          className="calendar-single-popover-link"
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          type="button"
          className="calendar-single-popover-link"
          onClick={handleToday}
        >
          Today
        </button>
        <button
          type="button"
          className="calendar-single-popover-done"
          onClick={handleDone}
        >
          Done
        </button>
      </div>
    </div>
  );
}
