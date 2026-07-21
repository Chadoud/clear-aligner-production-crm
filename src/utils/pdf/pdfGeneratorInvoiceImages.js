/**
 * Image loading for invoice PDF (QR strip, logo).
 * @module utils/pdf/pdfGeneratorInvoiceImages
 */

/**
 * Load an image from path; resolves with the image or null on error.
 * @param {string} path - Image path (e.g. /assets/logo.svg)
 * @returns {Promise<HTMLImageElement|null>}
 */
export const loadImage = (path) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Image failed to load:", path);
      resolve(null);
    };
    img.src = path.startsWith("/") ? path : `/${path}`;
  });
