/**
 * Centralized loading state for Dashboard sections (Overview, Doctors Billing).
 * Combines patient, invoice, and cabinet loading so all must be ready before showing data.
 * Cabinets are needed to resolve doctor/cabinet names from cabinet_id when cabinet_nom is missing.
 *
 * @returns {{ dataReady: boolean, dataLoading: boolean }}
 */
import { usePatientService } from "./usePatientService";
import { useDashboardInvoiceData } from "@/context/InvoiceDataContext";
import { useCabinetList } from "./useCabinetList";

export function useDashboardDataReady() {
  const { loading: patientLoading } = usePatientService();
  const { loading: invoiceLoading } = useDashboardInvoiceData();
  const { loading: cabinetLoading } = useCabinetList();

  const dataLoading = patientLoading || invoiceLoading || cabinetLoading;
  const dataReady = !dataLoading;

  return { dataReady, dataLoading };
}
