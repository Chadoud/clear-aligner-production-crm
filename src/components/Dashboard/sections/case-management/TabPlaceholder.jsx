import { useTranslation } from "react-i18next";
import { CASE_MANAGEMENT_TABS } from "@/constants/caseManagementTabs";

export default function TabPlaceholder({ tabId }) {
  const { t } = useTranslation();
  const tab = CASE_MANAGEMENT_TABS.find((x) => x.id === tabId);
  const label = tab?.labelKey ? t(tab.labelKey) : tabId;
  return (
    <div className="form-section tab-panel">
      <p className="tab-panel-empty">
        {t("caseTabs.placeholderComingSoon", { label })}
      </p>
    </div>
  );
}
