import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import {
  syncChatActionMenuLayout,
  getBubbleRowElement,
  estimateActionSheetHeight,
  buildAttachedActionSheetStyles,
  buildFooterActionSheetStyles,
  measureBubbleLayout,
} from "./chatActionMenuLayout";

const CLOSE_MS = 220;

/**
 * WhatsApp-style message menu: blurred backdrop + lifted bubble + anchored sheet.
 */
export default function ChatMessageActionSheet({
  open,
  actions,
  focusMessageKey = null,
  messagesScrollRef = null,
  tabChatRootRef = null,
  onClose,
}) {
  const [sheetStyle, setSheetStyle] = useState(null);
  const [sheetReady, setSheetReady] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [liftFrame, setLiftFrame] = useState(null);
  const [liftMarkup, setLiftMarkup] = useState(null);
  const [bubbleLayout, setBubbleLayout] = useState(null);
  const unlockScrollRef = useRef(null);
  const hiddenBubbleRef = useRef(null);
  const layoutGenRef = useRef(0);
  const sheetRef = useRef(null);
  const bubbleRowRef = useRef(null);

  const primaryActions = (actions ?? []).filter((a) => a.id !== "cancel");

  const clearLift = useCallback(() => {
    hiddenBubbleRef.current?.classList.remove("tab-chat-bubble--menu-hidden");
    hiddenBubbleRef.current = null;
    bubbleRowRef.current = null;
    setLiftFrame(null);
    setLiftMarkup(null);
    setBubbleLayout(null);
  }, []);

  const unlockScroll = useCallback(() => {
    unlockScrollRef.current?.();
    unlockScrollRef.current = null;
  }, []);

  const requestClose = useCallback(() => {
    if (isClosing || !open) return;
    setIsClosing(true);
    unlockScroll();
    window.setTimeout(() => {
      clearLift();
      onClose?.();
    }, CLOSE_MS);
  }, [isClosing, open, onClose, unlockScroll, clearLift]);

  const applyBubbleLift = useCallback((rowEl, layout) => {
    if (!(rowEl instanceof HTMLElement) || !layout) return;
    const markup = rowEl.outerHTML;
    rowEl.classList.add("tab-chat-bubble--menu-hidden");
    hiddenBubbleRef.current = rowEl;
    bubbleRowRef.current = rowEl;

    setLiftFrame({
      top: layout.frameTop,
      left: layout.frameLeft,
      width: layout.frameWidth,
      height: layout.frameHeight,
      bubbleTop: layout.bubbleTop,
      bubbleLeft: layout.bubbleLeft,
    });
    setLiftMarkup(markup);
    setBubbleLayout(layout);
  }, []);

  const updateAttachedSheetPosition = useCallback((layout, sheetHeight) => {
    if (!layout) return;
    setSheetStyle(
      buildAttachedActionSheetStyles({
        ...layout,
        sheetHeight,
      })
    );
  }, []);

  useEffect(() => {
    if (!open) {
      setSheetReady(false);
      setSheetStyle(null);
      setIsClosing(false);
      clearLift();
      unlockScroll();
      return undefined;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const gen = ++layoutGenRef.current;
    setIsClosing(false);
    clearLift();
    // Show menu immediately (footer fallback); refine to anchored lift when layout is ready.
    setSheetReady(true);
    setSheetStyle(buildFooterActionSheetStyles());

    void (async () => {
      try {
        const sheetHeight = estimateActionSheetHeight(
          primaryActions.length,
          false
        );
        const searchRoot = tabChatRootRef?.current ?? null;
        const initialRow = getBubbleRowElement(focusMessageKey, searchRoot);

        const result = await syncChatActionMenuLayout({
          messageKey: focusMessageKey,
          bubbleEl: initialRow,
          actionCount: primaryActions.length,
          sheetHeight,
          messagesScrollEl: messagesScrollRef?.current,
          tabChatRoot: searchRoot,
        });

        if (layoutGenRef.current !== gen) {
          result.unlockScroll?.();
          return;
        }

        const rowEl =
          result.bubbleEl ?? getBubbleRowElement(focusMessageKey, searchRoot);

        const layout =
          result.layout ??
          (rowEl
            ? measureBubbleLayout(rowEl, messagesScrollRef?.current, searchRoot)
            : null);

        if (rowEl && layout) {
          applyBubbleLift(rowEl, layout);
          updateAttachedSheetPosition(layout, sheetHeight);
        } else if (result.sheetStyle) {
          setSheetStyle(result.sheetStyle);
        }
        unlockScrollRef.current = result.unlockScroll;
      } catch (err) {
        console.warn("[chat-menu] layout failed — using footer menu", err);
        if (layoutGenRef.current === gen) {
          setSheetStyle(buildFooterActionSheetStyles());
        }
      }
    })();

    return () => {
      document.body.style.overflow = prevOverflow;
      unlockScroll();
      clearLift();
    };
  }, [
    open,
    focusMessageKey,
    primaryActions.length,
    messagesScrollRef,
    tabChatRootRef,
    unlockScroll,
    clearLift,
    applyBubbleLift,
    updateAttachedSheetPosition,
  ]);

  useLayoutEffect(() => {
    if (!open || !sheetReady || !bubbleLayout || !sheetRef.current) return;
    const actualHeight = sheetRef.current.getBoundingClientRect().height;
    if (actualHeight < 1) return;
    updateAttachedSheetPosition(bubbleLayout, actualHeight);
  }, [
    open,
    sheetReady,
    bubbleLayout,
    primaryActions.length,
    updateAttachedSheetPosition,
  ]);

  if (!open || !primaryActions.length) return null;

  const resolvedSheetStyle = sheetStyle ?? buildFooterActionSheetStyles();

  const sheetNode = (
    <div
      ref={sheetRef}
      className={`tab-chat-action-sheet tab-chat-action-sheet--anchored tab-chat-action-sheet--attached${isClosing ? " tab-chat-action-sheet-closing" : ""}`}
      style={resolvedSheetStyle}
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="tab-chat-action-sheet-group tab-chat-action-sheet-group--scroll">
        {primaryActions.map((action) => (
          <button
            key={action.id}
            type="button"
            role="menuitem"
            className={`tab-chat-action-sheet-btn ${action.destructive ? "tab-chat-action-sheet-btn--danger" : ""}`}
            onClick={() => {
              action.onClick?.();
              requestClose();
            }}
          >
            <span className="tab-chat-action-sheet-btn-label">
              {action.label}
            </span>
            {action.icon ? <i className={action.icon} aria-hidden /> : null}
          </button>
        ))}
      </div>
    </div>
  );

  return createPortal(
    <div
      className="tab-chat-action-sheet-root"
      role="presentation"
      data-focus-message={focusMessageKey ?? undefined}
    >
      <button
        type="button"
        className={`tab-chat-action-sheet-backdrop${isClosing ? " tab-chat-action-layer-closing" : ""}`}
        aria-label="Close menu"
        onClick={requestClose}
      />
      {sheetReady && liftFrame && liftMarkup ? (
        <div
          className="tab-chat-bubble-lift-frame"
          style={{
            top: `${liftFrame.top}px`,
            left: `${liftFrame.left}px`,
            width: `${liftFrame.width}px`,
            height: `${liftFrame.height}px`,
          }}
        >
          <div
            className="tab-chat-bubble-lift"
            style={{
              top: `${liftFrame.bubbleTop}px`,
              left: `${liftFrame.bubbleLeft}px`,
            }}
            aria-hidden
            dangerouslySetInnerHTML={{ __html: liftMarkup }}
          />
          {sheetNode}
        </div>
      ) : sheetReady ? (
        sheetNode
      ) : null}
    </div>,
    document.body
  );
}
