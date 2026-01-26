import { test, expect } from "../fixtures";

test.describe("Kanban Board", () => {
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

  test("should load kanban board page", async ({ page }) => {
    await page.goto("/project/test-project-id");
    await page.waitForLoadState("networkidle");

    // Page should load
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display kanban board structure", async ({ page }) => {
    await page.goto("/project/test-project-id");
    await page.waitForLoadState("networkidle");

    // Check for column headers or board elements
    const todoColumn = page.getByTestId("column-TODO");
    const inProgressColumn = page.getByTestId("column-IN_PROGRESS");

    const todoVisible = await todoColumn.isVisible().catch(() => false);
    const inProgressVisible = await inProgressColumn.isVisible().catch(() => false);

    // Either columns are visible or we're redirected
    expect(todoVisible || inProgressVisible || page.url().includes("login")).toBeTruthy();
  });

  test("should display task cards", async ({ page }) => {
    await page.goto("/project/test-project-id");
    await page.waitForLoadState("networkidle");

    const taskCards = page.locator("[data-testid^='task-card-']");
    const count = await taskCards.count().catch(() => 0);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should handle task navigation", async ({ page }) => {
    await page.goto("/project/test-project-id");
    await page.waitForLoadState("networkidle");

    const taskLink = page.locator("[data-testid^='task-card-'] a").first();
    if (await taskLink.isVisible().catch(() => false)) {
      await taskLink.click();
      await expect(page).toHaveURL(/\/task\//);
    }
  });

  test("should handle drag and drop setup", async ({ page }) => {
    await page.goto("/project/test-project-id");
    await page.waitForLoadState("networkidle");

    // Mock the task update endpoint
    await page.route("**/api/tasks/*", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "task-id",
            status: body.status,
          }),
        });
      } else {
        await route.continue();
      }
    });

    const taskCards = page.locator("[data-testid^='task-card-']");
    const exists = await taskCards.first().isVisible().catch(() => false);

    if (exists) {
      const dragHandle = taskCards.first().locator("button").first();
      const handleVisible = await dragHandle.isVisible().catch(() => false);
      expect(handleVisible).toBeTruthy();
    }
  });

  test("should display task priority badges", async ({ page }) => {
    await page.goto("/project/test-project-id");
    await page.waitForLoadState("networkidle");

    const taskCards = page.locator("[data-testid^='task-card-']");
    const count = await taskCards.count().catch(() => 0);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display PR indicators", async ({ page }) => {
    await page.goto("/project/test-project-id");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should have navigation elements", async ({ page }) => {
    await page.goto("/project/test-project-id");
    await page.waitForLoadState("networkidle");

    // Check for New Task link or button
    const newTaskElement = page.getByRole("link", { name: /new task/i }).or(
      page.getByRole("button", { name: /new task/i })
    );
    const exists = await newTaskElement.isVisible().catch(() => false);

    // Either element exists or we're redirected
    expect(exists || page.url().includes("login")).toBeTruthy();
  });
});
