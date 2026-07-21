import {
  getBewareNotificationReason,
  getBewareTab,
  formatTimeAgo,
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

export default function BellDropdown({ patients, scope, onSelectPatient }) {
  const { t } = useTranslation();
  const { open, setOpen, triggerRef, menuRef, menuRect } = usePortalDropdown({
    minWidth: 280,
    maxWidth: 320,
    align: "end",
    placeAbove: "auto",
    viewportPadding: 12,
  });

  const handleSelect = async (p) => {
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
          aria-label={t("header.bellTriggerAria", { count: patients.length })}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <i className="fas fa-bell"></i>
          {patients.length > 0 && (
            <span className="notification-badge notification-badge-alert">
              {patients.length}
            </span>
          )}
        </button>
      </div>

      <NotificationDropdownPanel
        open={open}
        menuRef={menuRef}
        menuRect={menuRect}
        ariaLabel={t("header.bellDialogAria")}
      >
        <div className="bell-dropdown-header">
          <i className="fas fa-exclamation-triangle bell-dropdown-icon" />
          <span>{t("header.bellNotifications")}</span>
          {patients.length > 0 && (
            <span className="bell-dropdown-count">{patients.length}</span>
          )}
        </div>

        {patients.length === 0 ? (
          <div className="bell-dropdown-empty">
            <i className="fas fa-check-circle" />
            <span>{t("header.bellAllClear")}</span>
          </div>
        ) : (
          <ul className="bell-dropdown-list" role="list">
            {patients.map((p) => (
              <li key={p.ref} className="bell-dropdown-item" role="listitem">
                <button
                  type="button"
                  className="bell-dropdown-item-btn"
                  onClick={() => handleSelect(p)}
                >
                  <span className="bell-alert-dot" aria-hidden />
                  <div className="bell-item-body">
                    <div className="bell-item-header-row">
                      <span className="bell-item-name">{p.name}</span>
                      <span className="bell-item-timestamp">
                        {formatTimeAgo(p.last_chat_at) ?? t("header.emDash")}
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
      </NotificationDropdownPanel>
    </>
  );
}
