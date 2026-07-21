import { useState, useCallback } from "react";
import { flushSync } from "react-dom";
import PageLoading from "@/components/shared/PageLoading/PageLoading";

/**
 * flushSync + overlay for long async actions (e.g. invoice email PDF capture).
 * @returns {{ busy: boolean, runWithBusy: (fn: () => Promise<unknown>, message?: string) => Promise<unknown>, overlay: import("react").ReactNode }}
 */
export function useBusyOverlay() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const runWithBusy = useCallback(async (asyncFn, msg = "") => {
    flushSync(() => {
      setMessage(msg);
      setBusy(true);
    });
    try {
      return await asyncFn();
    } finally {
      setBusy(false);
    }
  }, []);

  const overlay = busy ? (
    <PageLoading variant="overlay" message={message} />
  ) : null;

  return { busy, runWithBusy, overlay };
}
