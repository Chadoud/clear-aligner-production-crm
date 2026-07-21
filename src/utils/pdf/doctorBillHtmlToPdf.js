/**
 * HTML-to-PDF utilities: capture any rendered preview element via html2canvas.
 * Used for doctor bills (DoctorBillPreview) and patient invoices (InvoicePreview).
 *
 * Patient invoice PDFs: html2canvas renders inside an iframe; cloned `<link rel="stylesheet">`
 * often never applies before rasterization. We inline same-origin CSS from the **live**
 * page into the clone, then strip `<link>` tags (doctor bills and invoices use the same path).
 */
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import InvoicePreview from "@/components/Invoice/InvoicePreview.jsx";
import InvoiceMobAppCredentialsPage from "@/components/Invoice/InvoiceMobAppCredentialsPage.jsx";
import DoctorBillPreview from "@/components/Invoice/DoctorBillPreview.jsx";
import { shouldAppendMobAppCredentialsPage } from "@/utils/invoices/mobAppCredentialsPage.js";
import {
  INVOICE_BRAND_LOGO_HEIGHT_PX as LAB_INVOICE_LOGO_HEIGHT_PX,
  INVOICE_BRAND_LOGO_MAX_WIDTH_PX as LAB_INVOICE_LOGO_MAX_WIDTH_PX,
} from "@/components/Invoice/config/invoiceBrandLogo.js";

const DEFAULT_SELECTOR = ".invoice-preview.invoice-preview--doctor";

/**
 * Extra brand logo sizing when stylesheet parsing on the clone is incomplete.
 */
function enforceInvoiceBrandLogoInClone(doc) {
  if (!doc?.querySelectorAll) return;
  const h = `${LAB_INVOICE_LOGO_HEIGHT_PX}px`;
  const w = `${LAB_INVOICE_LOGO_MAX_WIDTH_PX}px`;
  doc
    .querySelectorAll(".invoice-preview .logo-image.logo-image--lab")
    .forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.style.setProperty("height", h, "important");
      node.style.setProperty("max-height", h, "important");
      node.style.setProperty("max-width", w, "important");
      node.style.setProperty("min-height", h, "important");
      node.style.setProperty("overflow", "visible", "important");
      node.style.setProperty("box-sizing", "border-box", "important");
      node.style.setProperty("line-height", "0", "important");
      node.style.setProperty("display", "block", "important");

      const svg = node.querySelector("svg");
      if (svg instanceof SVGSVGElement) {
        svg.style.setProperty("display", "block", "important");
        svg.style.setProperty("height", h, "important");
        svg.style.setProperty("max-height", h, "important");
        svg.style.setProperty("max-width", w, "important");
        svg.style.setProperty("width", "auto", "important");
        return;
      }

      const img = node.querySelector("img");
      if (img instanceof HTMLElement) {
        img.style.setProperty("height", h, "important");
        img.style.setProperty("max-height", h, "important");
        img.style.setProperty("max-width", w, "important");
        img.style.setProperty("width", "auto", "important");
        img.style.setProperty("object-fit", "contain", "important");
        img.style.setProperty("object-position", "left center", "important");
        img.style.setProperty("vertical-align", "top", "important");
      }
    });
}

/** Drop stylesheet `<link>` tags on the clone so we do not rely on iframe network loads. */
function stripStylesheetLinksInClone(doc) {
  doc?.querySelectorAll?.('link[rel="stylesheet"]')?.forEach((link) => {
    link.remove();
  });
}

/**
 * Flatten parsed rules from a live stylesheet (same-origin only). Handles `@import`.
 * @param {CSSStyleSheet} sheet
 * @param {string[]} parts
 */
function appendFlattenedCssRules(sheet, parts) {
  let rules;
  try {
    rules = sheet.cssRules;
  } catch {
    return;
  }
  if (!rules?.length) return;
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (
      rule?.type === CSSRule.IMPORT_RULE &&
      /** @type {CSSImportRule} */ (rule).styleSheet
    ) {
      appendFlattenedCssRules(
        /** @type {CSSImportRule} */ (rule).styleSheet,
        parts
      );
      continue;
    }
    if (rule && typeof rule.cssText === "string") parts.push(rule.cssText);
  }
}

/**
 * Copy all accessible CSS from the real tab into the iframe clone html2canvas uses.
 * External sheets are usually same-origin (`/assets/*.css`) after Vite build.
 */
function inlineLiveDocumentCssIntoClone(clonedDoc) {
  if (typeof window === "undefined" || !clonedDoc?.head) return;
  const live = window.document;
  const parts = [];

  live.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    try {
      const sheet = link.sheet;
      if (sheet) appendFlattenedCssRules(sheet, parts);
    } catch {
      /* cross-origin */
    }
  });

  live.querySelectorAll("style").forEach((node) => {
    const text = node.textContent?.trim();
    if (text) parts.push(node.textContent);
  });

  if (parts.length === 0) return;

  const style = clonedDoc.createElement("style");
  style.setAttribute("data-sa-pdf-inline", "");
  style.textContent = parts.join("\n");
  clonedDoc.head.appendChild(style);
}

