export const ACTION_SHEET_ROW_PX = 50;
export const ACTION_SHEET_PAD_PX = 4;
export const ACTION_SHEET_GAP_PX = 10;
export const ACTION_MENU_SCROLL_MS = 280;

export function estimateActionSheetHeight(
  actionCount,
  includeCancelGroup = false
) {
  const rowPx = 48;
  const rows = Math.max(1, actionCount || 1);
  const primary = rows * rowPx + ACTION_SHEET_PAD_PX;
  const cancelBlock = includeCancelGroup ? rowPx + 8 : 0;
  return primary + cancelBlock;
}

export function getViewportBottomLimit(tabChatRoot) {
  if (typeof window === "undefined") return 640;
  let footerH = 0;
  if (tabChatRoot instanceof HTMLElement) {
    const compose = tabChatRoot.querySelector(".tab-chat-compose");
    const replyBar = tabChatRoot.querySelector(".tab-chat-reply-bar");
    const attached = tabChatRoot.querySelector(".tab-chat-attached-files");
    footerH =
      (compose?.getBoundingClientRect().height ?? 0) +
      (replyBar?.getBoundingClientRect().height ?? 0) +
      (attached?.getBoundingClientRect().height ?? 0);
  }
  return window.innerHeight - footerH - 8;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export async function smoothScrollElementTo(scrollEl, top, durationMs) {
  const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
  const next = Math.max(0, Math.min(maxScroll, top));
  if (Math.abs(next - scrollEl.scrollTop) < 2) return;

  scrollEl.scrollTo({
    top: next,
    behavior: durationMs > 0 ? "smooth" : "auto",
  });
  if (durationMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, durationMs + 40));
  }
}

export async function scrollBubbleForActionSheet(
  scrollEl,
  bubbleEl,
  sheetHeight,
  viewportBottom
) {
  const topPad = 8;
  const gap = ACTION_SHEET_GAP_PX;
  const scrollRect = scrollEl.getBoundingClientRect();
  const scrollTo = (top) =>
    smoothScrollElementTo(scrollEl, top, ACTION_MENU_SCROLL_MS);

  const anchorEl =
    bubbleEl instanceof HTMLElement
      ? (bubbleEl.querySelector(".tab-chat-bubble-card") ?? bubbleEl)
      : bubbleEl;
  let rect = anchorEl.getBoundingClientRect();

  const fitsBelow = rect.bottom + gap + sheetHeight <= viewportBottom;
  const fitsAbove = rect.top - gap - sheetHeight >= topPad;

  if (!fitsBelow && !fitsAbove) {
    if (rect.bottom + gap + sheetHeight > viewportBottom) {
      await scrollTo(
        scrollEl.scrollTop +
          (rect.bottom + gap + sheetHeight - viewportBottom) +
          8
      );
      rect = anchorEl.getBoundingClientRect();
    }
    if (rect.top < scrollRect.top + topPad) {
      await scrollTo(scrollEl.scrollTop - (scrollRect.top + topPad - rect.top));
    }
    return;
  }

  if (!fitsBelow && fitsAbove) {
    if (rect.top < scrollRect.top + topPad) {
      await scrollTo(scrollEl.scrollTop - (scrollRect.top + topPad - rect.top));
    }
    return;
  }

  if (rect.top < scrollRect.top + topPad) {
    await scrollTo(scrollEl.scrollTop - (scrollRect.top + topPad - rect.top));
  }
}

export function buildFooterActionSheetStyles() {
  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const width = Math.min(320, Math.max(220, vw - 28));
  return {
    position: "fixed",
    left: "50%",
    bottom: "12px",
    top: "auto",
    transform: "translateX(-50%)",
    width: `${width}px`,
    zIndex: "10053",
  };
}

/** Position the sheet inside the lift frame, glued to the bubble card. */
export function buildAttachedActionSheetStyles({
  bubbleTop,
  bubbleLeft,
  bubbleWidth,
  bubbleHeight,
  isOwn,
  sheetHeight,
  frameTop,
  viewportBottom,
}) {
  const sheetW = Math.min(320, Math.max(220, Math.round(bubbleWidth)));
  const gap = ACTION_SHEET_GAP_PX;
  const minTop = 8;

  let top = bubbleTop + bubbleHeight + gap;
  const absoluteBottom = frameTop + top + sheetHeight;

  if (absoluteBottom > viewportBottom) {
    const aboveTop = bubbleTop - sheetHeight - gap;
    if (frameTop + aboveTop >= minTop) {
      top = aboveTop;
    }
  }

  const left = isOwn ? bubbleLeft + bubbleWidth - sheetW : bubbleLeft;

  return {
    position: "absolute",
    top: `${Math.round(top)}px`,
    left: `${Math.round(Math.max(0, left))}px`,
    width: `${sheetW}px`,
    zIndex: "10053",
  };
}

