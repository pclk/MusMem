import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  const testUser = {
    email: `test${Date.now()}@example.com`,
    username: `testuser${Date.now()}`,
    password: "testpassword123",
  };

  test("should show landing page with login and register links", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("MusMem")).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Get started" })
    ).toBeVisible();
  });

  test("should show login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("should show register form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Create an account")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("should show error for invalid login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("nonexistent");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByText("Invalid username or password")
    ).toBeVisible();
  });

  test("should register a new user and redirect to /type", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill(testUser.email);
    await page.getByLabel("Username").fill(testUser.username);
    await page.getByLabel("Password").fill(testUser.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("/type", { timeout: 10000 });
    await expect(page).toHaveURL("/type");
  });
});
