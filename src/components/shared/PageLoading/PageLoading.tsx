import type { ComponentType, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { getBrandConfig } from "@/config/constants";
import LoadingDonut from "../LoadingDonut/LoadingDonut";

type LoadingDonutProps = {
  size?: "sm" | "md" | "lg";
  message?: string;
};

const Loader = LoadingDonut as ComponentType<LoadingDonutProps>;

const LOGO_PNG = getBrandConfig("Lab").LOGO_PNG;

export type PageLoadingProps = {
  /** `page` — in-flow (Suspense fallback). `overlay` — fixed full-viewport blocker on top of the app. */
  variant?: "page" | "overlay";
  message?: string;
};

/**
 * Full-page loading fallback for Suspense and other loading states.
 * Uses PNG logo for a single asset (no SVG/bitmap mix).
 */
export default function PageLoading({
  variant = "page",
  message = "Loading...",
}: PageLoadingProps) {
  const inner = (
    <>
      <img
        src={LOGO_PNG}
        alt=""
        style={{ height: 48, width: "auto", objectFit: "contain" }}
      />
      <Loader size="lg" message={message} />
    </>
  );

  const baseFlex = {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  };

  if (variant === "overlay") {
    const overlayStyle: CSSProperties = {
      ...baseFlex,
      position: "fixed",
      inset: 0,
      zIndex: 10050,
      backgroundColor: "#ffffff",
      pointerEvents: "auto",
    };
    const node = (
      <div
        style={overlayStyle}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {inner}
      </div>
    );
    if (typeof document !== "undefined") {
      return createPortal(node, document.body);
    }
    return node;
  }

  return (
    <div style={baseFlex} role="status" aria-live="polite" aria-busy="true">
      {inner}
    </div>
  );
}
