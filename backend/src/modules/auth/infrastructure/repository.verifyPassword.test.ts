import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { __test__ } from "./repository.js";

const { verifyPassword } = __test__;

describe("verifyPassword (bcrypt-only)", () => {
  it("accepts a valid full bcrypt hash", async () => {
    const hash = await bcrypt.hash("correct-horse", 4);
    expect(await verifyPassword("correct-horse", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("rejects a 32-char MD5 hex string (no legacy fallback)", async () => {
    const md5Hex = "5f4dcc3b5aa765d61d8327deb882cf99"; // md5("password")
    expect(await verifyPassword("password", md5Hex)).toBe(false);
  });

  it("rejects truncated bcrypt-looking strings", async () => {
    const full = await bcrypt.hash("secret", 4);
    const truncated = full.slice(0, 40);
    expect(await verifyPassword("secret", truncated)).toBe(false);
  });
});
