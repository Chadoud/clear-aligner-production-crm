/**
 * Fetches delivery events (Open boxes) for the header.
 * @module hooks/useDeliveryEvents
 */

import { useState, useEffect, useCallback } from "react";
import { fetchDeliveryEvents } from "@/services/deliveryEventsService";
import { getPatientsRefreshEvent } from "@/services/caseService";

/**
 * Fetches delivery events (Open boxes). Backend scopes by cabinet for doctors.
 * @returns {{ events: Array, loading: boolean, refetch: () => Promise<void> }}
 */
export function useDeliveryEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchDeliveryEvents();
      setEvents(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const handleRefresh = () => refetch();
    window.addEventListener(getPatientsRefreshEvent(), handleRefresh);
    return () =>
      window.removeEventListener(getPatientsRefreshEvent(), handleRefresh);
  }, [refetch]);

  return { events, loading, refetch };
}
