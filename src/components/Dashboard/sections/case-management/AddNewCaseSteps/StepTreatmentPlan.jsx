import { useCallback, useState } from "react";
import StrippingAttachmentsV2 from "@/components/shared/DentalToothGrid/components/treatmentPlan/StrippingAttachmentsV2";
import StrippingV2PreviewModal from "@/components/shared/DentalToothGrid/components/treatmentPlan/StrippingV2PreviewModal";
import "./steps.css";
import "@/components/shared/DentalToothGrid/DentalToothGrid.css";

export default function StepTreatmentPlan({
  data,
  onChange,
  readOnly = false,
}) {
  const [v2PrintScene, setV2PrintScene] = useState(null);
  const patientName =
    [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || null;

  const handleV2SceneChange = useCallback(
    (payload) => onChange({ strippingV2: payload }),
    [onChange]
  );
  const handleV2PrintPreview = useCallback(
    (scene) => setV2PrintScene(scene),
    []
  );

  const v2Props = {
    initialScene: data.strippingV2 == null ? undefined : data.strippingV2,
    onPrintPreview: handleV2PrintPreview,
    readOnly: false,
    scope: readOnly ? "doctor" : "company",
    restrictedToDoctorOwnedEdits: readOnly,
    hideAlignerSteps: readOnly,
    onSceneChange: readOnly ? undefined : handleV2SceneChange,
  };

  return (
    <div className="step-content">
      <h2 className="step-heading">
        <i className="fas fa-file-medical-alt" aria-hidden /> Plan
      </h2>
      <p className="step-description">
        {readOnly
          ? "View the dental schema and treatment plan."
          : "Place modules and stripping markers on the dental schema to build the treatment plan."}
      </p>

      <div className="form-group">
        <span className="form-section-label">
          <i className="fas fa-tooth" aria-hidden /> Dental schema – modules
          &amp; treatment steps
        </span>
        <StrippingAttachmentsV2 {...v2Props} />
        {v2PrintScene != null && (
          <StrippingV2PreviewModal
            scene={v2PrintScene}
            patientName={patientName}
            onClose={() => setV2PrintScene(null)}
          />
        )}
      </div>
    </div>
  );
}
