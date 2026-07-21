/**
 * Unit tests for case status mapping (DB <-> UI).
 */
import { describe, it, expect } from "vitest";
import {
  getCaseStatusLabel,
  caseStatusToUiId,
  uiStatusToDbStatus,
  CASE_STATUS_OPTIONS,
} from "./cases/caseStatus.js";

describe("caseStatus", () => {
  describe("getCaseStatusLabel", () => {
    it("returns label for known id", () => {
      expect(getCaseStatusLabel("case_study")).toBe("Case study");
      expect(getCaseStatusLabel("in_fabrication")).toBe("In fabrication");
      expect(getCaseStatusLabel("in_treatment")).toBe("In treatment");
      expect(getCaseStatusLabel("delivered")).toBe("Delivered");
    });
    it("returns empty string for null/undefined", () => {
      expect(getCaseStatusLabel(null)).toBe("—");
      expect(getCaseStatusLabel(undefined)).toBe("—");
      expect(getCaseStatusLabel("")).toBe("—");
    });
    it("returns id string for unknown id", () => {
      expect(getCaseStatusLabel("unknown")).toBe("unknown");
    });
  });

  describe("caseStatusToUiId", () => {
    it("maps DB 0 to no_follow_up", () => {
      expect(caseStatusToUiId(0)).toBe("no_follow_up");
    });
    it("maps DB 3 to case_study", () => {
      expect(caseStatusToUiId(3)).toBe("case_study");
    });
    it("maps DB 5 to in_fabrication", () => {
      expect(caseStatusToUiId(5)).toBe("in_fabrication");
    });
    it("maps DB 11 to in_treatment", () => {
      expect(caseStatusToUiId(11)).toBe("in_treatment");
    });
    it("maps DB 7 to delivered", () => {
      expect(caseStatusToUiId(7)).toBe("delivered");
    });
    it("returns default for null/undefined", () => {
      expect(caseStatusToUiId(null)).toBe("no_follow_up");
      expect(caseStatusToUiId(undefined)).toBe("no_follow_up");
    });
  });

  describe("uiStatusToDbStatus", () => {
    it("maps UI id to DB number", () => {
      expect(uiStatusToDbStatus("case_study")).toBe(3);
      expect(uiStatusToDbStatus("in_fabrication")).toBe(5);
      expect(uiStatusToDbStatus("in_treatment")).toBe(11);
      expect(uiStatusToDbStatus("delivered")).toBe(7);
      expect(uiStatusToDbStatus("no_follow_up")).toBe(8);
    });
    it("returns undefined for null/empty/unknown", () => {
      expect(uiStatusToDbStatus(null)).toBeUndefined();
      expect(uiStatusToDbStatus("")).toBeUndefined();
      expect(uiStatusToDbStatus("unknown")).toBeUndefined();
    });
  });

  describe("CASE_STATUS_OPTIONS", () => {
    it("includes expected ids", () => {
      const ids = CASE_STATUS_OPTIONS.map((o) => o.id);
      expect(ids).toContain("case_study");
      expect(ids).toContain("in_fabrication");
      expect(ids).toContain("in_treatment");
      expect(ids).toContain("beware");
      expect(ids).toContain("delivered");
    });
  });
});
