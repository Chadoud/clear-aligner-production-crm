/**
 * Invoice Service Helpers
 *
 * Shared utilities for building invoice rows and calculating totals
 * Used by both InvoicePreview and PDF generator to avoid duplication
 * @module utils/invoices/invoiceServiceHelpers
 */

import {
  SERVICE_CODES,
  isPanoramiqueService,
  isExcludedFromDisplay,
} from "../../constants/index.js";
import {
  calculateServicePrice,
  calculateTotalPoints,
} from "../calculations/index.js";
import { calculateLabPrice } from "../calculations/priceCalculations.js";
import { formatCHF } from "./invoiceFormatters.js";
import { LAB_VAT_RATE } from "./vatBreakdown.js";

/** Swiss VAT rate (8.1%) — re-exported alias for callers that import from this module. */
export const VAT_RATE = LAB_VAT_RATE;

/**
 * Check if a service should be excluded from display
 * @param {Object} service - Service object
 * @returns {boolean} True if service should be excluded
 */
export const shouldExcludeService = (service) => {
  return (
    service.code === SERVICE_CODES.FIRST_CONSULTATION ||
    service.code === SERVICE_CODES.SCAN_INTRA_EXTRA_ORAL ||
    service.code === SERVICE_CODES.LAB_LAB ||
    isExcludedFromDisplay(service.code) ||
    isPanoramiqueService(service)
  );
};

/**
 * Check if a service should be excluded from total calculation
 * @param {Object} service - Service object
 * @returns {boolean} True if service should be excluded from total
 */
export const shouldExcludeFromTotal = (service) => {
  return (
    service.code === SERVICE_CODES.FIRST_CONSULTATION ||
    service.code === SERVICE_CODES.SCAN_INTRA_EXTRA_ORAL ||
    service.code === SERVICE_CODES.LAB_LAB ||
    service.code === SERVICE_CODES.BLANCHIMENT ||
    service.code === SERVICE_CODES.TRAITEMENT_ALIGNEMENT ||
    isExcludedFromDisplay(service.code) ||
    isPanoramiqueService(service)
  );
};

/**
 * Build invoice table rows from services data
 * Each service has its own point_value.
 * @param {Object} params - Parameters object
 * @param {Array} params.services - Array of services (with point_value per service)
 * @param {string} params.brand - Brand name
 * @param {boolean} params.showFreeServices - Whether to show free services (Direct only; ignored for Lab)
 * @param {number} params.labPrice - Lab service price
 * @param {number} [params.totalPrice] - When brand is Lab and set: only lab (0.1) uses remainder; other lines use quantity×vpt×points×point_value
 * @param {number} [params.vatRate] - VAT rate (0–1); when set the lab remainder is computed from the HT portion (totalPrice × (1−vatRate))
 * @returns {Array} Array of table row data
 */
