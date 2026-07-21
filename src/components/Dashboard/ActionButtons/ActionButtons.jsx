import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDashboard } from "@/context/DashboardContext";
import { useDashboardInvoiceData } from "@/context/InvoiceDataContext";
import { useServices } from "@/context/ServicesContext.jsx";
import { usePatientService } from "@/hooks";
import {
  CASE_STATUS_OPTIONS,
  uiStatusToDbStatus,
} from "@/utils/cases/index.js";
import { brandFromCabinetId } from "@/config/brand";
import { filterInvoicesForPatient } from "@/services/invoiceDataService";
import {
  getInvoiceUpdatesFromPatientStatus,
  getLastInvoiceForPatient,
  getNextReactivationRef,
  getReactivationCount,
  REACTIVATION_DB_STATUS,
} from "@/utils/invoices/patientInvoiceSyncHelpers";
import { buildReactivationInvoicePayload } from "@/utils/invoices/reactivationInvoiceBuilder";
import { setLastPatientChangeByUser } from "@/services/patientInvoiceSyncGuard";
import AcceptanceModal from "../AcceptanceModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import "./ActionButtons.css";

/** DB status 8 = No follow-up (Classer sans suite) */
const NO_FOLLOW_UP_DB_STATUS = 8;

const ActionButtons = ({ patient }) => {
  const { t } = useTranslation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const dropdownRef = useRef(null);
  const { setSelectedPatient, scope } = useDashboard();
  const { allInvoices, updateInvoice, refreshInvoices, addInvoice } =
    useDashboardInvoiceData();
  const { loadServicesForBrand } = useServices();
  const { service: patientService } = usePatientService();
  const canChangeStatus = scope === "company";

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  const handleStatusOptionClick = (e, uiStatusId) => {
    e.preventDefault();
    setOpenDropdown(null);
    const opt = CASE_STATUS_OPTIONS.find((o) => o.id === uiStatusId);
    if (opt) {
      setPendingStatus({ uiStatusId, labelKey: opt.labelKey });
      setStatusConfirmOpen(true);
    }
  };

  const executeStatusChange = async () => {
    if (!pendingStatus) return;
    const uiStatusId = pendingStatus.uiStatusId;
    setStatusConfirmOpen(false);
    setPendingStatus(null);
    if (
      !patient?.ref ||
      !patientService?.updatePatientByRef ||
      !patientService?.getPatientByRef ||
      !patientService?.loadPatientData
    )
      return;
    const dbStatus = uiStatusToDbStatus(uiStatusId);
    if (dbStatus === undefined) return;
    setStatusChanging(true);
    try {
      let refToUse = patient.ref;
      const updates = { case_status: dbStatus };

      if (dbStatus === REACTIVATION_DB_STATUS) {
        const newRef = getNextReactivationRef(patient.ref);
        updates.case_ref = newRef;
        refToUse = newRef;
      }

      const ok = await patientService.updatePatientByRef(patient.ref, updates);
      if (!ok) return;
      setLastPatientChangeByUser(refToUse);

      if (
        dbStatus === REACTIVATION_DB_STATUS &&
        getReactivationCount(refToUse) === 3
      ) {
        const brand =
          patient?.cabinet_id != null
            ? brandFromCabinetId(patient.cabinet_id)
            : "Lab";
        if (loadServicesForBrand && addInvoice) {
          const servicesList = await loadServicesForBrand(brand);
          const getServiceByCodeLocal = (code) =>
            servicesList?.find((s) => s?.code === code) ?? undefined;
          const payload = buildReactivationInvoicePayload(
            patient,
            refToUse,
            brand,
            getServiceByCodeLocal
          );
          if (payload) {
            await addInvoice(payload);
            await patientService.updatePatientByRef(refToUse, {
              case_status: REACTIVATION_DB_STATUS,
            });
            if (refreshInvoices) await refreshInvoices();
          }
        }
      } else if (
        canChangeStatus &&
        updateInvoice &&
        refreshInvoices &&
        allInvoices
      ) {
        const patientInvoices = filterInvoicesForPatient(allInvoices, patient);
        const lastInvoice = getLastInvoiceForPatient(patientInvoices);
        if (lastInvoice) {
          const invoiceUpdates = getInvoiceUpdatesFromPatientStatus(
            dbStatus,
            lastInvoice
          );
          if (invoiceUpdates) {
            await updateInvoice(lastInvoice, invoiceUpdates);
            await refreshInvoices();
          }
        }
      }

      await patientService.loadPatientData();
      const fresh =
        patientService.getPatientByRef(refToUse) ??
        (patient?.case_id != null
          ? patientService.getPatientByCaseId?.(patient.case_id)
          : null);
      if (fresh) {
        const formatted =
          patientService.formatPatientForDisplay?.(fresh) ?? fresh;
        setSelectedPatient(formatted);
      }
    } finally {
      setStatusChanging(false);
    }
  };

  const handleCancelCase = async () => {
    setCancelConfirmOpen(false);
    if (
      !patient?.ref ||
      !patientService?.updatePatientByRef ||
      !patientService?.getPatientByRef ||
      !patientService?.loadPatientData
    )
      return;
    setStatusChanging(true);
    try {
      const ok = await patientService.updatePatientByRef(patient.ref, {
        case_status: NO_FOLLOW_UP_DB_STATUS,
      });
      if (!ok) return;
      setLastPatientChangeByUser(patient.ref);
      if (canChangeStatus && updateInvoice && refreshInvoices && allInvoices) {
        const patientInvoices = filterInvoicesForPatient(allInvoices, patient);
        const lastInvoice = getLastInvoiceForPatient(patientInvoices);
        if (lastInvoice) {
          const updates = getInvoiceUpdatesFromPatientStatus(
            NO_FOLLOW_UP_DB_STATUS,
            lastInvoice
          );
          if (updates) {
            await updateInvoice(lastInvoice, updates);
            await refreshInvoices();
          }
        }
      }
      await patientService.loadPatientData();
      const fresh = patientService.getPatientByRef(patient.ref);
      if (fresh) {
        const formatted =
          patientService.formatPatientForDisplay?.(fresh) ?? fresh;
        setSelectedPatient(formatted);
      }
    } finally {
      setStatusChanging(false);
    }
  };

  const dbStatus =
    patient?.case_status != null ? Number(patient.case_status) : null;
  const isAwaitingAcceptance =
    dbStatus === 4 || dbStatus === REACTIVATION_DB_STATUS;
  const showAccept = patient && isAwaitingAcceptance;
  const showCancel = patient && !isAwaitingAcceptance && canChangeStatus;

  return (
    <>
      <div className="action-buttons-row">
        {showAccept && (
          <button
            type="button"
            className="action-btn action-btn-accept"
            onClick={() => setAcceptanceModalOpen(true)}
          >
            <i className="fas fa-check" aria-hidden />
            {t("actionButtons.accept")}
          </button>
        )}
        <AcceptanceModal
          isOpen={acceptanceModalOpen}
          onClose={() => setAcceptanceModalOpen(false)}
          patient={patient}
        />
        {canChangeStatus || showCancel ? (
          <div className="action-buttons-inline-group">
            {canChangeStatus && (
              <div className="dropdown-wrapper" ref={dropdownRef}>
                <button
                  className="action-btn dropdown-btn"
                  onClick={() => toggleDropdown("status")}
                  disabled={!patient || statusChanging}
                  title={
                    patient
                      ? t("actionButtons.changeStatusTitle")
                      : t("actionButtons.changeStatusDisabled")
                  }
                >
                  {statusChanging
                    ? t("actionButtons.changeStatusUpdating")
                    : t("actionButtons.changeStatusOpen")}
                  <i className="fas fa-chevron-down"></i>
                </button>
                {openDropdown === "status" && (
                  <div className="dropdown-menu">
                    {CASE_STATUS_OPTIONS.map((opt) => (
                      <a
                        key={opt.id}
                        href="#"
                        className="dropdown-item"
                        onClick={(e) => handleStatusOptionClick(e, opt.id)}
                      >
                        {t(opt.labelKey)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
            {showCancel && (
              <button
                type="button"
                className="action-btn action-btn-danger"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={statusChanging}
                title={t("actionButtons.classifyNoFollowUp")}
              >
                <i className="fas fa-trash"></i>
                {t("actionButtons.cancel")}
              </button>
            )}
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        open={cancelConfirmOpen}
        title={t("actionButtons.cancelCaseTitle")}
        message={t("actionButtons.cancelCaseMessage")}
        confirmLabel={t("actionButtons.cancelCaseConfirm")}
        cancelLabel={t("actionButtons.cancelCaseBack")}
        confirmVariant="danger"
        onConfirm={handleCancelCase}
        onCancel={() => setCancelConfirmOpen(false)}
      />
      <ConfirmDialog
        open={statusConfirmOpen}
        title={t("actionButtons.changeStatusDialogTitle")}
        message={
          pendingStatus
            ? t("actionButtons.statusConfirm", {
                label: t(pendingStatus.labelKey),
              })
            : ""
        }
        confirmLabel={t("actionButtons.changeStatusConfirm")}
        cancelLabel={t("actionButtons.changeStatusCancel")}
        onConfirm={executeStatusChange}
        onCancel={() => {
          setStatusConfirmOpen(false);
          setPendingStatus(null);
        }}
      />
    </>
  );
};

export default ActionButtons;
