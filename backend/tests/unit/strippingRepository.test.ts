import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/db/mysql.js", () => ({
  mysqlQuery: vi.fn(),
}));

vi.mock("../../src/repositories/caseRepository.js", () => ({
  getCaseById: vi.fn(),
}));

import { mysqlQuery } from "../../src/db/mysql.js";
import { getCaseById } from "../../src/repositories/caseRepository.js";
import {
  getLastCompletedStep,
  setStrippingForCase,
  updateStrippingCompletion,
} from "../../src/repositories/strippingRepository.js";

describe("strippingRepository", () => {
  beforeEach(() => {
    vi.mocked(mysqlQuery).mockReset();
    vi.mocked(getCaseById).mockReset();
    vi.mocked(getCaseById).mockResolvedValue({ ref: "CASE-REF-1" } as never);
    vi.mocked(mysqlQuery).mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT case_idx, steps_data")) return [];
      if (sql.includes("SELECT steps_data FROM")) return [];
      return [];
    });
  });

  it("getLastCompletedStep returns latest checked step using ordered list semantics", () => {
    const treatmentSteps = {
      "U17-16": [
        { stepNum: 11, stripings: [], isCompleted: false },
        { stepNum: 21, stripings: [], isCompleted: true },
      ],
      "U11-21": [{ stepNum: 19, stripings: [], isCompleted: true }],
    };
    expect(getLastCompletedStep(treatmentSteps)).toBe("17-16-1");
  });

  it("setStrippingForCase marks completion up to selected simple id and upserts snapshot", async () => {
    const treatmentSteps = {
      "U11-21": [{ stepNum: 7, stripings: ["mesial"], isCompleted: false }],
      "U21-22": [{ stepNum: 9, stripings: ["distal"], isCompleted: false }],
      "U22-23": [{ stepNum: 11, stripings: [], isCompleted: false }],
    };

    await setStrippingForCase(123, treatmentSteps, "21-22");

    const upsertCall = vi
      .mocked(mysqlQuery)
      .mock.calls.find((c) =>
        String(c[0]).includes("INSERT INTO tbl_checkbox_stripping")
      );
    expect(upsertCall).toBeTruthy();
    const params = upsertCall?.[1] as unknown[];
    expect(params[0]).toBe(123);
    const stepsData = JSON.parse(String(params[1])) as Array<{
      gapKey: string;
      stepNum: number;
      isCompleted: boolean;
    }>;
    expect(stepsData.map((s) => s.gapKey)).toEqual([
      "U11-21",
      "U21-22",
      "U22-23",
    ]);
    expect(stepsData.map((s) => s.isCompleted)).toEqual([true, true, false]);
    expect(params[2]).toBe("CASE-REF-1");
    expect(params[3]).toBe("9");
  });

  it("updateStrippingCompletion supports id alias without -0 and updates completion", async () => {
    const stored = JSON.stringify([
      {
        gapKey: "U11-21",
        stepNum: 7,
        stripings: ["mesial"],
        isCompleted: false,
      },
      {
        gapKey: "U21-22",
        stepNum: 9,
        stripings: ["distal"],
        isCompleted: false,
      },
      { gapKey: "U22-23", stepNum: 11, stripings: [], isCompleted: false },
    ]);
    vi.mocked(mysqlQuery).mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT case_idx, steps_data")) return [];
      if (sql.includes("SELECT steps_data FROM"))
        return [{ steps_data: stored }];
      return [];
    });

    await updateStrippingCompletion(123, "11-21");

    const upsertCall = vi
      .mocked(mysqlQuery)
      .mock.calls.find((c) =>
        String(c[0]).includes("INSERT INTO tbl_checkbox_stripping")
      );
    expect(upsertCall).toBeTruthy();
    const params = upsertCall?.[1] as unknown[];
    const stepsData = JSON.parse(String(params[1])) as Array<{
      gapKey: string;
      isCompleted: boolean;
    }>;
    expect(stepsData.map((s) => s.isCompleted)).toEqual([true, false, false]);
    expect(params[3]).toBe("7");
  });
});
