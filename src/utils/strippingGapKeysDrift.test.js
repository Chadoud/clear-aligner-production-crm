import { describe, expect, it } from "vitest";
import { STRIPPING_GAP_KEYS as frontendGapKeys } from "@/components/shared/DentalToothGrid/config/constants.js";
import { STRIPPING_GAP_KEYS as backendGapKeys } from "../../backend/src/constants/strippingGapKeys.ts";

describe("stripping gap keys parity", () => {
  it("keeps backend and frontend canonical gap order in sync", () => {
    expect(frontendGapKeys).toEqual([...backendGapKeys]);
  });
});
