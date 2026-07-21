/**
 * Composes doctors billing UI state for DoctorsBillingPage.
 * Sub-hook call order is stability-critical (Rules of Hooks).
 */
import {
  usePatientSheetNavigation,
  usePatientService,
  useDashboardDataReady,
} from "@/hooks";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { useDashboardInvoiceData } from "@/context/InvoiceDataContext";
import { useDoctorsBillingViewAndPeriod } from "./useDoctorsBillingViewAndPeriod.js";
import { useDoctorsBillingAggregates } from "./useDoctorsBillingAggregates.js";
import { useDoctorsBillingExpansion } from "./useDoctorsBillingExpansion.js";
import { useDoctorsBillingBillWorkflow } from "./useDoctorsBillingBillWorkflow.js";

export function useDoctorsBilling() {
  const { isCompany } = useAuth();
  const { actor } = useDashboard();
  const { allInvoices, refreshInvoices } = useDashboardInvoiceData();
  const { service: patientService } = usePatientService();
  const { dataReady } = useDashboardDataReady();
  const navigateToPatientSheet = usePatientSheetNavigation();

  const viewPeriod = useDoctorsBillingViewAndPeriod({ isCompany });
  const {
    canGenerateBill,
    canViewToBill,
    canViewUpcoming,
    canViewPaid,
    viewMode,
    setViewMode,
    selectedMonth,
    setSelectedMonth,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    monthOptions,
    dateRange,
    toggleDateRange,
  } = viewPeriod;

  const { billingData, summary } = useDoctorsBillingAggregates({
    viewMode,
    selectedMonth,
    dateRange,
    dataReady,
    allInvoices,
    isCompany,
    actor,
  });

  const { expandedDoctors, toggleExpand } = useDoctorsBillingExpansion({
    isCompany,
    billingData,
  });

  const workflow = useDoctorsBillingBillWorkflow({
    selectedMonth,
    dateRange,
    dateFrom,
    dateTo,
    allInvoices,
    refreshInvoices,
    patientService,
    navigateToPatientSheet,
  });

  return {
    canGenerateBill,
    canViewToBill,
    canViewUpcoming,
    canViewPaid,
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
    modal: workflow.modal,
    showBillPreview: workflow.showBillPreview,
    billPreviewZoomed: workflow.billPreviewZoomed,
    generatedBlob: workflow.generatedBlob,
    billGenerating: workflow.billGenerating,
    markPaidSending: workflow.markPaidSending,
    reverseBillingBusy: workflow.reverseBillingBusy,
    reverseConfirmGroup: workflow.reverseConfirmGroup,
    setReverseConfirmGroup: workflow.setReverseConfirmGroup,
    payConfirmGroup: workflow.payConfirmGroup,
    setPayConfirmGroup: workflow.setPayConfirmGroup,
    monthOptions,
    dateRange,
    billingData,
    summary,
    dataReady,
    toggleDateRange,
    openPreview: workflow.openPreview,
    removeFromModal: workflow.removeFromModal,
    handlePreviewBill: workflow.handlePreviewBill,
    closeBillPreview: workflow.closeBillPreview,
    closeModal: workflow.closeModal,
    handleBillPreviewZoomToggle: workflow.handleBillPreviewZoomToggle,
    handleGenerateBill: workflow.handleGenerateBill,
    handlePrint: workflow.handlePrint,
    handleReverseBill: workflow.handleReverseBill,
    handleMarkPaid: workflow.handleMarkPaid,
    handlePatientRowClick: workflow.handlePatientRowClick,
  };
}
