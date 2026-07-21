/**
 * Dossier du patient — unified patient file tab (legacy feature).
 * Shows all document categories in one view: Radiographies, Photographies, Documents, Modèle 3D.
 * Each section has upload zone + document grid.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCaseDocs, useRefreshCaseSheetOnMount } from "@/hooks";
import { uploadCaseDoc, deleteCaseDoc } from "@/services/caseDocsService.js";
import { DOC_CATEGORIES } from "./docCategoryConfig.js";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import DocumentsGridWithLightbox from "./DocumentsGridWithLightbox.jsx";
import FileUploadZone from "@/components/shared/FileUploadZone/FileUploadZone.jsx";

const DOSSIER_SECTION_KEYS = {
  photographies: "caseMgmt.dossier.sectionPhotography",
  radiographies: "caseMgmt.dossier.sectionXray",
  documents: "caseMgmt.dossier.sectionOtherDocuments",
  "empreinte-3d": "caseMgmt.dossier.section3d",
};

/** Map category key to doc type for upload */
const CATEGORY_TO_DOC_TYPE = {
  radiographies: "radiographies",
  photographies: "photographies",
  documents: "documents",
  "empreinte-3d": "empreinte-3d",
};

/** Map category key to file input accept */
const CATEGORY_ACCEPT = {
  radiographies: "image/*,.pdf,.dcm,.dicom,.stl,.obj,.ply,.3mf",
  photographies: "image/*,.pdf,.doc,.docx,.stl,.obj,.ply,.3mf",
  documents: "image/*,.pdf,.doc,.docx,.stl,.obj,.ply,.3mf",
  "empreinte-3d": ".stl,.obj,.ply,.3mf,.dcm,.dicom,image/*",
};

export default function TabDossierPatient({ patient, refreshCaseSheet }) {
  const { t } = useTranslation();
  useRefreshCaseSheetOnMount(refreshCaseSheet, patient?.case_id);
  const { docs: allDocs, loading, refreshDocs } = useCaseDocs(patient?.case_id);
  const [uploadingByCategory, setUploadingByCategory] = useState({});
  const [uploadError, setUploadError] = useState(null);

  const grouped = useMemo(() => {
    const list = Array.isArray(allDocs) ? allDocs : [];
    const result = {};
    for (const cat of DOC_CATEGORIES) {
      result[cat.key] = list.filter((d) =>
        cat.match((d.type || "").toLowerCase())
      );
    }
    return result;
  }, [allDocs]);

  const handleFilesChange = async (categoryKey, newFiles) => {
    if (!patient?.case_id || newFiles.length === 0) return;
    const docType = CATEGORY_TO_DOC_TYPE[categoryKey] ?? "documents";
    setUploadError(null);
    setUploadingByCategory((prev) => ({ ...prev, [categoryKey]: newFiles }));
    try {
      for (const file of newFiles) {
        await uploadCaseDoc(patient.case_id, file, docType);
      }
      await refreshDocs();
    } catch (err) {
      setUploadError(err?.message ?? t("caseMgmt.uploadFailed"));
    } finally {
      setUploadingByCategory((prev) => ({ ...prev, [categoryKey]: [] }));
    }
  };

  if (!patient) {
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">{t("caseMgmt.dossier.emptyPatient")}</p>
      </div>
    );
  }

  return (
    <div className="form-section tab-panel tab-dossier-patient">
      <h3 className="tab-panel-title">{t("caseMgmt.dossier.title")}</h3>
      <p className="tab-panel-description">
        {t("caseMgmt.dossier.description")}
      </p>

      {uploadError && (
        <p className="tab-panel-hint" style={{ color: "var(--color-danger)" }}>
          {uploadError}
        </p>
      )}

      {loading ? (
        <div className="tab-panel-loading-inline">
          <LoadingDonut size="md" message={t("caseMgmt.dossier.loading")} />
        </div>
      ) : (
        <div className="tab-dossier-sections">
          {DOC_CATEGORIES.map((cat) => {
            const docs = grouped[cat.key] ?? [];
            const isUploading = uploadingByCategory[cat.key]?.length > 0;
            const accept =
              CATEGORY_ACCEPT[cat.key] ??
              "image/*,.pdf,.doc,.docx,.stl,.obj,.ply,.3mf";

            return (
              <section
                key={cat.key}
                className="tab-dossier-section"
                aria-labelledby={`dossier-heading-${cat.key}`}
              >
                <h4
                  id={`dossier-heading-${cat.key}`}
                  className="tab-dossier-section-title"
                >
                  <i className={cat.icon} aria-hidden />
                  {t(
                    DOSSIER_SECTION_KEYS[cat.key] ??
                      "caseMgmt.dossier.sectionOtherDocuments"
                  )}
                </h4>
                <FileUploadZone
                  files={isUploading ? uploadingByCategory[cat.key] : []}
                  onChange={(files) => handleFilesChange(cat.key, files)}
                  label={
                    isUploading
                      ? t("caseMgmt.docCategory.uploading")
                      : t("caseMgmt.docCategory.dropLabel")
                  }
                  accept={accept}
                />
                {docs.length > 0 ? (
                  <DocumentsGridWithLightbox
                    docs={docs}
                    caseId={patient.case_id}
                    onDelete={async (storedFilename) => {
                      await deleteCaseDoc(patient.case_id, storedFilename);
                      await refreshDocs();
                    }}
                  />
                ) : (
                  !isUploading && (
                    <p className="tab-dossier-empty-cat">
                      {t("caseMgmt.docCategory.noDocs")}
                    </p>
                  )
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
