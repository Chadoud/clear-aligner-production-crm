import { useTranslation } from "react-i18next";

/**
 * Renders the 6 overview panels (last cases added, last exchanges, etc.).
 * Each panel shows a list of items with a shared render function.
 */
export default function OverviewPanelsGrid({
  panels,
  renderPanelItem,
  onShowAll,
}) {
  const { t } = useTranslation();
  return (
    <div className="overview-panels-grid">
      {panels.map(
        ({ key, title, iconClass, emptyMessage, items, getSubtitle }) => (
          <div key={key} className="overview-panel">
            <div className="overview-panel-header">
              <i className={`fas ${iconClass} overview-panel-icon`} />
              <span className="overview-panel-title">{title}</span>
              <button
                type="button"
                className="overview-panel-show-all"
                onClick={onShowAll}
              >
                {t("overview.panels.showAll")}
              </button>
            </div>
            <div className="overview-panel-body">
              {items.length === 0 ? (
                <p className="overview-panel-empty">{emptyMessage}</p>
              ) : (
                items.map((item) =>
                  renderPanelItem(item, getSubtitle(item), { clickable: true })
                )
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
