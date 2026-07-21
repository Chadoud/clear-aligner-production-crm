/**
 * Collapsible filter row for Overview (mobile-first).
 * Desktop (≥769px): filters always visible; toggle hidden.
 */
export default function OverviewFiltersPanel({
  expanded,
  onToggle,
  activeFilterCount = 0,
  children,
}) {
  const countLabel =
    activeFilterCount > 0 ? ` (${activeFilterCount} active)` : "";

  return (
    <div className={`overview-filters-panel${expanded ? " is-open" : ""}`}>
      <button
        type="button"
        className="overview-filters-panel-toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls="overview-filters-panel-body"
      >
        <span className="overview-filters-panel-toggle-label">
          <i className="fas fa-sliders-h" aria-hidden />
          Filters{countLabel}
        </span>
        <i
          className={`fas fa-chevron-${expanded ? "up" : "down"} overview-filters-panel-chevron`}
          aria-hidden
        />
      </button>
      <div
        id="overview-filters-panel-body"
        className={`overview-filters-panel-body${expanded ? "" : " overview-filters-panel-body--collapsed"}`}
      >
        {children}
      </div>
    </div>
  );
}
