import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ExecutionStep } from "@/types";
import { generateBranchName, parseGitHubRepo } from "@/lib/utils";
import {
  createBranch,
  branchExists,
  createOrUpdateFile,
  deleteFile,
  createPullRequest,
  getOpenPullRequestForBranch,
  requestReviewers,
  getPullRequestComments,
  getFileContent,
  mergePullRequest,
  addPRComment,
} from "./github";
import { generateCode, respondToReview, classifyComment, generateDiscussionReply, generateCodeFromComment } from "./agent";
import { generateReviewResponsePrompt } from "./prompt-generator";
import type { GeneratedFile } from "@/types";
import {
  notifyPRCreated,
  notifyPRMerged,
  notifyReviewRequested,
  notifyTaskCompleted,
  notifyTaskFailed,
} from "./notifications";

interface ExecuteTaskOptions {
  taskId: string;
  userId: string;
}

async function createExecution(
  taskId: string,
  step: ExecutionStep,
  input?: Record<string, unknown>
): Promise<string> {
  const execution = await prisma.execution.create({
    data: {
      taskId,
      step,
      status: "RUNNING",
      input: (input as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      startedAt: new Date(),
    },
  });
  return execution.id;
}

async function completeExecution(
  executionId: string,
  output: Record<string, unknown>
): Promise<void> {
  await prisma.execution.update({
    where: { id: executionId },
    data: {
      status: "COMPLETED",
      output: output as Prisma.InputJsonValue,
      completedAt: new Date(),
    },
  });
}

async function failExecution(executionId: string, error: string): Promise<void> {
  await prisma.execution.update({
    where: { id: executionId },
    data: {
      status: "FAILED",
      error,
      completedAt: new Date(),
    },
  });
}

export async function executeTask(options: ExecuteTaskOptions): Promise<void> {
  const { taskId, userId } = options;

  // Get task with project and user info
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: {
        userId,
      },
    },
    include: {
      project: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (!task.generatedPrompt) {
    throw new Error("Task has no generated prompt");
  }

  const { project } = task;
  const accessToken = project.user.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!repoInfo) {
    throw new Error("Invalid GitHub repository");
  }

  const { owner, repo } = repoInfo;
  const branchName = generateBranchName(task.title, task.id, task.taskKey);

  // Update task status to GENERATING
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "GENERATING", branchName },
  });

  // Collect activities for consolidated summary
  const activities: { icon: string; label: string; detail?: string }[] = [];
  let generatedFiles: GeneratedFile[] = [];
  let summary = "";
  let prNumber = 0;
  let prUrl = "";

  try {
    // Step 1: Create branch (or reuse existing)
    let executionId = await createExecution(taskId, "CREATE_BRANCH", {
      branchName,
      baseBranch: project.defaultBranch,
    });

    let branchAlreadyExists = false;
    try {
      branchAlreadyExists = await branchExists(accessToken, owner, repo, branchName);

      if (branchAlreadyExists) {
        await completeExecution(executionId, { branchName, reused: true });
        activities.push({
          icon: "branch",
          label: "Reused existing branch",
          detail: branchName,
        });
      } else {
        await createBranch(accessToken, owner, repo, branchName, project.defaultBranch);
        await completeExecution(executionId, { branchName, reused: false });
        activities.push({
          icon: "branch",
          label: "Created branch",
          detail: `${branchName} from ${project.defaultBranch}`,
        });
      }
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }

    // Step 2: Generate code
    executionId = await createExecution(taskId, "GENERATE_CODE", {
      model: project.agentModel,
    });

    try {
      const result = await generateCode({
        prompt: task.generatedPrompt,
        model: project.agentModel,
      });
      generatedFiles = result.files;
      summary = result.summary;
      await completeExecution(executionId, { fileCount: generatedFiles.length, summary });
      activities.push({
        icon: "code",
        label: `Generated ${generatedFiles.length} file${generatedFiles.length > 1 ? "s" : ""}`,
        detail: generatedFiles.map(f => f.path).join(", "),
      });
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "IN_PROGRESS" },
      });
      throw error;
    }

    // Step 3: Commit files
    executionId = await createExecution(taskId, "COMMIT_FILES", {
      files: generatedFiles.map((f) => ({ path: f.path, action: f.action })),
    });

    try {
      for (const file of generatedFiles) {
        if (file.action === "delete") {
          await deleteFile(
            accessToken,
            owner,
            repo,
            file.path,
            `Delete ${file.path}`,
            branchName
          );
        } else {
          await createOrUpdateFile(
            accessToken,
            owner,
            repo,
            file.path,
            file.content,
            `${file.action === "create" ? "Add" : "Update"} ${file.path}`,
            branchName
          );
        }
      }
      await completeExecution(executionId, { committedFiles: generatedFiles.length });
      activities.push({
        icon: "commit",
        label: `Committed ${generatedFiles.length} file${generatedFiles.length > 1 ? "s" : ""}`,
        detail: branchName,
      });
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }

    // Step 4: Create pull request (or reuse existing)
    executionId = await createExecution(taskId, "CREATE_PR", {
      title: task.title,
      baseBranch: project.defaultBranch,
    });

    try {
      const existingPR = await getOpenPullRequestForBranch(accessToken, owner, repo, branchName);

      if (existingPR) {
        prNumber = existingPR.number;
        prUrl = existingPR.html_url;

        await prisma.task.update({
          where: { id: taskId },
          data: { prNumber, prUrl, status: "PR_OPEN" },
        });

        await completeExecution(executionId, { prNumber, prUrl, reused: true });
        activities.push({
          icon: "pr",
          label: "Updated existing PR",
          detail: `#${prNumber}`,
        });

        await addPRComment(
          accessToken,
          owner,
          repo,
          prNumber,
          `## Code Updated by FlowForge

New code has been generated and pushed to this branch.

### Summary
${summary}

---
*This update was generated by [FlowForge](https://github.com/flowforge) AI agent.*`
        );
      } else {
        const prTitle = task.taskKey ? `[${task.taskKey}] ${task.title}` : task.title;
        const prBody = `## Summary

${summary}

## Task Details

${task.description}

${task.taskKey ? `\n**Task:** ${task.taskKey}` : ""}

---

*This PR was generated by [FlowForge](https://github.com/flowforge) AI agent.*`;

        const pr = await createPullRequest(
          accessToken,
          owner,
          repo,
          prTitle,
          prBody,
          branchName,
          project.defaultBranch
        );
        prNumber = pr.number;
        prUrl = pr.html_url;

        await prisma.task.update({
          where: { id: taskId },
          data: { prNumber, prUrl, status: "PR_OPEN" },
        });

        await completeExecution(executionId, { prNumber, prUrl, reused: false });
        activities.push({
          icon: "pr",
          label: "Created pull request",
          detail: `#${prNumber}`,
        });
      }

      const notificationContext = {
        taskId,
        taskTitle: task.title,
        taskKey: task.taskKey,
        projectName: project.name,
        prNumber,
        prUrl,
        branchName,
      };

      await notifyPRCreated(project.userId, notificationContext);
      await notifyTaskCompleted(project.userId, notificationContext);
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }

    // Step 5: Request reviewers
    if (project.reviewers.length > 0) {
      executionId = await createExecution(taskId, "REQUEST_REVIEWERS", {
        reviewers: project.reviewers,
      });

      try {
        await requestReviewers(accessToken, owner, repo, prNumber, project.reviewers);
        await completeExecution(executionId, { reviewers: project.reviewers });
        await prisma.task.update({
          where: { id: taskId },
          data: { status: "IN_REVIEW" },
        });
        activities.push({
          icon: "review",
          label: "Requested review",
          detail: project.reviewers.join(", "),
        });
      } catch (error) {
        await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
        console.error("Failed to request reviewers:", error);
      }
    }

    // Activity tracking completed - no comment created during execution
    // A comprehensive summary will be posted when the PR is merged via webhook
  } catch (error) {
    console.error("Error executing task:", error);
    // Ensure task is not left in GENERATING state
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS" },
    });

    // Notify user about task failure
    await notifyTaskFailed(
      project.userId,
      {
        taskId,
        taskTitle: task.title,
        taskKey: task.taskKey,
        projectName: project.name,
        branchName,
      },
      error instanceof Error ? error.message : "Unknown error"
    );

    throw error;
  }
}

