import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import CaseSection from "../CaseSection/CaseSection";
import ActionButtons from "../ActionButtons/ActionButtons";
import Tabs from "../Tabs/Tabs";
import { useCaseSheet, useCaseChannelStats } from "@/hooks";
import { useDashboard } from "@/context/DashboardContext";
import {
  TabPossibleTreatment,
  TabTreatmentPlan,
  TabFollowUp,
  TabDiscussion,
  TabNotes,
  TabStripping,
  TabDocsPrives,
  TabDocCategory,
  TabDossierPatient,
} from "../sections/case-management/tabs";
import TabPlaceholder from "../sections/case-management/TabPlaceholder";
import {
  isValidCaseManagementTab,
  CASE_MANAGEMENT_LAZY_TAB_IDS,
  CASE_MANAGEMENT_CASE_SHEET_TAB_IDS,
} from "@/constants/caseManagementTabs";
import "../sections/case-management/tabs/tabs.css";

const QuotationForm = lazy(
  () => import("../sections/case-management/QuotationForm/QuotationForm")
);
const GeneratedInvoices = lazy(() => import("../../Invoice/GeneratedInvoices"));

/**
 * Registry: tabId -> { Component, getProps(patient, context, activeTab) }.
 * Replaces switch growth; add new tabs here and in caseManagementTabs.js only.
 */
function buildTabRegistry(caseSheetProps) {
  const patientOnly = (patient) => ({ patient, ...caseSheetProps });
  const patientAndTabId = (patient, _ctx, activeTab) => ({
    patient,
    tabId: activeTab,
    ...caseSheetProps,
  });
  const invoiceContext = (patient, ctx) => ({
    patient,
    onGenerateInvoice: ctx?.onGenerateInvoice,
    onOpenSettings: ctx?.onOpenSettings,
  });

  return {
    treatment: {
      Component: TabPossibleTreatment,
      getProps: (patient) => ({
        patient,
        ...caseSheetProps,
        isReadOnly: caseSheetProps.isPossibleTreatmentReadOnly,
      }),
    },
    plan: { Component: TabTreatmentPlan, getProps: patientOnly },
    followup: {
      Component: TabFollowUp,
      getProps: (patient) => ({
        ...patientOnly(patient),
        isReadOnly: false,
      }),
    },
    discussion: { Component: TabDiscussion, getProps: patientOnly },
    notes: { Component: TabNotes, getProps: patientOnly },
    stripping: { Component: TabStripping, getProps: patientOnly },
    "dossier-patient": { Component: TabDossierPatient, getProps: patientOnly },
    photographie: { Component: TabDocCategory, getProps: patientAndTabId },
    radiographie: { Component: TabDocCategory, getProps: patientAndTabId },
    documents: { Component: TabDocCategory, getProps: patientAndTabId },
    "empreinte-3d": { Component: TabDocCategory, getProps: patientAndTabId },
    "docs-prives": { Component: TabDocsPrives, getProps: patientOnly },
    invoice: { Component: QuotationForm, getProps: invoiceContext },
    "invoice-generated": {
      Component: GeneratedInvoices,
      getProps: (patient) => ({ patient }),
    },
  };
}

function TabContent({
  activeTab,
  patient,
  onGenerateInvoice,
  onOpenSettings,
  tabRegistry,
}) {
  const { t } = useTranslation();
  const context = { onGenerateInvoice, onOpenSettings };
  const entry = tabRegistry[activeTab];

  if (!entry) {
    if (isValidCaseManagementTab(activeTab)) {
      return <TabPlaceholder tabId={activeTab} />;
    }
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">{t("caseMgmt.selectTab")}</p>
      </div>
    );
  }

  const { Component, getProps } = entry;
  const props = getProps(patient, context, activeTab);
  return <Component {...props} />;
}

export default function CaseManagementContent({
  patient,
  onGenerateInvoice,
  onOpenSettings,
  activeTab,
  onTabChange,
}) {
  const { t } = useTranslation();
  const isLazyTab = CASE_MANAGEMENT_LAZY_TAB_IDS.includes(activeTab);
  const { scope } = useDashboard();
  const isReadOnly = scope === "doctor";
  const caseSheetEnabled =
    CASE_MANAGEMENT_CASE_SHEET_TAB_IDS.includes(activeTab);
  const caseSheet = useCaseSheet(patient, caseSheetEnabled);
  const {
    stats: discussionChannelStats,
    totalUnread: discussionUnreadCount,
    refresh: refreshDiscussionChannelStats,
  } = useCaseChannelStats(patient?.case_id);
  const caseSheetProps = {
    caseSheet: caseSheet.caseSheet,
    updateCaseSheet: caseSheet.updateCaseSheet,
    saveNow: caseSheet.saveNow,
    refreshCaseSheet: caseSheet.refreshCaseSheet,
    sheetLoading: caseSheet.sheetLoading,
    sheetError: caseSheet.sheetError,
    hasUnsavedChanges: caseSheet.hasUnsavedChanges,
    saving: caseSheet.saving,
    isReadOnly,
    // Treatment: only doctors can edit; company is read-only
    isPossibleTreatmentReadOnly: scope === "company",
    discussionChannelStats,
    refreshDiscussionChannelStats,
  };
  const tabRegistry = buildTabRegistry(caseSheetProps);

  return (
    <>
      <CaseSection patient={patient} />
      <ActionButtons patient={patient} />
      <Tabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        discussionUnreadCount={discussionUnreadCount}
      />

      {caseSheet.sheetError && (
        <div className="tab-panel-error case-mgmt-shared-error" role="alert">
          {caseSheet.sheetError}
          {caseSheet.sheetError.includes("401") && t("caseMgmt.sheetError401")}
          {caseSheet.sheetError.includes("500") && t("caseMgmt.sheetError500")}
          {!caseSheet.sheetError.includes("401") &&
            !caseSheet.sheetError.includes("500") &&
            t("caseMgmt.sheetErrorGeneric")}
        </div>
      )}

      <Suspense
        fallback={
          isLazyTab ? (
            <div className="form-section">
              <LoadingDonut size="md" message={t("caseMgmt.loading")} />
            </div>
          ) : null
        }
      >
        <TabContent
          activeTab={activeTab}
          patient={patient}
          onGenerateInvoice={onGenerateInvoice}
          onOpenSettings={onOpenSettings}
          tabRegistry={tabRegistry}
        />
      </Suspense>
    </>
  );
}