export function measureBubbleLayout(bubbleEl, messagesScrollEl, tabChatRoot) {
  if (!(bubbleEl instanceof HTMLElement)) return null;

  const anchorEl = bubbleEl.querySelector(".tab-chat-bubble-card") ?? bubbleEl;
  const frameRect =
    messagesScrollEl instanceof HTMLElement
      ? messagesScrollEl.getBoundingClientRect()
      : anchorEl.getBoundingClientRect();
  const cardRect = anchorEl.getBoundingClientRect();

  return {
    frameTop: frameRect.top,
    frameLeft: frameRect.left,
    frameWidth: frameRect.width,
    frameHeight: frameRect.height,
    bubbleTop: cardRect.top - frameRect.top,
    bubbleLeft: cardRect.left - frameRect.left,
    bubbleWidth: cardRect.width,
    bubbleHeight: cardRect.height,
    isOwn: bubbleEl.classList.contains("tab-chat-bubble--own"),
    viewportBottom: getViewportBottomLimit(tabChatRoot),
  };
}

export function buildAnchoredActionSheetStyles(
  bubbleEl,
  sheetHeight,
  viewportBottom
) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const pad = 14;
  const minTop = 8;
  const anchorEl =
    bubbleEl instanceof HTMLElement
      ? (bubbleEl.querySelector(".tab-chat-bubble-card") ?? bubbleEl)
      : bubbleEl;
  const br = anchorEl.getBoundingClientRect();
  const sheetW = Math.min(320, Math.max(220, Math.round(br.width)));

  let top = Math.round(br.bottom + ACTION_SHEET_GAP_PX);
  if (top + sheetHeight > viewportBottom) {
    const above = Math.round(br.top - sheetHeight - ACTION_SHEET_GAP_PX);
    if (above >= minTop) {
      top = above;
    } else {
      top = Math.max(minTop, viewportBottom - sheetHeight);
    }
  }

  const isOwn =
    bubbleEl instanceof HTMLElement &&
    bubbleEl.classList.contains("tab-chat-bubble--own");

  let left = isOwn ? Math.round(br.right - sheetW) : Math.round(br.left);
  left = Math.max(pad, Math.min(left, vw - sheetW - pad));

  return {
    position: "fixed",
    top: `${top}px`,
    left: `${left}px`,
    bottom: "auto",
    right: "auto",
    transform: "none",
    width: `${sheetW}px`,
    zIndex: "10053",
  };
}

function queryScope(root) {
  return root instanceof HTMLElement ? root : document;
}

export function getBubbleElement(messageKey, root = document) {
  if (!messageKey || typeof document === "undefined") return null;
  const scope = queryScope(root);
  const safeKey =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(String(messageKey))
      : String(messageKey).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return scope.querySelector(`[data-message-key="${safeKey}"]`);
}

/** Full bubble row (`li`) for lift clone + scroll anchoring. */
export function getBubbleRowElement(messageKey, root = document) {
  const hit = getBubbleElement(messageKey, root);
  if (!hit) return null;
  return hit.closest(".tab-chat-bubble") ?? hit;
}

export function lockScrollElement(scrollEl) {
  if (!(scrollEl instanceof HTMLElement)) return () => {};
  const prevOverflow = scrollEl.style.overflow;
  const prevTouchAction = scrollEl.style.touchAction;
  scrollEl.style.overflow = "hidden";
  scrollEl.style.touchAction = "none";
  return () => {
    scrollEl.style.overflow = prevOverflow;
    scrollEl.style.touchAction = prevTouchAction;
  };
}

export async function syncChatActionMenuLayout({
  messageKey,
  bubbleEl: bubbleElOverride = null,
  actionCount,
  sheetHeight: sheetHeightOverride,
  messagesScrollEl,
  tabChatRoot,
}) {
  await nextFrame();
  await nextFrame();

  const bubbleEl =
    bubbleElOverride ??
    getBubbleRowElement(messageKey, tabChatRoot) ??
    getBubbleElement(messageKey, tabChatRoot);
  const viewportBottom = getViewportBottomLimit(tabChatRoot);
  const sheetHeight =
    sheetHeightOverride ?? estimateActionSheetHeight(actionCount, true);

  if (!bubbleEl) {
    return {
      sheetStyle: buildFooterActionSheetStyles(),
      unlockScroll: () => {},
    };
  }

  let unlockScroll = () => {};
  if (messagesScrollEl instanceof HTMLElement) {
    await scrollBubbleForActionSheet(
      messagesScrollEl,
      bubbleEl,
      sheetHeight,
      viewportBottom
    );
    unlockScroll = lockScrollElement(messagesScrollEl);
  }

  await nextFrame();
  const layout = measureBubbleLayout(bubbleEl, messagesScrollEl, tabChatRoot);
  const sheetStyle =
    layout != null
      ? buildAttachedActionSheetStyles({
          ...layout,
          sheetHeight,
        })
      : buildAnchoredActionSheetStyles(bubbleEl, sheetHeight, viewportBottom);

  return { sheetStyle, unlockScroll, bubbleEl, layout };
}
