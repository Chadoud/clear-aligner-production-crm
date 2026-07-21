/**
 * Fetch case documents (photographies, radiographies, etc.) from the API.
 *
 * @param {string|number|null|undefined} caseId - Case ID (tbl_case.case_id)
 * @returns {{ docs: Array, loading: boolean, refreshDocs: () => Promise<void> }}
 */
import { useState, useEffect, useCallback } from "react";
import { getCaseDocs } from "../services/caseDocsService.js";

export function useCaseDocs(caseId) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    if (caseId == null || caseId === "") {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getCaseDocs(caseId);
      setDocs(Array.isArray(list) ? list : []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  return { docs, loading, refreshDocs: fetchDocs };
}
