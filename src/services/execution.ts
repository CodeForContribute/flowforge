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
  deleteBranch,
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
  notifyCodeReviewReady,
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

/**
 * Phase 1: Create branch, generate code, and pause for review
 * This is the initial execution that pauses at AWAITING_CODE_REVIEW status
 */
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
  const accessToken = project.user?.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!accessToken) {
    throw new Error("No access token available for this project");
  }

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

  let generatedFiles: GeneratedFile[] = [];
  let summary = "";

  // Use task-specific base branch or fall back to project default
  const baseBranch = task.baseBranch || project.defaultBranch;

  try {
    // Step 1: Create branch (or reuse existing)
    let executionId = await createExecution(taskId, "CREATE_BRANCH", {
      branchName,
      baseBranch,
    });

    try {
      const branchAlreadyExists = await branchExists(accessToken, owner, repo, branchName);

      if (branchAlreadyExists) {
        await completeExecution(executionId, { branchName, reused: true });
      } else {
        await createBranch(accessToken, owner, repo, branchName, baseBranch);
        await completeExecution(executionId, { branchName, reused: false });
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
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "IN_PROGRESS" },
      });
      throw error;
    }

    // Step 3: Save generated code to database and pause for review
    console.log(`[Phase 1] Task ${taskId}: Saving generated code for review (${generatedFiles.length} files)`);
    executionId = await createExecution(taskId, "AWAIT_CODE_REVIEW", {
      fileCount: generatedFiles.length,
    });

    try {
      // Get the current highest version for this task
      const latestVersion = await prisma.generatedCode.findFirst({
        where: { taskId },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const newVersion = (latestVersion?.version ?? 0) + 1;

      // Save generated code
      await prisma.generatedCode.create({
        data: {
          taskId,
          files: generatedFiles as unknown as Prisma.InputJsonValue,
          summary,
          version: newVersion,
          status: "PENDING_REVIEW",
        },
      });

      // Update task status to AWAITING_CODE_REVIEW
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "AWAITING_CODE_REVIEW" },
      });

      console.log(`[Phase 1] Task ${taskId}: Status set to AWAITING_CODE_REVIEW - PAUSING for user review`);

      await completeExecution(executionId, {
        version: newVersion,
        status: "PENDING_REVIEW",
        fileCount: generatedFiles.length,
      });

      // Notify user that code is ready for review
      if (project.userId) {
        await notifyCodeReviewReady(project.userId, {
          taskId,
          taskTitle: task.title,
          taskKey: task.taskKey,
          projectName: project.name,
          fileCount: generatedFiles.length,
          version: newVersion,
        });
      }
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }

    // Execution pauses here - Phase 2 will be triggered by user approval
  } catch (error) {
    console.error("Error executing task (Phase 1):", error);
    // Ensure task is not left in GENERATING state
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS" },
    });

    // Notify user about task failure
    if (project.userId) {
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
    }

    throw error;
  }
}

interface ContinueExecutionOptions {
  taskId: string;
  userId: string;
  generatedCodeId: string;
}

/**
 * Phase 2: Commit approved code, create PR, and request reviewers
 * This is triggered after user approves the generated code
 */
