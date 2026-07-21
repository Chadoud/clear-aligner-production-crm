import { useEffect } from "react";

/**
 * Refreshes case sheet when the tab mounts. Use in tabs so they show fresh data
 * when the user lands on them.
 *
 * @param {() => void} refreshCaseSheet - From useCaseSheet
 * @param {number|string|null} caseId - patient?.case_id
 */
export function useRefreshCaseSheetOnMount(refreshCaseSheet, caseId) {
  useEffect(() => {
    if (caseId && refreshCaseSheet) {
      refreshCaseSheet();
    }
  }, [caseId, refreshCaseSheet]);
}
