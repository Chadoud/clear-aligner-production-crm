import { describe, expect, it } from "vitest";
import { EXCLUDED_FROM_PRICE } from "@aligner-crm/domain";
import { SERVICE_CODES } from "@/constants/serviceCodes.js";

describe("excluded service codes parity", () => {
  it("EXCLUDED_FROM_PRICE matches SERVICE_CODES canonical list", () => {
    expect([...EXCLUDED_FROM_PRICE]).toEqual([
      SERVICE_CODES.FIRST_CONSULTATION,
      SERVICE_CODES.SCAN_INTRA_EXTRA_ORAL,
      SERVICE_CODES.TRAITEMENT_ALIGNEMENT,
    ]);
  });
});
