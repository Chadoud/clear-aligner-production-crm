import { test, expect } from "@playwright/test";

const LAB_EMAIL = "lab@example.com";
const LAB_PASSWORD = "Doctor123!";

async function labLogin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(LAB_EMAIL);
  await page.getByTestId("login-password").fill(LAB_PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/app/, { timeout: 20_000 });
}

test.describe("demo seed journey", () => {
  test("lab login reaches case list with seeded patients", async ({ page }) => {
    await labLogin(page);

    await expect(page.getByText("Jordan Martin").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Casey Dupont").first()).toBeVisible();
  });

  test("add new case shows seeded cabinets", async ({ page }) => {
    await labLogin(page);

    await page.goto("/app/company/case-management/new");
    await expect(
      page.getByText(/Add new case|Informations/i).first()
    ).toBeVisible({
      timeout: 15_000,
    });

    const cabinetTrigger = page.locator("#step-cabinet button").first();
    await cabinetTrigger.click();
    await expect(
      page.getByRole("option").filter({ hasText: "Demo Dental Clinic" })
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  test("create invoice treatment preset fills services and total", async ({
    page,
  }) => {
    await labLogin(page);

    await page.goto("/app/company/case-management/id/1001?tab=invoice");
    await expect(page.getByTestId("quotation-presets")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByTestId("quotation-preset-treatment-1000").check();

    const services = page.getByTestId("quotation-selected-services");
    await expect(
      services.locator(".selected-service-item").first()
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(services).toContainText(/0\.1|012|091/);

    const total = page.locator("#totalPrice");
    await expect(total).toHaveValue("1000", { timeout: 10_000 });
  });
});
