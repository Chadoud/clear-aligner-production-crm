import { describe, it, expect } from "vitest";
import {
  formatDateEnGB,
  formatInvoiceDateForDisplay,
} from "./invoiceFormatters.js";

describe("invoice date display (DD/MM/YYYY)", () => {
  it("parses slash dates as day/month/year", () => {
    expect(formatInvoiceDateForDisplay("03/06/2026")).toBe("03/06/2026");
    expect(formatInvoiceDateForDisplay("28/03/2026")).toBe("28/03/2026");
  });

  it("parses ISO dates as day/month/year", () => {
    expect(formatInvoiceDateForDisplay("2026-06-03")).toBe("03/06/2026");
    expect(formatDateEnGB("2026-03-28")).toBe("28/03/2026");
  });

  it("returns em dash for empty values", () => {
    expect(formatInvoiceDateForDisplay("")).toBe("—");
    expect(formatInvoiceDateForDisplay(null)).toBe("—");
  });
});
