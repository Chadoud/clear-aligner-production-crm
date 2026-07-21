import { EXCLUDED_FROM_PRICE } from "./excludedServiceCodes.js";

export const PANORAMIQUE_CODE = "PANORAMIQUE" as const;

const PANORAMIQUE_SERVICE_LABEL = "Examen et radiographie panoramique chez CDC";

const excluded = new Set<string>(EXCLUDED_FROM_PRICE);

export function isExcludedFromPrice(code: string | undefined): boolean {
  return code != null && excluded.has(code);
}

export function isPanoramiqueService(service: {
  code?: string;
  service?: string;
}): boolean {
  return (
    service.code === PANORAMIQUE_CODE ||
    service.service === PANORAMIQUE_SERVICE_LABEL ||
    (service.service?.toLowerCase().includes("panoramique") ?? false)
  );
}
