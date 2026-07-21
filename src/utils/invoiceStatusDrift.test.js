import { describe, expect, it } from "vitest";
import {
  INVOICE_STATUS_QUOTE as frontendQuote,
  INVOICE_STATUS_IN_FABRICATION as frontendFabrication,
  INVOICE_STATUS_PAID as frontendPaid,
} from "@/utils/invoices/invoiceStatusConstants.js";
import {
  INVOICE_STATUS_QUOTE as backendQuote,
  INVOICE_STATUS_IN_FABRICATION as backendFabrication,
  INVOICE_STATUS_PAID as backendPaid,
} from "../../backend/src/constants/invoiceStatus.ts";

describe("invoice status parity", () => {
  it("keeps frontend and backend invoice status constants in sync", () => {
    expect(frontendQuote).toBe(backendQuote);
    expect(frontendFabrication).toBe(backendFabrication);
    expect(frontendPaid).toBe(backendPaid);
  });
});