interface HandleReviewCommentsOptions {
  taskId: string;
  prNumber: number;
  reviewId: number;
}

export async function handleReviewComments(
  options: HandleReviewCommentsOptions
): Promise<void> {
  const { taskId, prNumber } = options;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const { project } = task;
  const accessToken = project.user.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!repoInfo || !task.branchName) {
    throw new Error("Invalid task state");
  }

  const { owner, repo } = repoInfo;

  // Update task status
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "CHANGES_REQUESTED" },
  });

  // Notify user about changes requested
  await notifyReviewRequested(
    project.userId,
    {
      taskId,
      taskTitle: task.title,
      taskKey: task.taskKey,
      projectName: project.name,
      prNumber,
      prUrl: task.prUrl || undefined,
      branchName: task.branchName || undefined,
    }
  );

  // Get review comments
  const comments = await getPullRequestComments(accessToken, owner, repo, prNumber);

  if (comments.length === 0) {
    // No review comments to address - no comment needed
    return;
  }

  // Get current file contents for changed files
  const uniquePaths = Array.from(new Set(comments.map((c) => c.path)));
  const currentFiles: { path: string; content: string }[] = [];

  for (const path of uniquePaths) {
    const content = await getFileContent(accessToken, owner, repo, path, task.branchName);
    if (content) {
      currentFiles.push({ path, content });
    }
  }

  // Generate review response prompt
  const prompt = generateReviewResponsePrompt({
    taskTitle: task.title,
    taskDescription: task.description,
    reviewComments: comments.map((c) => ({
      path: c.path,
      body: c.body,
      line: c.line,
    })),
    currentFiles,
  });

  // Create execution record
  const executionId = await createExecution(taskId, "RESPOND_TO_REVIEW", {
    commentCount: comments.length,
    files: uniquePaths,
  });

  try {
    // Generate response
    const result = await respondToReview({
      prompt,
      model: project.agentModel,
    });

    // Commit changes
    for (const file of result.files) {
      if (file.action === "delete") {
        await deleteFile(
          accessToken,
          owner,
          repo,
          file.path,
          `Address review: delete ${file.path}`,
          task.branchName
        );
      } else {
        await createOrUpdateFile(
          accessToken,
          owner,
          repo,
          file.path,
          file.content,
          `Address review: ${file.path}`,
          task.branchName
        );
      }
    }

    // Add comment to PR
    await addPRComment(
      accessToken,
      owner,
      repo,
      prNumber,
      `I've addressed the review comments with the following changes:\n\n${result.explanation}\n\n*Changes committed by FlowForge AI agent.*`
    );

    await completeExecution(executionId, {
      filesModified: result.files.length,
      explanation: result.explanation,
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_REVIEW" },
    });

    // No comment during execution - activity will be in merge summary
  } catch (error) {
    await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

interface HandlePRApprovalOptions {
  taskId: string;
  prNumber: number;
}

export async function handlePRApproval(options: HandlePRApprovalOptions): Promise<void> {
  const { taskId, prNumber } = options;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const { project } = task;
  const accessToken = project.user.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!repoInfo) {
    throw new Error("Invalid GitHub repository");
  }

  const { owner, repo } = repoInfo;

  // Update task status
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "APPROVED" },
  });

  // Create execution record
  const executionId = await createExecution(taskId, "MERGE_PR", {
    prNumber,
  });

  try {
    await mergePullRequest(accessToken, owner, repo, prNumber, task.title);

    await completeExecution(executionId, { merged: true });

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "MERGED" },
    });

    // No comment here - comprehensive summary is posted via webhook when PR merges

    // Notify user about PR merge
    await notifyPRMerged(project.userId, {
      taskId,
      taskTitle: task.title,
      taskKey: task.taskKey,
      projectName: project.name,
      prNumber,
      prUrl: task.prUrl || undefined,
      branchName: task.branchName || project.defaultBranch,
    });
  } catch (error) {
    await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

interface HandlePRCommentOptions {
  taskId: string;
  prNumber: number;
  commentId: number;
  commentBody: string;
  commentAuthor: string;
}

export async function handlePRComment(options: HandlePRCommentOptions): Promise<void> {
  const { taskId, prNumber, commentId, commentBody, commentAuthor } = options;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const { project } = task;
  const accessToken = project.user.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!repoInfo || !task.branchName) {
    throw new Error("Invalid task state");
  }

  const { owner, repo } = repoInfo;

  // Step 1: Analyze the comment to classify intent
  const analysisExecutionId = await createExecution(taskId, "ANALYZE_COMMENT", {
    commentId,
    commentAuthor,
    commentBody: commentBody.substring(0, 200), // Truncate for logging
  });

  let classification;
  try {
    classification = await classifyComment({
      commentBody,
      commentAuthor,
      taskTitle: task.title,
      taskDescription: task.description,
      model: project.agentModel,
    });

    await completeExecution(analysisExecutionId, {
      intent: classification.intent,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    });

    // Analysis complete - no comment during execution
  } catch (error) {
    await failExecution(analysisExecutionId, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }

  // Step 2: Handle based on classification
  const responseExecutionId = await createExecution(taskId, "RESPOND_TO_COMMENT", {
    intent: classification.intent,
    commentId,
  });

  try {
    if (classification.intent === "code_change") {
      // Get files changed in the PR to provide context
      const comments = await getPullRequestComments(accessToken, owner, repo, prNumber);
      const uniquePaths = Array.from(new Set(comments.map((c) => c.path)));

      // If no specific files from review comments, get all changed files
      const currentFiles: { path: string; content: string }[] = [];

      if (uniquePaths.length > 0) {
        for (const path of uniquePaths) {
          const content = await getFileContent(accessToken, owner, repo, path, task.branchName);
          if (content) {
            currentFiles.push({ path, content });
          }
        }
      }

      // Generate code changes based on the comment
      const result = await generateCodeFromComment({
        commentBody,
        commentAuthor,
        taskTitle: task.title,
        taskDescription: task.description,
        currentFiles,
        model: project.agentModel,
      });

      // Commit the changes
      for (const file of result.files) {
        if (file.action === "delete") {
          await deleteFile(
            accessToken,
            owner,
            repo,
            file.path,
            `Address comment: delete ${file.path}`,
            task.branchName
          );
        } else {
          await createOrUpdateFile(
            accessToken,
            owner,
            repo,
            file.path,
            file.content,
            `Address comment from @${commentAuthor}: ${file.path}`,
            task.branchName
          );
        }
      }

      // Post reply summarizing the code changes
      await addPRComment(
        accessToken,
        owner,
        repo,
        prNumber,
        `Thanks for the feedback, @${commentAuthor}! I've made the following changes:\n\n${result.explanation}\n\n**Files modified:** ${result.files.map((f) => `\`${f.path}\``).join(", ")}\n\n*Changes committed by FlowForge AI agent.*`
      );

      await completeExecution(responseExecutionId, {
        action: "code_change",
        filesModified: result.files.length,
        explanation: result.explanation,
      });

      // No comment during execution - activity will be in merge summary
    } else {
      // Generate a discussion reply
      const result = await generateDiscussionReply({
        commentBody,
        commentAuthor,
        taskTitle: task.title,
        taskDescription: task.description,
        model: project.agentModel,
      });

      // Post the reply
      await addPRComment(
        accessToken,
        owner,
        repo,
        prNumber,
        `${result.reply}\n\n*Response generated by FlowForge AI agent.*`
      );

      await completeExecution(responseExecutionId, {
        action: "discussion_reply",
        reply: result.reply.substring(0, 500), // Truncate for storage
      });

      // No comment during execution - activity will be in merge summary
    }
  } catch (error) {
    await failExecution(responseExecutionId, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
