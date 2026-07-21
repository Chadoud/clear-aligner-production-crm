import { describe, it, expect } from "vitest";
import { safeString, safeTrim, safeNumber } from "./shared/coercion.js";

describe("coercion", () => {
  describe("safeString", () => {
    it("returns string for primitives", () => {
      expect(safeString(1)).toBe("1");
      expect(safeString("a")).toBe("a");
    });
    it("returns default for null/undefined", () => {
      expect(safeString(null)).toBe("");
      expect(safeString(null, "x")).toBe("x");
    });
  });
  describe("safeTrim", () => {
    it("trims and returns non-empty", () => {
      expect(safeTrim("  a  ")).toBe("a");
    });
    it("returns default for empty or null", () => {
      expect(safeTrim("")).toBe("");
      expect(safeTrim(null)).toBe("");
    });
  });
  describe("safeNumber", () => {
    it("returns number for numeric values", () => {
      expect(safeNumber(1)).toBe(1);
      expect(safeNumber("2")).toBe(2);
    });
    it("returns default for NaN/null", () => {
      expect(safeNumber(null)).toBeNull();
      expect(safeNumber("x")).toBeNull();
    });
  });
});
