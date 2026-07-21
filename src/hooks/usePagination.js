import { useState, useMemo } from "react";

/**
 * @param {Array} items - Full list of items
 * @param {number} [initialPageSize=10]
 * @returns {{ page, setPage, pageSize, setPageSize, pageCount, start, end, total, paginatedItems, resetPage }}
 */
export function usePagination(items = [], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paginatedItems = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize]
  );

  const setPageSizeAndReset = (size) => {
    setPageSize(size);
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    setPageSize: setPageSizeAndReset,
    pageCount,
    start,
    end,
    total,
    paginatedItems,
    resetPage: () => setPage(1),
  };
}
