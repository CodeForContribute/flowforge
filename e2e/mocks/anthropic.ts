import { Page, Route } from "@playwright/test";

// Mock code generation response
export const mockCodeGeneration = {
  content: [
    {
      type: "text",
      text: `Here's the implementation for your task:

\`\`\`typescript
// Generated code
export function exampleFunction() {
  return "Hello, World!";
}
\`\`\`

This implementation includes:
- A simple function
- Proper TypeScript typing
- Clean code structure`,
    },
  ],
  model: "claude-sonnet-4-20250514",
  stop_reason: "end_turn",
  usage: {
    input_tokens: 100,
    output_tokens: 50,
  },
};

// Mock prompt generation
export const mockPromptGeneration = {
  prompt: `# Task: Implement Feature

## Context
This is a generated prompt for the task.

## Requirements
1. Implement the feature as described
2. Follow existing code patterns
3. Add appropriate tests

## Files to Modify
- src/components/Example.tsx
- src/lib/utils.ts`,
};

// Setup Anthropic API mocks
export async function setupAnthropicMocks(page: Page) {
  // Mock the internal generate-prompt endpoint
  await page.route("**/api/tasks/*/generate-prompt", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPromptGeneration),
      });
    } else {
      await route.continue();
    }
  });

  // Mock the internal execute endpoint
  await page.route("**/api/tasks/*/execute", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Task execution queued",
          executionId: "test-execution-id",
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock direct Anthropic API calls (if any bypass our API)
  await page.route("**/api.anthropic.com/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockCodeGeneration),
    });
  });
}

// Cleanup function
export async function cleanupAnthropicMocks(page: Page) {
  await page.unrouteAll();
}
