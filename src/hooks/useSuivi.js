/**
 * Hook: fetch and mutate follow-up (tbl_suivi) for a case.
 * @module hooks/useSuivi
 */

import { useState, useEffect, useCallback } from "react";
import { fetchSuivi, addSuivi, deleteSuivi } from "../services/suiviService";

/**
 * @param {string|number|null} caseId - Patient case_id
 * @returns {{ suivi: Array, loading: boolean, error: string|null, addEntry: (entry) => Promise<boolean>, removeEntry: (suiviId) => Promise<boolean>, refetch: () => Promise<void> }}
 */
export function useSuivi(caseId) {
  const [suivi, setSuivi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (caseId == null || String(caseId).trim() === "") {
      setSuivi([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSuivi(caseId);
      setSuivi(list);
    } catch (err) {
      setError(err?.message ?? "Failed to load follow-up");
      setSuivi([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addEntry = useCallback(
    async (entry) => {
      if (caseId == null) return false;
      const id = await addSuivi(caseId, entry);
      if (id != null) {
        await refetch();
        return true;
      }
      return false;
    },
    [caseId, refetch]
  );

  const removeEntry = useCallback(
    async (suiviId) => {
      if (caseId == null) return false;
      const ok = await deleteSuivi(caseId, suiviId);
      if (ok) await refetch();
      return ok;
    },
    [caseId, refetch]
  );

  return { suivi, loading, error, addEntry, removeEntry, refetch };
}
