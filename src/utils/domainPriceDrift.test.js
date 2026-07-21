import { describe, expect, it } from "vitest";
import {
  calculateLabPrice,
  calculateServicesSumExcludingLab,
} from "@aligner-crm/domain";
import {
  calculateLabPrice as feLab,
  calculateServicesSumExcludingLab as feSum,
} from "@/utils/calculations/priceCalculations.js";

describe("@aligner-crm/domain price exports", () => {
  it("re-exports match direct domain imports for lab price", () => {
    const services = [
      { code: "0.1", quantity: 1, points: 1, vpt: 1, point_value: 1 },
      { code: "1.1", quantity: 1, points: 10, vpt: 1, point_value: 1 },
    ];
    const total = 1200;
    expect(feLab(total, services, 0)).toBe(
      calculateLabPrice(total, services, 0)
    );
  });

  it("re-exports match for services sum excluding lab", () => {
    const services = [
      { code: "0.1", quantity: 1, points: 1, vpt: 1, point_value: 1 },
      { code: "1.1", quantity: 2, points: 5, vpt: 1, point_value: 1 },
    ];
    expect(feSum(services)).toBe(calculateServicesSumExcludingLab(services));
  });
});
