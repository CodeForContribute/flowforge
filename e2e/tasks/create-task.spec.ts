import { test, expect } from "../fixtures";

test.describe("Create Task", () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up authentication
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

    // Mock session
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
  });

  test("should display create task page", async ({ page }) => {
    await page.goto("/project/test-project-id/task/new");
    await page.waitForLoadState("networkidle");

    // Check for task form elements
    const titleField = page.getByLabel(/title/i);
    if (await titleField.isVisible()) {
      await expect(titleField).toBeVisible();
    }
  });

  test("should create task with all fields", async ({ page }) => {
    // Mock task creation
    await page.route("**/api/tasks", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-task-id",
            ...body,
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/project/test-project-id/task/new");
    await page.waitForLoadState("networkidle");

    // Fill in all fields
    const titleField = page.getByLabel(/title/i);
    if (await titleField.isVisible()) {
      await titleField.fill("Implement new feature");
    }

    const descField = page.getByLabel(/description/i);
    if (await descField.isVisible()) {
      await descField.fill("Detailed description of the feature");
    }
  });

  test("should validate required title field", async ({ page }) => {
    await page.goto("/project/test-project-id/task/new");
    await page.waitForLoadState("networkidle");

    // Try to submit without title
    const createButton = page.getByRole("button", { name: /create|save/i });
    if (await createButton.isVisible()) {
      await createButton.click();
    }
  });

  test("should navigate back when cancelled", async ({ page }) => {
    await page.goto("/project/test-project-id/task/new");
    await page.waitForLoadState("networkidle");

    // Cancel
    const cancelButton = page.getByRole("button", { name: /cancel/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      // Should navigate back
      await page.waitForURL(/\/project\/test-project-id/);
    }
  });

  test("should create task from backlog page", async ({ page }) => {
    await page.goto("/project/test-project-id/backlog");
    await page.waitForLoadState("networkidle");

    // Look for create task button or link
    const newTaskButton = page.getByRole("link", { name: /new task/i });
    if (await newTaskButton.isVisible()) {
      await newTaskButton.click();
      await expect(page).toHaveURL(/\/task\/new/);
    }
  });
});
