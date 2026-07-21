/**
 * OverviewFiltersBar — single row of controls affecting every dashboard module
 * (cards, donut chart, payment table).
 *
 * Month | Doctor/Cabinet | Invoices | Status | Min CHF | Max CHF
 */
import MonthOrRangeFilter from "@/components/shared/MonthOrRangeFilter/MonthOrRangeFilter";
import CabinetMultiSelectDropdown from "./filters/CabinetMultiSelectDropdown";
import PaymentOverviewFiltersDropdown from "./filters/PaymentOverviewFiltersDropdown";
import CaseStatusFilterDropdown from "./filters/CaseStatusFilterDropdown";
import NumberInputWithArrows from "@/components/shared/NumberInputWithArrows/NumberInputWithArrows";

export default function DonutFiltersRow({
  scope,
  // Date
  selectedMonth,
  onMonthChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onToggleDateRange,
  monthOptions = [],
  // Cabinet (search built into dropdown)
  cabinetOptions = [],
  cabinetFilter,
  onCabinetFilterChange,
  // Payment status
  statusFilter,
  onStatusFilterChange,
  // Case status
  caseStatusFilter,
  onCaseStatusFilterChange,
  // Amount range
  amountMin,
  onAmountMinChange,
  amountMax,
  onAmountMaxChange,
}) {
  const showCabinet = scope === "company" && cabinetOptions.length > 0;

  return (
    <div className="overview-filters-row">
      <div className="overview-filters-row-item">
        <label htmlFor="overview-filter-month">Month</label>
        <MonthOrRangeFilter
          id="overview-filter-month"
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          dateFrom={dateFrom}
          onDateFromChange={onDateFromChange}
          dateTo={dateTo}
          onDateToChange={onDateToChange}
          monthOptions={monthOptions}
          onToggleDateRange={onToggleDateRange}
        />
      </div>

      {showCabinet && (
        <div className="overview-filters-row-item">
          <label htmlFor="overview-filter-cabinet">Doctor / Cabinet</label>
          <CabinetMultiSelectDropdown
            id="overview-filter-cabinet"
            cabinetOptions={cabinetOptions}
            selectedCabinets={cabinetFilter}
            onSelectionChange={onCabinetFilterChange}
          />
        </div>
      )}

      <div className="overview-filters-row-item">
        <label htmlFor="overview-filter-invoices">Invoices</label>
        <PaymentOverviewFiltersDropdown
          id="overview-filter-invoices"
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
        />
      </div>

      <div className="overview-filters-row-item">
        <label htmlFor="overview-filter-case-status">Status</label>
        <CaseStatusFilterDropdown
          id="overview-filter-case-status"
          filter={caseStatusFilter}
          onFilterChange={onCaseStatusFilterChange}
        />
      </div>

      <div className="overview-filters-row-item">
        <label htmlFor="overview-filter-min">Min CHF</label>
        <NumberInputWithArrows
          id="overview-filter-min"
          className="number-input-with-arrows--currency"
          value={amountMin ?? ""}
          onChange={onAmountMinChange}
          aria-label="Minimum invoice amount"
          placeholder="Min"
          min={0}
          max={999999.99}
          step={0.01}
        />
      </div>

      <div className="overview-filters-row-item">
        <label htmlFor="overview-filter-max">Max CHF</label>
        <NumberInputWithArrows
          id="overview-filter-max"
          className="number-input-with-arrows--currency"
          value={amountMax ?? ""}
          onChange={onAmountMaxChange}
          aria-label="Maximum invoice amount"
          placeholder="Max"
          min={0}
          max={999999.99}
          step={0.01}
        />
      </div>
    </div>
  );
}
