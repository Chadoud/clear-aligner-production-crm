import { describe, it, expect } from "vitest";
import { getVatLabels } from "./vatLabels.js";

describe("getVatLabels", () => {
  it("uses VAT in English", () => {
    const labels = getVatLabels("en");
    expect(labels.subtotalExclVat).toBe("Subtotal excl. VAT");
    expect(labels.formatVatLine("8.1")).toBe("VAT (8.1%)");
    expect(labels.totalInclVat).toBe("TOTAL incl. VAT");
  });

  it("uses TVA in French", () => {
    const labels = getVatLabels("fr");
    expect(labels.subtotalExclVat).toBe("Sous-total HT");
    expect(labels.formatVatLine("8.1")).toBe("TVA (8,1%)");
    expect(labels.totalInclVat).toBe("TOTAL TTC");
  });
});
