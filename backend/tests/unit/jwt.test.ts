import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "../../src/modules/auth/domain/jwt.js";

describe("JWT helpers", () => {
  it("signs and verifies payload", () => {
    const token = signToken({
      sub: "42",
      role: "doctor",
      cabinetId: 9,
      cabinetName: "Cabinet Test",
    });
    const payload = verifyToken(`Bearer ${token}`);
    expect(payload).toBeTruthy();
    expect(payload?.sub).toBe("42");
    expect(payload?.role).toBe("doctor");
    expect(payload?.cabinetId).toBe(9);
  });
});
