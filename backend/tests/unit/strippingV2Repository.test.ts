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
  deleteStrippingV2ForCase,
  getStrippingV2ByCaseId,
  upsertStrippingV2ForCase,
} from "../../src/repositories/strippingV2Repository.js";

describe("strippingV2Repository", () => {
  beforeEach(() => {
    vi.mocked(mysqlQuery).mockReset();
    vi.mocked(getCaseById).mockReset();
    vi.mocked(getCaseById).mockResolvedValue({ ref: "CASE-REF-9" } as never);
    vi.mocked(mysqlQuery).mockImplementation(async (sql: string) => {
      if (String(sql).includes("CREATE TABLE")) return [];
      if (String(sql).includes("SELECT schema_version")) return [];
      return [];
    });
  });

  it("upsertStrippingV2ForCase inserts scene_json and schema_version", async () => {
    const scene = {
      schemaVersion: 1,
      cases: [
        {
          id: "a1",
          label: "3",
          origin: { x: 1, y: 2 },
          target: { x: 4, y: 5 },
        },
      ],
      attachments: [
        {
          id: "m1",
          x: 10,
          y: 20,
          width: 32,
          height: 32,
          rotation: 0,
          moduleId: "comment",
          commentText: "Hi",
        },
      ],
    };
    await upsertStrippingV2ForCase(77, scene);

    const upsertCall = vi
      .mocked(mysqlQuery)
      .mock.calls.find((c) =>
        String(c[0]).includes("INSERT INTO tbl_stripping_v2")
      );
    expect(upsertCall).toBeTruthy();
    const params = upsertCall?.[1] as unknown[];
    expect(params[0]).toBe(77);
    expect(params[1]).toBe("CASE-REF-9");
    expect(params[2]).toBe(1);
    const inner = JSON.parse(String(params[3])) as {
      cases: unknown[];
      attachments: unknown[];
    };
    expect(inner.cases).toHaveLength(1);
    expect(inner.attachments).toHaveLength(1);
  });

  it("upsertStrippingV2ForCase deletes when scene is empty", async () => {
    await upsertStrippingV2ForCase(5, {
      schemaVersion: 1,
      cases: [],
      attachments: [],
    });
    const del = vi
      .mocked(mysqlQuery)
      .mock.calls.find((c) =>
        String(c[0]).includes("DELETE FROM tbl_stripping_v2")
      );
    expect(del).toBeTruthy();
    expect((del?.[1] as unknown[])[0]).toBe(5);
  });

  it("getStrippingV2ByCaseId merges column schema_version with scene_json", async () => {
    vi.mocked(mysqlQuery).mockImplementation(async (sql: string) => {
      if (String(sql).includes("CREATE TABLE")) return [];
      if (String(sql).includes("SELECT schema_version"))
        return [
          {
            schema_version: 1,
            scene_json: JSON.stringify({
              cases: [{ id: "x" }],
              attachments: [],
            }),
          },
        ];
      return [];
    });
    const got = await getStrippingV2ByCaseId(3);
    expect(got?.schemaVersion).toBe(1);
    expect(got?.cases).toHaveLength(1);
    expect(got?.attachments).toEqual([]);
  });

  it("deleteStrippingV2ForCase runs DELETE", async () => {
    await deleteStrippingV2ForCase(99);
    const del = vi
      .mocked(mysqlQuery)
      .mock.calls.find((c) =>
        String(c[0]).includes("DELETE FROM tbl_stripping_v2")
      );
    expect(del).toBeTruthy();
    expect((del?.[1] as unknown[])[0]).toBe(99);
  });
});
