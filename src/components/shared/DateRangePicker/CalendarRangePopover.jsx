/**
 * CalendarRangePopover – custom calendar for date range selection.
 * Two months side by side, blue highlight for selected range.
 * Aligned with website style (primary-blue, rounded corners).
 */

import { useState, useMemo } from "react";
import { ENGLISH_FULL_MONTH_NAMES as MONTH_NAMES } from "@/utils/dates/englishFullMonthNames";
import { buildCalendarMonthRows } from "@/utils/dates/calendarGrid.js";
import "./CalendarRangePopover.css";
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
 * @param {string} props.dateFrom - YYYY-MM-DD
 * @param {string} props.dateTo - YYYY-MM-DD
 * @param {(from: string, to: string) => void} props.onSelect
 * @param {() => void} props.onClose
 * @param {React.RefObject} props.anchorRef
 */
export default function CalendarRangePopover({
  dateFrom,
  dateTo,
  onSelect,
  onClose,
  anchorRef,
}) {
  const today = toYMD(new Date());
  const fromDate = parseYMD(dateFrom);
  const toDate = parseYMD(dateTo);

  const [leftMonth, setLeftMonth] = useState(() => {
    if (fromDate)
      return { year: fromDate.getFullYear(), month: fromDate.getMonth() };
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [rightMonth, setRightMonth] = useState(() => {
    if (toDate) return { year: toDate.getFullYear(), month: toDate.getMonth() };
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selecting, setSelecting] = useState(null);

  const leftGrid = useMemo(
    () => buildCalendarMonthRows(leftMonth.year, leftMonth.month),
    [leftMonth.year, leftMonth.month]
  );
  const rightGrid = useMemo(
    () => buildCalendarMonthRows(rightMonth.year, rightMonth.month),
    [rightMonth.year, rightMonth.month]
  );

  const navMonth = (delta) => {
    const d = new Date(leftMonth.year, leftMonth.month + delta, 1);
    const newLeft = { year: d.getFullYear(), month: d.getMonth() };
    const d2 = new Date(newLeft.year, newLeft.month + 1, 1);
    const newRight = { year: d2.getFullYear(), month: d2.getMonth() };
    setLeftMonth(newLeft);
    setRightMonth(newRight);
  };

  const isInRange = (ymd) => {
    if (!dateFrom || !dateTo) return false;
    return ymd >= dateFrom && ymd <= dateTo;
  };
  const isStart = (ymd) => ymd === dateFrom;
  const isEnd = (ymd) => ymd === dateTo;
  const isWeekend = (d) => {
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const isFuture = (ymd) => ymd > today;

  const handleDateClick = (ymd) => {
    if (isFuture(ymd)) return;
    if (!selecting) {
      onSelect(ymd, "");
      setSelecting("to");
      return;
    }
    if (selecting === "to") {
      const from = dateFrom || ymd;
      const to = ymd;
      if (to < from) {
        onSelect(to, from);
      } else {
        onSelect(from, to);
      }
      setSelecting(null);
    }
  };

  const handleClear = () => {
    onSelect("", "");
    setSelecting(null);
  };

  const handleToday = () => {
    onSelect(today, today);
    setSelecting(null);
  };

  const handleDone = () => {
    onClose();
  };

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
      className="calendar-range-popover"
      style={style}
      role="dialog"
      aria-label="Select date range"
    >
      <div className="calendar-range-popover-header">
        <button
          type="button"
          className="calendar-range-popover-nav"
          onClick={() => navMonth(-1)}
          aria-label="Previous months"
        >
          <i className="fas fa-chevron-left" />
        </button>
        <div className="calendar-range-popover-months">
          <span>
            {MONTH_NAMES[leftMonth.month]} {leftMonth.year}
          </span>
          <span>
            {MONTH_NAMES[rightMonth.month]} {rightMonth.year}
          </span>
        </div>
        <button
          type="button"
          className="calendar-range-popover-nav"
          onClick={() => navMonth(1)}
          aria-label="Next months"
        >
          <i className="fas fa-chevron-right" />
        </button>
      </div>

      <div className="calendar-range-popover-grids">
        {[leftGrid, rightGrid].map((grid, idx) => (
          <div key={idx} className="calendar-range-month">
            <div className="calendar-range-days-row">
              {DAYS.map((d) => (
                <span key={d} className="calendar-range-day-header">
                  {d}
                </span>
              ))}
            </div>
            {grid.map((row, ri) => (
              <div key={ri} className="calendar-range-days-row">
                {row.map(({ date, currentMonth }) => {
                  const ymd = toYMD(date);
                  const inRange = isInRange(ymd);
                  const start = isStart(ymd);
                  const end = isEnd(ymd);
                  const weekend = isWeekend(date);
                  const isToday = ymd === today;
                  const future = isFuture(ymd);
                  return (
                    <button
                      key={ymd}
                      type="button"
                      className={`calendar-range-cell ${!currentMonth ? "other-month" : ""} ${inRange ? "in-range" : ""} ${start ? "start" : ""} ${end ? "end" : ""} ${weekend ? "weekend" : ""} ${isToday ? "today" : ""} ${future ? "disabled" : ""}`}
                      onClick={() => handleDateClick(ymd)}
                      disabled={future}
                      aria-label={`${date.toLocaleDateString()}${start ? " (start)" : ""}${end ? " (end)" : ""}${future ? " (disabled)" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="calendar-range-popover-footer">
        <button
          type="button"
          className="calendar-range-popover-link"
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          type="button"
          className="calendar-range-popover-link"
          onClick={handleToday}
        >
          Today
        </button>
        <button
          type="button"
          className="calendar-range-popover-done"
          onClick={handleDone}
        >
          Done
        </button>
      </div>
    </div>
  );
}
