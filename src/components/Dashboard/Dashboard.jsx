import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout/DashboardLayout";
import PageLoading from "../shared/PageLoading/PageLoading";
import ListOfCabinets from "./sections/cabinets/ListOfCabinets";
import AddCabinet from "./sections/cabinets/AddCabinet";
import CabinetEdit from "./sections/cabinets/CabinetEdit";
import ListOfUsers from "./sections/users/ListOfUsers";
import UserDetail from "./sections/users/UserDetail";
import CreateUser from "./sections/users/CreateUser";
import ListOfCases from "./sections/case-management/ListOfCases";
import AddNewCase from "./sections/case-management/AddNewCase";
import MyProfile from "./sections/MyProfile";
import {
  usePatientService,
  useDashboardRouting,
  useSelectedPatientSync,
} from "../../hooks";
import { setLastCaseTab } from "../../constants/caseManagementTabs";
import { recordPatientConsulted } from "../../constants/recentConsultedPatients.js";
import {
  useDashboard,
  DashboardProvider,
} from "../../context/DashboardContext";
import { useDashboardInvoiceData } from "../../context/InvoiceDataContext";
import { getCurrentDoctorIdentity } from "../../services/doctorIdentityService";
import {
  generateInvoiceHtmlPdfBase64FromData,
  generateInvoicePreviewHtmlPdfBase64,
} from "@/utils/pdf/doctorBillHtmlToPdf.js";
import {
  formatTodayDDMMYYYY,
  hasMonthlyArrangementPlan,
  isQuoteInvoice,
} from "@/utils/invoices/index.js";
import { useBusyOverlay } from "@/hooks/useBusyOverlay.jsx";
import "./Dashboard.css";

const CaseManagementContent = lazy(
  () => import("./CaseManagementContent/CaseManagementContent")
);
const InvoiceModal = lazy(() => import("../Invoice/InvoiceModal"));
const SettingsModal = lazy(() => import("../Settings/SettingsModal"));
const Overview = lazy(() => import("./sections/overview"));
const DoctorsBillingPage = lazy(
  () => import("./sections/doctors-billing/DoctorsBillingPage")
);

