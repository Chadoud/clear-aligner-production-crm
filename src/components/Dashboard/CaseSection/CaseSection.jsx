import { useMemo, useState, useRef, useEffect } from "react";
import LoadingDonut from "../../shared/LoadingDonut/LoadingDonut";
import { useDashboard } from "@/context/DashboardContext";
import { useDashboardInvoiceData } from "@/context/InvoiceDataContext";
import { updateCaseRef, dispatchPatientsRefresh } from "@/services/caseService";
import { filterInvoicesForPatient } from "@/services/invoiceDataService";
import { brandFromCabinetId } from "@/config/brand";
import {
  resolveTreatmentDurationMonths,
  resolveTreatmentWindow,
  formatTreatmentEndDate,
} from "@/utils/patientTreatmentDuration";
import { formatDateEnGB } from "@/utils/invoices/index.js";
import EditPatientModal from "../sections/case-management/EditPatientModal.jsx";
import "./CaseSection.css";

const CaseSection = ({ patient }) => {
  const { scope, setSelectedPatient } = useDashboard();
  const { invoices: allInvoices = [] } = useDashboardInvoiceData();
  const [isEditingRef, setIsEditingRef] = useState(false);
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editRefValue, setEditRefValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditingRef && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingRef]);

  const isLab =
    patient?.cabinet_id != null &&
    brandFromCabinetId(Number(patient.cabinet_id)) === "Lab";

  const patientInvoices = useMemo(
    () => filterInvoicesForPatient(allInvoices, patient),
    [allInvoices, patient]
  );

  const monitoringSummary = useMemo(() => {
    if (!patient) return null;
    const durationMonths = resolveTreatmentDurationMonths({
      alignerMonitoringMonthsOverride: isLab
        ? patient.aligner_monitoring_months
        : null,
      invoices: patientInvoices,
      cabinetId: patient.cabinet_id,
    });
    const { treatmentEnd } = resolveTreatmentWindow({
      desiredDeliveryDate: patient.desired_delivery_date,
      durationMonths,
    });
    return {
      durationMonths,
      treatmentEndLabel: formatTreatmentEndDate(treatmentEnd),
    };
  }, [patient, patientInvoices, isLab]);

  const handleRefClick = () => {
    if (!patient?.case_id) return;
    setEditRefValue(patient.ref ?? "");
    setIsEditingRef(true);
  };

  const handleRefSave = async () => {
    if (!patient?.case_id) return;
    const trimmed = String(editRefValue ?? "").trim();
    if (!trimmed || trimmed === patient.ref) {
      setIsEditingRef(false);
      return;
    }
    const ok = await updateCaseRef(patient.case_id, trimmed);
    setIsEditingRef(false);
    if (ok) {
      dispatchPatientsRefresh();
      setSelectedPatient?.({ ...patient, ref: trimmed });
    }
  };

  const handleRefKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRefSave();
    }
    if (e.key === "Escape") {
      setIsEditingRef(false);
      setEditRefValue(patient.ref ?? "");
    }
  };

  if (!patient) {
    return (
      <div className="case-section">
        <div className="case-header case-section-loading">
          <LoadingDonut size="sm" message="Loading patient data..." />
        </div>
      </div>
    );
  }

  const fullName = patient.titleLabel
    ? `${patient.titleLabel} ${patient.name}`
    : patient.name;
  const showBeware =
    scope === "company" ? patient.hasBewareForLab : patient.hasBewareForDoctor;

  return (
    <div className="case-section">
      <div className="case-section-header">
        <div className="case-section-header-top">
          <div className="case-section-name-row">
            <h1 className="case-section-name case-name">{fullName}</h1>
            {isEditingRef ? (
              <span className="case-section-ref case-section-ref-editing">
                #
                <input
                  ref={inputRef}
                  type="text"
                  className="case-section-ref-input"
                  value={editRefValue}
                  onChange={(e) => setEditRefValue(e.target.value)}
                  onBlur={handleRefSave}
                  onKeyDown={handleRefKeyDown}
                  aria-label="Edit reference"
                />
              </span>
            ) : (
              <button
                type="button"
                className="case-section-ref case-ref"
                onClick={handleRefClick}
                aria-label={`Reference ${patient.ref}. Click to edit`}
                title="Click to edit reference"
              >
                #{patient.ref}
              </button>
            )}
            {patient.principalStatus && patient.principalStatus !== "—" && (
              <span
                className="case-section-status"
                aria-label={`Status: ${patient.principalStatus}`}
              >
                {patient.principalStatus}
              </span>
            )}
            {showBeware && (
              <span
                className="case-section-status case-section-status--alert"
                aria-label="Requires attention"
              >
                Beware
              </span>
            )}
          </div>
          <div className="case-section-header-actions">
            <button
              type="button"
              className="case-section-edit-patient"
              onClick={() => setEditPatientOpen(true)}
              aria-label="Edit patient details"
            >
              Edit patient
            </button>
          </div>
        </div>
      </div>

      <EditPatientModal
        patient={patient}
        open={editPatientOpen}
        onClose={() => setEditPatientOpen(false)}
      />

      <div className="case-section-details">
        <div className="case-section-detail" data-field="born">
          <i
            className="fas fa-birthday-cake case-section-detail-icon"
            aria-hidden
          />
          <span>{patient.born ? `Born on ${patient.born}` : "—"}</span>
        </div>
        <div className="case-section-detail" data-field="entered">
          <i
            className="fas fa-calendar-plus case-section-detail-icon"
            aria-hidden
          />
          <span>{patient.entered ? `Entered on ${patient.entered}` : "—"}</span>
        </div>
        <div className="case-section-detail" data-field="cabinet">
          <i className="fas fa-building case-section-detail-icon" aria-hidden />
          <span>Cabinet: {patient.cabinet || "—"}</span>
        </div>
        {patient.desired_delivery_date && (
          <div className="case-section-detail" data-field="delivery">
            <i className="fas fa-truck case-section-detail-icon" aria-hidden />
            <span>
              Delivery: {formatDateEnGB(patient.desired_delivery_date)}
            </span>
          </div>
        )}
        {monitoringSummary?.treatmentEndLabel && (
          <div
            className="case-section-detail"
            data-field="aligner-monitoring-end"
          >
            <i className="fas fa-camera case-section-detail-icon" aria-hidden />
            <span>
              Aligner photo follow-up until:{" "}
              {monitoringSummary.treatmentEndLabel}
            </span>
          </div>
        )}
        {!isLab && monitoringSummary?.durationMonths && (
          <div
            className="case-section-detail"
            data-field="aligner-monitoring-hint"
          >
            <i
              className="fas fa-info-circle case-section-detail-icon"
              aria-hidden
            />
            <span>
              Photo reminders use the longest invoice payment plan (
              {monitoringSummary.durationMonths} months).
            </span>
          </div>
        )}
        <div className="case-section-detail" data-field="email">
          <i className="fas fa-envelope case-section-detail-icon" aria-hidden />
          {patient.email &&
          patient.email !== "—" &&
          patient.email.includes("@") ? (
            <a href={`mailto:${patient.email}`} className="case-section-email">
              {patient.email}
            </a>
          ) : (
            <span>{patient.email ?? "—"}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseSection;
