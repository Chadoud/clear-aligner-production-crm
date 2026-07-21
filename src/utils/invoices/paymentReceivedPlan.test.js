import { describe, expect, it } from "vitest";
import {
  normalizePaymentReceivedMap,
  computePlanDownPaymentScheduled,
  getScheduledAmountForDisplayIndex,
  getCreditedAmountForDisplayIndex,
} from "./paymentReceivedPlan.js";

describe("normalizePaymentReceivedMap", () => {
  it("returns empty object for invalid input", () => {
    expect(normalizePaymentReceivedMap(null)).toEqual({});
    expect(normalizePaymentReceivedMap([])).toEqual({});
  });

  it("normalizes keys and rounds values to 5 rp", () => {
    const r = normalizePaymentReceivedMap({ 0: 100.02, 1: "50.03" });
    expect(r["0"]).toBe(100);
    expect(r["1"]).toBeCloseTo(50.05, 10);
  });
});

describe("computePlanDownPaymentScheduled", () => {
  it("computes down payment from total minus instalments", () => {
    const invoice = {
      totalPrice: 1000,
      monthlyPaymentAmount: 100,
      monthlyPaymentPlanRows: [
        { amount: 100 },
        { amount: 100 },
        { amount: 100 },
      ],
    };
    expect(computePlanDownPaymentScheduled(invoice)).toBe(700);
  });
});

describe("getScheduledAmountForDisplayIndex", () => {
  it("returns down payment for displayIndex 0", () => {
    const invoice = {
      totalPrice: 500,
      monthlyPaymentAmount: 100,
      monthlyPaymentPlanRows: [{ amount: 100 }, { amount: 100 }],
    };
    expect(getScheduledAmountForDisplayIndex(invoice, 0)).toBe(300);
  });

  it("returns row amount for month badges", () => {
    const invoice = {
      totalPrice: 500,
      monthlyPaymentAmount: 100,
      monthlyPaymentPlanRows: [{ amount: 120 }, { amount: 90 }],
    };
    expect(getScheduledAmountForDisplayIndex(invoice, 1)).toBe(120);
    expect(getScheduledAmountForDisplayIndex(invoice, 2)).toBe(90);
  });
});

describe("getCreditedAmountForDisplayIndex", () => {
  it("uses override from map when present", () => {
    const invoice = {
      totalPrice: 500,
      monthlyPaymentAmount: 100,
      monthlyPaymentPlanRows: [{ amount: 100 }, { amount: 100 }],
      paymentReceivedByDisplayIndex: { 1: 77.5 },
    };
    expect(getCreditedAmountForDisplayIndex(invoice, 1)).toBe(77.5);
    expect(getCreditedAmountForDisplayIndex(invoice, 2)).toBe(100);
  });
});
