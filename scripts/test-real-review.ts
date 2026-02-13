/**
 * Test review handling with real PR
 */

import { PrismaClient } from "@prisma/client";
import { getPullRequestComments, getOctokit } from "../src/services/github";
import { handleReviewComments } from "../src/services/execution";

const prisma = new PrismaClient();

async function testRealReview() {
  console.log("=== Testing Review Flow with Real PR ===\n");

  // Find the real task
  const task = await prisma.task.findFirst({
    where: {
      id: "cmkv8jrgn0008n5be0lbpst2y",
    },
    include: {
      project: {
        include: { user: true },
      },
    },
  });

  if (!task) {
    console.log("Task not found");
    await prisma.$disconnect();
    return;
  }

  console.log(`Task: ${task.title}`);
  console.log(`PR #${task.prNumber} on ${task.project.githubRepo}`);
  console.log(`Branch: ${task.branchName}`);
  console.log(`Status: ${task.status}\n`);

  const accessToken = task.project.user?.accessToken;
  if (!accessToken) {
    console.log("ERROR: No access token (project may be org-owned or user not found)");
    await prisma.$disconnect();
    return;
  }

  // Check for review comments
  console.log("Checking for review comments...");
  try {
    const comments = await getPullRequestComments(
      accessToken,
      "CodeForContribute",
      "flowforge",
      task.prNumber!
    );

    console.log(`Found ${comments.length} review comment(s)\n`);

    if (comments.length > 0) {
      console.log("Review comments:");
      for (const c of comments) {
        console.log(`  - [${c.path}] ${c.body.slice(0, 80)}...`);
      }

      console.log("\n--- Running Review Handler ---");
      console.log("This will generate code changes and push to PR...\n");

      // Wait before proceeding
      await new Promise((r) => setTimeout(r, 3000));

      await handleReviewComments({
        taskId: task.id,
        prNumber: task.prNumber!,
        reviewId: 0,
      });

      console.log("\n=== SUCCESS ===");
      console.log("Review comments handled!");

    } else {
      console.log("No review comments found on PR.");
      console.log("\nTo test the flow:");
      console.log("1. Go to the PR on GitHub");
      console.log("2. Add a review comment (on a specific line of code)");
      console.log("3. Run this script again");

      // Also check for issue comments (general PR comments)
      console.log("\nChecking for general PR comments...");
      const octokit = getOctokit(accessToken);
      const { data: issueComments } = await octokit.issues.listComments({
        owner: "CodeForContribute",
        repo: "flowforge",
        issue_number: task.prNumber!,
      });

      console.log(`Found ${issueComments.length} general comment(s)`);
      for (const c of issueComments) {
        console.log(`  - [${c.user?.login}] ${c.body?.slice(0, 80)}...`);
      }
    }

  } catch (error) {
    console.error("Error:", error);
  }

  await prisma.$disconnect();
}

testRealReview().catch(console.error);
