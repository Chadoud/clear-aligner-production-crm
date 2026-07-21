import FileUploadZone from "@/components/shared/FileUploadZone/FileUploadZone";
import "./steps.css";

export default function StepPatientFile({ data, onChange }) {
  return (
    <div className="step-content">
      <h2 className="step-heading">
        <i className="fas fa-folder-open" aria-hidden /> Patient file
      </h2>
      <p className="step-description">Upload patient documents and records.</p>

      {/* File uploads */}
      <div className="form-group">
        <span className="form-section-label">
          <i className="fas fa-paperclip" aria-hidden /> Documents &amp; records
        </span>
        <div className="step-uploads-grid">
          <div className="form-group">
            <label>
              <i className="fas fa-x-ray" aria-hidden /> X-rays
            </label>
            <FileUploadZone
              files={data.filesRadiographies}
              onChange={(files) => onChange({ filesRadiographies: files })}
              accept="image/*,.pdf"
              label="Drop radiography files here"
            />
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-camera" aria-hidden /> Photos
            </label>
            <FileUploadZone
              files={data.filesPhotos}
              onChange={(files) => onChange({ filesPhotos: files })}
              accept="image/*"
              label="Drop photo files here"
            />
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-file-alt" aria-hidden /> Documents
            </label>
            <FileUploadZone
              files={data.filesDocuments}
              onChange={(files) => onChange({ filesDocuments: files })}
              accept=".pdf,.doc,.docx"
              label="Drop document files here"
            />
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-cube" aria-hidden /> 3D Model
            </label>
            <FileUploadZone
              files={data.filesModele3D}
              onChange={(files) => onChange({ filesModele3D: files })}
              accept=".stl,.obj,.ply,.3mf"
              label="Drop 3D model files here"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
