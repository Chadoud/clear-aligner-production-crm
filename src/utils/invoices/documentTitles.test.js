import { describe, it, expect } from "vitest";
import { getViewTitle } from "./documentTitles.js";

describe("getViewTitle", () => {
  it("uses English Lab titles when locale is en", () => {
    expect(getViewTitle("quote", "Lab", "en")).toBe("QUOTE");
    expect(getViewTitle("invoice", "Lab", "en")).toBe("BULLETIN");
    expect(getViewTitle("receipt", "Lab", "en")).toBe("RECEIPT");
  });

  it("uses French Lab titles when locale is fr", () => {
    expect(getViewTitle("quote", "Lab", "fr")).toBe("DEVIS");
    expect(getViewTitle("invoice", "Lab", "fr")).toBe("BULLETIN");
    expect(getViewTitle("receipt", "Lab", "fr")).toBe("REÇU");
  });

  it("uses localized Direct titles", () => {
    expect(getViewTitle("quote", "Direct", "en")).toBe("QUOTATION");
    expect(getViewTitle("quote", "Direct", "fr")).toBe("DEVIS");
    expect(getViewTitle("invoice", "Direct", "fr")).toBe("FACTURE");
  });
});