export async function continueExecution(options: ContinueExecutionOptions): Promise<void> {
  const { taskId, userId, generatedCodeId } = options;

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

  if (!task.branchName) {
    throw new Error("Task has no branch name");
  }

  // Get the approved generated code
  const generatedCode = await prisma.generatedCode.findUnique({
    where: { id: generatedCodeId },
  });

  if (!generatedCode) {
    throw new Error("Generated code not found");
  }

  if (generatedCode.status !== "APPROVED") {
    throw new Error("Generated code is not approved");
  }

  const { project } = task;
  const accessToken = project.user?.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!accessToken) {
    throw new Error("No access token available for this project");
  }

  if (!repoInfo) {
    throw new Error("Invalid GitHub repository");
  }

  const { owner, repo } = repoInfo;
  const branchName = task.branchName;
  const baseBranch = task.baseBranch || project.defaultBranch;
  const generatedFiles = generatedCode.files as unknown as GeneratedFile[];
  const summary = generatedCode.summary;

  // Update task status to GENERATING (briefly while committing)
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "GENERATING" },
  });

  let prNumber = 0;
  let prUrl = "";

  try {
    // Step 1: Commit files
    let executionId = await createExecution(taskId, "COMMIT_FILES", {
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
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }

    // Step 2: Create pull request (or reuse existing)
    executionId = await createExecution(taskId, "CREATE_PR", {
      title: task.title,
      baseBranch,
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
          baseBranch
        );
        prNumber = pr.number;
        prUrl = pr.html_url;

        await prisma.task.update({
          where: { id: taskId },
          data: { prNumber, prUrl, status: "PR_OPEN" },
        });

        await completeExecution(executionId, { prNumber, prUrl, reused: false });
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

      if (project.userId) {
        await notifyPRCreated(project.userId, notificationContext);
        await notifyTaskCompleted(project.userId, notificationContext);
      }
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }

    // Step 3: Request reviewers
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
      } catch (error) {
        await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
        console.error("Failed to request reviewers:", error);
      }
    }

    // Add activity comment summarizing the execution
    const activities = [
      { icon: "branch", text: `Created branch \`${branchName}\`` },
      { icon: "code", text: `Generated ${generatedFiles.length} file${generatedFiles.length !== 1 ? "s" : ""}` },
      { icon: "pr", text: `Created PR #${prNumber}` },
    ];

    if (project.reviewers.length > 0) {
      activities.push({
        icon: "review",
        text: `Requested review from ${project.reviewers.map(r => `@${r}`).join(", ")}`,
      });
    }

    const activityContent = JSON.stringify({
      type: "activity_summary",
      title: "Task Executed",
      activities,
    });

    await prisma.comment.create({
      data: {
        taskId,
        content: activityContent,
        type: "ACTIVITY",
        isSystem: true,
      },
    });
  } catch (error) {
    console.error("Error executing task (Phase 2):", error);
    // Ensure task is not left in GENERATING state
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS" },
    });

    // Notify user about task failure
    if (project.userId) {
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
    }

    throw error;
  }
}

interface RegenerateCodeOptions {
  taskId: string;
  userId: string;
  feedback: string;
}

/**
 * Regenerate code with user feedback
 * Creates a new version of generated code incorporating the feedback
 */
export async function regenerateCode(options: RegenerateCodeOptions): Promise<void> {
  const { taskId, userId, feedback } = options;

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

  // Update task status to GENERATING
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "GENERATING" },
  });

  try {
    // Create enhanced prompt with feedback
    const enhancedPrompt = `${task.generatedPrompt}

---

## User Feedback for Revision

The following feedback was provided on the previously generated code. Please incorporate this feedback in your new implementation:

${feedback}

Please generate improved code that addresses all the points mentioned in the feedback above.`;

    // Generate new code
    const executionId = await createExecution(taskId, "GENERATE_CODE", {
      model: project.agentModel,
      isRegeneration: true,
      feedback,
    });

    let generatedFiles: GeneratedFile[] = [];
    let summary = "";

    try {
      const result = await generateCode({
        prompt: enhancedPrompt,
        model: project.agentModel,
      });
      generatedFiles = result.files;
      summary = result.summary;
      await completeExecution(executionId, { fileCount: generatedFiles.length, summary });
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }

    // Get the current highest version for this task
    const latestVersion = await prisma.generatedCode.findFirst({
      where: { taskId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const newVersion = (latestVersion?.version ?? 0) + 1;

    // Save new generated code
    await prisma.generatedCode.create({
      data: {
        taskId,
        files: generatedFiles as unknown as Prisma.InputJsonValue,
        summary,
        userFeedback: feedback,
        version: newVersion,
        status: "PENDING_REVIEW",
      },
    });

    // Update task status to AWAITING_CODE_REVIEW
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "AWAITING_CODE_REVIEW" },
    });

    // Notify user that new code is ready for review
    if (project.userId) {
      await notifyCodeReviewReady(project.userId, {
        taskId,
        taskTitle: task.title,
        taskKey: task.taskKey,
        projectName: project.name,
        fileCount: generatedFiles.length,
        version: newVersion,
      });
    }
  } catch (error) {
    console.error("Error regenerating code:", error);
    // Ensure task is not left in GENERATING state
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "AWAITING_CODE_REVIEW" },
    });

    if (project.userId) {
      await notifyTaskFailed(
        project.userId,
        {
          taskId,
          taskTitle: task.title,
          taskKey: task.taskKey,
          projectName: project.name,
        },
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    throw error;
  }
}

