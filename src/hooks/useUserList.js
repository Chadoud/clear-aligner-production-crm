import { useState, useEffect, useCallback } from "react";
import { fetchUsers } from "@/services/userService";
import { safeLogError } from "@/utils/safeLogError";

function isAbortError(err) {
  const name = err?.name ?? err?.details?.name;
  return name === "AbortError";
}

function userListErrorMessage(err) {
  if (isAbortError(err)) return null;
  const message = err?.userMessage ?? err?.message;
  if (message && !/^Request failed for \//.test(message)) return message;
  return "Could not load users. Check your connection and try again.";
}

/**
 * Fetches the user list from the live API with server-side pagination and search.
 *
 * @param {{ status?: number, pageSize?: number }} opts
 */
export function useUserList({ status = 1, pageSize = 10 } = {}) {
  const [allUsers, setAllUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [query, setQueryRaw] = useState("");
  const [sort, setSort] = useState({ sortBy: "id", sortOrder: "desc" });

  const setQuery = useCallback((q) => {
    setQueryRaw(q);
    setPage(1);
  }, []);

  const handleSort = useCallback((column) => {
    setSort((prev) => {
      if (prev.sortBy === column) {
        return {
          sortBy: column,
          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
        };
      }
      return { sortBy: column, sortOrder: "asc" };
    });
    setPage(1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);
    setAllUsers([]);

    fetchUsers(
      {
        status,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        q: query || undefined,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
      },
      { signal: controller.signal }
    )
      .then(({ users, total: t }) => {
        if (cancelled) return;
        setAllUsers(users);
        setTotal(t);
        setError(null);
      })
      .catch((err) => {
        if (cancelled || isAbortError(err)) return;
        safeLogError(err, "useUserList fetch error");
        setError(userListErrorMessage(err));
        setAllUsers([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [status, page, pageSize, query, sort.sortBy, sort.sortOrder]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    users: allUsers,
    total,
    loading,
    error,
    page,
    setPage,
    pageCount,
    query,
    setQuery,
    pageSize,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    handleSort,
  };
}
