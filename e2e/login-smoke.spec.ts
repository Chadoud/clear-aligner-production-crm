import { test, expect } from "@playwright/test";

test("login page renders core controls", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Doctors Portal & Laboratory")).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
