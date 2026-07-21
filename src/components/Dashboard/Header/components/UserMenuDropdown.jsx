import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { profileInitials } from "@/utils/profileImageUrl";

export default function UserMenuDropdown({
  open,
  onOpenChange,
  displayName,
  profileImageUrl,
  profileImageFallbackUrl,
  profileUrl,
  onProfileClick,
  onDisconnect,
}) {
  const { t } = useTranslation();
  const wrapperRef = useRef(null);
  const [activeUrl, setActiveUrl] = useState(profileImageUrl);
  const [triedFallback, setTriedFallback] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setActiveUrl(profileImageUrl);
    setTriedFallback(false);
    setImageError(false);
  }, [profileImageUrl, profileImageFallbackUrl]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, onOpenChange]);

  const showImage = activeUrl && !imageError;
  const initials = profileInitials(displayName);

  const handleImageError = () => {
    if (
      !triedFallback &&
      profileImageFallbackUrl &&
      activeUrl !== profileImageFallbackUrl
    ) {
      setActiveUrl(profileImageFallbackUrl);
      setTriedFallback(true);
      return;
    }
    setImageError(true);
  };

  return (
    <div ref={wrapperRef} className="user-menu-wrapper">
      <div
        className="user-menu"
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenChange(!open);
          }
        }}
      >
        <span className="user-menu-avatar" aria-hidden="true">
          {showImage ? (
            <img
              src={activeUrl}
              alt=""
              className="user-menu-avatar-img"
              onError={handleImageError}
            />
          ) : (
            <span className="user-menu-avatar-fallback">{initials}</span>
          )}
        </span>
        <span className="user-name">{displayName}</span>
        <i className="fas fa-chevron-down"></i>
      </div>
      {open && (
        <div className="user-menu-dropdown" role="menu">
          <button
            type="button"
            className="user-menu-dropdown-item"
            onClick={() => {
              onOpenChange(false);
              onProfileClick(profileUrl);
            }}
          >
            <i className="fas fa-user"></i>
            {t("userMenu.seeProfile")}
          </button>
          <button
            type="button"
            className="user-menu-dropdown-item user-menu-dropdown-item-disconnect"
            onClick={onDisconnect}
          >
            <i className="fas fa-sign-out-alt"></i>
            {t("userMenu.disconnect")}
          </button>
        </div>
      )}
    </div>
  );
}
