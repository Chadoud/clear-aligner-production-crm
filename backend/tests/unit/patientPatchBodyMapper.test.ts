import { describe, expect, it } from "vitest";
import { mapPatientPatchApiBodyToSql } from "../../src/routes/v1/utils/patientPatchBodyMapper.js";

describe("mapPatientPatchApiBodyToSql", () => {
  it("returns null when no patchable fields", () => {
    expect(mapPatientPatchApiBodyToSql({})).toBeNull();
  });

  it("maps demographics and trims strings", () => {
    const out = mapPatientPatchApiBodyToSql({
      first_name: "  Jean ",
      last_name: " Dupont ",
      email: " j@ex.com ",
      phone: " 079 ",
      address: " Rue 1 ",
      date_of_birth: "1999-01-15",
      title: 1,
    });
    expect(out).toEqual({
      case_prenom: "Jean",
      case_nom: "Dupont",
      case_email: "j@ex.com",
      case_phone: "079",
      case_address: "Rue 1",
      case_naissance: "1999-01-15",
      case_title: 1,
    });
  });

  it("maps case_status and case_ref", () => {
    const out = mapPatientPatchApiBodyToSql({
      case_status: 5,
      case_ref: "26001-1",
    });
    expect(out).toEqual({ case_status: 5, case_ref: "26001-1" });
  });

  it("throws on invalid date_of_birth", () => {
    expect(() =>
      mapPatientPatchApiBodyToSql({ date_of_birth: "99-01-01" })
    ).toThrow();
  });

  it("clears nullable fields with null or empty date", () => {
    expect(
      mapPatientPatchApiBodyToSql({
        email: null,
        date_of_birth: null,
        title: null,
      })
    ).toEqual({
      case_email: null,
      case_naissance: null,
      case_title: null,
    });
  });

  it("clears date with empty string", () => {
    const out = mapPatientPatchApiBodyToSql({ date_of_birth: "" });
    expect(out).toEqual({ case_naissance: null });
  });
});

/**
 * Manual verification (doctor vs company):
 * - Company: open case, Edit patient, change fields, Save — header updates after refresh.
 * - Doctor: same for a patient in own cabinet; patient outside cabinet should 404 on PATCH.
 */
