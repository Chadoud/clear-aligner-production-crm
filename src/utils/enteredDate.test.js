import { describe, it, expect } from "vitest";
import { parseEnteredToDate, enteredToMonthKey } from "./dates/enteredDate.js";

describe("enteredDate", () => {
  describe("parseEnteredToDate", () => {
    it("parses DD/MM/YYYY", () => {
      const d = parseEnteredToDate("25/12/2024");
      expect(d).toBeInstanceOf(Date);
      expect(d.getDate()).toBe(25);
      expect(d.getMonth()).toBe(11);
      expect(d.getFullYear()).toBe(2024);
    });
    it("parses DD/MM/YY", () => {
      const d = parseEnteredToDate("01/06/24");
      expect(d.getFullYear()).toBe(2024);
    });
    it("returns null for invalid", () => {
      expect(parseEnteredToDate("")).toBeNull();
      expect(parseEnteredToDate(null)).toBeNull();
      expect(parseEnteredToDate("1/2")).toBeNull();
      expect(parseEnteredToDate("32/01/2024")).toBeNull();
    });
  });
  describe("enteredToMonthKey", () => {
    it("returns YYYY-MM", () => {
      expect(enteredToMonthKey("25/12/2024")).toBe("2024-12");
      expect(enteredToMonthKey("01/06/24")).toBe("2024-06");
    });
    it("returns null for invalid", () => {
      expect(enteredToMonthKey("")).toBeNull();
      expect(enteredToMonthKey("invalid")).toBeNull();
    });
  });
});
