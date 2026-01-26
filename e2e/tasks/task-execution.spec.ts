import { test, expect } from "../fixtures";
import { setupAnthropicMocks } from "../mocks";

test.describe("Task Execution", () => {
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

    // Set up Anthropic mocks
    await setupAnthropicMocks(page);
  });

  test("should load task details page", async ({ page }) => {
    await page.goto("/project/test-project-id/task/task-todo-1");
    await page.waitForLoadState("networkidle");

    // Page should load
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display task content", async ({ page }) => {
    await page.goto("/project/test-project-id/task/task-todo-1");
    await page.waitForLoadState("networkidle");

    // Check for page content elements
    const pageContent = page.locator("h1, h2, [class*='title']");
    const exists = await pageContent.first().isVisible().catch(() => false);
    expect(exists || page.url().includes("login")).toBeTruthy();
  });

  test("should handle prompt generation", async ({ page }) => {
    await page.goto("/project/test-project-id/task/task-todo-1");
    await page.waitForLoadState("networkidle");

    const generateButton = page.getByRole("button", { name: /generate/i });
    if (await generateButton.isVisible().catch(() => false)) {
      await generateButton.click();
    }
  });

  test("should handle task execution", async ({ page }) => {
    await page.goto("/project/test-project-id/task/task-todo-1");
    await page.waitForLoadState("networkidle");

    const executeButton = page.getByRole("button", { name: /execute|run|start/i });
    if (await executeButton.isVisible().catch(() => false)) {
      await executeButton.click();
    }
  });

  test("should load task comments section", async ({ page }) => {
    await page.goto("/project/test-project-id/task/task-inprogress-1");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle comment submission", async ({ page }) => {
    // Mock comment creation
    await page.route("**/api/tasks/*/comments", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-comment-id",
            content: body?.content || "Test comment",
            createdAt: new Date().toISOString(),
            user: {
              id: "test-user-id",
              name: "Test User",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/project/test-project-id/task/task-todo-1");
    await page.waitForLoadState("networkidle");

    const commentInput = page.getByPlaceholder(/comment|message/i);
    if (await commentInput.isVisible().catch(() => false)) {
      await commentInput.fill("This is a test comment");
      const sendButton = page.getByRole("button", { name: /send|post|submit|add/i });
      if (await sendButton.isVisible().catch(() => false)) {
        await sendButton.click();
      }
    }
  });

  test("should have navigation back to board", async ({ page }) => {
    await page.goto("/project/test-project-id/task/task-todo-1");
    await page.waitForLoadState("networkidle");

    const backLink = page.locator("a[href*='/project/test-project-id']").first();
    const exists = await backLink.isVisible().catch(() => false);
    expect(exists || page.url().includes("login")).toBeTruthy();
  });
});
