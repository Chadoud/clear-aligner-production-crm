/**
 * Parity and shape tests for case status metrics (single canonical pipeline).
 */
import { describe, it, expect } from "vitest";
import {
  computeStatusCounts,
  filterPatientsByStatus,
  attachCaseStatus,
  ALL_STATUS_ID,
} from "./caseStatusMetrics";
import { CASE_STATUS_OPTIONS } from "@/utils/cases/index.js";

describe("caseStatusMetrics", () => {
  it("computeStatusCounts returns total and counts for all status ids", () => {
    const patients = [
      { case_status: 3, ref: "1" },
      { case_status: 3, ref: "2" },
      { case_status: 7, ref: "3" },
    ];
    const { total, counts } = computeStatusCounts(patients);
    expect(total).toBe(3);
    expect(counts[ALL_STATUS_ID]).toBe(3);
    expect(counts.case_study).toBe(2);
    expect(counts.delivered).toBe(1);
  });

  it("filterPatientsByStatus(all) returns all with caseStatus attached", () => {
    const patients = [{ case_status: 4, ref: "a" }];
    const list = filterPatientsByStatus(patients, ALL_STATUS_ID);
    expect(list).toHaveLength(1);
    expect(list[0].caseStatus).toBe("en_attente");
  });

  it("filterPatientsByStatus(statusId) returns only matching", () => {
    const patients = [
      { case_status: 3, ref: "1" },
      { case_status: 7, ref: "2" },
    ];
    const list = filterPatientsByStatus(patients, "case_study");
    expect(list).toHaveLength(1);
    expect(list[0].ref).toBe("1");
  });

  it("attachCaseStatus adds caseStatus to each patient", () => {
    const patients = [
      { case_status: 5, ref: "x" },
      { case_status: 11, ref: "y" },
    ];
    const out = attachCaseStatus(patients);
    expect(out[0].caseStatus).toBe("in_fabrication");
    expect(out[1].caseStatus).toBe("in_treatment");
  });

  /** Parity: computed counts match fixture snapshot (no double-count or loss). */
  it("parity: total equals sum of per-status counts for fixture snapshot", () => {
    const fixture = [
      { ref: "A", case_status: 3 },
      { ref: "B", case_status: 3 },
      { ref: "C", case_status: 7 },
      { ref: "D", case_status: 4 },
      { ref: "E", case_status: 5 },
      { ref: "F", case_status: 11 },
    ];
    const { total, counts } = computeStatusCounts(fixture);
    const sumPerStatus = CASE_STATUS_OPTIONS.reduce(
      (acc, o) => acc + (counts[o.id] ?? 0),
      0
    );
    expect(total).toBe(fixture.length);
    expect(sumPerStatus).toBe(total);
    expect(counts[ALL_STATUS_ID]).toBe(6);
    expect(counts.case_study).toBe(2);
    expect(counts.delivered).toBe(1);
    expect(counts.en_attente).toBe(1);
    expect(counts.in_fabrication).toBe(1);
    expect(counts.in_treatment).toBe(1);
  });

  it("beware filter uses case_notif when scope provided", () => {
    const patients = [
      { ref: "a", case_status: 3, case_notif: 2 },
      { ref: "b", case_status: 5, case_notif: 0 },
      { ref: "c", case_status: 4, case_notif: 2 },
    ];
    const list = filterPatientsByStatus(patients, "beware", {
      scope: "company",
    });
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.ref)).toEqual(["a", "c"]);
  });

  it("beware count uses case_notif when scope provided", () => {
    const patients = [
      { ref: "a", case_status: 3, case_notif: 1 },
      { ref: "b", case_status: 5, case_notif: 2 },
    ];
    const { counts } = computeStatusCounts(patients, { scope: "doctor" });
    expect(counts.beware).toBe(1);
  });
});
