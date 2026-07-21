import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CASE_STATUS_OPTIONS } from "@/utils/cases/index.js";

const EMPTY_PATIENT_TOTALS = {
  owedCount: 0,
  paidCount: 0,
  pendingCount: 0,
  exclusiveOwed: 0,
  exclusivePaid: 0,
  exclusivePending: 0,
  exclusiveTotal: 0,
};

export default function OverviewCharts({
  totalInvoiced,
  totalPaid,
  totalLeft,
  totalPending = 0,
  donutHover,
  onDonutHoverChange,
  donutTooltipPos,
  onDonutTooltipPosChange,
  formatCHF,
  statusCounts,
  caseManagementListRoute,
  onNavigateToStatus,
  loading = false,
  mode = "invoices",
  patientTotals = null,
  /** When `mode === "invoices"`, optional fallback: counts invoices per case workflow status (scoped). */
  invoiceStatusCounts = null,
  /** When `mode === "invoices"`, preferred: CHF totals per case workflow status (scoped). */
  invoiceStatusAmounts = null,
}) {
  const { t } = useTranslation();
  const pt = patientTotals ?? EMPTY_PATIENT_TOTALS;
  const isPatientsMode = mode === "patients";
  // Bars are mode-aware:
  // - patients mode: patient counts by case status
  // - invoices mode: CHF totals by case status (fallback: invoice counts)
  const barValues = isPatientsMode
    ? statusCounts
    : invoiceStatusAmounts || invoiceStatusCounts || statusCounts;

  const donutTotal = isPatientsMode ? pt.exclusiveTotal : totalInvoiced;
  const donutPaid = isPatientsMode ? pt.exclusivePaid : totalPaid;
  const donutLeft = isPatientsMode ? pt.exclusiveOwed : totalLeft;
  const donutPending = isPatientsMode ? pt.exclusivePending : totalPending;

  const formatDonutNumber = useCallback(
    (n) =>
      isPatientsMode
        ? String(Math.round(Number(n) || 0))
        : formatCHF(n, { decimals: 0 }),
    [isPatientsMode, formatCHF]
  );

  const donutAriaLabel = useMemo(
    () =>
      t("overview.donutAria", {
        paid: formatDonutNumber(donutPaid),
        left: formatDonutNumber(donutLeft),
        pending: formatDonutNumber(donutPending),
      }),
    [t, formatDonutNumber, donutPaid, donutLeft, donutPending]
  );

  const handleDonutMouseMove = useCallback(
    (e) => {
      if (donutTotal <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle =
        ((Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180) / Math.PI +
          360) %
        360;
      const paidDeg = (donutPaid / donutTotal) * 360;
      const leftDeg = (donutLeft / donutTotal) * 360;
      let hover = "left";
      if (angle <= paidDeg) hover = "paid";
      else if (angle <= paidDeg + leftDeg) hover = "left";
      else hover = "pending";
      onDonutHoverChange(hover);
      onDonutTooltipPosChange({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [
      donutTotal,
      donutPaid,
      donutLeft,
      onDonutHoverChange,
      onDonutTooltipPosChange,
    ]
  );

  const handleDonutMouseLeave = useCallback(() => {
    onDonutHoverChange(null);
    onDonutTooltipPosChange(null);
  }, [onDonutHoverChange, onDonutTooltipPosChange]);

  const paidDeg = donutTotal ? (donutPaid / donutTotal) * 360 : 0;
  const leftDeg = donutTotal ? (donutLeft / donutTotal) * 360 : 0;
  const conicGradient =
    donutTotal > 0
      ? `conic-gradient(#10b981 0deg ${paidDeg}deg, #f59e0b ${paidDeg}deg ${paidDeg + leftDeg}deg, #6366f1 ${paidDeg + leftDeg}deg 360deg)`
      : "conic-gradient(#e5e7eb 0deg 360deg)";

  const tooltipMain =
    donutHover === "paid"
      ? donutPaid
      : donutHover === "left"
        ? donutLeft
        : donutPending;

  return (
    <div className="overview-charts">
      <div className="overview-chart-card overview-chart-card-donut">
        <div className="overview-chart-head">
          <h3 className="overview-chart-title">
            {isPatientsMode
              ? t("overview.donutTitlePatients")
              : t("overview.donutTitleInvoices")}
          </h3>
        </div>
        <div className="overview-donut-body">
          <div
            className="overview-donut-wrap"
            onMouseMove={handleDonutMouseMove}
            onMouseLeave={handleDonutMouseLeave}
            role="img"
            aria-label={donutAriaLabel}
          >
            <div
              className="overview-donut"
              style={{ background: conicGradient }}
              aria-hidden
            />
            <div className="overview-donut-center">
              <span className="overview-donut-total-label">
                {t("overview.donutTotal")}
              </span>
              <span className="overview-donut-total-value">
                {formatDonutNumber(donutTotal)}
              </span>
              {!isPatientsMode && (
                <span className="overview-donut-total-unit">CHF</span>
              )}
            </div>
            {donutHover && donutTooltipPos && (
              <div
                className={`overview-donut-tooltip overview-donut-tooltip-${donutHover}`}
                style={{
                  left:
                    donutTooltipPos.x >= 100
                      ? donutTooltipPos.x - 12
                      : donutTooltipPos.x + 12,
                  top: donutTooltipPos.y,
                  transform:
                    donutTooltipPos.x >= 100
                      ? "translate(-100%, -50%)"
                      : "translateY(-50%)",
                }}
                role="status"
                aria-live="polite"
              >
                {formatDonutNumber(tooltipMain)}
                <span className="overview-donut-tooltip-label">
                  {donutHover === "paid"
                    ? t("overview.donutTooltipPaid")
                    : donutHover === "left"
                      ? t("overview.donutTooltipLeft")
                      : t("overview.donutTooltipPending")}
                </span>
              </div>
            )}
          </div>
          <div className="overview-donut-legend">
            <span className="overview-legend-item">
              <span
                className="overview-legend-dot"
                style={{ background: "#10b981" }}
              />
              {t("overview.donutLegendPaid")}
            </span>
            <span className="overview-legend-item">
              <span
                className="overview-legend-dot"
                style={{ background: "#f59e0b" }}
              />
              {t("overview.donutLegendLeft")}
            </span>
            <span className="overview-legend-item">
              <span
                className="overview-legend-dot"
                style={{ background: "#6366f1" }}
              />
              {t("overview.donutLegendPending")}
            </span>
          </div>
        </div>
      </div>
      <div className="overview-chart-card">
        <h3 className="overview-chart-title">
          {isPatientsMode
            ? t("overview.barsTitlePatients")
            : t("overview.barsTitleInvoices")}
        </h3>
        <div className="overview-bars">
          {CASE_STATUS_OPTIONS.map((opt) => {
            const value = Number(barValues[opt.id] ?? 0) || 0;
            const maxValue = Math.max(1, ...Object.values(barValues));
            const pct = maxValue ? (value / maxValue) * 100 : 0;
            const statusLabel = t(opt.labelKey);
            const goToStatus = () =>
              onNavigateToStatus(
                `${caseManagementListRoute}?status=${encodeURIComponent(opt.id)}`
              );
            return (
              <div
                key={opt.id}
                className={`overview-bar-row ${isPatientsMode ? "" : "overview-bar-row-invoices"}`.trim()}
                role="button"
                tabIndex={0}
                onClick={goToStatus}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" ||
                    e.key === " " ||
                    e.key === "Spacebar"
                  ) {
                    e.preventDefault();
                    goToStatus();
                  }
                }}
                aria-label={
                  isPatientsMode
                    ? t("overview.barAriaPatients", {
                        label: statusLabel,
                        value,
                      })
                    : t("overview.barAriaInvoices", {
                        label: statusLabel,
                        amount: formatCHF(value, { decimals: 0 }),
                      })
                }
              >
                <span className="overview-bar-label">{statusLabel}</span>
                <div className="overview-bar-track">
                  <div
                    className="overview-bar-fill"
                    style={{ width: `${pct}%`, background: opt.color }}
                  />
                </div>
                <span
                  className={`overview-bar-value ${isPatientsMode ? "" : "overview-bar-value-invoices"}`.trim()}
                >
                  {loading ? (
                    <span
                      className="skeleton-value"
                      style={{ width: "2rem" }}
                    />
                  ) : isPatientsMode ? (
                    value
                  ) : value > 0 ? (
                    formatCHF(value, { decimals: 0 })
                  ) : (
                    "---"
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
