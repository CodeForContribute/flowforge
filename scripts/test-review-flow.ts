/**
 * Test the review handling flow manually
 * This simulates what happens when a reviewer comments on a PR
 */

import { PrismaClient } from "@prisma/client";
import { handleReviewComments } from "../src/services/execution";

const prisma = new PrismaClient();

async function testReviewFlow() {
  console.log("=== Testing Review Handling Flow ===\n");

  // Find a task that has a PR
  const task = await prisma.task.findFirst({
    where: {
      prNumber: { not: null },
      branchName: { not: null },
    },
    include: {
      project: {
        include: { user: true },
      },
    },
  });

  if (!task) {
    console.log("No task with PR found. Creating test scenario...");

    // List available tasks
    const tasks = await prisma.task.findMany({
      take: 5,
      include: { project: true },
    });

    console.log("\nAvailable tasks:");
    for (const t of tasks) {
      console.log(`  - [${t.id}] ${t.title}`);
      console.log(`    Status: ${t.status}, PR: ${t.prNumber || "none"}, Branch: ${t.branchName || "none"}`);
    }

    console.log("\nTo test review flow, you need a task with an open PR.");
    console.log("Run a task execution first to create a PR.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found task: ${task.title}`);
  console.log(`  - Task ID: ${task.id}`);
  console.log(`  - PR Number: ${task.prNumber}`);
  console.log(`  - Branch: ${task.branchName}`);
  console.log(`  - Status: ${task.status}`);
  console.log(`  - Project: ${task.project.name}`);
  console.log(`  - Repo: ${task.project.githubRepo}`);

  // Check if there's an access token
  if (!task.project.user.accessToken) {
    console.log("\nERROR: No GitHub access token found for user");
    await prisma.$disconnect();
    return;
  }

  console.log("\n--- Testing Review Comment Handling ---");
  console.log("This will:");
  console.log("  1. Fetch review comments from the PR");
  console.log("  2. Generate code changes using OpenAI");
  console.log("  3. Push changes to the branch");
  console.log("  4. Add a comment to the PR");

  // Ask for confirmation before running
  console.log("\nWARNING: This will make actual changes to the GitHub PR!");
  console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    console.log("Starting review handling...\n");

    await handleReviewComments({
      taskId: task.id,
      prNumber: task.prNumber!,
      reviewId: 0, // 0 indicates general comment handling
    });

    console.log("\n=== SUCCESS ===");
    console.log("Review handling completed!");

    // Check for new comments on the task
    const comments = await prisma.comment.findMany({
      where: { taskId: task.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    console.log("\nRecent task comments:");
    for (const c of comments) {
      console.log(`  - [${c.isSystem ? "SYSTEM" : "USER"}] ${c.content.slice(0, 100)}...`);
    }

  } catch (error) {
    console.error("\n=== ERROR ===");
    console.error("Review handling failed:", error);
  }

  await prisma.$disconnect();
}

testReviewFlow().catch(console.error);
