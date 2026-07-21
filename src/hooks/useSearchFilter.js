import { useState, useMemo } from "react";

/**
 * @param {Array} items
 * @param {(item: T, queryLower: string) => boolean} filterFn - return true if item matches query (query is already trimmed and lowercased)
 * @param {string} [initialQuery=""]
 * @returns {{ query, setQuery, filteredItems, onQueryChange }}
 */
export function useSearchFilter(items = [], filterFn, initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((item) => filterFn(item, q));
  }, [items, query, filterFn]);

  const onQueryChange = (value) => setQuery(value);

  return { query, setQuery, filteredItems, onQueryChange };
}
