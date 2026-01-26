import { test, expect } from '@playwright/test';

// Utility function to create a task with prompt
async function createTask(page, { title, description }) {
  await page.goto('/tasks/new');
  await page.fill('input[name="title"]', title);
  await page.fill('textarea[name="description"]', description);
  await page.click('button[type="submit"]');
}

test.describe('Prompt Generation for Task', () => {
  test('should generate prompts for title and description', async ({ page }) => {
    const taskData = {
      title: 'Test Task Title',
      description: 'Test Task Description'
    };

    // Create a new task
    await createTask(page, taskData);

    // Navigate to the newly created task page
    await page.waitForNavigation();

    // Generate prompt for the title
    await page.click('button#generate-title-prompt');
    const titlePrompt = await page.textContent('#title-prompt-result');
    expect(titlePrompt).toContain('This is a title prompt'); // Example assertion

    // Generate prompt for the description
    await page.click('button#generate-description-prompt');
    const descriptionPrompt = await page.textContent('#description-prompt-result');
    expect(descriptionPrompt).toContain('This is a description prompt'); // Example assertion
  });
});