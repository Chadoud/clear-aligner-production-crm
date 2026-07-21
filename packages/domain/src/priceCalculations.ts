/**
 * Price math shared by CRM frontend and API (lab line, VAT HT, service sums).
 */
import {
  isExcludedFromPrice,
  isPanoramiqueService,
} from "./serviceLineFilters.js";

export type ServiceLineLike = {
  code?: string;
  quantity?: number | string;
  points?: number | string;
  vpt?: number | string;
  point_value?: number | string;
  service?: string;
};

function calculateServicePrice(service: ServiceLineLike): number {
  const quantity = parseInt(String(service.quantity ?? 0), 10) || 0;
  const points = parseFloat(String(service.points ?? 0)) || 0;
  const vpt = parseFloat(String(service.vpt ?? 1)) || 1.0;
  const pointValue = parseFloat(String(service.point_value ?? 1)) || 1.0;
  return quantity * points * vpt * pointValue;
}

export function calculateTotalFromServices(
  services: ServiceLineLike[]
): number {
  if (!services?.length) return 0;
  return services
    .filter((service) => {
      if (isExcludedFromPrice(service.code)) return false;
      return !isPanoramiqueService(service);
    })
    .reduce((sum, service) => sum + calculateServicePrice(service), 0);
}

export function calculateServicesSumExcludingLab(
  services: ServiceLineLike[]
): number {
  if (!services?.length) return 0;
  return services
    .filter((service) => {
      if (service.code === "0.1") return false;
      if (isExcludedFromPrice(service.code)) return false;
      return !isPanoramiqueService(service);
    })
    .reduce((sum, s) => sum + calculateServicePrice(s), 0);
}

export function calculateLabPrice(
  totalPrice: number,
  services: ServiceLineLike[],
  vatRate = 0
): number {
  const hasLab = services?.some((s) => s.code === "0.1") ?? false;
  if (!hasLab) return 0;
  const servicesSum = calculateServicesSumExcludingLab(services ?? []);
  const total = Number(totalPrice) || 0;
  const effectiveTotal = vatRate > 0 ? total * (1 - vatRate) : total;
  return Math.max(0, effectiveTotal - servicesSum);
}

export function calculateTotalPoints(service: ServiceLineLike): number {
  const quantity = parseInt(String(service.quantity ?? 0), 10) || 0;
  const points = parseFloat(String(service.points ?? 0)) || 0;
  const vpt = parseFloat(String(service.vpt ?? 1)) || 1.0;
  return quantity * points * vpt;
}

export { calculateServicePrice };

/**
 * Distribute total CHF across billable service lines by quantity (legacy / presets).
 */
export function distributeTotalAcrossServices(
  totalPrice: number,
  services: ServiceLineLike[],
  filter?: (s: ServiceLineLike) => boolean
): Map<string, number> {
  const total = Number(totalPrice) || 0;
  if (!Array.isArray(services) || services.length === 0 || total <= 0) {
    return new Map();
  }
  const defaultFilter = (s: ServiceLineLike) => {
    if (isExcludedFromPrice(s.code)) return false;
    return !isPanoramiqueService(s);
  };
  const billable = services.filter(filter ?? defaultFilter);
  const totalQty = billable.reduce(
    (sum, s) => sum + (parseInt(String(s.quantity ?? 0), 10) || 0),
    0
  );
  if (totalQty <= 0) return new Map();
  const map = new Map<string, number>();
  let assigned = 0;
  billable.forEach((s, i) => {
    const qty = parseInt(String(s.quantity ?? 0), 10) || 0;
    const isLast = i === billable.length - 1;
    const amount = isLast
      ? Math.round((total - assigned) * 100) / 100
      : Math.round(total * (qty / totalQty) * 100) / 100;
    assigned += amount;
    const code = s.code ?? "";
    map.set(code, amount);
  });
  return map;
}
