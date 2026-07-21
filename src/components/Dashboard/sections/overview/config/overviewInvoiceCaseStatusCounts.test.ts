/**
 * Scoped patient case-status counts align with invoice filter universe (dedup per case).
 */
import { describe, it, expect } from "vitest";
import { computePatientCaseStatusCountsFromScopedInvoices } from "./overviewInvoiceCaseStatusCounts.js";

const ALL_PATIENTS = [
  { case_id: 10, ref: "a", case_status: 7, case_notif: 0 }, // delivered
  { case_id: 20, ref: "b", case_status: 3, case_notif: 0 }, // case_study
];

describe("computePatientCaseStatusCountsFromScopedInvoices", () => {
  it("counts each case once and follows computeStatusCounts / workflow ids", () => {
    const invoices = [
      { id: 1, case_id: 10, client: { ref: "a" } },
      { id: 2, case_id: 10, client: { ref: "a" } },
      { id: 3, case_id: 20, client: { ref: "b" } },
    ];
    const counts = computePatientCaseStatusCountsFromScopedInvoices(
      invoices as never,
      {},
      ALL_PATIENTS as never
    );
    expect(counts.delivered).toBe(1);
    expect(counts.case_study).toBe(1);
    expect(counts.all).toBe(2);
  });

  it("empty invoices yields zero totals", () => {
    const counts = computePatientCaseStatusCountsFromScopedInvoices(
      [],
      {},
      ALL_PATIENTS as never
    );
    expect(counts.all).toBe(0);
  });
});
