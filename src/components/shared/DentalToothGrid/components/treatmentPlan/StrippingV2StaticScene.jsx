import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  drawStrippingV2Scene,
  getStrippingV2PlacedIconLayout,
  STRIPPING_V2_SCENE_BASE_HEIGHT,
  STRIPPING_V2_SCENE_BASE_WIDTH,
  STRIPPING_V2_STEP_BUBBLE_RADIUS,
} from "./strippingV2SceneDraw.js";
import { MODULES, ModuleIcon } from "../../shared/DentalToothGridIcons.jsx";

const BASE_WIDTH = STRIPPING_V2_SCENE_BASE_WIDTH;
const BASE_HEIGHT = STRIPPING_V2_SCENE_BASE_HEIGHT;
const STEP_BUBBLE_RADIUS = STRIPPING_V2_STEP_BUBBLE_RADIUS;
const PLACED_ICON_OFFSET_Y = -2;

/**
 * Read-only canvas + HTML overlay of placed modules (matches StrippingAttachmentsV2 layout).
 * @param {{ cases?: unknown[]; attachments?: unknown[]; className?: string }} props
 */
export default function StrippingV2StaticScene({
  cases = [],
  attachments = [],
  className = "",
}) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  });
  const [canvasVersion, setCanvasVersion] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    drawStrippingV2Scene(ctx, {
      dpr,
      image: imageRef.current,
      cases,
      selection: null,
      interaction: null,
      baseWidth: BASE_WIDTH,
      baseHeight: BASE_HEIGHT,
      stepBubbleRadius: STEP_BUBBLE_RADIUS,
      showEditorOverlays: false,
    });
  }, [cases]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(BASE_WIDTH * dpr);
    canvas.height = Math.round(BASE_HEIGHT * dpr);
    setCanvasSize({ width: BASE_WIDTH, height: BASE_HEIGHT });
    setCanvasVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      draw();
    };
    img.onerror = () => {
      const off = document.createElement("canvas");
      off.width = BASE_WIDTH;
      off.height = BASE_HEIGHT;
      const ctx = off.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, off.width, off.height);
      const fallback = new Image();
      fallback.onload = () => {
        imageRef.current = fallback;
        draw();
      };
      fallback.src = off.toDataURL("image/png");
    };
    img.src = "/assets/strippingEmbeddedImage.png";
  }, [draw]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    draw();
  }, [canvasVersion, draw, attachments]);

  return (
    <div
      className={`dtg-v2-static-scene ${className}`.trim()}
      style={{
        position: "relative",
        width: canvasSize.width,
        height: canvasSize.height,
        margin: "0 auto",
      }}
    >
      <canvas
        ref={canvasRef}
        className="dtg-v2-canvas"
        width={Math.round(
          BASE_WIDTH *
            (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
        )}
        height={Math.round(
          BASE_HEIGHT *
            (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
        )}
        style={{ width: canvasSize.width, height: canvasSize.height }}
        aria-hidden
      />
      <div
        className="dtg-v2-placed-layer"
        aria-hidden
        style={{ width: canvasSize.width, height: canvasSize.height }}
      >
        {attachments.map((a) => {
          const mod = MODULES.find((m) => m.id === a.moduleId);
          if (!mod) return null;
          const {
            svgSize: placedIconSvgSize,
            spanWidth: placedIconSpanWidth,
            spanHeight: placedIconSpanHeight,
            iconHeight,
          } = getStrippingV2PlacedIconLayout(a);
          const commentHasText = (a.commentText || "").trim().length > 0;
          const commentCaptionVisible =
            a.moduleId === "comment" && commentHasText;
          return (
            <Fragment key={String(a.id)}>
              <span
                className="dtg-v2-placed-icon"
                style={{
                  left: `${(a.x / BASE_WIDTH) * 100}%`,
                  top: `${(a.y / BASE_HEIGHT) * 100}%`,
                  width: placedIconSpanWidth,
                  height: placedIconSpanHeight,
                  fontSize: placedIconSvgSize,
                  transform: `translate(-50%, -50%) rotate(${a.rotation}rad) translateY(${PLACED_ICON_OFFSET_Y}px)`,
                  "--mod-color": mod.color,
                }}
              >
                <ModuleIcon mod={mod} svgSize={placedIconSvgSize} />
              </span>
              {commentCaptionVisible && (
                <span
                  className="dtg-v2-comment-caption"
                  style={{
                    left: `${(a.x / BASE_WIDTH) * 100}%`,
                    top: `${(a.y / BASE_HEIGHT) * 100}%`,
                    transform: `translate(-50%, calc(-50% + ${iconHeight / 2 + 12}px))`,
                  }}
                  title={a.commentText}
                >
                  {(a.commentText || "").length > 48
                    ? `${(a.commentText || "").slice(0, 46)}…`
                    : a.commentText}
                </span>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
