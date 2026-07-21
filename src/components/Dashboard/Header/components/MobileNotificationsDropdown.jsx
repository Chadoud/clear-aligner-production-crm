import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import {
  getBewareNotificationReason,
  getBewareTab,
  formatTimeAgo,
  formatDeliveryDays,
} from "../utils/formatters";
import {
  markCaseAsSeen,
  dispatchPatientsRefresh,
  dispatchPatientsRefreshSoft,
  clearBewareInCache,
} from "@/services/caseService";
import { useTranslation } from "react-i18next";
import { usePortalDropdown } from "@/hooks";
import NotificationDropdownPanel from "./NotificationDropdownPanel";

export default function MobileNotificationsDropdown({
  deliveryEvents,
  deliveryLoading,
  onSelectDeliveryEvent,
  bewarePatients,
  scope,
  onSelectPatient,
}) {
  const { t } = useTranslation();
  const totalCount = deliveryEvents.length + bewarePatients.length;
  const { open, setOpen, triggerRef, menuRef, menuRect } = usePortalDropdown({
    minWidth: 280,
    maxWidth: 320,
    align: "end",
    placeAbove: "auto",
    viewportPadding: 12,
  });

  const handleSelectPatient = async (p) => {
    const caseId = p.case_id;
    if (caseId != null) {
      clearBewareInCache(caseId);
      dispatchPatientsRefreshSoft();
      const ok = await markCaseAsSeen(caseId);
      if (ok) dispatchPatientsRefresh();
    }
    onSelectPatient(p, { tab: getBewareTab(p) });
    setOpen(false);
  };

  return (
    <>
      <div className="bell-wrapper" ref={triggerRef}>
        <button
          className={`header-icon${open ? " header-icon-active" : ""}`}
          aria-label={t("header.notificationsHubTriggerAria", {
            count: totalCount,
          })}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <i className="fas fa-bell" />
          {totalCount > 0 && (
            <span className="notification-badge notification-badge-alert">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </button>
      </div>

      <NotificationDropdownPanel
        open={open}
        menuRef={menuRef}
        menuRect={menuRect}
        ariaLabel={t("header.notificationsHubDialogAria")}
        panelClassName="bell-dropdown--hub"
      >
        <div className="notifications-hub-scroll">
          <section className="notifications-hub-section">
            <div className="bell-dropdown-header">
              <i className="fas fa-truck bell-dropdown-icon" />
              <span>{t("header.deliveryTitle")}</span>
              {deliveryEvents.length > 0 && (
                <span className="bell-dropdown-count">
                  {deliveryEvents.length}
                </span>
              )}
            </div>

            {deliveryLoading ? (
              <div className="bell-dropdown-empty">
                <LoadingDonut size="sm" message={t("header.deliveryLoading")} />
              </div>
            ) : deliveryEvents.length === 0 ? (
              <div className="bell-dropdown-empty notifications-hub-empty">
                <i className="fas fa-truck" />
                <span>{t("header.deliveryEmpty")}</span>
              </div>
            ) : (
              <ul className="bell-dropdown-list" role="list">
                {deliveryEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="bell-dropdown-item"
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="bell-dropdown-item-btn"
                      onClick={() => {
                        onSelectDeliveryEvent(ev);
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
          </section>

          <section className="notifications-hub-section">
            <div className="bell-dropdown-header">
              <i className="fas fa-exclamation-triangle bell-dropdown-icon" />
              <span>{t("header.bellNotifications")}</span>
              {bewarePatients.length > 0 && (
                <span className="bell-dropdown-count">
                  {bewarePatients.length}
                </span>
              )}
            </div>

            {bewarePatients.length === 0 ? (
              <div className="bell-dropdown-empty notifications-hub-empty">
                <i className="fas fa-check-circle" />
                <span>{t("header.bellAllClear")}</span>
              </div>
            ) : (
              <ul className="bell-dropdown-list" role="list">
                {bewarePatients.map((p) => (
                  <li
                    key={p.ref}
                    className="bell-dropdown-item"
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="bell-dropdown-item-btn"
                      onClick={() => handleSelectPatient(p)}
                    >
                      <span className="bell-alert-dot" aria-hidden />
                      <div className="bell-item-body">
                        <div className="bell-item-header-row">
                          <span className="bell-item-name">{p.name}</span>
                          <span className="bell-item-timestamp">
                            {formatTimeAgo(p.last_chat_at) ??
                              t("header.emDash")}
                          </span>
                        </div>
                        <span className="bell-item-reason">
                          {getBewareNotificationReason(scope, p)}
                        </span>
                        <div className="bell-item-footer-row">
                          <span className="bell-item-cabinet">
                            {p.cabinet || t("header.emDash")}
                          </span>
                          <span className="bell-item-ref">#{p.ref}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </NotificationDropdownPanel>
    </>
  );
}
