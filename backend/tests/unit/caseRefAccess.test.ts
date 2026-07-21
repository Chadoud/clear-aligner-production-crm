import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/caseRepository.js", () => ({
  getCaseIdByPatientRef: vi.fn(),
  getCaseById: vi.fn(),
}));

vi.mock("../../src/auth/principal.js", () => ({
  requirePrincipal: vi.fn(),
  enforceCaseAccess: vi.fn(),
}));

import {
  getCaseById,
  getCaseIdByPatientRef,
} from "../../src/repositories/caseRepository.js";
import {
  enforceCaseAccess,
  requirePrincipal,
} from "../../src/auth/principal.js";
import { loadAuthorizedCaseRefContext } from "../../src/routes/v1/utils/caseRefAccess.js";

describe("loadAuthorizedCaseRefContext", () => {
  const makeReply = () =>
    ({
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    }) as any;

  beforeEach(() => {
    vi.mocked(getCaseIdByPatientRef).mockReset();
    vi.mocked(getCaseById).mockReset();
    vi.mocked(requirePrincipal).mockReset();
    vi.mocked(enforceCaseAccess).mockReset();
  });

  it("returns null with 400 when case ref is empty", async () => {
    vi.mocked(requirePrincipal).mockReturnValue({
      userId: 1,
      role: "company",
      cabinetId: null,
      cabinetName: null,
    } as any);
    const reply = makeReply();
    const out = await loadAuthorizedCaseRefContext({} as any, reply, "   ");
    expect(out).toBeNull();
    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it("returns null with 404 when ref lookup fails", async () => {
    vi.mocked(requirePrincipal).mockReturnValue({
      userId: 1,
      role: "company",
      cabinetId: null,
      cabinetName: null,
    } as any);
    vi.mocked(getCaseIdByPatientRef).mockResolvedValue(0 as any);
    const reply = makeReply();
    const out = await loadAuthorizedCaseRefContext({} as any, reply, "ABC123");
    expect(out).toBeNull();
    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it("returns authorized context for valid case ref", async () => {
    const principal = {
      userId: 2,
      role: "doctor",
      cabinetId: 10,
      cabinetName: "X",
    } as any;
    vi.mocked(requirePrincipal).mockReturnValue(principal);
    vi.mocked(getCaseIdByPatientRef).mockResolvedValue(77 as any);
    vi.mocked(getCaseById).mockResolvedValue({ cabinet_id: 10 } as any);
    vi.mocked(enforceCaseAccess).mockReturnValue(true);
    const reply = makeReply();

    const out = await loadAuthorizedCaseRefContext({} as any, reply, "AB-REF");
    expect(out).toEqual({
      principal,
      caseRef: "AB-REF",
      caseId: 77,
      caseRow: { cabinet_id: 10 },
    });
  });
});