/** Inline A4 box on cloned doctor preview (stylesheet rules are gone in clone). */
function cloneApplyDoctorBillA4Styles(doc) {
  const clonedPreview = doc.querySelector(
    ".invoice-preview.invoice-preview--doctor"
  );
  if (clonedPreview instanceof HTMLElement) {
    clonedPreview.style.width = "210mm";
    clonedPreview.style.maxWidth = "210mm";
    clonedPreview.style.minHeight = "297mm";
    clonedPreview.style.padding = "30px 40px";
    clonedPreview.style.boxSizing = "border-box";
    clonedPreview.style.overflow = "visible";
  }
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.doctorA4] - apply 210mm doctor preview box in clone
 * @param {boolean} [opts.preserveLinkedStylesheets] - patient invoice / credentials: inline live-page CSS into clone, then strip `<link>`
 */
function createPdfCaptureOnClone(opts = {}) {
  const { doctorA4 = false, preserveLinkedStylesheets = false } = opts;
  return (_doc, el) => {
    const doc = el.ownerDocument;
    if (preserveLinkedStylesheets) {
      inlineLiveDocumentCssIntoClone(doc);
    }
    stripStylesheetLinksInClone(doc);
    enforceInvoiceBrandLogoInClone(doc);
    if (doctorA4) cloneApplyDoctorBillA4Styles(doc);
  };
}

/**
 * Shared html2canvas defaults; pass `windowWidth` / `windowHeight` only when forcing desktop layout (doctor bill).
 * @param {object} [overrides]
 */
function buildHtml2CanvasOptions(overrides = {}) {
  const { scale, windowWidth, windowHeight, onclone, ...rest } = overrides;
  const opt = {
    scale: scale ?? 1.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    ...rest,
  };
  if (windowWidth !== undefined) opt.windowWidth = windowWidth;
  if (windowHeight !== undefined) opt.windowHeight = windowHeight;
  if (onclone !== undefined) opt.onclone = onclone;
  return opt;
}

function findScaledWrapper() {
  const body = document.querySelector(
    ".doctors-billing-modal-body-preview .invoice-preview-body"
  );
  if (!body) return null;
  return body.querySelector(":scope > div");
}

/**
 * InvoicePreviewPane scales content to fit the modal; remove transform so capture is full A4 resolution.
 * @returns {() => void} restore
 */
function unscalePreviewWrapper() {
  const inner = findScaledWrapper();
  if (!inner) return () => {};
  const prev = {
    transform: inner.style.transform,
    width: inner.style.width,
    transition: inner.style.transition,
  };
  inner.style.transition = "none";
  inner.style.transform = "none";
  inner.style.width = "100%";
  return () => {
    inner.style.transform = prev.transform;
    inner.style.width = prev.width;
    inner.style.transition = prev.transition;
  };
}

async function waitForPaint() {
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  );
  await new Promise((r) => setTimeout(r, 60));
}

async function waitForImagesWithin(rootEl, maxMs = 2500) {
  const imgs = Array.from(rootEl.querySelectorAll("img"));
  if (imgs.length === 0) return;
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, maxMs);
        })
    )
  );
}

/** Wait until async invoice ID is shown (same as preview user sees). */
async function waitForInvoiceId(selector, maxMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const el = document.querySelector(`${selector} .invoice-id`);
    const t = el?.textContent?.trim() ?? "";
    if (t.length > 3 && /ID:/i.test(t)) return;
    await new Promise((r) => setTimeout(r, 40));
  }
}

async function waitForInvoiceIdInRoot(rootEl, maxMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const el = rootEl.querySelector(".invoice-id");
    const t = el?.textContent?.trim() ?? "";
    if (t.length > 3 && /ID:/i.test(t)) return;
    await new Promise((r) => setTimeout(r, 40));
  }
}

/**
 * @param {"PNG"|"JPEG"} [format="PNG"]
 * @param {number} [quality=0.92] - JPEG quality (ignored for PNG)
 */
/**
 * @param {import("jspdf").jsPDF} pdf
 * @param {object} data - Invoice payload
 * @param {string} documentType
 * @param {object} [options]
 */
