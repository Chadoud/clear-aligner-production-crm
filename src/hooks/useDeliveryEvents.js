/**
 * Fetches delivery events (Open boxes) for the header.
 * Module cache + in-flight coalesce avoids Header remount storms.
 * @module hooks/useDeliveryEvents
 */

import { useState, useEffect, useCallback } from "react";
import { fetchDeliveryEvents } from "@/services/deliveryEventsService";
import { getPatientsRefreshEvent } from "@/services/caseService";

const CACHE_TTL_MS = 60_000;
let eventsCache = null;
let eventsCacheAt = 0;
let eventsPromise = null;

async function loadDeliveryEvents({ force = false } = {}) {
  if (
    !force &&
    Array.isArray(eventsCache) &&
    Date.now() - eventsCacheAt < CACHE_TTL_MS
  ) {
    return eventsCache;
  }
  if (eventsPromise) return eventsPromise;
  eventsPromise = (async () => {
    try {
      const list = await fetchDeliveryEvents();
      eventsCache = Array.isArray(list) ? list : [];
      eventsCacheAt = Date.now();
      return eventsCache;
    } finally {
      eventsPromise = null;
    }
  })();
  return eventsPromise;
}

/**
 * Fetches delivery events (Open boxes). Backend scopes by cabinet for doctors.
 * @returns {{ events: Array, loading: boolean, refetch: () => Promise<void> }}
 */
export function useDeliveryEvents() {
  const [events, setEvents] = useState(() => eventsCache ?? []);
  const [loading, setLoading] = useState(() => eventsCache == null);

  const refetch = useCallback(async (force = true) => {
    setLoading(true);
    try {
      const list = await loadDeliveryEvents({ force });
      setEvents(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadDeliveryEvents({ force: false })
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      void refetch(true);
    };
    window.addEventListener(getPatientsRefreshEvent(), handleRefresh);
    return () =>
      window.removeEventListener(getPatientsRefreshEvent(), handleRefresh);
  }, [refetch]);

  return { events, loading, refetch: () => refetch(true) };
}
