/**
 * InvoicePreviewPane – reusable scale-to-fit + zoom pane.
 *
 * Manages scale calculation and scroll behaviour internally.
 * The parent controls zoom state so it can render the zoom button wherever it
 * wants (e.g. in the modal header).
 *
 * @param {object}          props
 * @param {React.ReactNode} props.children      - invoice content to render
 * @param {boolean}         props.isZoomed      - controlled zoom state
 * @param {() => void}      props.onZoomToggle  - called when user clicks the preview to zoom
 * @param {string}          [props.className]   - extra classes on the outer container
 * @param {any[]}           [props.deps]        - extra deps that trigger scale recalculation
 *                                                (e.g. [data, previewDocumentType])
 */
import { useEffect, useRef, useState } from "react";

export default function InvoicePreviewPane({
  children,
  isZoomed,
  onZoomToggle,
  className = "",
  deps = [],
}) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  // Scale content down so the full height fits the container.
  useEffect(() => {
    const calculateScale = () => {
      if (!isZoomed && containerRef.current && contentRef.current) {
        const containerHeight = containerRef.current.clientHeight;
        const contentHeight = contentRef.current.scrollHeight;
        const availableHeight = containerHeight - 20; // 10 px padding each side
        if (contentHeight > availableHeight) {
          setScale(Math.min(availableHeight / contentHeight, 1));
        } else {
          setScale(1);
        }
      }
    };

    if (!isZoomed) {
      calculateScale();
      window.addEventListener("resize", calculateScale);
      const t = setTimeout(calculateScale, 100);
      return () => {
        window.removeEventListener("resize", calculateScale);
        clearTimeout(t);
      };
    }
    return () => window.removeEventListener("resize", calculateScale);
    // deps spread is intentional – callers pass stable arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isZoomed, ...deps]);

  // Scroll: reset to top-left on zoom-out, scroll to vertical centre on zoom-in.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!isZoomed) {
      container.scrollTop = 0;
      container.scrollLeft = 0;
    } else {
      const scrollToCenter = () => {
        const targetTop =
          Math.max(0, container.scrollHeight - container.clientHeight) / 2;
        container.scrollTo({ top: targetTop, left: 0, behavior: "smooth" });
      };
      const t = setTimeout(() => requestAnimationFrame(scrollToCenter), 350);
      return () => clearTimeout(t);
    }
  }, [isZoomed]);

  const handleClick = (e) => {
    if (
      e.target.closest(".invoice-preview") ||
      e.target.closest(".invoice-container")
    ) {
      if (!e.target.closest("button") && !e.target.closest("a")) {
        onZoomToggle?.();
      }
    }
  };

  const effectiveScale = isZoomed ? 1.5 : scale;
  const contentWidth = scale < 1 && !isZoomed ? `${100 / scale}%` : "100%";

  return (
    <div
      ref={containerRef}
      className={`invoice-preview-body ${isZoomed ? "zoomed" : ""} ${className}`.trim()}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      <div
        ref={contentRef}
        className={isZoomed ? "invoice-zoomed" : ""}
        style={{
          transform: `scale(${effectiveScale})`,
          transformOrigin: "top center",
          width: contentWidth,
          transition: "transform 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
