import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ExecutionStep } from "@/types";
import { generateBranchName, parseGitHubRepo } from "@/lib/utils";
import {
  createBranch,
  createOrUpdateFile,
  deleteFile,
  createPullRequest,
  requestReviewers,
  getPullRequestComments,
  getFileContent,
  mergePullRequest,
  addPRComment,
} from "./github";
import { generateCode, respondToReview } from "./agent";
import { generateReviewResponsePrompt } from "./prompt-generator";
import type { GeneratedFile } from "@/types";

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

async function addSystemComment(taskId: string, content: string): Promise<void> {
  await prisma.comment.create({
    data: {
      taskId,
      content,
      isSystem: true,
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
  const branchName = generateBranchName(task.title, task.id);

  // Update task status to GENERATING
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "GENERATING", branchName },
  });

  try {
    // Step 1: Create branch
    let executionId = await createExecution(taskId, "CREATE_BRANCH", {
      branchName,
      baseBranch: project.defaultBranch,
    });

    try {
      await createBranch(accessToken, owner, repo, branchName, project.defaultBranch);
      await completeExecution(executionId, { branchName });
      await addSystemComment(taskId, `Created branch \`${branchName}\` from \`${project.defaultBranch}\``);
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }

    // Step 2: Generate code
    executionId = await createExecution(taskId, "GENERATE_CODE", {
      model: project.agentModel,
    });

    let generatedFiles: GeneratedFile[];
    let summary: string;

    try {
      const result = await generateCode({
        prompt: task.generatedPrompt,
        model: project.agentModel,
      });
      generatedFiles = result.files;
      summary = result.summary;
      await completeExecution(executionId, { fileCount: generatedFiles.length, summary });
      await addSystemComment(taskId, `Generated code for ${generatedFiles.length} files:\n\n${summary}`);
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
      await addSystemComment(taskId, `Committed ${generatedFiles.length} files to \`${branchName}\``);
    } catch (error) {
      await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }

    // Step 4: Create pull request
    executionId = await createExecution(taskId, "CREATE_PR", {
      title: task.title,
      baseBranch: project.defaultBranch,
    });

    let prNumber: number;
    let prUrl: string;

    try {
      const prBody = `## Summary

${summary}

## Task Details

${task.description}

---

*This PR was generated by [FlowForge](https://github.com/flowforge) AI agent.*`;

      const pr = await createPullRequest(
        accessToken,
        owner,
        repo,
        task.title,
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

      await completeExecution(executionId, { prNumber, prUrl });
      await addSystemComment(taskId, `Created pull request [#${prNumber}](${prUrl})`);
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
        await addSystemComment(taskId, `Requested review from: ${project.reviewers.join(", ")}`);
      } catch (error) {
        // Don't fail the whole process if reviewers can't be added
        await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
        console.error("Failed to request reviewers:", error);
      }
    }
  } catch (error) {
    console.error("Error executing task:", error);
    // Ensure task is not left in GENERATING state
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "IN_PROGRESS" },
    });
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

  // Get review comments
  const comments = await getPullRequestComments(accessToken, owner, repo, prNumber);

  if (comments.length === 0) {
    await addSystemComment(taskId, "No review comments to address");
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

    await addSystemComment(
      taskId,
      `Addressed ${comments.length} review comment(s):\n\n${result.explanation}`
    );
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

    await addSystemComment(taskId, `Pull request #${prNumber} has been merged!`);
  } catch (error) {
    await failExecution(executionId, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}
