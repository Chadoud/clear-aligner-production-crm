import { describe, it, expect } from "vitest";
import {
  calculateServicePrice,
  calculateTotalFromServices,
} from "./priceCalculations.js";

describe("priceCalculations", () => {
  it("calculateServicePrice computes quantity x points x vpt x point_value", () => {
    const value = calculateServicePrice({
      quantity: 2,
      points: 10,
      vpt: 1.5,
      point_value: 1.2,
    });
    expect(value).toBe(36);
  });

  it("calculateTotalFromServices returns 0 for empty list", () => {
    expect(calculateTotalFromServices([])).toBe(0);
  });
});
