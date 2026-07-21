import { useCallback, useEffect, useMemo, useState } from "react";
import { getCaseChannelStats } from "@/services/discussionService";
import { DISCUSSION_STATS_REFRESH_EVENT } from "@/hooks/useDiscussionRealtimeToasts";

const EMPTY_STATS = {
  unreadGeneralCount: 0,
  unreadDoctorCount: 0,
  lastGeneralAt: null,
  lastDoctorAt: null,
  lastActivityAt: null,
};

/**
 * Per-case discussion unread counts (General + Doctor), synced with mobile read cursors.
 */
export function useCaseChannelStats(caseId) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const id = caseId != null ? String(caseId).trim() : "";
    if (!id) {
      setStats(EMPTY_STATS);
      return EMPTY_STATS;
    }
    setLoading(true);
    try {
      const row = await getCaseChannelStats(id);
      const next = {
        unreadGeneralCount: row.unreadGeneralCount,
        unreadDoctorCount: row.unreadDoctorCount,
        lastGeneralAt: row.lastGeneralAt,
        lastDoctorAt: row.lastDoctorAt,
        lastActivityAt: row.lastActivityAt,
      };
      setStats(next);
      return next;
    } catch {
      setStats(EMPTY_STATS);
      return EMPTY_STATS;
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = (event) => {
      const detailCaseId = Number(event?.detail?.caseId);
      const currentId = caseId != null ? Number(caseId) : NaN;
      if (!Number.isFinite(detailCaseId) || detailCaseId !== currentId) return;
      void refresh();
    };
    window.addEventListener(DISCUSSION_STATS_REFRESH_EVENT, onRefresh);
    return () =>
      window.removeEventListener(DISCUSSION_STATS_REFRESH_EVENT, onRefresh);
  }, [caseId, refresh]);

  const totalUnread = useMemo(
    () => stats.unreadGeneralCount + stats.unreadDoctorCount,
    [stats.unreadGeneralCount, stats.unreadDoctorCount]
  );

  return { stats, totalUnread, loading, refresh };
}
