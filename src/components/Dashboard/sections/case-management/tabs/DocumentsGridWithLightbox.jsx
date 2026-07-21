/**
 * Shared grid of document cards with image lightbox.
 * Used by TabDocCategory.
 */
import { useState, useCallback } from "react";
import { getDocsBaseUrl, buildDocUrl } from "@/utils/docs/index.js";
import DocPreviewCard from "@/components/shared/DocPreviewCard";
import ImageLightbox from "./ImageLightbox.jsx";

export default function DocumentsGridWithLightbox({ docs, caseId, onDelete }) {
  const [lightbox, setLightbox] = useState(null);
  const docsBaseUrl = getDocsBaseUrl();

  const openLightbox = useCallback((src, alt) => {
    setLightbox({ src, alt });
  }, []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  return (
    <>
      <div className="doc-cards-grid">
        {docs.map((doc, i) => (
          <DocPreviewCard
            key={`${doc.storedFilename}-${i}`}
            doc={doc}
            docUrl={buildDocUrl(docsBaseUrl, caseId, doc.storedFilename)}
            onImageClick={openLightbox}
            onDelete={onDelete}
            variant="grid"
          />
        ))}
      </div>
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
