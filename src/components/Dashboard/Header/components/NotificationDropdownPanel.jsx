import { createPortal } from "react-dom";

export default function NotificationDropdownPanel({
  open,
  menuRef,
  menuRect,
  ariaLabel,
  panelClassName = "",
  children,
}) {
  if (!open || menuRect.width <= 0 || typeof document === "undefined") {
    return null;
  }

  const panelClass = ["bell-dropdown", "bell-dropdown--portal", panelClassName]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      ref={menuRef}
      className={panelClass}
      role="dialog"
      aria-label={ariaLabel}
      style={{
        position: "fixed",
        ...(menuRect.placement === "above"
          ? { bottom: menuRect.bottom }
          : { top: menuRect.top }),
        left: menuRect.left,
        width: menuRect.width,
        zIndex: 10002,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}