/**
 * Reset task after code review rejection
 * Optionally deletes the branch if requested
 */
export async function rejectCodeReview(
  taskId: string,
  userId: string,
  deleteBranchFlag: boolean = false
): Promise<void> {
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

  const { project } = task;

  // Delete branch if requested and exists
  if (deleteBranchFlag && task.branchName) {
    const accessToken = project.user?.accessToken;
    const repoInfo = parseGitHubRepo(project.githubRepo);

    if (accessToken && repoInfo) {
      const { owner, repo } = repoInfo;
      try {
        await deleteBranch(accessToken, owner, repo, task.branchName);
      } catch (error) {
        // Log but don't fail if branch deletion fails
        console.error("Failed to delete branch:", error);
      }
    }
  }

  // Reset task status to IN_PROGRESS and clear branch
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "IN_PROGRESS",
      branchName: deleteBranchFlag ? null : task.branchName,
    },
  });
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
  const accessToken = project.user?.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!accessToken) {
    throw new Error("No access token available for this project");
  }

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
  if (project.userId) {
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
  }

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
  const accessToken = project.user?.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!accessToken) {
    throw new Error("No access token available for this project");
  }

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
    if (project.userId) {
      await notifyPRMerged(project.userId, {
        taskId,
        taskTitle: task.title,
        taskKey: task.taskKey,
        projectName: project.name,
        prNumber,
        prUrl: task.prUrl || undefined,
        branchName: task.branchName || project.defaultBranch,
      });
    }
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
  const accessToken = project.user?.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!accessToken) {
    throw new Error("No access token available for this project");
  }

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
  if (classification.intent === "code_change") {
    // Generate code and save for review (Phase 1)
    const generateExecutionId = await createExecution(taskId, "GENERATE_CODE", {
      type: "PR_COMMENT_RESPONSE",
      commentId,
      commentAuthor,
    });

    try {
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

      await completeExecution(generateExecutionId, {
        fileCount: result.files.length,
        explanation: result.explanation,
      });

      // Save generated code for review instead of committing directly
      console.log(`[PR Comment Response] Task ${taskId}: Saving generated code for review (${result.files.length} files)`);

      const awaitReviewExecutionId = await createExecution(taskId, "AWAIT_CODE_REVIEW", {
        type: "PR_COMMENT_RESPONSE",
        commentId,
        fileCount: result.files.length,
      });

      // Get the current highest version for this task
      const latestVersion = await prisma.generatedCode.findFirst({
        where: { taskId },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const newVersion = (latestVersion?.version ?? 0) + 1;

      // Save generated code with PR comment context
      await prisma.generatedCode.create({
        data: {
          taskId,
          files: result.files as unknown as Prisma.InputJsonValue,
          summary: result.explanation,
          version: newVersion,
          status: "PENDING_REVIEW",
          type: "PR_COMMENT_RESPONSE",
          prCommentId: String(commentId),
          prCommentBody: commentBody,
          prCommentAuthor: commentAuthor,
        },
      });

      // Update task status to AWAITING_CODE_REVIEW
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "AWAITING_CODE_REVIEW" },
      });

      console.log(`[PR Comment Response] Task ${taskId}: Status set to AWAITING_CODE_REVIEW - PAUSING for user review`);

      await completeExecution(awaitReviewExecutionId, {
        version: newVersion,
        status: "PENDING_REVIEW",
        fileCount: result.files.length,
        type: "PR_COMMENT_RESPONSE",
      });

      // Notify user that code is ready for review
      if (project.userId) {
        await notifyCodeReviewReady(project.userId, {
          taskId,
          taskTitle: task.title,
          taskKey: task.taskKey,
          projectName: project.name,
          fileCount: result.files.length,
          version: newVersion,
        });
      }

      // Execution pauses here - continueCommentResponse will be called after approval
    } catch (error) {
      await failExecution(generateExecutionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }
  } else {
    // Generate a discussion reply (no code review needed)
    const responseExecutionId = await createExecution(taskId, "RESPOND_TO_COMMENT", {
      intent: classification.intent,
      commentId,
    });

    try {
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
    } catch (error) {
      await failExecution(responseExecutionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }
  }
}

