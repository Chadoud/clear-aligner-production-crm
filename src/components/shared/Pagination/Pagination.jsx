import CustomSelect from "../CustomSelect/CustomSelect";
import "./Pagination.css";

/**
 * @param {Object} props
 * @param {number} props.page - current page (1-based)
 * @param {number} props.pageCount - total pages
 * @param {number} props.start - 0-based start index of current page
 * @param {number} props.end - 0-based end index (exclusive)
 * @param {number} props.total - total items
 * @param {(p: number) => void} props.onPageChange
 * @param {number} [props.pageSize]
 * @param {(n: number) => void} [props.onPageSizeChange]
 * @param {number[]} [props.pageSizeOptions=[5, 10, 25, 50, 100]]
 * @param {"full"|"compact"} [props.variant="full"] - full: First/Prev/1,2,3/Next/Last; compact: < 1 2 3 >
 * @param {string} [props.className]
 */
export default function Pagination({
  page,
  pageCount,
  start,
  end,
  total,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50, 100],
  variant = "full",
  className = "",
}) {
  const showFrom = total ? start + 1 : 0;

  return (
    <div className={`pagination-bar ${className}`.trim()}>
      {pageSize != null && onPageSizeChange && (
        <label className="pagination-show">
          show:
          <CustomSelect
            value={String(pageSize)}
            onChange={(v) => onPageSizeChange(Number(v))}
            className="pagination-select"
            aria-label="Items per page"
            options={pageSizeOptions.map((n) => ({
              value: String(n),
              label: String(n),
            }))}
          />
        </label>
      )}
      <span className="pagination-info">
        {variant === "full"
          ? `Showing ${showFrom} to ${end} of ${total} entries`
          : null}
      </span>
      <div
        className={`pagination-buttons${variant === "full" ? " pagination-buttons-full" : ""}`}
      >
        {variant === "full" && (
          <>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(1)}
              aria-label="First page"
            >
              First
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
            >
              Previous
            </button>
          </>
        )}
        {variant === "compact" && (
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            &lt;
          </button>
        )}
        {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
          const p =
            pageCount <= 5
              ? i + 1
              : Math.max(1, Math.min(page - 2, pageCount - 4)) + i;
          if (p > pageCount) return null;
          return (
            <button
              key={p}
              type="button"
              className={page === p ? "pagination-btn-active" : ""}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={page === p ? "page" : undefined}
            >
              {p}
            </button>
          );
        })}
        {variant === "compact" && (
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            &gt;
          </button>
        )}
        {variant === "full" && (
          <>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
            >
              Next
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => onPageChange(pageCount)}
              aria-label="Last page"
            >
              Last
            </button>
          </>
        )}
      </div>
    </div>
  );
}
