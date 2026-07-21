import { useRef, useEffect, forwardRef } from "react";

const MIN_HEIGHT = 40;
const MAX_HEIGHT = 200;

/**
 * Auto-expanding textarea for chat/discussion compose.
 * Grows with content up to MAX_HEIGHT.
 */
const ChatComposeInput = forwardRef(function ChatComposeInput(
  {
    value,
    onChange,
    onKeyDown,
    placeholder = "Type a message…",
    ariaLabel = "New message",
    disabled = false,
  },
  forwardedRef
) {
  const innerRef = useRef(null);
  const ref = forwardedRef ?? innerRef;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0";
    el.style.overflow = "hidden";
    const scrollH = el.scrollHeight;
    const h = Math.min(Math.max(scrollH, MIN_HEIGHT), MAX_HEIGHT);
    el.style.height = `${h}px`;
    el.style.overflow = h >= MAX_HEIGHT ? "auto" : "hidden";
  }, [value, ref]);

  return (
    <div className="tab-chat-input-wrap">
      <textarea
        ref={ref}
        className="tab-chat-input"
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
      />
    </div>
  );
});

export default ChatComposeInput;
