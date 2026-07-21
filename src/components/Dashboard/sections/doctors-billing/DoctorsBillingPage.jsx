import MonthOrRangeFilter from "@/components/shared/MonthOrRangeFilter/MonthOrRangeFilter";
import { useTranslation } from "react-i18next";
import { formatCHF } from "@/utils/invoices/index.js";
import BillModal from "./components/BillModal";
import DoctorBillingCard from "./components/DoctorBillingCard";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import DoctorsBillingBusyOverlay from "./components/DoctorsBillingBusyOverlay";
import { useDoctorsBilling } from "./hooks/useDoctorsBilling";
import "./DoctorsBillingPage.css";

function getEmptyMessage(viewMode, selectedMonth, isCompany, pendingLabel, t) {
  if (viewMode === "bill") {
    if (selectedMonth === "all") {
      return t(
        isCompany
          ? "doctorsBillingPage.emptyBillAll"
          : "doctorsBillingPage.emptyUpcomingAll"
      );
    }
    if (selectedMonth === "daterange") {
      return t(
        isCompany
          ? "doctorsBillingPage.emptyBillRange"
          : "doctorsBillingPage.emptyUpcomingRange"
      );
    }
    return t(
      isCompany
        ? "doctorsBillingPage.emptyBillMonth"
        : "doctorsBillingPage.emptyUpcomingMonth"
    );
  }
  if (viewMode === "paid") {
    if (selectedMonth === "all") return "No paid patients.";
    if (selectedMonth === "daterange")
      return "No paid patients in this date range.";
    return "No paid patients for this month.";
  }
  if (viewMode === "all") {
    if (selectedMonth === "all") {
      return t("doctorsBillingPage.emptyAllPeriod", { pendingLabel });
    }
    if (selectedMonth === "daterange")
      return "No billing records in this date range.";
    return "No billing records for this month.";
  }
  if (selectedMonth === "all") {
    return isCompany
      ? t("doctorsBillingPage.emptySwitchToPending", { pendingLabel })
      : "No billed patients.";
  }
  if (selectedMonth === "daterange")
    return "No billed patients in this date range.";
  return "No billed patients for this month.";
}

function getSummaryLabel(viewMode, isCompany, t) {
  if (viewMode === "bill") {
    return t(
      isCompany
        ? "doctorsBillingPage.summaryBillableDoctors"
        : "doctorsBillingPage.summaryUpcomingDoctors"
    );
  }
  if (viewMode === "paid") return t("doctorsBillingPage.summaryPaidDoctors");
  if (viewMode === "all") return t("doctorsBillingPage.summaryAllDoctors");
  return t("doctorsBillingPage.summaryBilledDoctors");
}

function getTotalLabel(selectedMonth) {
  if (selectedMonth === "all") return "Total amount";
  if (selectedMonth === "daterange") return "Total amount (date range)";
  return "Total amount this month";
}

