/**
 * Loads users once for the header global search (client-side filter).
 */
import { useState, useEffect } from "react";
import { fetchUsers } from "@/services/userService";
import { safeLogError } from "@/utils/safeLogError";

const HEADER_SEARCH_USER_LIMIT = 500;

export function useHeaderSearchUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchUsers({ status: 1, limit: HEADER_SEARCH_USER_LIMIT, offset: 0 })
      .then(({ users: rows }) => {
        if (!cancelled) setUsers(rows ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          safeLogError(err, "useHeaderSearchUsers");
          setUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { users, loading };
}
