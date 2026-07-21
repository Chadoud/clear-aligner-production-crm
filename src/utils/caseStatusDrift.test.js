import { describe, expect, it } from "vitest";
import { uiStatusToDbStatus } from "@/utils/cases/index.js";
import {
  CASE_STATUS_CASE_STUDY,
  CASE_STATUS_AWAITING_ACCEPTANCE,
  CASE_STATUS_IN_FABRICATION,
  CASE_STATUS_IN_TREATMENT,
  CASE_STATUS_DELIVERED,
  CASE_STATUS_REACTIVATION,
  CASE_STATUS_NO_FOLLOW_UP,
} from "../../backend/src/constants/caseStatus.ts";

describe("case status parity", () => {
  it("keeps backend and frontend canonical case statuses in sync", () => {
    expect(uiStatusToDbStatus("case_study")).toBe(CASE_STATUS_CASE_STUDY);
    expect(uiStatusToDbStatus("en_attente")).toBe(
      CASE_STATUS_AWAITING_ACCEPTANCE
    );
    expect(uiStatusToDbStatus("in_fabrication")).toBe(
      CASE_STATUS_IN_FABRICATION
    );
    expect(uiStatusToDbStatus("in_treatment")).toBe(CASE_STATUS_IN_TREATMENT);
    expect(uiStatusToDbStatus("delivered")).toBe(CASE_STATUS_DELIVERED);
    expect(uiStatusToDbStatus("reactivation")).toBe(CASE_STATUS_REACTIVATION);
    expect(uiStatusToDbStatus("no_follow_up")).toBe(CASE_STATUS_NO_FOLLOW_UP);
  });
});
