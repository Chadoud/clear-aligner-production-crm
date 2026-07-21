export default function SortHeader({
  column,
  label,
  sortBy,
  sortOrder,
  onSort,
}) {
  const isActive = sortBy === column;
  return (
    <th
      scope="col"
      className={
        column === "doctorName"
          ? "overview-payment-th-sort"
          : "overview-payment-th-num overview-payment-th-sort"
      }
    >
      <button
        type="button"
        className="overview-payment-sort-btn"
        onClick={() => onSort(column)}
        aria-sort={
          isActive
            ? sortOrder === "asc"
              ? "ascending"
              : "descending"
            : undefined
        }
      >
        {label}
        <span className="overview-payment-sort-icons" aria-hidden>
          <i
            className={
              "fas fa-chevron-up overview-payment-sort-icon " +
              (isActive && sortOrder === "asc"
                ? "overview-payment-sort-active"
                : "")
            }
          />
          <i
            className={
              "fas fa-chevron-down overview-payment-sort-icon " +
              (isActive && sortOrder === "desc"
                ? "overview-payment-sort-active"
                : "")
            }
          />
        </span>
      </button>
    </th>
  );
}
