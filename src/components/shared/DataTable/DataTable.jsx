import "./DataTable.css";

/**
 * Generic data table with configurable columns.
 * @param {Object} props
 * @param {Array<{ key: string, label: string, sortable?: boolean }>} props.columns
 * @param {Array<Object>} props.rows - array of row objects
 * @param {string} props.rowKey - key in row object for React key
 * @param {(row: Object) => React.ReactNode} [props.renderCell] - (row, columnKey) => content
 * @param {string} [props.sortBy] - active sort column key
 * @param {"asc"|"desc"} [props.sortOrder]
 * @param {(columnKey: string) => void} [props.onSort]
 * @param {string} [props.className]
 * @param {string} [props.tableClassName]
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  renderCell,
  sortBy,
  sortOrder,
  onSort,
  className = "",
  tableClassName = "",
}) {
  const resolveRowKey = (row, index) => {
    const key = row?.[rowKey] ?? row?.id ?? row?.slug;
    if (key != null) return String(key);
    if (import.meta.env.DEV) {
      console.warn(
        "DataTable row is missing a stable key. Provide rowKey or row.id/row.slug.",
        row
      );
    }
    return `row-${index}`;
  };

  const renderHeaderCell = (col) => {
    if (!col.sortable || !onSort) {
      return <th key={col.key}>{col.label}</th>;
    }

    const isActive = sortBy === col.key;
    return (
      <th key={col.key} className="data-table-th-sort">
        <button
          type="button"
          className="data-table-sort-btn"
          onClick={() => onSort(col.key)}
          aria-sort={
            isActive
              ? sortOrder === "asc"
                ? "ascending"
                : "descending"
              : "none"
          }
        >
          {col.label}
          <span className="data-table-sort-icons" aria-hidden>
            <i
              className={
                "fas fa-chevron-up data-table-sort-icon " +
                (isActive && sortOrder === "asc"
                  ? "data-table-sort-active"
                  : "")
              }
            />
            <i
              className={
                "fas fa-chevron-down data-table-sort-icon " +
                (isActive && sortOrder === "desc"
                  ? "data-table-sort-active"
                  : "")
              }
            />
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className={`data-table-wrap ${className}`}>
      <table className={`data-table ${tableClassName}`}>
        <thead>
          <tr>{columns.map(renderHeaderCell)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={resolveRowKey(row, index)}>
              {columns.map((col) => (
                <td key={col.key}>
                  {renderCell ? renderCell(row, col.key) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
