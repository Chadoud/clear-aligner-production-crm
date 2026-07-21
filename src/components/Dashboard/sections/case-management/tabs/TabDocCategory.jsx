import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCaseDocs, useRefreshCaseSheetOnMount } from "@/hooks";
import { uploadCaseDoc, deleteCaseDoc } from "@/services/caseDocsService.js";
import {
  TAB_TO_DOC_TYPE,
  TAB_ACCEPT,
  filterDocsByType,
} from "./docCategoryConfig.js";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import DocumentsGridWithLightbox from "./DocumentsGridWithLightbox.jsx";
import FileUploadZone from "@/components/shared/FileUploadZone/FileUploadZone.jsx";

const TAB_TITLE_KEYS = {
  photographie: "caseTabs.photography",
  radiographie: "caseTabs.xray",
  "empreinte-3d": "caseTabs.model3d",
  "autres-documents": "caseTabs.documents",
  documents: "caseTabs.documents",
};

const TABS_WITH_MESSAGE = ["documents", "autres-documents"];

export default function TabDocCategory({ patient, tabId, refreshCaseSheet }) {
  const { t } = useTranslation();
  useRefreshCaseSheetOnMount(refreshCaseSheet, patient?.case_id);
  const { docs: allDocs, loading, refreshDocs } = useCaseDocs(patient?.case_id);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const docType = TAB_TO_DOC_TYPE[tabId] || "documents";
  const docs = useMemo(
    () => filterDocsByType(allDocs, docType),
    [allDocs, docType]
  );
  const label = t(TAB_TITLE_KEYS[tabId] ?? "caseTabs.documents");
  const showMessageField = TABS_WITH_MESSAGE.includes(tabId);

  const handleFilesChange = async (newFiles) => {
    if (!patient?.case_id || newFiles.length === 0) return;
    setUploadError(null);
    setUploadingFiles(newFiles);
    const message = showMessageField ? uploadMessage.trim() : "";
    try {
      for (const file of newFiles) {
        await uploadCaseDoc(patient.case_id, file, docType, message);
      }
      await refreshDocs();
      if (message) setUploadMessage("");
    } catch (err) {
      setUploadError(err?.message ?? t("caseMgmt.uploadFailed"));
    } finally {
      setUploadingFiles([]);
    }
  };

  if (!patient) {
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">
          {t("caseMgmt.docCategory.emptyPatient")}
        </p>
      </div>
    );
  }

  return (
    <div className="form-section tab-panel">
      <h3 className="tab-panel-title">{label}</h3>

      {showMessageField && (
        <div className="tab-doc-upload-message">
          <label
            htmlFor="doc-upload-message"
            className="tab-doc-upload-message-label"
          >
            {t("caseMgmt.docCategory.messageLabel")}
          </label>
          <input
            id="doc-upload-message"
            type="text"
            className="form-input tab-doc-upload-message-input"
            value={uploadMessage}
            onChange={(e) => setUploadMessage(e.target.value)}
            placeholder={t("caseMgmt.docCategory.messagePlaceholder")}
            disabled={uploadingFiles.length > 0}
            aria-label={t("caseMgmt.docCategory.messageAria")}
          />
        </div>
      )}
      <FileUploadZone
        files={uploadingFiles}
        onChange={handleFilesChange}
        label={
          uploadingFiles.length > 0
            ? t("caseMgmt.docCategory.uploading")
            : t("caseMgmt.docCategory.dropLabel")
        }
        accept={
          TAB_ACCEPT[tabId] ?? "image/*,.pdf,.doc,.docx,.stl,.obj,.ply,.3mf"
        }
      />
      {uploadError && (
        <p className="tab-panel-hint" style={{ color: "var(--color-danger)" }}>
          {uploadError}
        </p>
      )}

      {loading ? (
        <div className="tab-panel-loading-inline">
          <LoadingDonut size="md" message={t("caseMgmt.docCategory.loading")} />
        </div>
      ) : docs.length === 0 ? (
        <p className="tab-panel-hint">{t("caseMgmt.docCategory.noDocs")}</p>
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
  );
}