export default function DoctorsBillingPage() {
  const { t } = useTranslation();
  const {
    canGenerateBill,
    canViewToBill,
    canViewUpcoming,
    isCompany,
    viewMode,
    setViewMode,
    selectedMonth,
    setSelectedMonth,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    expandedDoctors,
    toggleExpand,
    modal,
    showBillPreview,
    billPreviewZoomed,
    generatedBlob,
    billGenerating,
    markPaidSending,
    reverseBillingBusy,
    reverseConfirmGroup,
    setReverseConfirmGroup,
    payConfirmGroup,
    setPayConfirmGroup,
    monthOptions,
    billingData,
    summary,
    dataReady,
    toggleDateRange,
    openPreview,
    removeFromModal,
    handlePreviewBill,
    closeBillPreview,
    closeModal,
    handleBillPreviewZoomToggle,
    handleGenerateBill,
    handlePrint,
    handleReverseBill,
    handleMarkPaid,
    handlePatientRowClick,
  } = useDoctorsBilling();

  const pendingLabel = isCompany
    ? t("nav.doctorsBillingToBill")
    : t("nav.doctorsBillingUpcoming");

  const showContent =
    selectedMonth === "all" ||
    selectedMonth === "daterange" ||
    (selectedMonth && selectedMonth.length >= 7);

  return (
    <section
      className="dashboard-section doctors-billing-page"
      aria-labelledby="doctors-billing-title"
    >
      <h1 id="doctors-billing-title" className="section-title">
        <i className="fas fa-file-invoice-dollar" aria-hidden />
        Doctors Billing
      </h1>
      <div className="doctors-billing-view-toggle">
        <button
          type="button"
          className={`doctors-billing-toggle-btn ${viewMode === "all" ? "active" : ""}`}
          onClick={() => setViewMode("all")}
          aria-pressed={viewMode === "all"}
        >
          <i className="fas fa-layer-group" aria-hidden />
          {t("nav.doctorsBillingAll")}
        </button>
        {canViewToBill && (
          <button
            type="button"
            className={`doctors-billing-toggle-btn ${viewMode === "bill" ? "active" : ""}`}
            onClick={() => setViewMode("bill")}
            aria-pressed={viewMode === "bill"}
            aria-label={t("nav.doctorsBillingToBill")}
          >
            <i className="fas fa-file-invoice" aria-hidden />
            {t("nav.doctorsBillingToBill")}
          </button>
        )}
        {canViewUpcoming && (
          <button
            type="button"
            className={`doctors-billing-toggle-btn ${viewMode === "bill" ? "active" : ""}`}
            onClick={() => setViewMode("bill")}
            aria-pressed={viewMode === "bill"}
            aria-label={t("nav.doctorsBillingUpcoming")}
          >
            <i className="fas fa-hourglass-half" aria-hidden />
            {t("nav.doctorsBillingUpcoming")}
          </button>
        )}
        <button
          type="button"
          className={`doctors-billing-toggle-btn ${viewMode === "billed" ? "active" : ""}`}
          onClick={() => setViewMode("billed")}
          aria-pressed={viewMode === "billed"}
        >
          <i className="fas fa-check-circle" aria-hidden />
          {t("nav.doctorsBillingBilled")}
        </button>
        <button
          type="button"
          className={`doctors-billing-toggle-btn ${viewMode === "paid" ? "active" : ""}`}
          onClick={() => setViewMode("paid")}
          aria-pressed={viewMode === "paid"}
        >
          <i className="fas fa-money-check-alt" aria-hidden />
          {t("nav.doctorsBillingPaid")}
        </button>
      </div>

      <div className="doctors-billing-month-row">
        <label htmlFor="doctors-billing-month">Month (invoice date)</label>
        <MonthOrRangeFilter
          id="doctors-billing-month"
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          monthOptions={monthOptions
            .filter((o) => o.value !== "all")
            .map((o) => o.value)}
          onToggleDateRange={toggleDateRange}
        />
      </div>

      {showContent && (
        <>
          <div className="doctors-billing-summary-cards">
            <div className="doctors-billing-summary-card">
              <div className="doctors-billing-summary-card-label">
                {getSummaryLabel(viewMode, isCompany, t)}
              </div>
              <div className="doctors-billing-summary-card-value">
                {summary.doctorCount}
              </div>
            </div>
            <div className="doctors-billing-summary-card">
              <div className="doctors-billing-summary-card-label">
                {getTotalLabel(selectedMonth)}
              </div>
              <div className="doctors-billing-summary-card-value">
                {formatCHF(summary.totalAmount)}
              </div>
            </div>
          </div>

          <div className="doctors-billing-doctor-list">
            {!dataReady ? (
              <div className="doctors-billing-loading">
                <LoadingDonut size="md" message="Loading billing data…" />
              </div>
            ) : billingData.length === 0 ? (
              <p className="doctors-billing-empty">
                {getEmptyMessage(
                  viewMode,
                  selectedMonth,
                  isCompany,
                  pendingLabel,
                  t
                )}
              </p>
            ) : (
              billingData.map((group) => (
                <DoctorBillingCard
                  key={group.doctorName}
                  group={group}
                  isExpanded={expandedDoctors.has(group.doctorName)}
                  viewMode={viewMode}
                  canGenerateBill={canGenerateBill}
                  pendingStatusLabel={pendingLabel}
                  onToggleExpand={toggleExpand}
                  onOpenPreview={openPreview}
                  onReverse={setReverseConfirmGroup}
                  onMarkPaid={setPayConfirmGroup}
                  onPatientRowClick={handlePatientRowClick}
                />
              ))
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!reverseConfirmGroup}
        title="Reverse bill"
        message={
          reverseConfirmGroup
            ? reverseConfirmGroup.reverseType === "paid"
              ? `This will unmark ${reverseConfirmGroup.lineItems.length} patient invoice(s) as paid and move them back to "Billed". Continue?`
              : `This will move ${reverseConfirmGroup.lineItems.length} billed invoice(s) back to "${pendingLabel}". Continue?`
            : ""
        }
        confirmLabel="Reverse"
        confirmVariant="danger"
        onConfirm={handleReverseBill}
        onCancel={() => setReverseConfirmGroup(null)}
      />
      <ConfirmDialog
        open={!!payConfirmGroup}
        title="Mark billed invoices as paid"
        message={
          payConfirmGroup
            ? `This will mark ${payConfirmGroup.lineItems.length} billed invoice(s) as fully paid. Continue?`
            : ""
        }
        confirmLabel="Mark as paid"
        confirmVariant="primary"
        onConfirm={handleMarkPaid}
        onCancel={() => setPayConfirmGroup(null)}
      />
      <DoctorsBillingBusyOverlay
        billGenerating={billGenerating}
        markPaidSending={markPaidSending}
        reverseBillingBusy={reverseBillingBusy}
      />
      <BillModal
        modal={modal}
        showBillPreview={showBillPreview}
        billPreviewZoomed={billPreviewZoomed}
        generatedBlob={generatedBlob}
        billGenerating={billGenerating}
        canGenerateBill={canGenerateBill}
        onClose={closeModal}
        onZoomToggle={handleBillPreviewZoomToggle}
        onPreviewBill={handlePreviewBill}
        onBackToList={closeBillPreview}
        onPrint={handlePrint}
        onGenerateBill={handleGenerateBill}
        onRemoveItem={removeFromModal}
      />
    </section>
  );
}
