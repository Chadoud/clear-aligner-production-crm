import { useEffect, useState } from "react";
import { RECENT_CONSULTED_CHANGED_EVENT } from "../constants/recentConsultedPatients.js";

/**
 * Bumps when the recent-consulted list changes (sidebar re-sorts).
 * @returns {number}
 */
export function useRecentConsultedPatientsRefresh() {
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const onChange = () => setRefreshTick((t) => t + 1);
    window.addEventListener(RECENT_CONSULTED_CHANGED_EVENT, onChange);
    return () =>
      window.removeEventListener(RECENT_CONSULTED_CHANGED_EVENT, onChange);
  }, []);

  return refreshTick;
}
