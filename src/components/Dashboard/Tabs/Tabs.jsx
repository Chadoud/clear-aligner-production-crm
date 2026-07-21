import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDashboard } from "@/context/DashboardContext";
import { CASE_MANAGEMENT_SECTIONS } from "@/constants/caseManagementTabs";
import { canAccessCaseTab } from "@/utils/cases/index.js";
import "./Tabs.css";
import DiscussionUnreadBadge from "@/components/shared/DiscussionUnreadBadge/DiscussionUnreadBadge";

const Tabs = ({ activeTab, onTabChange, discussionUnreadCount = 0 }) => {
  const { t } = useTranslation();
  const { scope } = useDashboard();

  const visibleSections = useMemo(() => {
    return CASE_MANAGEMENT_SECTIONS.map((section) => {
      const visibleTabs =
        scope === "doctor"
          ? section.tabs.filter((tab) => canAccessCaseTab(scope, tab.id))
          : section.tabs;
      return { ...section, tabs: visibleTabs };
    }).filter((s) => s.tabs.length > 0);
  }, [scope]);

  const handleTabClick = (tabId) => {
    if (tabId !== activeTab) onTabChange(tabId);
  };

  return (
    <div
      className="tabs-sectioned"
      role="tablist"
      aria-label={t("caseTabs.tablistAria")}
    >
      {visibleSections.map((section) => (
        <div key={section.id} className="tabs-section-box">
          <div className="tabs-section-box-header">
            <i className={section.icon} aria-hidden />
            <span>{t(section.labelKey)}</span>
          </div>
          <div className="tabs-section-box-tabs">
            {section.tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const label = t(tab.labelKey);
              return (
                <button
                  type="button"
                  key={tab.id}
                  className={`tab-item ${isActive ? "active" : ""}`}
                  onClick={() => handleTabClick(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={
                    tab.id === "discussion" && discussionUnreadCount > 0
                      ? `${label} (${discussionUnreadCount} unread)`
                      : label
                  }
                >
                  <i className={tab.icon} aria-hidden />
                  <span>{label}</span>
                  {tab.id === "discussion" && (
                    <DiscussionUnreadBadge count={discussionUnreadCount} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Tabs;
