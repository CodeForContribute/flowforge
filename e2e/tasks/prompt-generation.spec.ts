import { test, expect } from '@playwright/test';

// Utility function to log in the user
async function login(page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'testuser@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
}

// Define the e2e test
const projectId = 'test-project-id';
const taskId = 'new-task-id';

// Mock API response for prompt generation
const mockPromptResponse = {
  title: 'Generated Task Title',
  description: 'Generated Task Description'
};

test.describe('Prompt Generation for Task', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should generate prompt for title and description', async ({ page }) => {
    await page.route('/api/tasks/generate-prompt', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify(mockPromptResponse)
      });
    });

    await page.goto(`/project/${projectId}/task/${taskId}/new`);
    await page.click('button.generate-prompt');

    const generatedTitle = await page.inputValue('input[name="title"]');
    const generatedDescription = await page.textContent('textarea[name="description"]');

    expect(generatedTitle).toBe(mockPromptResponse.title);
    expect(generatedDescription).toBe(mockPromptResponse.description);
  });
});
