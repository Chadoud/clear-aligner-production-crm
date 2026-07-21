import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { ApiError } from "@/core/errors/ApiError";
import { usePatientService } from "./usePatientService.js";
import { updatePatientDemographics } from "@/services/patient/patientDemographicsService.js";
import { normalizeBirthDateYmd } from "@/constants/defaultBirthDate.js";

function splitDisplayName(name) {
  const t = String(name ?? "").trim();
  if (!t) return { firstName: "", lastName: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t, lastName: "" };
  return { firstName: t.slice(0, i).trim(), lastName: t.slice(i + 1).trim() };
}

function buildInitialForm(patient) {
  const { firstName, lastName } = splitDisplayName(patient?.name);
  return {
    firstName,
    lastName,
    title:
      patient?.title === 0 || patient?.title === 1 ? String(patient.title) : "",
    email: patient?.rawEmail != null ? String(patient.rawEmail) : "",
    phone: patient?.rawPhone != null ? String(patient.rawPhone) : "",
    address: patient?.rawAddress != null ? String(patient.rawAddress) : "",
    dateOfBirth: normalizeBirthDateYmd(patient?.bornYmd),
  };
}

/**
 * Form state + save for Edit patient modal (demographics PATCH).
 * @param {object|null|undefined} patient - Formatted patient from CaseSection (includes rawEmail, bornYmd, …)
 * @param {boolean} isOpen
 */
export function usePatientDemographicsEditor(patient, isOpen) {
  const { setSelectedPatient } = useDashboard();
  const { service: patientService } = usePatientService();
  const [form, setForm] = useState(() => buildInitialForm(patient));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && patient) {
      setForm(buildInitialForm(patient));
      setError("");
    }
  }, [isOpen, patient]);

  const setField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }, []);

  const validate = useCallback(() => {
    if (!String(form.firstName ?? "").trim()) {
      return "First name is required.";
    }
    if (!String(form.lastName ?? "").trim()) {
      return "Last name is required.";
    }
    const dob = String(form.dateOfBirth ?? "").trim();
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return "Date of birth must be YYYY-MM-DD.";
    }
    return "";
  }, [form.firstName, form.lastName, form.dateOfBirth]);

  const submit = useCallback(async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return false;
    }
    const ref = patient?.ref;
    if (!ref || !patientService?.loadPatientData) {
      setError("Missing patient or patient service.");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      const titleStr = String(form.title ?? "").trim();
      const payload = {
        first_name: String(form.firstName).trim(),
        last_name: String(form.lastName).trim(),
        title: titleStr === "" ? null : Number(titleStr),
        email:
          String(form.email ?? "").trim() === ""
            ? null
            : String(form.email).trim(),
        phone:
          String(form.phone ?? "").trim() === ""
            ? null
            : String(form.phone).trim(),
        address:
          String(form.address ?? "").trim() === ""
            ? null
            : String(form.address).trim(),
        date_of_birth:
          String(form.dateOfBirth ?? "").trim() === ""
            ? null
            : String(form.dateOfBirth).trim().slice(0, 10),
      };
      await updatePatientDemographics(ref, payload);
      await patientService.loadPatientData();
      const fresh =
        patientService.getPatientByRef?.(ref) ??
        (patient?.case_id != null && patientService.getPatientByCaseId
          ? patientService.getPatientByCaseId(patient.case_id)
          : null);
      if (fresh) {
        const formatted =
          patientService.formatPatientForDisplay?.(fresh) ?? fresh;
        setSelectedPatient?.(formatted);
      }
      return true;
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? (e.userMessage ?? e.message)
          : e instanceof Error
            ? e.message
            : "Save failed.";
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, patient, patientService, setSelectedPatient, validate]);

  return { form, setField, error, saving, submit, setError };
}
