import { Page, Route } from "@playwright/test";

// Mock GitHub repositories response
export const mockRepos = [
  {
    id: 1,
    name: "test-repo",
    full_name: "test-owner/test-repo",
    private: false,
    description: "A test repository",
    default_branch: "main",
    html_url: "https://github.com/test-owner/test-repo",
  },
  {
    id: 2,
    name: "another-repo",
    full_name: "test-owner/another-repo",
    private: true,
    description: "Another test repository",
    default_branch: "main",
    html_url: "https://github.com/test-owner/another-repo",
  },
];

// Mock branches response
export const mockBranches = [
  { name: "main", protected: true },
  { name: "develop", protected: false },
  { name: "feature/test", protected: false },
];

// Setup GitHub API mocks
export async function setupGitHubMocks(page: Page) {
  // Mock the internal repos API endpoint
  await page.route("**/api/github/repos", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockRepos),
    });
  });

  // Mock GitHub API calls for repo details
  await page.route("**/api.github.com/repos/**", async (route: Route) => {
    const url = route.request().url();

    if (url.includes("/branches")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockBranches),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRepos[0]),
      });
    }
  });

  // Mock PR creation
  await page.route("**/api.github.com/repos/**/pulls", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          number: 123,
          html_url: "https://github.com/test-owner/test-repo/pull/123",
          state: "open",
        }),
      });
    } else {
      await route.continue();
    }
  });
}

// Cleanup function
export async function cleanupGitHubMocks(page: Page) {
  await page.unrouteAll();
}
