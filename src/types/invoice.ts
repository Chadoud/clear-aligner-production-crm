export interface InvoiceClientDto {
  name?: string | null;
  ref?: string | null;
}

export interface InvoiceDoctorInfoDto {
  name?: string | null;
}

export interface InvoiceDto {
  id?: string | number;
  case_id?: number | null;
  cabinet_id?: number | null;
  cabinetId?: number | null;
  cabinet_nom?: string | null;
  cabinetName?: string | null;
  doctorInfo?: InvoiceDoctorInfoDto | null;
  generatedDate?: string | null;
  /** ISO 8601 from DB `created_at` (API). */
  createdAt?: string | null;
  totalPrice?: number | string | null;
  amountPaid?: number | string | null;
  isPaid?: boolean | null;
  isQuote?: boolean | null;
  invoiceStatus?: number | null;
  brand?: string | null;
  doctorBillGeneratedAt?: string | null;
  client?: InvoiceClientDto | null;
}

export interface PatientSummaryDto {
  case_status?: number | string | null;
  /** Lab/doctor notification flag (beware filter). */
  case_notif?: number | string | null;
  cabinet?: string | null;
  entered?: string | null;
  /** Case ref string (e.g. "26863-3") — used for invoice→patient cross-lookup. */
  ref?: string | null;
  /** Numeric case id — used as fallback lookup key when ref is absent. */
  case_id?: number | null;
}

export interface InvoiceTotalsDto {
  totalPaid: number;
  totalLeft: number;
  totalPending: number;
  totalInvoiced: number;
}
