import { useEffect, useRef, useState } from "react";
import { useDropdownPortalPosition } from "./useDropdownPortalPosition";

export function usePortalDropdown(positionOptions = {}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const { menuRect, menuRef } = useDropdownPortalPosition(
    triggerRef,
    open,
    positionOptions
  );

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (
        trigger &&
        menu &&
        !trigger.contains(e.target) &&
        !menu.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onEscape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, menuRef]);

  return { open, setOpen, triggerRef, menuRef, menuRect };
}
