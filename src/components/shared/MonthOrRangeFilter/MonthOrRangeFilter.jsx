/**
 * MonthOrRangeFilter – reusable controlled date-filter combining:
 *   • CustomSelect    — single month picker ("all" or "YYYY-MM")
 *   • CalendarBtn     — toggles date-range mode
 *   • DateRangePicker — day-precision range shown when selectedMonth === "daterange"
 *
 * Fully stateless: all values come from the parent.
 *
 * @param {Object}   props
 * @param {string}   [props.id]               — id for the CustomSelect element
 * @param {string}   props.selectedMonth       — "all" | "YYYY-MM" | "daterange"
 * @param {Function} props.onMonthChange       — (v: string) => void
 * @param {string}   [props.dateFrom]          — "YYYY-MM-DD" (daterange mode only)
 * @param {Function} [props.onDateFromChange]  — (v: string) => void
 * @param {string}   [props.dateTo]            — "YYYY-MM-DD" (daterange mode only)
 * @param {Function} [props.onDateToChange]    — (v: string) => void
 * @param {string[]} [props.monthOptions]      — YYYY-MM values (no "all" — added automatically)
 * @param {Function} props.onToggleDateRange   — () => void — toggles daterange mode
 */

import CustomSelect from "@/components/shared/CustomSelect/CustomSelect";
import CalendarBtn from "@/components/shared/CalendarBtn/CalendarBtn";
import DateRangePicker from "@/components/shared/DateRangePicker/DateRangePicker";
import { formatBillingMonth } from "@/utils/dates/formatBillingMonth";
import "./MonthOrRangeFilter.css";

function buildOptions(monthOptions) {
  return [
    { value: "all", label: "All" },
    ...monthOptions.map((o) =>
      typeof o === "string" ? { value: o, label: formatBillingMonth(o) } : o
    ),
  ];
}

export default function MonthOrRangeFilter({
  id,
  selectedMonth = "all",
  onMonthChange,
  dateFrom = "",
  onDateFromChange,
  dateTo = "",
  onDateToChange,
  monthOptions = [],
  onToggleDateRange,
}) {
  const isDateRange = selectedMonth === "daterange";
  const selectValue = isDateRange ? "all" : selectedMonth;
  const options = buildOptions(monthOptions);

  const handleMonthChange = (v) => {
    // Switching to a specific month clears any date-range values.
    if (v !== "daterange") {
      onDateFromChange?.("");
      onDateToChange?.("");
    }
    onMonthChange?.(v);
  };

  return (
    <div className="month-or-range-filter">
      <div className="month-or-range-filter-controls">
        <CustomSelect
          id={id}
          value={selectValue}
          onChange={handleMonthChange}
          options={options}
          searchable={false}
        />
        <CalendarBtn
          onClick={onToggleDateRange}
          active={isDateRange}
          aria-label={
            isDateRange ? "Exit date range mode" : "Select date range"
          }
        />
      </div>

      {isDateRange && (
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
        />
      )}
    </div>
  );
}
