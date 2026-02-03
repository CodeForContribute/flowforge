import { test, expect } from '@playwright/test';


test.describe('Generated Review Flow', () => {
    test('should display review button on task detail', async ({ page }) => {
        await page.goto('/project/1/task/1');

        // Verify the review button is present
        const reviewButton = await page.locator('button:has-text("Request Review")');
        await expect(reviewButton).toBeVisible();
    });

    test('should handle review flow correctly', async ({ page }) => {
        await page.goto('/project/1/task/1');

        // Simulate review button click
        await page.click('button:has-text("Request Review")');

        // Check if the success message appears
        const successMessage = await page.locator('text="Review requested successfully"');
        await expect(successMessage).toBeVisible();

        // Ensure the next steps are correctly shown
        const commentSection = page.locator('selector-for-comment-section');
        await expect(commentSection).toBeVisible();
        
        // Verify if the review status is displayed correctly
        const reviewStatus = page.locator('text="In Review"');
        await expect(reviewStatus).toContainText('In Review');
    });
});
