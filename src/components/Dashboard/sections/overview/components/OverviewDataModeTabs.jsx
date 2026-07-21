/**
 * Invoices vs Patients display mode for Overview dashboard modules.
 */
export default function OverviewDataModeTabs({ dataMode, onDataModeChange }) {
  return (
    <div
      className="overview-mode-tabs"
      role="tablist"
      aria-label="Overview data mode"
    >
      <button
        type="button"
        role="tab"
        id="overview-mode-invoices"
        aria-selected={dataMode === "invoices"}
        className={dataMode === "invoices" ? "active" : ""}
        onClick={() => onDataModeChange("invoices")}
      >
        Invoices
      </button>
      <button
        type="button"
        role="tab"
        id="overview-mode-patients"
        aria-selected={dataMode === "patients"}
        className={dataMode === "patients" ? "active" : ""}
        onClick={() => onDataModeChange("patients")}
      >
        Patients
      </button>
    </div>
  );
}
