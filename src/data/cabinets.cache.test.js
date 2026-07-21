import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repositories/CabinetRepository.js", () => ({
  fetchCabinets: vi.fn(async () => ({
    cabinets: [
      {
        id: 2,
        slug: "2",
        name: "Demo Dental Clinic",
        email: "doctor@example.com",
        entered_at: null,
      },
    ],
    total: 1,
  })),
  fetchCabinetById: vi.fn(),
  fetchCabinetBySlug: vi.fn(),
}));

import { fetchCabinets } from "../repositories/CabinetRepository.js";
import {
  invalidateCabinetCache,
  loadCabinetsFromApi,
  getCabinetsList,
} from "./cabinets.js";

describe("cabinets warm cache", () => {
  beforeEach(() => {
    invalidateCabinetCache();
    vi.mocked(fetchCabinets).mockClear();
  });

  it("skips network when warm cache is within TTL", async () => {
    await loadCabinetsFromApi();
    expect(fetchCabinets).toHaveBeenCalledTimes(1);
    expect(getCabinetsList()).toHaveLength(1);

    await loadCabinetsFromApi();
    expect(fetchCabinets).toHaveBeenCalledTimes(1);

    await loadCabinetsFromApi({ force: true });
    expect(fetchCabinets).toHaveBeenCalledTimes(2);
  });
});
