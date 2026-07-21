import { createPortal } from "react-dom";
import { usePatientDemographicsEditor } from "@/hooks/usePatientDemographicsEditor";
import SingleDatePicker from "@/components/shared/DatePicker/SingleDatePicker";
import { DEFAULT_BIRTH_DATE_YMD } from "@/constants/defaultBirthDate.js";
import "./EditPatientModal.css";

export default function EditPatientModal({ patient, open, onClose }) {
  const { form, setField, error, saving, submit } =
    usePatientDemographicsEditor(patient, open);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await submit();
    if (ok) onClose?.();
  };

  return createPortal(
    <div
      className="edit-patient-modal-overlay"
      role="presentation"
      onClick={() => !saving && onClose?.()}
    >
      <div
        className="edit-patient-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-patient-modal-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="edit-patient-modal-header">
          <h2
            id="edit-patient-modal-title"
            className="edit-patient-modal-title"
          >
            Edit patient
          </h2>
        </div>
        <form className="edit-patient-modal-body" onSubmit={handleSubmit}>
          <div className="edit-patient-modal-grid">
            <label className="edit-patient-modal-field">
              <span className="edit-patient-modal-label">Title</span>
              <select
                className="edit-patient-modal-input"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                aria-label="Title"
              >
                <option value="">—</option>
                <option value="0">Mr</option>
                <option value="1">Mrs</option>
              </select>
            </label>
            <label className="edit-patient-modal-field edit-patient-modal-field-span2">
              <span className="edit-patient-modal-label">First name</span>
              <input
                type="text"
                className="edit-patient-modal-input"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                autoComplete="given-name"
                required
              />
            </label>
            <label className="edit-patient-modal-field edit-patient-modal-field-span2">
              <span className="edit-patient-modal-label">Last name</span>
              <input
                type="text"
                className="edit-patient-modal-input"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                autoComplete="family-name"
                required
              />
            </label>
            <div className="edit-patient-modal-field edit-patient-modal-field-span2 edit-patient-modal-field--date">
              <span className="edit-patient-modal-label">Date of birth</span>
              <SingleDatePicker
                id="edit-patient-date-of-birth"
                value={form.dateOfBirth}
                onChange={(val) => setField("dateOfBirth", val)}
                placeholder="dd.mm.yyyy"
                allowFuture={false}
                defaultViewYmd={DEFAULT_BIRTH_DATE_YMD}
                disabled={saving}
              />
            </div>
            <label className="edit-patient-modal-field edit-patient-modal-field-span2">
              <span className="edit-patient-modal-label">Email</span>
              <input
                type="email"
                className="edit-patient-modal-input"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="edit-patient-modal-field edit-patient-modal-field-span2">
              <span className="edit-patient-modal-label">Phone</span>
              <input
                type="tel"
                className="edit-patient-modal-input"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label className="edit-patient-modal-field edit-patient-modal-field-full">
              <span className="edit-patient-modal-label">Address</span>
              <textarea
                className="edit-patient-modal-textarea"
                rows={2}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                autoComplete="street-address"
              />
            </label>
          </div>
          {error ? (
            <p className="edit-patient-modal-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="edit-patient-modal-actions">
            <button
              type="button"
              className="edit-patient-modal-btn"
              onClick={() => !saving && onClose?.()}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-patient-modal-btn edit-patient-modal-btn-primary"
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
