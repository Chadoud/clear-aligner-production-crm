import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "@/context/DashboardContext";
import { ROUTES } from "@/routes/sectionConfig";
import { useCabinetList } from "@/hooks/useCabinetList";
import { usePatientService, usePatientSheetNavigation } from "@/hooks";
import {
  createCase,
  getAvailableCabinets,
  fetchNextRef,
} from "@/services/caseCreateService";
import { ADD_NEW_CASE_STEPS } from "./config/steps";
import StepInfoOnCase from "./AddNewCaseSteps/StepInfoOnCase";
import StepPossibleTreatment from "./AddNewCaseSteps/StepPossibleTreatment";
import StepTreatmentPlan from "./AddNewCaseSteps/StepTreatmentPlan";
import StepPatientFile from "./AddNewCaseSteps/StepPatientFile";
import StepTermsConditions from "./AddNewCaseSteps/StepTermsConditions";
import "./AddNewCase.css";

export default function AddNewCase() {
  const { scope, actor } = useDashboard();
  const navigate = useNavigate();
  const { service: patientService } = usePatientService();
  const navigateToPatientSheet = usePatientSheetNavigation();
  const listUrl =
    scope === "doctor"
      ? ROUTES.doctorCaseManagementList
      : ROUTES.caseManagementList;
  const { cabinets: apiCabinets } = useCabinetList();
  // Company: use full cabinet list from API. Doctor: use own cabinet only (from patients or actor).
  const cabinets = useMemo(() => {
    if (scope === "company") {
      return (apiCabinets ?? [])
        .map((c) => c?.name)
        .filter(Boolean)
        .sort();
    }
    return getAvailableCabinets(scope, actor);
  }, [scope, actor, apiCabinets]);
  // Doctors: always use actor.cabinet (even with no patients). Company: prefer Direct when in list.
  const defaultCabinet = useMemo(() => {
    if (scope === "doctor" && actor?.cabinet) {
      return actor.cabinet;
    }
    const direct = cabinets.find((c) =>
      String(c ?? "")
        .toLowerCase()
        .includes("direct")
    );
    return direct ?? cabinets[0] ?? "";
  }, [cabinets, scope, actor?.cabinet]);

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    ref: "",
    firstName: "",
    lastName: "",
    birthday: "",
    email: "",
    address: "",
    phone: "",
    title: "",
    cabinet: defaultCabinet,
    strippingV2: null,
    treatments: [],
    treatmentComments: "",
    filesRadiographies: [],
    filesPhotos: [],
    filesDocuments: [],
    filesModele3D: [],
    termsAccepted: false,
  });

  const updateFormData = useCallback((updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Sync cabinet when defaultCabinet becomes available (e.g. after patient data loads)
  useEffect(() => {
    if (defaultCabinet && !formData.cabinet) {
      setFormData((prev) => ({ ...prev, cabinet: defaultCabinet }));
    }
  }, [defaultCabinet, formData.cabinet]);

  // Pre-fill suggested ref when cabinet is selected (updates when cabinet changes)
  // For doctors with no patients: use actor.cabinet as fallback
  useEffect(() => {
    const cabinet =
      scope === "doctor"
        ? defaultCabinet || actor?.cabinet || ""
        : formData.cabinet || defaultCabinet || "";
    if (!cabinet) return;
    let cancelled = false;
    fetchNextRef(cabinet).then((nextRef) => {
      if (!cancelled && nextRef) {
        setFormData((prev) => ({ ...prev, ref: nextRef }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [scope, defaultCabinet, formData.cabinet, actor?.cabinet]);

  const validateStep0 = useCallback(() => {
    const cabinet = scope === "doctor" ? defaultCabinet : formData.cabinet;
    const errors = [];
    if (!formData.firstName.trim()) errors.push("First name");
    if (!formData.lastName.trim()) errors.push("Name");
    if (!formData.title || formData.title === "") errors.push("Title");
    if (!formData.ref?.trim()) errors.push("Reference");
    if (!cabinet) errors.push("Cabinet");
    if (formData.email?.trim()) {
      const email = formData.email.trim();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) errors.push("a valid email format");
    }
    return errors;
  }, [
    formData.firstName,
    formData.lastName,
    formData.title,
    formData.ref,
    formData.email,
    formData.cabinet,
    scope,
    defaultCabinet,
  ]);

  const handleNext = () => {
    setError("");
    if (currentStep === 0) {
      const errors = validateStep0();
      if (errors.length > 0) {
        setError(`Please fill in all required fields: ${errors.join(", ")}.`);
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, ADD_NEW_CASE_STEPS.length - 1));
  };

  const handlePrev = () => {
    setError("");
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setError("");
    if (!formData.termsAccepted) {
      setError("You must accept the terms and conditions.");
      return;
    }
    const ref = formData.ref.trim();
    const payload = {
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      ref,
      cabinet:
        (scope === "doctor" ? defaultCabinet : formData.cabinet) ||
        defaultCabinet,
      email: formData.email.trim() || undefined,
      address: formData.address?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      title: formData.title !== "" ? Number(formData.title) : undefined,
      birthday: formData.birthday || undefined,
      strippingV2: formData.strippingV2 ?? undefined,
      treatments: formData.treatments,
      treatmentComments: formData.treatmentComments || undefined,
      termsAccepted: formData.termsAccepted,
    };
    setSubmitting(true);
    try {
      const result = await createCase(payload);
      if (result.success) {
        const createdRef = String(result.ref ?? ref).trim();
        const fromList =
          createdRef && patientService?.getPatientByRef?.(createdRef);
        navigateToPatientSheet(
          fromList ?? {
            ref: createdRef,
            case_id: result.caseId,
            name: payload.name,
            cabinet: payload.cabinet,
          },
          { tab: "plan" }
        );
      } else {
        setError("Could not create case. Check required fields.");
      }
    } catch (err) {
      setError("Could not create case. Check required fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate(listUrl);

  const stepComponents = [
    <StepInfoOnCase
      key="step-0"
      data={formData}
      onChange={updateFormData}
      cabinets={cabinets}
      scope={scope}
      defaultCabinet={defaultCabinet}
    />,
    <StepPossibleTreatment
      key="step-1"
      data={formData}
      onChange={updateFormData}
    />,
    <StepTreatmentPlan
      key="step-2"
      data={formData}
      onChange={updateFormData}
      readOnly={scope === "doctor"}
    />,
    <StepPatientFile key="step-3" data={formData} onChange={updateFormData} />,
    <StepTermsConditions
      key="step-4"
      data={formData}
      onChange={updateFormData}
    />,
  ];

  return (
    <section
      className="dashboard-section add-new-case"
      aria-labelledby="add-new-case-title"
    >
      <h1 id="add-new-case-title" className="section-title">
        Add new case
      </h1>

      {/* Step tabs */}
      <div className="wizard-steps" role="tablist" aria-label="Wizard steps">
        {ADD_NEW_CASE_STEPS.map((step, i) => (
          <div key={i} className="wizard-step-item">
            <button
              type="button"
              className={`wizard-step-tab ${i === currentStep ? "wizard-step-tab--active" : ""} ${i < currentStep ? "wizard-step-tab--done" : ""}`}
              onClick={() => i < currentStep && setCurrentStep(i)}
              role="tab"
              aria-selected={i === currentStep}
              tabIndex={i === currentStep ? 0 : -1}
              disabled={i > currentStep}
            >
              <span className="wizard-step-badge">
                {i < currentStep ? (
                  <i className="fas fa-check" aria-hidden />
                ) : (
                  <span>{i + 1}</span>
                )}
              </span>
              <span className="wizard-step-info">
                <span className="wizard-step-sub">Step {i + 1}</span>
                <span className="wizard-step-label">
                  <i className={`${step.icon} wizard-step-icon`} aria-hidden />
                  {step.label}
                </span>
              </span>
            </button>
            {i < ADD_NEW_CASE_STEPS.length - 1 && (
              <span
                className={`wizard-step-connector ${i < currentStep ? "wizard-step-connector--done" : ""}`}
                aria-hidden
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="wizard-content">
        {error && (
          <p className="wizard-error" role="alert">
            <i className="fas fa-exclamation-circle" aria-hidden /> {error}
          </p>
        )}
        {stepComponents[currentStep]}
      </div>

      {/* Navigation footer */}
      <div className="wizard-footer">
        <button
          type="button"
          className="btn-base btn-base--secondary wizard-btn-cancel"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <div className="wizard-footer-nav">
          {currentStep > 0 && (
            <button
              type="button"
              className="btn-base btn-base--secondary"
              onClick={handlePrev}
            >
              <i className="fas fa-arrow-left" aria-hidden /> Previous
            </button>
          )}
          {currentStep < ADD_NEW_CASE_STEPS.length - 1 ? (
            <button
              type="button"
              className="btn-base btn-base--primary wizard-btn-next"
              onClick={handleNext}
              disabled={currentStep === 0 && validateStep0().length > 0}
              title={
                currentStep === 0 && validateStep0().length > 0
                  ? "Fill in all required fields (Title, First name, Name, Reference, Cabinet) to continue"
                  : undefined
              }
            >
              Next <i className="fas fa-arrow-right" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              className="btn-base btn-base--primary"
              onClick={handleSubmit}
              disabled={submitting || !formData.termsAccepted}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden /> Creating…
                </>
              ) : (
                <>
                  <i className="fas fa-plus" aria-hidden /> Add
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
