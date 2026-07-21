import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import TreatmentPlanSchemaVisual from "./TreatmentPlanSchemaVisual.jsx";
import { buildStrippingPlanDownloadFilename } from "../../config/dtgUtils.js";
import { withTemporaryDocumentTitle } from "@/utils/print/withTemporaryDocumentTitle.js";

const ZOOM_LEVELS = [1, 1.5, 2.2, 3];
/** Default preview zoom = two in-modal zoom clicks (levels 0→1→2). */
const DEFAULT_ZOOM_LEVEL = 2;
const MOUSE_PAN_SENSITIVITY = 0.8;

export default function TreatmentPlanPreviewModal({
  treatmentSteps,
  toothModules = {},
  onClose,
  patientName,
}) {
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const lastMouseRef = useRef(null);
  const viewportRef = useRef(null);

  const scale = ZOOM_LEVELS[zoomLevel];
  const isZoomed = zoomLevel > 0;

  useEffect(() => {
    document.body.classList.add("tp-preview-printing");
    return () => document.body.classList.remove("tp-preview-printing");
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      if (!isZoomed || !viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        lastMouseRef.current = null;
        return;
      }
      if (lastMouseRef.current != null) {
        const dx = (e.clientX - lastMouseRef.current.x) * MOUSE_PAN_SENSITIVITY;
        const dy = (e.clientY - lastMouseRef.current.y) * MOUSE_PAN_SENSITIVITY;
        setPan((prev) => ({ x: prev.x - dx, y: prev.y - dy }));
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    },
    [isZoomed]
  );

  const handlePointerLeave = useCallback(() => {
    lastMouseRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const prevZoom = zoomLevel;
      setZoomLevel((prev) => (prev + 1) % 4);
      if (prevZoom === 3) setPan({ x: 0, y: 0 });
    },
    [zoomLevel]
  );

  const handleDownload = () => {
    if (patientName != null && patientName !== "") {
      const filename = buildStrippingPlanDownloadFilename(patientName);
      withTemporaryDocumentTitle(filename, () => window.print());
    } else {
      window.print();
    }
  };

  return createPortal(
    <div
      className="tp-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Treatment plan preview (A4)"
    >
      <div className="tp-preview-backdrop" onClick={onClose} />
      <div className="tp-preview-modal">
        <div className="tp-preview-header">
          <span>Treatment plan</span>
          <div className="tp-preview-header-actions">
            <button
              type="button"
              className="tp-preview-btn tp-preview-btn--print"
              onClick={() => window.print()}
              aria-label="Print treatment plan"
            >
              <i className="fas fa-print" aria-hidden />
              <span>Print</span>
            </button>
            <button
              type="button"
              className="tp-preview-btn tp-preview-btn--download"
              onClick={handleDownload}
              aria-label="Download treatment plan (Save as PDF from print dialog)"
              title="Print dialog: choose Save as PDF to download"
            >
              <i className="fas fa-download" aria-hidden />
              <span>Download</span>
            </button>
            <button
              type="button"
              className="tp-preview-close"
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
        <div className="tp-preview-a4" id="tp-preview-print-area">
          <div
            ref={viewportRef}
            className="tp-preview-zoom-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            style={{ cursor: isZoomed ? "move" : "zoom-in" }}
          >
            <div
              className={`tp-preview-zoom-content ${isZoomed ? "tp-preview-zoom-content--panning" : ""}`}
              style={{
                transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`,
              }}
            >
              <TreatmentPlanSchemaVisual
                treatmentSteps={treatmentSteps}
                toothModules={toothModules}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
