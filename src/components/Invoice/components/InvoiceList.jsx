import { useState, useCallback } from "react";
import {
  getInvoiceRowDisplay,
  getMonthlyOverview,
  toggleMonthPaid,
  allocateLumpToInstalments,
} from "../config/generatedInvoicesHelpers";
import { getInvoiceClient, formatTodayDDMMYYYY } from "@/utils/index.js";
import InvoiceCardToggles from "./InvoiceCardToggles.jsx";
import MonthlyPaymentReceivedModal from "./MonthlyPaymentReceivedModal.jsx";

export default function InvoiceList({
  invoices,
  formatCHF,
  canManageInvoices,
  updateInvoice,
  onPrint,
  onDeleteClick,
  onViewClick,
  onQuoteToggle,
  onPaidToggle,
  onMonthlyPaymentToggle,
}) {
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(false);

  const applyToggleResult = useCallback(
    async (inv, result) => {
      await updateInvoice(inv, {
        amountPaid: result.amountPaid,
        remainingBalanceDue: result.remainingBalanceDue,
        isPaid: result.isPaid,
        paidDate: result.isPaid ? formatTodayDDMMYYYY() : null,
        invoiceStatus: result.isPaid ? 3 : 2,
        downPaymentPaid: result.downPaymentPaid,
        paidMonthIndices: result.paidMonthIndices,
        paymentReceivedByDisplayIndex: result.paymentReceivedByDisplayIndex,
      });
    },
    [updateInvoice]
  );

  const handleConfirmReceivedAmount = useCallback(
    async (receivedAmount) => {
      if (!paymentModal) return;
      const { invoice } = paymentModal;
      setPaymentBusy(true);
      try {
        const result = allocateLumpToInstalments(invoice, receivedAmount);
        await applyToggleResult(invoice, result);
      } finally {
        setPaymentBusy(false);
        setPaymentModal(null);
      }
    },
    [paymentModal, applyToggleResult]
  );

  return (
    <>
      <div className="invoices-list">
        {invoices.map((invoice, index) => {
          const row = getInvoiceRowDisplay(
            invoice,
            formatCHF,
            getInvoiceClient
          );
          const {
            clientName,
            invoiceRef,
            brand,
            statusKind,
            statusLabel,
            paymentLine,
            isPaid,
            isQuote,
            isAcceptedQuote,
            showBillingStage,
            billingStage,
            billingStageLabel,
          } = row;

          const monthlyOverview = getMonthlyOverview(invoice);
          const isDirectMonthly =
            brand === "Direct" && Boolean(monthlyOverview?.hasMonthlyPlan);

          return (
            <div
              key={invoice.id ?? `inv-${index}`}
              className={`invoice-item invoice-item--${statusKind}`}
            >
              <div className="invoice-item-info">
                <div className="invoice-item-header">
                  <h3>{clientName}</h3>
                  <span className="invoice-ref">{invoiceRef}</span>
                  <span className="invoice-brand">{brand}</span>
                  <span
                    className={`invoice-status status-${statusKind}`}
                    title={paymentLine}
                  >
                    {statusLabel}
                  </span>
                  {showBillingStage && (
                    <span
                      className={`invoice-billing-stage invoice-billing-stage--${billingStage}`}
                      title={`Doctors billing stage: ${billingStageLabel}`}
                    >
                      {billingStageLabel}
                    </span>
                  )}
                </div>
                <div className="invoice-item-details">
                  <span className="invoice-date">
                    <i className="fas fa-calendar"></i> {row.date}
                  </span>
                  <span className="invoice-payment-line">{paymentLine}</span>
                </div>
                {monthlyOverview?.hasMonthlyPlan && (
                  <div className="invoice-monthly-overview">
                    <span className="invoice-monthly-overview-label">
                      <i className="fas fa-calendar-check" aria-hidden />
                      Months
                    </span>
                    <div className="invoice-monthly-overview-months">
                      {monthlyOverview.months.map((m, i) => {
                        const displayIndex = m.displayIndex ?? i;
                        const runToggleDirect = async () => {
                          const result = toggleMonthPaid(invoice, displayIndex);
                          await applyToggleResult(invoice, result);
                        };
                        const openAmountModal = () => {
                          setPaymentModal({
                            invoice,
                            displayIndex,
                            monthLabel: m.monthLabel,
                            defaultAmount: m.amount,
                          });
                        };
                        const partialPct =
                          m.isPartial && m.paidFraction != null
                            ? Math.round(m.paidFraction * 100)
                            : 0;
                        const partialTitleReadOnly = m.isPartial
                          ? `${formatCHF(m.receivedTowardInstalment ?? 0, { decimals: 2 })} of ${formatCHF(m.amount, { decimals: 2 })} (${partialPct}%)`
                          : "";
                        const partialTitleManage = m.isPartial
                          ? `${partialTitleReadOnly} — click to add another payment`
                          : "";
                        if (m.isPaid && canManageInvoices) {
                          const titleCustom =
                            m.creditedAmount != null
                              ? `Scheduled ${formatCHF(m.amount)} · received ${formatCHF(m.creditedAmount)} — click to unmark`
                              : "Click to unmark this month as paid";
                          return (
                            <button
                              key={i}
                              type="button"
                              className="invoice-month-badge month-paid"
                              title={titleCustom}
                              onClick={runToggleDirect}
                            >
                              {m.monthLabel}
                            </button>
                          );
                        }
                        if (m.isPaid) {
                          const titleRead =
                            m.creditedAmount != null
                              ? `Scheduled ${formatCHF(m.amount)} · received ${formatCHF(m.creditedAmount)}`
                              : "Paid";
                          return (
                            <span
                              key={i}
                              className="invoice-month-badge month-paid"
                              title={titleRead}
                            >
                              {m.monthLabel}
                            </span>
                          );
                        }
                        if (m.isPartial && canManageInvoices) {
                          return (
                            <button
                              key={i}
                              type="button"
                              className="invoice-month-badge month-partial"
                              style={{
                                ["--paid-pct"]: `${partialPct}%`,
                              }}
                              title={partialTitleManage}
                              onClick={openAmountModal}
                            >
                              {m.monthLabel}
                            </button>
                          );
                        }
                        if (m.isPartial) {
                          return (
                            <span
                              key={i}
                              className="invoice-month-badge month-partial"
                              style={{
                                ["--paid-pct"]: `${partialPct}%`,
                              }}
                              title={partialTitleReadOnly}
                            >
                              {m.monthLabel}
                            </span>
                          );
                        }
                        if (canManageInvoices) {
                          return (
                            <button
                              key={i}
                              type="button"
                              className="invoice-month-badge month-pending"
                              title={
                                isDirectMonthly
                                  ? "Enter total received; applied from first unpaid segment"
                                  : "Click to mark this month as paid"
                              }
                              onClick={
                                isDirectMonthly
                                  ? openAmountModal
                                  : runToggleDirect
                              }
                            >
                              {m.monthLabel}
                            </button>
                          );
                        }
                        return (
                          <span
                            key={i}
                            className="invoice-month-badge month-pending"
                            title="Pending"
                          >
                            {m.monthLabel}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {canManageInvoices && (
                  <InvoiceCardToggles
                    invoice={invoice}
                    isQuote={isAcceptedQuote ? false : isQuote}
                    isQuoteDisabled={false}
                    isPaid={isPaid}
                    monthlyPaymentEnabled={invoice.monthlyPaymentEnabled}
                    onQuoteToggle={onQuoteToggle}
                    onPaidToggle={onPaidToggle}
                    onMonthlyPaymentToggle={onMonthlyPaymentToggle}
                  />
                )}
              </div>
              <div className="invoice-item-actions">
                <button
                  className="btn-view"
                  onClick={() => onViewClick(invoice, "invoice")}
                  title="Preview invoice, plan or receipt"
                >
                  <i className="fas fa-eye"></i> Preview
                </button>
                <button
                  type="button"
                  className="btn-download"
                  onClick={() => onPrint(invoice)}
                  title="Print invoice"
                >
                  <i className="fas fa-print"></i> Download
                </button>
                {canManageInvoices && (
                  <button
                    className="btn-delete"
                    onClick={() => onDeleteClick(invoice, clientName)}
                    title="Delete invoice"
                  >
                    <i className="fas fa-trash" aria-hidden="true"></i>
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {paymentModal && (
        <MonthlyPaymentReceivedModal
          monthLabel={paymentModal.monthLabel}
          defaultAmount={paymentModal.defaultAmount}
          invoice={paymentModal.invoice}
          busy={paymentBusy}
          onCancel={() => !paymentBusy && setPaymentModal(null)}
          onConfirm={handleConfirmReceivedAmount}
        />
      )}
    </>
  );
}
