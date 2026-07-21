/**
 * Hook: useCabinetList
 *
 * Loads the cabinet/doctor list from the live API.
 * Shares an in-module cache — do not invalidate on every mount (that causes
 * refetch storms and empty dropdowns when the global rate limit returns 429).
 *
 * @module hooks/useCabinetList
 */

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  loadCabinetsFromApi,
  getCabinetsList,
  invalidateCabinetCache,
} from "../data/cabinets.js";
import { safeLogError } from "@/utils/safeLogError";

/**
 * Force a fresh cabinet fetch (e.g. after creating a cabinet).
 */
export function refreshCabinetList() {
  invalidateCabinetCache();
  return loadCabinetsFromApi();
}

/**
 * @returns {{ cabinets: Array, loading: boolean, error: string|null }}
 */
export function useCabinetList() {
  const { user, isDoctor } = useAuth();
  const [cabinets, setCabinets] = useState(() => getCabinetsList());
  const [loading, setLoading] = useState(() => getCabinetsList().length === 0);
  const [error, setError] = useState(null);
  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;
    const cached = getCabinetsList();
    if (cached.length > 0) {
      setCabinets(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    loadCabinetsFromApi()
      .then(() => {
        if (!cancelled) {
          setCabinets(getCabinetsList());
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          safeLogError(err, "useCabinetList");
          // Keep any previously loaded cabinets; only surface error if none.
          const existing = getCabinetsList();
          if (existing.length > 0) {
            setCabinets(existing);
            setError(null);
          } else {
            setError(err?.message ?? "Failed to load cabinets");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const visibleCabinets = useMemo(() => {
    if (!isDoctor || user?.cabinetId == null) return cabinets;
    return cabinets.filter((c) => c.id === user.cabinetId);
  }, [cabinets, isDoctor, user?.cabinetId]);

  return { cabinets: visibleCabinets, loading, error };
}
