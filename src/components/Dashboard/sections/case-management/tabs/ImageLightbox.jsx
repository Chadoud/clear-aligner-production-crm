import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./ImageLightbox.css";

/**
 * Full-screen lightbox for viewing document images.
 * Closes on overlay click, Escape key, or close button.
 */
export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      className="doc-image-lightbox"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="View image"
    >
      <button
        className="doc-image-lightbox-close"
        onClick={onClose}
        aria-label="Close"
      >
        <i className="fas fa-times" />
      </button>
      <div
        className="doc-image-lightbox-content"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt || "Document"}
          className="doc-image-lightbox-img"
        />
      </div>
    </div>,
    document.body
  );
}
