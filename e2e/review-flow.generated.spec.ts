import { test, expect } from '@playwright/test';


test.describe('Generated Review Flow', () => {
  test('should display the review flow correctly', async ({ page }) => {
    await page.goto('/project/1/task/1');
    const flowTitle = await page.textContent('.review-flow-title');
    expect(flowTitle).toBe('Generated Code Review Flow');
  });

  test('should allow starting a review', async ({ page }) => {
    await page.goto('/project/1/task/1');
    await page.click('button.start-review');
    const reviewStatus = await page.textContent('.review-status');
    expect(reviewStatus).toBe('In Review');
  });

  test('should display generated code preview', async ({ page }) => {
    await page.goto('/project/1/task/1');
    const codePreview = await page.textContent('.code-preview');
    expect(codePreview).toContain('function generatedCode()');
  });

  test('should support adding comments to review', async ({ page }) => {
    await page.goto('/project/1/task/1');
    await page.fill('.comment-input', 'This is a test comment');
    await page.click('button.submit-comment');
    const comments = await page.textContent('.comments-list');
    expect(comments).toContain('This is a test comment');
  });

  test('should complete review workflow successfully', async ({ page }) => {
    await page.goto('/project/1/task/1');
    await page.click('button.complete-review');
    const finalStatus = await page.textContent('.final-status');
    expect(finalStatus).toBe('Review Completed');
  });

});
