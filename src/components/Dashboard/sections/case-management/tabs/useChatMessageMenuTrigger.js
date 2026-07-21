import { useCallback } from "react";

const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, [role='button'], .doc-preview-card";

/** Click / context-menu handler for discussion message bubbles (web CRM). */
export function useChatMessageMenuTrigger(openMenu) {
  const onBubbleClick = useCallback(
    (event, payload) => {
      if (event.target.closest(INTERACTIVE_SELECTOR)) return;
      openMenu(payload);
    },
    [openMenu]
  );

  const onBubbleContextMenu = useCallback(
    (event, payload) => {
      event.preventDefault();
      event.stopPropagation();
      openMenu(payload);
    },
    [openMenu]
  );

  return { onBubbleClick, onBubbleContextMenu };
}
