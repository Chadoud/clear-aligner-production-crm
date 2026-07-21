import { test, expect } from "@playwright/test";

test("login page renders core controls", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-email")).toBeVisible();
  await expect(page.getByTestId("login-password")).toBeVisible();
  await expect(page.getByTestId("login-submit")).toBeVisible();
});
