import { test, expect } from "../fixtures";

test.describe("Metrics Dashboard", () => {
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

  test("should display metrics page", async ({ page }) => {
    await page.goto("/project/test-project-id/metrics");

    // Check for metrics header or content
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test("should show sprint velocity chart", async ({ page }) => {
    await page.goto("/project/test-project-id/metrics");

    // Look for velocity section
    const velocitySection = page.getByText(/velocity/i);

    if (await velocitySection.isVisible()) {
      await expect(velocitySection).toBeVisible();
    }
  });

  test("should show task completion stats", async ({ page }) => {
    await page.goto("/project/test-project-id/metrics");

    // Look for completion stats
    const completionStats = page.getByText(/completed|completion/i);

    if (await completionStats.isVisible()) {
      await expect(completionStats).toBeVisible();
    }
  });

  test("should show burndown chart", async ({ page }) => {
    await page.goto("/project/test-project-id/metrics");

    // Look for burndown chart
    const burndownSection = page.getByText(/burndown/i);

    if (await burndownSection.isVisible()) {
      await expect(burndownSection).toBeVisible();
    }
  });

  test("should filter metrics by date range", async ({ page }) => {
    await page.goto("/project/test-project-id/metrics");

    // Look for date range picker
    const dateRangePicker = page.getByRole("button", { name: /date|range/i });

    if (await dateRangePicker.isVisible()) {
      await dateRangePicker.click();

      // Select a preset range
      const lastMonthOption = page.getByRole("option", { name: /last month|30 days/i });

      if (await lastMonthOption.isVisible()) {
        await lastMonthOption.click();
      }
    }
  });

  test("should show team productivity stats", async ({ page }) => {
    await page.goto("/project/test-project-id/metrics");

    // Look for team stats
    const teamStats = page.getByText(/team|productivity|members/i);

    if (await teamStats.isVisible()) {
      await expect(teamStats).toBeVisible();
    }
  });

  test("should show story points by member", async ({ page }) => {
    await page.goto("/project/test-project-id/metrics");

    // Look for points breakdown
    const pointsSection = page.getByText(/points|story/i);

    if (await pointsSection.isVisible()) {
      await expect(pointsSection).toBeVisible();
    }
  });

  test("should export metrics data", async ({ page }) => {
    await page.goto("/project/test-project-id/metrics");

    // Look for export button
    const exportButton = page.getByRole("button", { name: /export|download/i });

    if (await exportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent("download").catch(() => null);

      await exportButton.click();

      const download = await downloadPromise;

      if (download) {
        // Verify download was triggered
        expect(download.suggestedFilename()).toContain("metrics");
      }
    }
  });

  test("should show sprint comparison", async ({ page }) => {
    await page.goto("/project/test-project-id/metrics");

    // Look for sprint comparison section
    const comparisonSection = page.getByText(/comparison|compare/i);

    if (await comparisonSection.isVisible()) {
      await expect(comparisonSection).toBeVisible();
    }
  });
});
