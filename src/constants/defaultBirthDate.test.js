import { describe, it, expect } from "vitest";
import {
  DEFAULT_BIRTH_DATE_YMD,
  normalizeBirthDateYmd,
} from "./defaultBirthDate.js";

describe("defaultBirthDate", () => {
  it("maps legacy 1900 placeholder to 1980", () => {
    expect(normalizeBirthDateYmd("1900-01-01")).toBe(DEFAULT_BIRTH_DATE_YMD);
    expect(DEFAULT_BIRTH_DATE_YMD).toBe("1980-01-01");
  });

  it("keeps real birth dates unchanged", () => {
    expect(normalizeBirthDateYmd("1995-06-12")).toBe("1995-06-12");
  });

  it("returns empty string for missing values", () => {
    expect(normalizeBirthDateYmd(null)).toBe("");
    expect(normalizeBirthDateYmd("")).toBe("");
  });
});