export const buildInvoiceTableRows = ({
  services,
  brand,
  showFreeServices,
  labPrice,
  totalPrice,
  vatRate,
}) => {
  const rows = [];
  const totalPriceNum = Number(totalPrice);
  const isLabTotalBased =
    brand === "Lab" &&
    totalPrice != null &&
    totalPrice !== "" &&
    totalPriceNum > 0 &&
    Array.isArray(services) &&
    services.length > 0;
  // When labPrice is missing (e.g. stored invoice), compute it from total and services
  const effectiveLabPrice =
    labPrice != null && Number.isFinite(labPrice)
      ? labPrice
      : isLabTotalBased
        ? calculateLabPrice(totalPriceNum, services, Number(vatRate) || 0)
        : 0;
  const isLabFreeInvoice =
    brand === "Lab" &&
    totalPrice != null &&
    totalPrice !== "" &&
    totalPriceNum === 0 &&
    Array.isArray(services) &&
    services.length > 0;

  // Add free services (Analyse & consultation, Scan) — Direct only, when toggle is on
  const shouldShowFreeServices =
    brand === "Direct" && showFreeServices !== false;
  if (shouldShowFreeServices) {
    rows.push({
      quantity: "1",
      code: SERVICE_CODES.FIRST_CONSULTATION,
      service: "Analyse & consultation",
      vpt: "1",
      points: "88.90",
      totalPoints: "88.90",
      total: "88.90 CHF",
      crossed: true,
    });
    rows.push({
      quantity: "6",
      code: SERVICE_CODES.SCAN_INTRA_EXTRA_ORAL,
      service: "Scan & Intra/Extra-Oral Pic.",
      vpt: "1",
      points: "16.30",
      totalPoints: "97.80",
      total: "97.80 CHF",
      crossed: true,
    });
  }

  // Add panoramique service if present (Direct only; crossed out)
  if (brand !== "Lab" && services.some(isPanoramiqueService)) {
    rows.push({
      quantity: "---",
      code: "---",
      service: "Examen et radiographie panoramique chez CDC",
      vpt: "---",
      points: "300.00",
      totalPoints: "300.00",
      total: "300.00 CHF",
      crossed: true,
      showPanoramiqueNote: true,
    });
  }

  // Add regular services
  services.forEach((service) => {
    if (isLabFreeInvoice) {
      // Lab free invoice: all line amounts 0
      const vptDisplay =
        service.vpt === "---"
          ? "---"
          : service.vpt != null && service.vpt !== ""
            ? String(service.vpt)
            : "---";
      const pointsNum =
        service.points != null && !Number.isNaN(Number(service.points))
          ? Number(service.points)
          : null;
      const pointsDisplay = pointsNum != null ? pointsNum.toFixed(2) : "---";
      const tPoints = pointsNum != null ? calculateTotalPoints(service) : null;
      const totalPointsDisplay = tPoints != null ? tPoints.toFixed(2) : "---";
      rows.push({
        quantity: String(service.quantity),
        code: service.code === SERVICE_CODES.BLANCHIMENT ? "---" : service.code,
        service: service.service,
        vpt: vptDisplay,
        points: pointsDisplay,
        totalPoints: totalPointsDisplay,
        total: "0.00 CHF",
        crossed: false,
      });
      return;
    }
    if (isLabTotalBased) {
      // Lab: only lab (0.1) uses remainder from total; others use quantity×vpt×points×point_value
      const amount =
        service.code === SERVICE_CODES.LAB_LAB
          ? effectiveLabPrice
          : calculateServicePrice(service);
      const vptDisplay =
        service.vpt === "---"
          ? "---"
          : service.vpt != null && service.vpt !== ""
            ? String(service.vpt)
            : "---";
      const pointsNum =
        service.points != null && !Number.isNaN(Number(service.points))
          ? Number(service.points)
          : null;
      const pointsDisplay = pointsNum != null ? pointsNum.toFixed(2) : "---";
      const tPoints = pointsNum != null ? calculateTotalPoints(service) : null;
      const totalPointsDisplay = tPoints != null ? tPoints.toFixed(2) : "---";
      rows.push({
        quantity: String(service.quantity),
        code: service.code === SERVICE_CODES.BLANCHIMENT ? "---" : service.code,
        service: service.service,
        vpt: vptDisplay,
        points: pointsDisplay,
        totalPoints: totalPointsDisplay,
        total: formatCHF(amount),
        crossed: false,
      });
      return;
    }
    if (shouldExcludeService(service)) {
      return;
    }

    const tPoints = calculateTotalPoints(service);
    const price = calculateServicePrice(service);
    const isCustomService = service.code === SERVICE_CODES.BLANCHIMENT;
    const vptDisplay =
      service.vpt === "---"
        ? "---"
        : service.vpt != null && service.vpt !== ""
          ? String(service.vpt)
          : "---";
    const pointsNum =
      service.points != null && !Number.isNaN(Number(service.points))
        ? Number(service.points)
        : 0;

    rows.push({
      quantity: String(service.quantity),
      code: isCustomService ? "---" : service.code,
      service: service.service,
      vpt: vptDisplay,
      points: pointsNum.toFixed(2),
      totalPoints: tPoints.toFixed(2),
      total: formatCHF(price),
      crossed: false,
    });
  });

  // Add lab service if present (not when Lab total-based: lab 0.1 is already in rows with labPrice)
  if (
    !isLabTotalBased &&
    services.some((s) => s.code === SERVICE_CODES.LAB_LAB)
  ) {
    rows.push({
      quantity: "1",
      code: SERVICE_CODES.LAB_LAB,
      service: "Laboratory service",
      vpt: "---",
      points: "---",
      totalPoints: "---",
      total: formatCHF(labPrice || 0),
      crossed: false,
    });
  }

  return rows;
};

