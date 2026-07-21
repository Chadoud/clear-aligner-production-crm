import { describe, expect, it } from "vitest";
import {
  extractColumnsFromPayload,
  parsePaymentReceivedFromRow,
} from "../../src/repositories/invoicePayload.js";
import { INVOICE_STATUS_IN_FABRICATION } from "../../src/constants/invoiceStatus.js";

describe("invoicePayload payment_received_json", () => {
  it("serializes paymentReceivedByDisplayIndex to payment_received_json", () => {
    const cols = extractColumnsFromPayload({
      totalPrice: 1000,
      amountPaid: 200,
      monthlyPaymentEnabled: true,
      monthlyPaymentPlanRows: [],
      services: [],
      paidMonthIndices: [],
      downPaymentPaid: false,
      invoiceStatus: INVOICE_STATUS_IN_FABRICATION,
      paymentReceivedByDisplayIndex: { "0": 500, "1": 75.5 },
    });
    expect(JSON.parse(String(cols.payment_received_json))).toEqual({
      "0": 500,
      "1": 75.5,
    });
  });

  it("returns null payment_received_json for empty map", () => {
    const cols = extractColumnsFromPayload({
      totalPrice: 100,
      amountPaid: 0,
      monthlyPaymentEnabled: false,
      services: [],
      paidMonthIndices: [],
      downPaymentPaid: false,
      invoiceStatus: INVOICE_STATUS_IN_FABRICATION,
      paymentReceivedByDisplayIndex: {},
    });
    expect(cols.payment_received_json).toBeNull();
  });

  it("parsePaymentReceivedFromRow parses DB string", () => {
    expect(parsePaymentReceivedFromRow('{"1":88.05}')).toEqual({ "1": 88.05 });
    expect(parsePaymentReceivedFromRow(null)).toEqual({});
  });
});
