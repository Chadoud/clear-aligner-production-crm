/**
 * Cabinet names for Overview doctor/cabinet filter (no synthetic "Unassigned" option).
 */
import { getCabinetForInvoice } from "./overviewCabinet.js";
import type { InvoiceDto } from "@/types/invoice";

/** API list order + any cabinet string seen on invoices but missing from the list. */
export function getEffectiveCabinetNames(
  invoices: InvoiceDto[],
  cabinetNamesForOverviewTable: string[]
): string[] {
  const fromApi = new Set(
    cabinetNamesForOverviewTable
      .map((n) => String(n || "").trim())
      .filter(Boolean)
  );
  const fromInvoices = new Set<string>();
  invoices.forEach((inv) => {
    const cab = getCabinetForInvoice(inv);
    if (cab && !fromApi.has(cab)) fromInvoices.add(cab);
  });
  const ordered = [...cabinetNamesForOverviewTable];
  fromInvoices.forEach((c) => {
    if (!ordered.includes(c)) ordered.push(c);
  });
  return ordered;
}

/** Dedupe + Direct-first sort — used for the multi-select dropdown only. */
export function sortCabinetDropdownOptions(names: string[]): string[] {
  const seen = new Set<string>();
  const list = names.filter((name) => {
    const k = String(name ?? "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return list.sort((a, b) => {
    const aE = String(a ?? "")
      .toLowerCase()
      .includes("direct");
    const bE = String(b ?? "")
      .toLowerCase()
      .includes("direct");
    if (aE && !bE) return -1;
    if (!aE && bE) return 1;
    return 0;
  });
}

export function getCabinetDropdownOptionNames(
  invoices: InvoiceDto[],
  cabinetNamesForOverviewTable: string[]
): string[] {
  return sortCabinetDropdownOptions(
    getEffectiveCabinetNames(invoices, cabinetNamesForOverviewTable)
  );
}
