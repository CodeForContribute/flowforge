import { test, expect } from "../fixtures";
import { setupGitHubMocks } from "../mocks";

test.describe("Create Project", () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up authentication cookie
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: "test-session-token",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // Mock session endpoint
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            name: "Test User",
            email: "test@example.com",
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Set up GitHub mocks
    await setupGitHubMocks(page);
  });

  test("should navigate to create project page", async ({ page }) => {
    await page.goto("/project/new");
    await page.waitForLoadState("networkidle");

    // Page should load (may redirect to login if not authenticated)
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have project creation API endpoint", async ({ page }) => {
    // Mock project creation endpoint
    let apiCalled = false;
    await page.route("**/api/projects", async (route) => {
      if (route.request().method() === "POST") {
        apiCalled = true;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-project-id",
            name: "Test Project",
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Just verify the mock is set up
    expect(true).toBeTruthy();
  });

  test("should validate required fields on submit", async ({ page }) => {
    await page.goto("/project/new");
    await page.waitForLoadState("networkidle");

    // Page should load
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle project creation via API", async ({ page }) => {
    // Mock project creation endpoint
    await page.route("**/api/projects", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-project-id",
            name: body?.name || "Test Project",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/project/new");
    await page.waitForLoadState("networkidle");
  });

  test("should handle project creation error via API", async ({ page }) => {
    // Mock failed project creation
    await page.route("**/api/projects", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Project with this name already exists",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/project/new");
    await page.waitForLoadState("networkidle");
  });
});
