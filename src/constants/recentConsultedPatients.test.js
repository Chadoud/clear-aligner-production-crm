import { describe, it, expect, beforeEach } from "vitest";
import {
  getPatientConsultKey,
  recordPatientConsulted,
  sortPatientsByLastConsulted,
} from "./recentConsultedPatients.js";
import { AUTH_USER_KEY } from "./authStorage.js";

describe("recentConsultedPatients", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 1 }));
  });

  it("getPatientConsultKey prefers ref over case_id", () => {
    expect(getPatientConsultKey({ ref: "E26154", case_id: 99 })).toBe("E26154");
    expect(getPatientConsultKey({ case_id: 99 })).toBe("case:99");
  });

  it("sortPatientsByLastConsulted puts most recent consultation first", () => {
    const patients = [
      { ref: "A", name: "Alpha", entered: "04/06/2026" },
      { ref: "B", name: "Beta", entered: "01/06/2025" },
      { ref: "C", name: "Charlie", entered: "03/05/2026" },
    ];
    recordPatientConsulted({ ref: "B" }, "company");
    recordPatientConsulted({ ref: "C" }, "company");

    const sorted = sortPatientsByLastConsulted(patients, "company");
    expect(sorted.map((p) => p.ref)).toEqual(["C", "B", "A"]);
  });

  it("scopes recent list per user", () => {
    recordPatientConsulted({ ref: "X" }, "company");
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 2 }));
    recordPatientConsulted({ ref: "Y" }, "company");

    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 1 }));
    const user1 = sortPatientsByLastConsulted(
      [
        { ref: "X", entered: "01/01/2020" },
        { ref: "Y", entered: "01/01/2020" },
      ],
      "company"
    );
    expect(user1[0].ref).toBe("X");

    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 2 }));
    const user2 = sortPatientsByLastConsulted(
      [
        { ref: "X", entered: "01/01/2020" },
        { ref: "Y", entered: "01/01/2020" },
      ],
      "company"
    );
    expect(user2[0].ref).toBe("Y");
  });

  it("uses entered date for patients never consulted", () => {
    const patients = [
      { ref: "OLD", entered: "01/01/2020" },
      { ref: "NEW", entered: "04/06/2026" },
    ];
    const sorted = sortPatientsByLastConsulted(patients, "company");
    expect(sorted.map((p) => p.ref)).toEqual(["NEW", "OLD"]);
  });

  it("pins the active patient to the top", () => {
    const patients = [
      { ref: "A", entered: "04/06/2026" },
      { ref: "B", entered: "03/06/2026" },
      { ref: "C", entered: "02/06/2026" },
    ];
    recordPatientConsulted({ ref: "A" }, "company");
    const sorted = sortPatientsByLastConsulted(patients, "company", {
      ref: "C",
    });
    expect(sorted.map((p) => p.ref)).toEqual(["C", "A", "B"]);
  });
});
