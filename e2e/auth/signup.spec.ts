import { test, expect } from '@playwright/test';

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  test('should display signup form', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible();
  });

  test('should display error for existing email', async ({ page }) => {
    await page.fill('input[name="email"]', 'existing@example.com');
    await page.fill('input[name="password"]', 'Password123');
    await page.click('button[type="submit"]');

    const errorMsg = await page.locator('.error-message').textContent();
    expect(errorMsg).toBe('Email already exists');
  });

  test('should successfully submit signup form', async ({ page }) => {
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'Password123');
    await page.click('button[type="submit"]');

    // Expect to be redirected to the dashboard after successful signup
    await page.waitForURL('/dashboard');
    const content = await page.textContent('h1');
    expect(content).toContain('Welcome');
  });
});