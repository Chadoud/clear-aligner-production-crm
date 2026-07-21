/**
 * Loads users once for the header global search (client-side filter).
 * Module cache avoids refetch on every Header remount.
 */
import { useState, useEffect } from "react";
import { fetchUsers } from "@/services/userService";
import { safeLogError } from "@/utils/safeLogError";

const HEADER_SEARCH_USER_LIMIT = 500;
const CACHE_TTL_MS = 60_000;

let usersCache = null;
let usersCacheAt = 0;
let usersPromise = null;

async function loadHeaderUsers() {
  if (Array.isArray(usersCache) && Date.now() - usersCacheAt < CACHE_TTL_MS) {
    return usersCache;
  }
  if (usersPromise) return usersPromise;
  usersPromise = (async () => {
    try {
      const { users: rows } = await fetchUsers({
        status: 1,
        limit: HEADER_SEARCH_USER_LIMIT,
        offset: 0,
      });
      usersCache = rows ?? [];
      usersCacheAt = Date.now();
      return usersCache;
    } finally {
      usersPromise = null;
    }
  })();
  return usersPromise;
}

export function useHeaderSearchUsers() {
  const [users, setUsers] = useState(() => usersCache ?? []);
  const [loading, setLoading] = useState(() => usersCache == null);

  useEffect(() => {
    let cancelled = false;

    loadHeaderUsers()
      .then((rows) => {
        if (!cancelled) setUsers(rows ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          safeLogError(err, "useHeaderSearchUsers");
          if (!usersCache) setUsers([]);
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
