import { getCabinetsList } from "@/data/cabinets";

/**
 * Resolve cabinet id for doctor-bill email **before** refreshInvoices().
 * After await refreshInvoices(), `allInvoices` in this closure is still the
 * previous render — lookups there often miss `cabinet_id` and skip the email.
 *
 * @param {unknown[]} lineItems
 * @param {unknown[]} allInvoices
 * @param {string} doctorName
 * @returns {number|null}
 */
export function resolveCabinetIdForDoctorBill(
  lineItems,
  allInvoices,
  doctorName
) {
  const invoices = allInvoices ?? [];
  for (const item of lineItems ?? []) {
    const iid = item?.invoiceId;
    if (iid == null || iid === "") continue;
    const inv = invoices.find((i) => String(i?.id) === String(iid));
    if (inv) {
      const cid = inv?.cabinet_id ?? inv?.cabinetId;
      if (cid != null && Number.isFinite(Number(cid))) return Number(cid);
    }
  }
  const norm = (s) =>
    String(s ?? "")
      .trim()
      .toLowerCase();
  const dn = norm(doctorName);
  if (dn) {
    const match = (getCabinetsList() ?? []).find((c) => norm(c.name) === dn);
    if (match?.id != null && Number.isFinite(Number(match.id))) {
      return Number(match.id);
    }
  }
  return null;
}
