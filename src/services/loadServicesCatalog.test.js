import { describe, expect, it, vi } from "vitest";
import { runLoadServicesCatalog } from "./loadServicesCatalog.js";

describe("runLoadServicesCatalog", () => {
  it("merges sparse API overrides with static JSON so preset codes resolve", async () => {
    const getStaticServicesJson = vi.fn(async () => [
      { code: "0.1", service: "Laboratory", vpt: 1, points: 100 },
      { code: "012", service: "Modele", vpt: 1, points: 22.2 },
      { code: "091", service: "Attelle", vpt: 1, points: 74.925 },
    ]);

    const result = await runLoadServicesCatalog({
      brand: "Lab",
      isApiEnabled: true,
      hasAuthSession: true,
      storage: { get: () => null },
      cache: {},
      getServicesOverrides: async () => ({
        services: [{ code: "ALIGN-FULL", service: "Full", point_value: 3200 }],
      }),
      apiClientRequest: async () => ({ services: [] }),
      getStaticServicesJson,
      getServicesJsonPath: (b) =>
        b === "Lab" ? "/services-lab.json" : "/services.json",
    });

    expect(result.kind).toBe("api-ok");
    const codes = new Set(result.list.map((s) => s.code));
    expect(codes.has("ALIGN-FULL")).toBe(true);
    expect(codes.has("0.1")).toBe(true);
    expect(codes.has("012")).toBe(true);
    expect(codes.has("091")).toBe(true);
  });
});
