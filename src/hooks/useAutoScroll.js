/**
 * Custom Hook: useAutoScroll
 *
 * Smoothly scrolls to the very bottom after preset/service changes,
 * retrying until the bottom is reached.
 */

import { useEffect, useRef } from "react";

const SCROLL_CONFIG = {
  PRESET_DELAY: 240,
  SERVICE_DELAY: 100,
  RETRY_DELAY: 220,
  MAX_RETRIES: 8,
  BOTTOM_EPSILON: 2,
};

const getScrollableAncestors = (element) => {
  const ancestors = [];
  let current = element?.parentElement;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight + 1;

    if (isScrollable) ancestors.push(current);
    current = current.parentElement;
  }

  return ancestors;
};

const getWindowMaxTop = () => {
  const doc = document.documentElement;
  const body = document.body;
  return Math.max(doc.scrollHeight, body.scrollHeight) - window.innerHeight;
};

const isElementAtBottom = (el) =>
  el.scrollTop + el.clientHeight >=
  el.scrollHeight - SCROLL_CONFIG.BOTTOM_EPSILON;

const isWindowAtBottom = () =>
  window.scrollY >= getWindowMaxTop() - SCROLL_CONFIG.BOTTOM_EPSILON;

export const useAutoScroll = (
  selectedServices,
  presetConfig,
  { formActionsRef }
) => {
  const previousLengthRef = useRef(0);
  const previousPresetRef = useRef("");

  useEffect(() => {
    const currentLen = selectedServices.length;
    const previousLen = previousLengthRef.current;
    const presetChanged =
      !!presetConfig && presetConfig !== previousPresetRef.current;
    const servicesAdded = currentLen > previousLen;
    const shouldScroll = currentLen > 0 && (presetChanged || servicesAdded);

    if (!shouldScroll) {
      previousLengthRef.current = currentLen;
      previousPresetRef.current = presetConfig;
      return;
    }

    const delay = presetChanged
      ? SCROLL_CONFIG.PRESET_DELAY
      : SCROLL_CONFIG.SERVICE_DELAY;
    let retryTimer = null;

    const startTimer = setTimeout(() => {
      const anchor = formActionsRef?.current;
      const scrollables = getScrollableAncestors(anchor);

      const smoothToBottom = () => {
        scrollables.forEach((el) => {
          el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        });

        const maxWindowTop = getWindowMaxTop();
        if (maxWindowTop > 0) {
          window.scrollTo({ top: maxWindowTop, behavior: "smooth" });
        }
      };

      let retries = 0;
      const runRetry = () => {
        retries += 1;
        smoothToBottom();

        const elementsAtBottom = scrollables.every(isElementAtBottom);
        const windowAtBottom = isWindowAtBottom();

        if (
          (elementsAtBottom && windowAtBottom) ||
          retries >= SCROLL_CONFIG.MAX_RETRIES
        ) {
          return;
        }

        retryTimer = setTimeout(runRetry, SCROLL_CONFIG.RETRY_DELAY);
      };

      // Initial smooth run + retries if layout keeps extending
      runRetry();
    }, delay);

    previousLengthRef.current = currentLen;
    previousPresetRef.current = presetConfig;

    return () => {
      clearTimeout(startTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [selectedServices.length, presetConfig, formActionsRef]);
};
