import { describe, expect, it } from "vitest";
import { useOverviewInvoices } from "./index.js";

describe("overview hooks barrel", () => {
  it("exports useOverviewInvoices from the barrel", () => {
    expect(typeof useOverviewInvoices).toBe("function");
  });
});