async function appendMobAppCredentialsPageToPdf(
  pdf,
  data,
  documentType,
  options = {}
) {
  if (!shouldAppendMobAppCredentialsPage(data, documentType)) return;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "210mm";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  host.style.background = "#ffffff";
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(createElement(InvoiceMobAppCredentialsPage, { data }));

  try {
    await waitForPaint();
    await waitForImagesWithin(host);
    await waitForPaint();

    const el = host.querySelector(".invoice-preview--mob-app-credentials");
    if (!el) throw new Error("Mob app credentials preview did not render");

    const canvas = await html2canvas(
      el,
      buildHtml2CanvasOptions({
        scale: options.scale ?? 1.5,
        onclone: createPdfCaptureOnClone({
          preserveLinkedStylesheets: true,
        }),
      })
    );
    pdf.addPage();
    addCanvasToPdf(pdf, canvas, "JPEG", options.quality ?? 0.88);
  } finally {
    root.unmount();
    host.remove();
  }
}

function addCanvasToPdf(pdf, canvas, format = "PNG", quality = 0.92) {
  const imgData =
    format === "JPEG"
      ? canvas.toDataURL("image/jpeg", quality)
      : canvas.toDataURL("image/png", 1.0);
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgWmm = pageW;
  const imgHmm = (canvas.height * pageW) / canvas.width;
  /** Avoid an empty-looking second page when raster mm height barely exceeds A4 (float / full-page flex layout). */
  const SINGLE_PAGE_TOLERANCE_MM = 6;

  if (imgHmm <= pageH + SINGLE_PAGE_TOLERANCE_MM) {
    pdf.addImage(imgData, format, 0, 0, imgWmm, Math.min(imgHmm, pageH));
    return;
  }

  let heightLeft = imgHmm;
  let position = 0;
  pdf.addImage(imgData, format, 0, position, imgWmm, imgHmm);
  heightLeft -= pageH;

  while (heightLeft > 0) {
    position = heightLeft - imgHmm;
    pdf.addPage();
    pdf.addImage(imgData, format, 0, position, imgWmm, imgHmm);
    heightLeft -= pageH;
  }
}

/**
 * Snapshot the visible doctor bill preview as a PDF blob (A4).
 * Call after `DoctorBillPreview` is mounted (e.g. show bill preview in the modal).
 *
 * @param {object} [options]
 * @param {string} [options.selector]
 * @param {number} [options.scale] - html2canvas scale (default 1.5 — sharp enough for email, keeps payload under 3 MB)
 * @returns {Promise<Blob>}
 */
export async function generateDoctorBillPdfFromPreviewElement(options = {}) {
  const selector = options.selector ?? DEFAULT_SELECTOR;

  await waitForDoctorBillPreviewMounted(
    selector,
    options.waitForMountMs ?? 10000
  );
  await waitForPaint();

  const element = document.querySelector(selector);
  if (!element) {
    throw new Error("Doctor bill preview not found in DOM");
  }
  // Invoice ID is nice-to-have but not mandatory for doctor bill capture.
  try {
    await waitForInvoiceId(selector, options.waitForIdMs ?? 5000);
  } catch {
    // Continue capture even if ID text is still loading.
  }

  const restore = unscalePreviewWrapper();
  try {
    await waitForPaint();
    const canvas = await html2canvas(
      element,
      buildHtml2CanvasOptions({
        scale: options.scale ?? 1.5,
        windowWidth: options.windowWidth ?? 1400,
        windowHeight: options.windowHeight ?? 2200,
        onclone: createPdfCaptureOnClone({
          doctorA4: true,
          preserveLinkedStylesheets: true,
        }),
      })
    );

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    addCanvasToPdf(pdf, canvas);
    return pdf.output("blob");
  } finally {
    restore();
  }
}

/**
 * Render {@link DoctorBillPreview} offscreen and return a PDF blob (same visual as modal capture).
 * Allows closing the billing modal immediately while generation runs, avoiding double-submit emails.
 *
 * @param {{ doctorName: string, lineItems: unknown[], billDate?: string }} props
 * @param {object} [options]
 * @returns {Promise<Blob>}
 */