interface ContinueCommentResponseOptions {
  taskId: string;
  userId: string;
  generatedCodeId: string;
  prNumber: number;
  commentAuthor: string;
}

/**
 * Phase 2 for PR comment responses: Commit approved code changes
 * This is triggered after user approves the generated code from a PR comment
 */
export async function continueCommentResponse(options: ContinueCommentResponseOptions): Promise<void> {
  const { taskId, userId, generatedCodeId, prNumber, commentAuthor } = options;

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

  if (!task.branchName) {
    throw new Error("Task has no branch name");
  }

  // Get the approved generated code
  const generatedCode = await prisma.generatedCode.findUnique({
    where: { id: generatedCodeId },
  });

  if (!generatedCode) {
    throw new Error("Generated code not found");
  }

  if (generatedCode.status !== "APPROVED") {
    throw new Error("Generated code is not approved");
  }

  const { project } = task;
  const accessToken = project.user?.accessToken;
  const repoInfo = parseGitHubRepo(project.githubRepo);

  if (!accessToken) {
    throw new Error("No access token available for this project");
  }

  if (!repoInfo) {
    throw new Error("Invalid GitHub repository");
  }

  const { owner, repo } = repoInfo;
  const branchName = task.branchName;
  const generatedFiles = generatedCode.files as unknown as GeneratedFile[];
  const explanation = generatedCode.summary;

  console.log(`[PR Comment Response Phase 2] Task ${taskId}: Committing approved code (${generatedFiles.length} files)`);

  // Create execution for committing
  const commitExecutionId = await createExecution(taskId, "COMMIT_FILES", {
    type: "PR_COMMENT_RESPONSE",
    files: generatedFiles.map((f) => ({ path: f.path, action: f.action })),
  });

  try {
    // Commit the changes
    for (const file of generatedFiles) {
      if (file.action === "delete") {
        await deleteFile(
          accessToken,
          owner,
          repo,
          file.path,
          `Address comment: delete ${file.path}`,
          branchName
        );
      } else {
        await createOrUpdateFile(
          accessToken,
          owner,
          repo,
          file.path,
          file.content,
          `Address comment from @${commentAuthor}: ${file.path}`,
          branchName
        );
      }
    }

    await completeExecution(commitExecutionId, {
      committedFiles: generatedFiles.length,
    });

    // Post reply summarizing the code changes
    const responseExecutionId = await createExecution(taskId, "RESPOND_TO_COMMENT", {
      type: "PR_COMMENT_RESPONSE",
      prNumber,
    });

    await addPRComment(
      accessToken,
      owner,
      repo,
      prNumber,
      `Thanks for the feedback, @${commentAuthor}! I've made the following changes:\n\n${explanation}\n\n**Files modified:** ${generatedFiles.map((f) => `\`${f.path}\``).join(", ")}\n\n*Changes committed by FlowForge AI agent.*`
    );

    await completeExecution(responseExecutionId, {
      action: "code_change",
      filesModified: generatedFiles.length,
      explanation,
    });

    // Update task status back to PR_OPEN or IN_REVIEW
    await prisma.task.update({
      where: { id: taskId },
      data: { status: task.prNumber ? "IN_REVIEW" : "PR_OPEN" },
    });

    console.log(`[PR Comment Response Phase 2] Task ${taskId}: Code committed and replied to PR`);
  } catch (error) {
    await failExecution(commitExecutionId, error instanceof Error ? error.message : "Unknown error");

    // Reset task status
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_REVIEW" },
    });

    throw error;
  }
}
