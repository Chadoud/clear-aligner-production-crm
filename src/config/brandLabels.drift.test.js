import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRODUCT_DISPLAY_NAME } from "./brandLabels.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("brandLabels drift", () => {
  it("keeps FE and BE PRODUCT_DISPLAY_NAME aligned", () => {
    const be = readFileSync(
      resolve(root, "backend/src/utils/brandLabels.ts"),
      "utf8"
    );
    const match = be.match(
      /export const PRODUCT_DISPLAY_NAME\s*=\s*["']([^"']+)["']/
    );
    expect(match?.[1]).toBe(PRODUCT_DISPLAY_NAME);
  });
});
