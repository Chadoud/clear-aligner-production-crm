import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import { formatDeliveryDays } from "../utils/formatters";
import { useTranslation } from "react-i18next";
import { usePortalDropdown } from "@/hooks";
import NotificationDropdownPanel from "./NotificationDropdownPanel";

export default function DeliveryDropdown({ events, loading, onSelectEvent }) {
  const { t } = useTranslation();
  const { open, setOpen, triggerRef, menuRef, menuRect } = usePortalDropdown({
    minWidth: 280,
    maxWidth: 320,
    align: "end",
    placeAbove: "auto",
    viewportPadding: 12,
  });

  return (
    <>
      <div className="bell-wrapper" ref={triggerRef}>
        <button
          className={`header-icon${open ? " header-icon-active" : ""}`}
          aria-label={t("header.deliveryTriggerAria", { count: events.length })}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <i className="fas fa-truck"></i>
          {events.length > 0 && (
            <span className="notification-badge">{events.length}</span>
          )}
        </button>
      </div>

      <NotificationDropdownPanel
        open={open}
        menuRef={menuRef}
        menuRect={menuRect}
        ariaLabel={t("header.deliveryDialogAria")}
      >
        <div className="bell-dropdown-header">
          <i className="fas fa-truck bell-dropdown-icon" />
          <span>{t("header.deliveryTitle")}</span>
          {events.length > 0 && (
            <span className="bell-dropdown-count">{events.length}</span>
          )}
        </div>

        {loading ? (
          <div className="bell-dropdown-empty">
            <LoadingDonut size="sm" message={t("header.deliveryLoading")} />
          </div>
        ) : events.length === 0 ? (
          <div className="bell-dropdown-empty">
            <i className="fas fa-truck" />
            <span>{t("header.deliveryEmpty")}</span>
          </div>
        ) : (
          <ul className="bell-dropdown-list" role="list">
            {events.map((ev) => (
              <li key={ev.id} className="bell-dropdown-item" role="listitem">
                <button
                  type="button"
                  className="bell-dropdown-item-btn"
                  onClick={() => {
                    onSelectEvent(ev);
                    setOpen(false);
                  }}
                >
                  <div className="bell-item-body">
                    <div className="bell-item-header-row">
                      <span className="bell-item-name">{ev.name}</span>
                      <span className="bell-item-timestamp">
                        {formatDeliveryDays(ev.date)}
                      </span>
                    </div>
                    <div className="bell-item-footer-row">
                      <span className="bell-item-cabinet">
                        {ev.cabinet || t("header.emDash")}
                      </span>
                      <span className="bell-item-ref">#{ev.case_id}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </NotificationDropdownPanel>
    </>
  );
}
