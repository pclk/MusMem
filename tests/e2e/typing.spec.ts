import { test, expect } from "@playwright/test";

test.describe("Typing Interface", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/type");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("should redirect to login for stats when not authenticated", async ({
    page,
  }) => {
    await page.goto("/stats");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });

  test("should redirect to login for settings when not authenticated", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
  });
});
