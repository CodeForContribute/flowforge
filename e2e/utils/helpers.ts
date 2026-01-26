import { Page, expect } from "@playwright/test";

/**
 * Wait for a specific network request to complete
 */
export async function waitForApiCall(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response) =>
      (typeof urlPattern === "string"
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) && response.status() === 200
  );
}

/**
 * Fill a form field by label
 */
export async function fillFormField(
  page: Page,
  label: string,
  value: string
) {
  const field = page.getByLabel(label);
  await field.fill(value);
}

/**
 * Select an option from a Radix UI select component
 */
export async function selectOption(
  page: Page,
  triggerTestId: string,
  optionText: string
) {
  await page.getByTestId(triggerTestId).click();
  await page.getByRole("option", { name: optionText }).click();
}

/**
 * Wait for a toast message
 */
export async function waitForToast(page: Page, message: string) {
  const toast = page.getByRole("status").filter({ hasText: message });
  await expect(toast).toBeVisible({ timeout: 10000 });
  return toast;
}

/**
 * Drag and drop helper for dnd-kit components
 */
export async function dragAndDrop(
  page: Page,
  sourceTestId: string,
  targetTestId: string
) {
  const source = page.getByTestId(sourceTestId);
  const target = page.getByTestId(targetTestId);

  const sourceBounds = await source.boundingBox();
  const targetBounds = await target.boundingBox();

  if (!sourceBounds || !targetBounds) {
    throw new Error("Could not find source or target element bounds");
  }

  // Start drag
  await page.mouse.move(
    sourceBounds.x + sourceBounds.width / 2,
    sourceBounds.y + sourceBounds.height / 2
  );
  await page.mouse.down();

  // Move to target
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2,
    { steps: 10 }
  );

  // Drop
  await page.mouse.up();
}

/**
 * Get page error messages (for debugging)
 */
export function setupErrorLogging(page: Page) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`Console error: ${msg.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    console.log(`Page error: ${error.message}`);
  });
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeDebugScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `playwright-report/debug-${name}-${Date.now()}.png`,
    fullPage: true,
  });
}
