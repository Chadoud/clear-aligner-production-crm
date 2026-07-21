import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { usePortalDropdown } from "@/hooks";

const LOCALES = [
  { code: "en", short: "ENG", labelKey: "header.langEnglish" },
  { code: "fr", short: "FR", labelKey: "header.langFrench" },
];

export default function LanguageDropdown({ className = "" }) {
  const { t, i18n } = useTranslation();
  const { open, setOpen, triggerRef, menuRef, menuRect } = usePortalDropdown({
    minWidth: 140,
    gap: 6,
    placeAbove: "auto",
  });

  const activeLng = i18n.language?.startsWith("fr") ? "fr" : "en";
  const activeLocale =
    LOCALES.find((locale) => locale.code === activeLng) ?? LOCALES[0];

  const handleSelect = (code) => {
    if (code !== "en" && code !== "fr") return;
    void i18n.changeLanguage(code);
    setOpen(false);
  };

  const panel =
    open && menuRect.width > 0 && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="language-dropdown-menu"
            role="menu"
            aria-label={t("header.langSwitcher")}
            style={{
              position: "fixed",
              ...(menuRect.placement === "above"
                ? { bottom: menuRect.bottom }
                : { top: menuRect.top }),
              left: menuRect.left,
              width: menuRect.width,
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {LOCALES.map((locale) => (
              <button
                key={locale.code}
                type="button"
                role="menuitemradio"
                aria-checked={activeLng === locale.code}
                className={`language-dropdown-item${
                  activeLng === locale.code
                    ? " language-dropdown-item-active"
                    : ""
                }`}
                onClick={() => handleSelect(locale.code)}
              >
                <span className="language-dropdown-item-short">
                  {locale.short}
                </span>
                <span className="language-dropdown-item-label">
                  {t(locale.labelKey)}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={`language-dropdown-wrapper${className ? ` ${className}` : ""}`}
        ref={triggerRef}
      >
        <button
          type="button"
          className={`language-dropdown-trigger${open ? " language-dropdown-trigger-open" : ""}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("header.langSwitcher")}
          onClick={() => setOpen(!open)}
        >
          <span>{activeLocale.short}</span>
          <i className="fas fa-chevron-down" aria-hidden />
        </button>
      </div>
      {panel}
    </>
  );
}
