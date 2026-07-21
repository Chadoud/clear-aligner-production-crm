import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCaseDocs, useRefreshCaseSheetOnMount } from "@/hooks";
import { uploadCaseDoc, deleteCaseDoc } from "@/services/caseDocsService.js";
import { filterDocsByType } from "./docCategoryConfig.js";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import FileUploadZone from "@/components/shared/FileUploadZone/FileUploadZone.jsx";
import DocumentsGridWithLightbox from "./DocumentsGridWithLightbox.jsx";

const DOC_TYPE = "docs-prives";

export default function TabDocsPrives({ patient, refreshCaseSheet }) {
  const { t } = useTranslation();
  useRefreshCaseSheetOnMount(refreshCaseSheet, patient?.case_id);
  const { docs: allDocs, loading, refreshDocs } = useCaseDocs(patient?.case_id);
  const docs = useMemo(() => filterDocsByType(allDocs, DOC_TYPE), [allDocs]);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleSend = async () => {
    if (!patient?.case_id) return;
    const hasMessage = message.trim().length > 0;
    const hasFiles = files.length > 0;
    if (!hasMessage && !hasFiles) return;

    setUploadError(null);
    setUploading(true);
    try {
      if (hasFiles) {
        for (const file of files) {
          await uploadCaseDoc(
            patient.case_id,
            file,
            DOC_TYPE,
            hasMessage ? message.trim() : ""
          );
        }
      } else {
        await uploadCaseDoc(patient.case_id, null, DOC_TYPE, message.trim());
      }
      setMessage("");
      setFiles([]);
      await refreshDocs();
    } catch (err) {
      setUploadError(err?.message ?? t("caseMgmt.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const canSend = (message.trim().length > 0 || files.length > 0) && !uploading;

  if (!patient) {
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">
          {t("caseMgmt.docsPrives.emptyPatient")}
        </p>
      </div>
    );
  }

  return (
    <div className="form-section tab-panel">
      <h3 className="tab-panel-title">{t("caseMgmt.docsPrives.title")}</h3>

      {uploadError && (
        <div className="tab-panel-error" role="alert">
          {uploadError}
        </div>
      )}

      <div className="tab-docs-prives-grid-wrap">
        {loading ? (
          <div className="tab-panel-loading-inline">
            <LoadingDonut
              size="md"
              message={t("caseMgmt.docsPrives.loading")}
            />
          </div>
        ) : docs.length === 0 ? (
          <p className="tab-panel-hint">{t("caseMgmt.docsPrives.emptyHint")}</p>
        ) : (
          <DocumentsGridWithLightbox
            docs={docs}
            caseId={patient.case_id}
            onDelete={async (storedFilename) => {
              await deleteCaseDoc(patient.case_id, storedFilename);
              await refreshDocs();
            }}
          />
        )}
      </div>

      <div className="tab-docs-prives-compose">
        <div className="tab-doc-upload-message">
          <label
            htmlFor="doc-prives-message"
            className="tab-doc-upload-message-label"
          >
            {t("caseMgmt.docsPrives.messageLabel")}
          </label>
          <input
            id="doc-prives-message"
            type="text"
            className="form-input tab-doc-upload-message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("caseMgmt.docsPrives.messagePlaceholder")}
            disabled={uploading}
            aria-label={t("caseMgmt.docsPrives.messageAria")}
          />
        </div>
        <FileUploadZone
          files={files}
          onChange={setFiles}
          label={
            uploading
              ? t("caseMgmt.docsPrives.uploading")
              : t("caseMgmt.docsPrives.dropLabel")
          }
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        <button
          type="button"
          className="btn-base btn-base--primary tab-chat-send"
          onClick={handleSend}
          disabled={!canSend}
          aria-busy={uploading}
          title={t("caseMgmt.docsPrives.sendTitle")}
        >
          <span className="tab-chat-send-label">
            {uploading
              ? t("caseMgmt.docsPrives.sending")
              : t("caseMgmt.docsPrives.send")}
          </span>
        </button>
      </div>
    </div>
  );
}
