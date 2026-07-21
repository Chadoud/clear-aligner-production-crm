import { useEffect } from "react";
import { createPortal } from "react-dom";
import StrippingV2StaticScene from "./StrippingV2StaticScene.jsx";
import { buildStrippingV2PlanDownloadFilename } from "../../config/dtgUtils.js";
import { withTemporaryDocumentTitle } from "@/utils/print/withTemporaryDocumentTitle.js";

/**
 * @param {{
 *   scene: { cases?: unknown[]; attachments?: unknown[] } | null;
 *   onClose: () => void;
 *   patientName?: string;
 * }} props
 */
export default function StrippingV2PreviewModal({
  scene,
  onClose,
  patientName,
}) {
  const cases = Array.isArray(scene?.cases) ? scene.cases : [];
  const attachments = Array.isArray(scene?.attachments)
    ? scene.attachments
    : [];

  useEffect(() => {
    document.body.classList.add("sa-stripping-v2-printing");
    return () => document.body.classList.remove("sa-stripping-v2-printing");
  }, []);

  const handleDownload = () => {
    if (patientName != null && patientName !== "") {
      const filename = buildStrippingV2PlanDownloadFilename(patientName);
      withTemporaryDocumentTitle(filename, () => window.print());
    } else {
      window.print();
    }
  };

  return createPortal(
    <div
      className="sa-v2-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Stripping and attachments V2 (A4)"
    >
      <div className="sa-v2-preview-backdrop" onClick={onClose} />
      <div className="sa-v2-preview-modal">
        <div className="sa-v2-preview-header">
          <span>Stripping &amp; attachments (new)</span>
          <div className="sa-v2-preview-header-actions">
            <button
              type="button"
              className="sa-v2-preview-btn sa-v2-preview-btn--print"
              onClick={() => window.print()}
              aria-label="Print stripping V2 plan"
            >
              <i className="fas fa-print" aria-hidden />
              <span>Print</span>
            </button>
            <button
              type="button"
              className="sa-v2-preview-btn sa-v2-preview-btn--download"
              onClick={handleDownload}
              aria-label="Download stripping V2 plan as PDF from print dialog"
              title="Print dialog: choose Save as PDF to download"
            >
              <i className="fas fa-download" aria-hidden />
              <span>Download</span>
            </button>
            <button
              type="button"
              className="sa-v2-preview-close"
              onClick={onClose}
              aria-label="Close preview"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="sa-v2-preview-a4" id="sa-stripping-v2-print-area">
          <div className="sa-v2-preview-zoom-viewport">
            <div className="sa-v2-preview-zoom-content">
              <StrippingV2StaticScene cases={cases} attachments={attachments} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
