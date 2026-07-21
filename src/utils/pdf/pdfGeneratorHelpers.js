/**
 * Shared PDF layout constants and drawing helpers used by invoice, doctor bill, and doctor invoice.
 */

export const PDF_CONSTANTS = {
  PAGE_WIDTH_MM: 210,
  MARGIN_MM: 20,
  SIGNATURE_BOX_WIDTH: 30,
  SIGNATURE_BOX_HEIGHT: 8,
  SIGNATURE_LABEL_SPACING: 40,
};

/**
 * Draw logo image onto PDF (converts SVG to PNG via canvas if needed).
 * @param {import("jspdf").jsPDF} doc
 * @param {HTMLImageElement} logoImage
 * @param {number} x - mm
 * @param {number} y - mm
 * @param {number} w - mm
 * @param {number} h - mm
 */
export function drawLogoImage(doc, logoImage, x, y, w, h) {
  if (!logoImage || !logoImage.complete || !logoImage.width) return;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = logoImage.width;
    canvas.height = logoImage.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(logoImage, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const srcRatio = logoImage.width / logoImage.height;
    const boxRatio = w / h;
    let drawW = w;
    let drawH = h;
    if (srcRatio > boxRatio) {
      drawH = w / srcRatio;
    } else {
      drawW = h * srcRatio;
    }
    const drawX = x + (w - drawW) / 2;
    const drawY = y + (h - drawH) / 2;
    doc.addImage(dataUrl, "PNG", drawX, drawY, drawW, drawH);
  } catch (e) {
    console.warn("Could not draw logo on PDF:", e);
  }
}
