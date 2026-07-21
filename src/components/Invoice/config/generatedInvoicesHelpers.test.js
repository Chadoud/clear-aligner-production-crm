import { describe, expect, it } from "vitest";
import {
  getTargetStatusFromMostRecentInvoice,
  toggleMonthPaid,
  computeAmountPaidFromPaidState,
  allocateLumpToInstalments,
  getMonthlyOverview,
} from "./generatedInvoicesHelpers";
import {
  DELIVERED_STATUS,
  QUOTE_STATUS_EN_ATTENTE,
  QUOTE_STATUS_IN_FABRICATION,
} from "@/utils/invoices/quoteHelpers.js";

describe("getTargetStatusFromMostRecentInvoice", () => {
  it("returns case-study status when there are no invoices", () => {
    expect(getTargetStatusFromMostRecentInvoice([])).toBe(3);
  });

  it("returns delivered when all invoices are paid", () => {
    const invoices = [{ totalPrice: 1000, amountPaid: 1000, isQuote: false }];
    expect(getTargetStatusFromMostRecentInvoice(invoices)).toBe(
      DELIVERED_STATUS
    );
  });

  it("returns awaiting acceptance when any quote exists", () => {
    const invoices = [
      { totalPrice: 1000, amountPaid: 0, invoiceStatus: 1 },
      { totalPrice: 900, amountPaid: 900, isQuote: false },
    ];
    expect(getTargetStatusFromMostRecentInvoice(invoices)).toBe(
      QUOTE_STATUS_EN_ATTENTE
    );
  });

  it("returns fabrication when no quotes and not all paid", () => {
    const invoices = [{ totalPrice: 1000, amountPaid: 400, isQuote: false }];
    expect(getTargetStatusFromMostRecentInvoice(invoices)).toBe(
      QUOTE_STATUS_IN_FABRICATION
    );
  });
});

describe("toggleMonthPaid with paymentReceivedByDisplayIndex", () => {
  const baseInvoice = () => ({
    totalPrice: 1000,
    monthlyPaymentEnabled: true,
    monthlyPaymentAmount: 100,
    monthlyPaymentPlanRows: [
      { monthLabel: "M1", dueDate: "01/02/2026", amount: 100 },
      { monthLabel: "M2", dueDate: "01/03/2026", amount: 100 },
      { monthLabel: "M3", dueDate: "01/04/2026", amount: 100 },
    ],
    paidMonthIndices: [],
    downPaymentPaid: false,
    amountPaid: 0,
  });

  it("marks first month paid with custom received amount", () => {
    const inv = baseInvoice();
    const r = toggleMonthPaid(inv, 1, { receivedAmount: 85 });
    expect(r.paidMonthIndices).toEqual([0]);
    expect(r.paymentReceivedByDisplayIndex["1"]).toBe(85);
    expect(r.amountPaid).toBe(85);
    expect(r.isPaid).toBe(false);
  });

  it("omits map entry when received equals scheduled instalment", () => {
    const inv = baseInvoice();
    const r = toggleMonthPaid(inv, 1, { receivedAmount: 100 });
    expect(r.paymentReceivedByDisplayIndex["1"]).toBeUndefined();
    expect(r.amountPaid).toBe(100);
  });

  it("unpay removes override key", () => {
    const inv = {
      ...baseInvoice(),
      paidMonthIndices: [0],
      paymentReceivedByDisplayIndex: { 1: 85 },
      amountPaid: 85,
    };
    const r = toggleMonthPaid(inv, 1);
    expect(r.paidMonthIndices).toEqual([]);
    expect(r.paymentReceivedByDisplayIndex["1"]).toBeUndefined();
    expect(r.amountPaid).toBe(0);
  });

  it("computeAmountPaidFromPaidState sums overrides", () => {
    const paidState = {
      downPaymentPaid: true,
      paidMonthIndices: [0, 1],
      downPayment: 700,
      rows: [{ amount: 100 }, { amount: 100 }, { amount: 100 }],
      monthlyAmount: 100,
      paymentReceived: { 0: 700, 1: 90, 2: 100 },
    };
    expect(computeAmountPaidFromPaidState(paidState)).toBe(890);
  });

  it("computeAmountPaidFromPaidState includes partial month not in paidMonthIndices", () => {
    const paidState = {
      downPaymentPaid: true,
      paidMonthIndices: [0, 1],
      downPayment: 800,
      rows: [{ amount: 100 }, { amount: 100 }, { amount: 100 }],
      monthlyAmount: 100,
      paymentReceived: { 3: 55 },
    };
    expect(computeAmountPaidFromPaidState(paidState)).toBe(
      800 + 100 + 100 + 55
    );
  });
});

describe("allocateLumpToInstalments", () => {
  const fourMonthInvoice = () => ({
    totalPrice: 1200,
    monthlyPaymentEnabled: true,
    monthlyPaymentAmount: 100,
    monthlyPaymentPlanRows: [1, 2, 3, 4].map((n) => ({
      monthLabel: `M${n}`,
      dueDate: "01/01/2026",
      amount: 100,
    })),
    downPaymentPaid: true,
    paidMonthIndices: [],
    paymentReceivedByDisplayIndex: {},
    amountPaid: 800,
  });

  it("allocates across full months then partial on next", () => {
    const inv = fourMonthInvoice();
    const r = allocateLumpToInstalments(inv, 250);
    expect(r.paidMonthIndices).toEqual([0, 1]);
    expect(r.paymentReceivedByDisplayIndex["3"]).toBe(50);
    expect(r.amountPaid).toBe(800 + 100 + 100 + 50);
    expect(r.isPaid).toBe(false);
  });

  it("caps lump at remaining treatment balance", () => {
    const inv = fourMonthInvoice();
    const r = allocateLumpToInstalments(inv, 9999);
    expect(r.amountPaid).toBe(1200);
    expect(r.isPaid).toBe(true);
  });
});

describe("getMonthlyOverview partial badges", () => {
  it("exposes paidFraction for partial instalment", () => {
    const inv = {
      totalPrice: 500,
      monthlyPaymentEnabled: true,
      monthlyPaymentAmount: 100,
      monthlyPaymentPlanRows: [
        { monthLabel: "A", dueDate: "01/01/2026", amount: 100 },
        { monthLabel: "B", dueDate: "01/02/2026", amount: 100 },
      ],
      downPaymentPaid: true,
      paidMonthIndices: [0],
      paymentReceivedByDisplayIndex: { 2: 40 },
      amountPaid: 300 + 100 + 40,
    };
    const ov = getMonthlyOverview(inv);
    const partial = ov.months.find((m) => m.monthLabel === "B");
    expect(partial.isPartial).toBe(true);
    expect(partial.paidFraction).toBeCloseTo(0.4, 5);
  });
});