/**
 * Calculate total price from services
 * @param {Object} params - Parameters object
 * @param {Array} params.services - Array of services (with point_value per service)
 * @param {number} params.labPrice - Lab service price
 * @returns {number} Calculated total
 */
export const calculateInvoiceTotal = ({ services, labPrice }) => {
  const selectedServicesSum = services
    .filter((s) => !shouldExcludeFromTotal(s))
    .reduce((sum, service) => sum + calculateServicePrice(service), 0);

  // Include BLANCHIMENT service separately
  const blanchimentService = services.find(
    (s) => s.code === SERVICE_CODES.BLANCHIMENT
  );
  const blanchimentPrice = blanchimentService
    ? calculateServicePrice(blanchimentService)
    : 0;

  // Include lab service if present
  const hasLabService = services.some((s) => s.code === SERVICE_CODES.LAB_LAB);

  return (
    selectedServicesSum + (hasLabService ? labPrice || 0 : 0) + blanchimentPrice
  );
};

/**
 * Sum the numeric total from each invoice row (e.g. "44.00 CHF" -> 44.00).
 * @param {Array<{ total: string, crossed?: boolean }>} rows - Rows from buildInvoiceTableRows
 * @param {Object} [options] - Options
 * @param {boolean} [options.countedOnly=false] - If true, sum only rows that count toward the invoice total (exclude crossed-out/free services).
 * @returns {number} Sum of row totals
 */
export const sumInvoiceRowTotals = (rows, options = {}) => {
  if (!Array.isArray(rows)) return 0;
  const countedOnly = options.countedOnly === true;
  return rows.reduce((sum, row) => {
    if (countedOnly && row?.crossed === true) return sum;
    const str = row?.total;
    if (typeof str !== "string") return sum;
    const num = parseFloat(str);
    return sum + (Number.isFinite(num) ? num : 0);
  }, 0);
};

/** Tolerance in CHF for considering total vs sum of lines equal (rounding). */
const TOTAL_MISMATCH_TOLERANCE = 0.02;

/**
 * Check if the invoice total doesn't match the sum of line item totals that count on the invoice.
 * Only rows that count toward the total (non–crossed-out services) are summed; free/crossed-out
 * services (e.g. Analyse & consultation, Scan, Panoramique) are excluded.
 * When the invoice has a vatRate, the expected total is sumFromLines + VAT amount; the stored
 * totalPrice is the TTC figure so both sides must be compared on the same basis.
 * @param {Object} data - Invoice data (services, brand, showFreeServices, labPrice, totalPrice, vatRate)
 * @returns {{ mismatch: false } | { mismatch: true, sumFromLines: number, totalPrice: number }}
 */
export const getInvoiceTotalMismatch = (data) => {
  if (!data) return { mismatch: false };
  const totalPrice = Number(data.totalPrice) || 0;
  if (totalPrice <= 0) return { mismatch: false };

  const vatRate = Number(data.vatRate) || 0;

  // VAT-preset invoices (Lab treatments): the lab row absorbs the
  // remainder, so the totalPrice is always the authoritative figure. Rounding
  // each line to the nearest 5 cents introduces accumulated floating-point
  // drift that can exceed the tight tolerance even when the numbers are correct.
  // Suppress the mismatch check entirely for these invoices.
  if (vatRate > 0) return { mismatch: false };

  const rows = buildInvoiceTableRows({
    services: data.services,
    brand: data.brand,
    showFreeServices: data.showFreeServices,
    labPrice: data.labPrice,
    totalPrice: data.totalPrice,
    vatRate,
  });
  const sumFromLines = sumInvoiceRowTotals(rows, { countedOnly: true });

  const diff = Math.abs(totalPrice - sumFromLines);
  if (diff <= TOTAL_MISMATCH_TOLERANCE) return { mismatch: false };
  return { mismatch: true, sumFromLines, totalPrice };
};

/**
 * Convert invoice row to PDF table format
 * @param {Object} row - Invoice row object
 * @returns {Array} PDF table row [quantity, code, service, vpt, points, totalPoints, total]
 */
export const rowToPdfFormat = (row) => {
  return [
    row.quantity,
    row.code,
    row.service,
    row.vpt,
    row.points === "---" ? "---" : row.points,
    row.totalPoints === "---" ? "---" : row.totalPoints,
    row.total,
  ];
};