function DashboardInner() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { selectedPatient, scope, actor } = useDashboard();
  usePatientService();
  const { addInvoice } = useDashboardInvoiceData();

  const {
    section,
    caseTab,
    patientRefFromQuery,
    isCaseIdFromPath,
    routes,
    isDoctor,
    effectiveCabinetSlug,
    isAddNewCase,
    cabinetView,
    userView,
    userId,
  } = useDashboardRouting(scope, actor);

  useSelectedPatientSync(
    patientRefFromQuery,
    isCaseIdFromPath,
    section,
    caseTab,
    isDoctor,
    actor
  );

  // Persist tab from URL so it becomes the "last tab" when navigating to other patients
  useEffect(() => {
    if (
      section === "case-management" &&
      caseTab !== "list" &&
      selectedPatient &&
      caseTab
    ) {
      setLastCaseTab(caseTab);
    }
  }, [section, caseTab, selectedPatient]);

  // Track last-consulted order for the right sidebar patient list
  useEffect(() => {
    if (
      section === "case-management" &&
      caseTab !== "list" &&
      selectedPatient
    ) {
      recordPatientConsulted(selectedPatient, scope);
    }
  }, [section, caseTab, selectedPatient, scope]);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const {
    busy: invoiceSubmitting,
    runWithBusy,
    overlay: busyOverlay,
  } = useBusyOverlay();

  const handleGenerateInvoice = (data) => {
    setInvoiceData({
      ...data,
      cabinet_id: selectedPatient?.cabinet_id,
      generatedDate: formatTodayDDMMYYYY(),
    });
    setShowInvoiceModal(true);
  };

  const handleInvoiceConfirm = async () => {
    if (invoiceSubmitting) return;
    await runWithBusy(async () => {
      if (invoiceData && addInvoice) {
        const payload = { ...invoiceData };
        if (
          selectedPatient?.cabinet_id != null &&
          selectedPatient?.cabinet_id !== ""
        ) {
          payload.cabinet_id = selectedPatient.cabinet_id;
        }
        if (
          selectedPatient?.case_id != null &&
          Number.isFinite(selectedPatient.case_id)
        ) {
          payload.case_id = selectedPatient.case_id;
        }
        // Capture the rendered InvoicePreview from the open modal at its natural A4
        // size (after removing InvoicePreviewPane's scale transform) so the email PDF
        // is pixel-identical to what the user sees when they press Print.
        try {
          payload.pdfBase64 = await generateInvoicePreviewHtmlPdfBase64({
            invoiceData: payload,
            documentType: isQuoteInvoice(payload) ? "quote" : "invoice",
          });
        } catch {
          // Non-fatal — crud.js will fall back to jsPDF
        }
        if (isQuoteInvoice(payload) && hasMonthlyArrangementPlan(payload)) {
          try {
            payload.arrangementPdfBase64 =
              await generateInvoiceHtmlPdfBase64FromData(
                payload,
                "arrangement"
              );
          } catch {
            // Non-fatal — crud.js will fall back to jsPDF
          }
        }

        // Close modal immediately after collecting preview/capture and switch to
        // invoice tab while creation runs in background.
        setShowInvoiceModal(false);
        setInvoiceData(null);
        const caseId = selectedPatient?.case_id;
        const target =
          caseId != null
            ? `${routes.caseManagementList}/id/${caseId}?tab=invoice-generated`
            : routes.caseManagementInvoices +
              (search ? `?${new URLSearchParams(search)}` : "");
        navigate(target, { replace: true });

        await addInvoice(payload);
      }
    }, "Sending invoice…");
  };

  return (
    <>
      <DashboardLayout>
        <Suspense fallback={<PageLoading />}>
          {section === "overview" && <Overview />}
          {section === "cabinets" && cabinetView === "list" && (
            <ListOfCabinets
              onEdit={(slugToEdit) => navigate(routes.cabinetEdit(slugToEdit))}
            />
          )}
          {section === "cabinets" && cabinetView === "add" && (
            <AddCabinet onBack={() => navigate(routes.cabinets)} />
          )}
          {section === "cabinets" &&
            cabinetView === "edit" &&
            effectiveCabinetSlug && (
              <CabinetEdit
                cabinetSlug={effectiveCabinetSlug}
                onBack={() => navigate(routes.cabinets)}
              />
            )}
          {section === "case-management" && isAddNewCase && <AddNewCase />}
          {section === "case-management" &&
            !isAddNewCase &&
            caseTab === "list" && <ListOfCases />}
          {section === "case-management" &&
            !isAddNewCase &&
            caseTab !== "list" && (
              <CaseManagementContent
                patient={selectedPatient}
                onGenerateInvoice={handleGenerateInvoice}
                onOpenSettings={() => setShowSettingsModal(true)}
                activeTab={caseTab}
                onTabChange={(tab) => {
                  setLastCaseTab(tab);
                  const caseId = selectedPatient?.case_id;
                  const patientRef = selectedPatient?.ref
                    ? String(selectedPatient.ref).trim()
                    : "";
                  const baseUrl =
                    caseId != null
                      ? `${routes.caseManagementList}/id/${caseId}`
                      : routes.caseManagementList;
                  const params = new URLSearchParams(search);
                  params.set("tab", tab);
                  if (caseId == null && patientRef) {
                    params.set("patientRef", patientRef);
                  }
                  navigate(`${baseUrl}?${params.toString()}`, {
                    replace: true,
                  });
                }}
              />
            )}
          {section === "doctors-billing" && <DoctorsBillingPage />}
          {section === "users" && userView === "list" && <ListOfUsers />}
          {section === "users" && userView === "detail" && (
            <UserDetail userId={userId} />
          )}
          {section === "users" && userView === "add" && <CreateUser />}
          {section === "profile" && <MyProfile />}
        </Suspense>
      </DashboardLayout>

      {showInvoiceModal && (
        <Suspense fallback={null}>
          <InvoiceModal
            data={invoiceData}
            onClose={() => setShowInvoiceModal(false)}
            onConfirm={handleInvoiceConfirm}
            confirmLabel="Confirm & save"
          />
        </Suspense>
      )}
      {showSettingsModal && (
        <Suspense fallback={null}>
          <SettingsModal onClose={() => setShowSettingsModal(false)} />
        </Suspense>
      )}
      {busyOverlay}
    </>
  );
}

export default function Dashboard() {
  const { pathname, search, key: locationKey } = useLocation();
  const scope = pathname.startsWith("/app/doctor") ? "doctor" : "company";
  const actor = useMemo(
    () => (scope === "doctor" ? getCurrentDoctorIdentity() : null),
    [scope]
  );
  // Single remount point: pathname + search + history key. Multiple keyed Suspense
  // boundaries caused flaky UI in dev (HMR); one key keeps section in sync with URL.
  const routeContentKey = `${pathname}${search}-${locationKey}`;
  return (
    <DashboardProvider scope={scope} actor={actor}>
      <DashboardInner key={routeContentKey} />
    </DashboardProvider>
  );
}
