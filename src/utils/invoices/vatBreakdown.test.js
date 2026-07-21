import { describe, it, expect } from "vitest";
import {
  SWISS_VAT_RATE,
  resolveVatRate,
  computeVatBreakdown,
} from "./vatBreakdown.js";

describe("vatBreakdown", () => {
  it("uses 8.1% as the standard Swiss VAT rate", () => {
    expect(SWISS_VAT_RATE).toBe(0.081);
  });

  it("upgrades legacy 7.7% stored rates", () => {
    expect(resolveVatRate(0.077)).toBe(0.081);
  });

  it("computes VAT from TTC at 8.1%", () => {
    const { vatAmount, totalHT } = computeVatBreakdown(1000, 0.081);
    expect(vatAmount).toBe(81);
    expect(totalHT).toBe(919);
  });
});
