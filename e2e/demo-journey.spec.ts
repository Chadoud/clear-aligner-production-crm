import { test, expect } from "@playwright/test";

const LAB_EMAIL = "lab@example.com";
const LAB_PASSWORD = "Doctor123!";

test.describe("demo seed journey", () => {
  test("lab login reaches case list with seeded patients", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(LAB_EMAIL);
    await page.getByTestId("login-password").fill(LAB_PASSWORD);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });

    // Seeded patients appear in the right rail or case list.
    await expect(page.getByText("Jordan Martin").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Casey Dupont").first()).toBeVisible();
  });

  test("add new case shows seeded cabinets", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(LAB_EMAIL);
    await page.getByTestId("login-password").fill(LAB_PASSWORD);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });

    await page.goto("/app/company/case-management/new");
    await expect(
      page.getByText(/Add new case|Informations/i).first()
    ).toBeVisible({
      timeout: 15_000,
    });

    // Open cabinet CustomSelect and expect Demo Dental Clinic.
    const cabinetTrigger = page.locator("#step-cabinet button").first();
    await cabinetTrigger.click();
    await expect(
      page.getByRole("option").filter({ hasText: "Demo Dental Clinic" })
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});
