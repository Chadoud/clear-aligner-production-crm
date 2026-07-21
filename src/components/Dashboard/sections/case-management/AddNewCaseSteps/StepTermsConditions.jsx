import "./steps.css";

export default function StepTermsConditions({ data, onChange }) {
  return (
    <div className="step-content">
      <h2 className="step-heading">
        <i className="fas fa-file-contract" aria-hidden /> Terms and conditions
      </h2>
      <p className="step-description">
        Please read and accept the general terms and conditions before
        submitting the new case.
      </p>

      <div className="step-terms-box">
        <h3 className="step-terms-title">General Terms and Conditions</h3>

        <p>
          By creating a new case, you confirm that all patient information
          provided is accurate and complete to the best of your knowledge. You
          accept responsibility for the correctness of the submitted data.
        </p>
        <p>
          The treatment plan and associated records submitted through this
          platform are intended for professional orthodontic use only. All
          patient data is handled in accordance with applicable data protection
          regulations (GDPR / LPD).
        </p>
        <p>
          Lab reserves the right to request additional documentation before
          proceeding with fabrication. Submitted models and records must meet
          the required quality standards. Incomplete or insufficient submissions
          may result in processing delays.
        </p>
        <p>
          Prices, delivery times, and specific conditions are subject to the
          current Lab price list and service agreement. Changes to an accepted
          treatment plan may incur additional charges.
        </p>
        <p>
          By accepting these terms, you authorize Lab to process the patient
          data strictly for the purpose of delivering the requested orthodontic
          services.
        </p>
      </div>

      <label className="step-terms-accept">
        <input
          type="checkbox"
          checked={data.termsAccepted}
          onChange={(e) => onChange({ termsAccepted: e.target.checked })}
        />
        <span>
          I accept the terms and conditions <span className="required">*</span>
        </span>
      </label>

      {!data.termsAccepted && (
        <p className="step-terms-hint">
          <i className="fas fa-info-circle" aria-hidden /> You must accept the
          terms and conditions to proceed.
        </p>
      )}
    </div>
  );
}
