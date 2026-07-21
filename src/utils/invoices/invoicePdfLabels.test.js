import { describe, it, expect } from "vitest";
import {
  getInvoicePdfLabels,
  formatBornOnLine,
  formatEmailLine,
  formatMonthsCount,
  formatVatLine,
} from "./invoicePdfLabels.js";

describe("getInvoicePdfLabels", () => {
  it("translates section headers in French", () => {
    const labels = getInvoicePdfLabels("fr");
    expect(labels.from).toBe("DE");
    expect(labels.to).toBe("À :");
    expect(labels.patient).toBe("PATIENT :");
    expect(labels.treatment).toBe("TRAITEMENT");
    expect(labels.paymentReceived).toBe("PAIEMENT REÇU");
  });

  it("keeps English defaults", () => {
    const labels = getInvoicePdfLabels("en");
    expect(labels.from).toBe("FROM");
    expect(labels.treatment).toBe("TREATMENT");
  });
});

describe("invoicePdfLabels formatters", () => {
  it("formats born-on and email lines", () => {
    expect(formatBornOnLine("01/01/1980", "fr")).toBe("Né(e) le 01/01/1980");
    expect(formatEmailLine("a@b.ch", "fr")).toBe("E-mail : a@b.ch");
  });

  it("formats months count", () => {
    expect(formatMonthsCount(12, "fr")).toBe("12 mois");
    expect(formatMonthsCount(6, "en")).toBe("6 months");
  });

  it("formats VAT line with locale decimal", () => {
    expect(formatVatLine("8.1", "fr")).toBe("TVA (8,1%)");
    expect(formatVatLine("8.1", "en")).toBe("VAT (8.1%)");
  });
});
