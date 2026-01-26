import { test as base, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Test user credentials
export const TEST_USER = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  githubId: "test-github-id",
  accessToken: "test-access-token",
};

// Test project
export const TEST_PROJECT = {
  id: "test-project-id",
  name: "Test Project",
  githubRepo: "test-owner/test-repo",
};

// Session token for NextAuth
const SESSION_TOKEN = "test-session-token";

// Extend the base test to include authentication
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page, context }, use) => {
    // Set the NextAuth session cookie
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: SESSION_TOKEN,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await use(page);
  },
});

export { expect } from "@playwright/test";

// Helper to ensure test user exists
export async function ensureTestUser() {
  const user = await prisma.user.upsert({
    where: { id: TEST_USER.id },
    update: {},
    create: {
      id: TEST_USER.id,
      email: TEST_USER.email,
      name: TEST_USER.name,
      githubId: TEST_USER.githubId,
      accessToken: TEST_USER.accessToken,
    },
  });
  return user;
}

// Helper to clean up test data
export async function cleanupTestData() {
  await prisma.execution.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.sprint.deleteMany({});
  await prisma.label.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});
}
