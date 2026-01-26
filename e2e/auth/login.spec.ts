import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");

    // Should show the welcome message and GitHub button
    await expect(page.getByText("Welcome to FlowForge")).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();
  });

  test("should redirect unauthenticated user to login", async ({ page }) => {
    // Try to access a protected route
    await page.goto("/dashboard");

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("should show GitHub OAuth button", async ({ page }) => {
    await page.goto("/login");

    // Look for GitHub sign-in button
    const githubButton = page.getByRole("button", { name: /continue with github/i });
    await expect(githubButton).toBeVisible();
  });

  test("should have proper login page structure", async ({ page }) => {
    await page.goto("/login");

    // Check for key elements
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: /welcome to flowforge/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /github/i })).toBeVisible();
  });
});
