export type Brand = "Direct" | "Lab";

export interface ServiceItem {
  code: string;
  service: string;
  points: number | null;
  vpt: number | null;
  quantity?: number;
  quantityCustom?: string;
}

export interface Patient {
  name: string;
  ref: string;
  email?: string | null;
  born: string;
  entered: string;
  cabinet: string;
}

export interface PatientDisplay {
  name: string;
  status: string;
  ref: string;
  info: string[];
}

export interface InvoiceClient {
  name: string;
  ref?: string;
  born?: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface Invoice {
  id?: string;
  brand: Brand;
  client: InvoiceClient;
  services: ServiceItem[];
  generatedDate: string;
  totalPrice: number;
  treatmentDuration?: string | number;
  /** Aligner steps count; shown under duration on the invoice when set. */
  treatmentSteps?: string | number;
  pointValue?: number;
  showFreeServices?: boolean;
  isPaid?: boolean;
  amountPaid?: number;
  remainingBalanceDue?: number;
  monthlyPaymentEnabled?: boolean;
  monthlyPaymentPlanRows?: Array<{
    monthLabel: string;
    dueDate: string;
    amount: number;
  }>;
  /** Optional CHF amounts received per badge (displayIndex string → amount). */
  paymentReceivedByDisplayIndex?: Record<string, number>;
  /** When true, invoice is a quote (pending acceptance); amount excluded from totals. Default true for new invoices. */
  isQuote?: boolean;
  invoiceStatus?: 1 | 2 | 3;
}
