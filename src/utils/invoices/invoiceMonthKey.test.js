import { describe, expect, it } from "vitest";
import { invoiceDateToMonthKey } from "./invoiceMonthKey.js";

describe("invoiceDateToMonthKey", () => {
  it("parses dd/mm/yyyy and dd/mm/yy dates", () => {
    expect(invoiceDateToMonthKey("28/03/2026")).toBe("2026-03");
    expect(invoiceDateToMonthKey("5/4/26")).toBe("2026-04");
  });

  it("parses iso dates and ignores day precision", () => {
    expect(invoiceDateToMonthKey("2026-12-01")).toBe("2026-12");
    expect(invoiceDateToMonthKey("2026-7-9")).toBe("2026-07");
  });

  it("returns null for empty or invalid values", () => {
    expect(invoiceDateToMonthKey("")).toBeNull();
    expect(invoiceDateToMonthKey("not-a-date")).toBeNull();
    expect(invoiceDateToMonthKey(null)).toBeNull();
  });
});
