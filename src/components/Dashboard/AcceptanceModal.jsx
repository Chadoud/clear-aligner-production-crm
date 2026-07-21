import { useState, useCallback, useEffect } from "react";
import { usePatientService } from "../../hooks";
import { useDashboard } from "../../context/DashboardContext";
import { SingleDatePicker } from "../shared/DatePicker";
import {
  dispatchPatientsRefresh,
  dispatchPatientsRefreshSoft,
  dispatchInvoicesRefresh,
} from "@/services/caseService";
import { updatePatientInCacheByRef } from "@/services/patient/patientDataRepository";
import "./AcceptanceModal.css";

const LEGAL_TEXT =
  "By clicking YES, you confirm acceptance of the pricing proposal made by the Lab team. This will start production work and is irreversible. Accepted proposals will be invoiced for the full amount of the work.  BY CLICKING YES YOU DECLARE THAT YOU HAVE READ AND ACCEPT THE CONDITIONS STATED ABOVE.";

/** Split legal text into lines at each period. */
const LEGAL_TEXT_LINES = LEGAL_TEXT.split(/(?<=\.)\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

/** Default delivery date: 12 days from today (YYYY-MM-DD). */
function getDefaultDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 12);
  return d.toISOString().slice(0, 10);
}

export default function AcceptanceModal({ isOpen, onClose, patient }) {
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate);
  const [submitting, setSubmitting] = useState(false);
  const { service: patientService } = usePatientService();
  const { setSelectedPatient } = useDashboard();

  useEffect(() => {
    if (isOpen) {
      setDeliveryDate(getDefaultDeliveryDate());
    }
  }, [isOpen]);

  const handleConfirm = useCallback(async () => {
    if (!patient?.ref || !patientService?.acceptPatientByRef) return;
    const dateToUse = deliveryDate?.trim() || getDefaultDeliveryDate();
    setSubmitting(true);
    try {
      const updated = await patientService.acceptPatientByRef(
        patient.ref,
        dateToUse
      );
      if (updated) {
        const merged = {
          ...updated,
          case_status: 5,
          desired_delivery_date: dateToUse,
        };
        updatePatientInCacheByRef(patient.ref, {
          case_status: 5,
          desired_delivery_date: dateToUse,
        });
        dispatchPatientsRefreshSoft();
        dispatchPatientsRefresh();
        dispatchInvoicesRefresh();
        await patientService.loadPatientData?.();
        const formatted = patientService.formatPatientForDisplay?.(merged);
        setSelectedPatient(formatted ?? merged);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [patient?.ref, deliveryDate, patientService, setSelectedPatient, onClose]);

  const handleClose = useCallback(() => {
    if (!submitting) {
      setDeliveryDate("");
      onClose();
    }
  }, [submitting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="acceptance-modal-backdrop" onClick={handleClose}>
      <div
        className="acceptance-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="acceptance-modal-title"
        aria-modal="true"
      >
        <h2 id="acceptance-modal-title" className="acceptance-modal-title">
          Acceptance of the price proposal
        </h2>
        <p className="acceptance-modal-legal">
          {LEGAL_TEXT_LINES.map((line, i) => (
            <span key={i}>
              {line}
              {i < LEGAL_TEXT_LINES.length - 1 && <br />}
            </span>
          ))}
        </p>
        <div className="acceptance-modal-field">
          <SingleDatePicker
            id="acceptance-modal-delivery-date"
            label="Desired delivery date"
            value={deliveryDate}
            onChange={setDeliveryDate}
            placeholder="dd.mm.yyyy"
            allowFuture={true}
          />
        </div>
        <div className="acceptance-modal-actions">
          <button
            type="button"
            className="acceptance-modal-btn acceptance-modal-btn-cancel"
            onClick={handleClose}
            disabled={submitting}
          >
            NO
          </button>
          <button
            type="button"
            className="acceptance-modal-btn acceptance-modal-btn-confirm"
            onClick={handleConfirm}
            disabled={submitting}
          >
            YES
          </button>
        </div>
      </div>
    </div>
  );
}
