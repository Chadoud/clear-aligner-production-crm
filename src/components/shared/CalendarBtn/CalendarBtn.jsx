/**
 * CalendarBtn – icon button for opening date range selection.
 */

import "./CalendarBtn.css";

/**
 * @param {Object} props
 * @param {() => void} props.onClick
 * @param {boolean} [props.active] - whether date range mode is active
 * @param {string} [props['aria-label']] - e.g. "Select date range"
 * @param {string} [props.className]
 */
export default function CalendarBtn({
  onClick,
  active = false,
  "aria-label": ariaLabel = "Select date range",
  className = "",
}) {
  return (
    <button
      type="button"
      className={`calendar-btn ${active ? "calendar-btn--active" : ""} ${className}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      <i className="fas fa-calendar-alt" aria-hidden />
    </button>
  );
}