export async function generateDoctorBillPdfBlobFromData(props, options = {}) {
  const { doctorName, lineItems, billDate } = props ?? {};
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "210mm";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  host.style.background = "#ffffff";
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(
    createElement(DoctorBillPreview, {
      doctorName,
      lineItems: lineItems ?? [],
      billDate,
    })
  );

  try {
    await waitForPaint();
    await waitForImagesWithin(host);
    await waitForPaint();
    await waitForInvoiceIdInRoot(host, options.waitForIdMs ?? 8000);

    const element = host.querySelector(DEFAULT_SELECTOR);
    if (!element) {
      throw new Error("Offscreen doctor bill preview did not render");
    }

    const canvas = await html2canvas(
      element,
      buildHtml2CanvasOptions({
        scale: options.scale ?? 1.5,
        windowWidth: options.windowWidth ?? 1400,
        windowHeight: options.windowHeight ?? 2200,
        onclone: createPdfCaptureOnClone({
          doctorA4: true,
          preserveLinkedStylesheets: true,
        }),
      })
    );

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    addCanvasToPdf(pdf, canvas, "JPEG", options.quality ?? 0.88);
    return pdf.output("blob");
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * Remove the CSS scale transform applied by InvoicePreviewPane on the invoice confirm modal.
 * Returns a restore function.
 */
function unscaleInvoiceModalWrapper() {
  const body = document.querySelector(
    ".invoice-modal-content .invoice-preview-body"
  );
  if (!body) return () => {};
  const inner = body.querySelector(":scope > div");
  if (!inner) return () => {};
  const prev = {
    transform: inner.style.transform,
    width: inner.style.width,
    transition: inner.style.transition,
  };
  inner.style.transition = "none";
  inner.style.transform = "none";
  inner.style.width = "100%";
  return () => {
    inner.style.transform = prev.transform;
    inner.style.width = prev.width;
    inner.style.transition = prev.transition;
  };
}

/**
 * Capture the patient invoice preview from the open InvoiceModal as a base64 PDF.
 * Unscales the InvoicePreviewPane transform first so the capture is at natural A4 size.
 * Linked stylesheets stay on the html2canvas clone so invoice CSS matches the modal preview.
 *
 * @param {object} [options]
 * @param {number} [options.scale=1.5]   - html2canvas DPR scale (1.5 keeps base64 under ~3 MB)
 * @param {number} [options.quality=0.88] - JPEG quality 0–1
 * @param {object} [options.invoiceData] - Invoice payload (for optional 2nd page: app credentials)
 * @param {string} [options.documentType="invoice"]
 * @returns {Promise<string>} Pure base64 PDF data (no data URI prefix)
 */
export async function generateInvoicePreviewHtmlPdfBase64(options = {}) {
  await waitForPaint();
  const element = document.querySelector(
    ".invoice-modal-content .invoice-preview:not(.invoice-preview--mob-app-credentials)"
  );
  if (!element) throw new Error("Invoice preview not found in modal DOM");

  const restore = unscaleInvoiceModalWrapper();
  try {
    await waitForPaint();
    const canvas = await html2canvas(
      element,
      buildHtml2CanvasOptions({
        scale: options.scale ?? 1.5,
        onclone: createPdfCaptureOnClone({
          preserveLinkedStylesheets: true,
        }),
      })
    );

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    // JPEG compression keeps the base64 payload well under the 10 MB server limit
    // while still producing a sharp, print-quality document.
    addCanvasToPdf(pdf, canvas, "JPEG", options.quality ?? 0.88);

    const docType = options.documentType ?? "invoice";
    const invData = options.invoiceData ?? null;
    if (invData) {
      await appendMobAppCredentialsPageToPdf(pdf, invData, docType, options);
    }

    const dataUri = pdf.output("datauristring");
    const commaIdx = dataUri.indexOf(",");
    return commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
  } finally {
    restore();
  }
}

/**
 * Render InvoicePreview offscreen and capture it as PDF base64.
 * Used when no visible modal preview is present (e.g. payment receipt emails).
 *
 * @param {object} data
 * @param {"invoice"|"quote"|"arrangement"|"receipt"} [documentType="invoice"]
 * @param {object} [options]
 * @param {number} [options.scale=1.5]
 * @param {number} [options.quality=0.88]
 * @returns {Promise<string>}
 */
export async function generateInvoiceHtmlPdfBase64FromData(
  data,
  documentType = "invoice",
  options = {}
) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "210mm";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  host.style.background = "#ffffff";
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(createElement(InvoicePreview, { data, documentType }));

  try {
    await waitForPaint();
    await waitForImagesWithin(host);
    await waitForPaint();

    const element = host.querySelector(".invoice-preview");
    if (!element) throw new Error("Offscreen invoice preview did not render");

    const canvas = await html2canvas(
      element,
      buildHtml2CanvasOptions({
        scale: options.scale ?? 1.5,
        onclone: createPdfCaptureOnClone({
          preserveLinkedStylesheets: true,
        }),
      })
    );

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    addCanvasToPdf(pdf, canvas, "JPEG", options.quality ?? 0.88);
    await appendMobAppCredentialsPageToPdf(pdf, data, documentType, options);
    const dataUri = pdf.output("datauristring");
    const commaIdx = dataUri.indexOf(",");
    return commaIdx >= 0 ? dataUri.slice(commaIdx + 1) : dataUri;
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * Wait until the doctor bill root exists (after opening preview).
 * @param {string} [selector]
 * @param {number} [maxMs]
 * @returns {Promise<void>}
 */
export function waitForDoctorBillPreviewMounted(
  selector = DEFAULT_SELECTOR,
  maxMs = 5000
) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      if (document.querySelector(selector)) {
        resolve();
        return;
      }
      if (Date.now() - t0 > maxMs) {
        reject(new Error("Doctor bill preview did not mount in time"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}
