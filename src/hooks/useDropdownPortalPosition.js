/**
 * Shared hook for dropdowns that render in a portal with position: fixed.
 * Keeps the menu anchored to the trigger on scroll and resize.
 *
 * @param {React.RefObject} triggerRef - Ref to the trigger element
 * @param {boolean} isOpen - Whether the dropdown is open
 * @param {{ minWidth?: number, maxWidth?: number, gap?: number, placeAbove?: boolean | 'auto', align?: 'start' | 'end', viewportPadding?: number }} [options]
 *   - placeAbove: true = always above, false = always below, 'auto' = above only when menu would overflow viewport
 *   - align: 'start' = left edge of menu aligns with trigger left; 'end' = right edges align
 * @returns {{ menuRect: { top?, bottom?, left, width, placement? }, menuRef: React.RefObject }}
 */
import { useState, useRef, useEffect, useLayoutEffect } from "react";

const DEFAULT_GAP = 6;
const DEFAULT_VIEWPORT_PADDING = 12;

export function useDropdownPortalPosition(triggerRef, isOpen, options = {}) {
  const {
    minWidth,
    maxWidth,
    gap = DEFAULT_GAP,
    placeAbove = false,
    align = "start",
    viewportPadding = DEFAULT_VIEWPORT_PADDING,
  } = options;
  const [menuRect, setMenuRect] = useState({
    top: 0,
    left: 0,
    width: 0,
    placement: "below",
  });
  const menuRef = useRef(null);

  const updatePosition = useRef((menuHeight = null) => {
    if (!triggerRef?.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let width = minWidth != null ? Math.max(rect.width, minWidth) : rect.width;
    if (maxWidth != null) width = Math.min(width, maxWidth);
    width = Math.min(width, window.innerWidth - 2 * viewportPadding);

    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - width - viewportPadding)
    );

    const overflowBelow =
      placeAbove === "auto" &&
      menuHeight != null &&
      menuHeight > 0 &&
      rect.bottom + gap + menuHeight > window.innerHeight;

    const shouldPlaceAbove = placeAbove === true || overflowBelow;

    setMenuRect((prev) => {
      const next = shouldPlaceAbove
        ? {
            bottom: window.innerHeight - rect.top + gap,
            left,
            width,
            placement: "above",
          }
        : {
            top: rect.bottom + gap,
            left,
            width,
            placement: "below",
          };
      const same =
        prev.placement === next.placement &&
        (next.top !== undefined
          ? prev.top === next.top
          : prev.bottom === next.bottom) &&
        prev.left === next.left &&
        prev.width === next.width;
      return same ? prev : next;
    });
  });

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef?.current) return;
    updatePosition.current();
  }, [isOpen, triggerRef]);

  useLayoutEffect(() => {
    if (!isOpen || placeAbove !== "auto" || !triggerRef?.current) return;
    const runPlacement = () => {
      if (!menuRef.current) return;
      const menuHeight = menuRef.current.getBoundingClientRect().height;
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.bottom + gap + menuHeight > window.innerHeight) {
        updatePosition.current(menuHeight);
      }
    };
    runPlacement();
    const raf = requestAnimationFrame(() => {
      runPlacement();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, placeAbove, gap, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    const onScrollOrResize = () => {
      requestAnimationFrame(() => {
        const h = menuRef.current?.getBoundingClientRect().height ?? null;
        updatePosition.current(h);
      });
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || placeAbove !== "auto" || !menuRef.current) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        const h = menuRef.current?.getBoundingClientRect().height ?? null;
        updatePosition.current(h);
      });
    });
    ro.observe(menuRef.current);
    return () => ro.disconnect();
  }, [isOpen, placeAbove, menuRect.width]);

  return { menuRect, menuRef };
}
