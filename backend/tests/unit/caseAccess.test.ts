import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/caseRepository.js", () => ({
  getCaseById: vi.fn(),
}));

vi.mock("../../src/auth/principal.js", () => ({
  requirePrincipal: vi.fn(),
  enforceCaseAccess: vi.fn(),
}));

import { getCaseById } from "../../src/repositories/caseRepository.js";
import {
  enforceCaseAccess,
  requirePrincipal,
} from "../../src/auth/principal.js";
import { loadAuthorizedCaseContext } from "../../src/routes/v1/utils/caseAccess.js";

describe("loadAuthorizedCaseContext", () => {
  const makeReply = () =>
    ({
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    }) as any;

  beforeEach(() => {
    vi.mocked(getCaseById).mockReset();
    vi.mocked(requirePrincipal).mockReset();
    vi.mocked(enforceCaseAccess).mockReset();
  });

  it("returns null when case id is invalid and sends 400", async () => {
    vi.mocked(requirePrincipal).mockReturnValue({
      userId: 1,
      role: "company",
      cabinetId: null,
      cabinetName: null,
    } as any);
    const reply = makeReply();
    const out = await loadAuthorizedCaseContext({} as any, reply, "bad");
    expect(out).toBeNull();
    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it("returns null when case not found and sends 404", async () => {
    vi.mocked(requirePrincipal).mockReturnValue({
      userId: 1,
      role: "company",
      cabinetId: null,
      cabinetName: null,
    } as any);
    vi.mocked(getCaseById).mockResolvedValue(null);
    const reply = makeReply();
    const out = await loadAuthorizedCaseContext({} as any, reply, "12");
    expect(out).toBeNull();
    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it("returns context for authorized case", async () => {
    const principal = {
      userId: 2,
      role: "doctor",
      cabinetId: 10,
      cabinetName: "X",
    } as any;
    vi.mocked(requirePrincipal).mockReturnValue(principal);
    vi.mocked(getCaseById).mockResolvedValue({ cabinet_id: 10 } as any);
    vi.mocked(enforceCaseAccess).mockReturnValue(true);
    const reply = makeReply();

    const out = await loadAuthorizedCaseContext({} as any, reply, "99");

    expect(out).toEqual({
      principal,
      caseId: 99,
      caseRow: { cabinet_id: 10 },
    });
  });
});
