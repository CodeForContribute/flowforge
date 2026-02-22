import { getRepoTree, getFileContent } from "./github";
import type { GitHubTreeItem } from "@/types";

export function formatTreeStructure(tree: GitHubTreeItem[]): string {
  // Filter to only show relevant files and directories
  const relevantFiles = tree.filter((item) => {
    // Skip node_modules, build outputs, and other common exclusions
    const excludePatterns = [
      /^node_modules(\/|$)/,
      /^\.git(\/|$)/,
      /^dist(\/|$)/,
      /^build(\/|$)/,
      /^\.next(\/|$)/,
      /^coverage(\/|$)/,
      /^\.cache(\/|$)/,
      /\.lock$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
    ];

    return !excludePatterns.some((pattern) => pattern.test(item.path));
  });

  // Build tree structure
  const lines: string[] = [];

  for (const item of relevantFiles) {
    const depth = item.path.split("/").length - 1;
    const indent = "  ".repeat(depth);
    const name = item.path.split("/").pop() || item.path;
    const prefix = item.type === "tree" ? "+" : "-";

    lines.push(`${indent}${prefix} ${name}`);
  }

  return lines.join("\n");
}

interface ParentTaskContext {
  title: string;
  description: string;
  taskType: string;
}

interface SprintContext {
  name: string;
  goal: string | null;
}

interface GeneratePromptOptions {
  taskTitle: string;
  taskDescription: string;
  taskType: string;
  projectName: string;
  githubRepo: string;
  accessToken: string;
  additionalContext?: string;
  parentTask?: ParentTaskContext | null;
  sprint?: SprintContext | null;
}

export async function generateImplementationPrompt(
  options: GeneratePromptOptions
): Promise<string> {
  const {
    taskTitle,
    taskDescription,
    taskType,
    projectName,
    githubRepo,
    accessToken,
    additionalContext,
    parentTask,
    sprint,
  } = options;

  const [owner, repo] = githubRepo.split("/");

  // Get repository structure
  let repoStructure = "Unable to fetch repository structure";
  try {
    const tree = await getRepoTree(accessToken, owner, repo);
    repoStructure = formatTreeStructure(tree);
  } catch (error) {
    console.error("Error fetching repo tree:", error);
  }

  // Try to get key configuration files
  const configFiles: { name: string; content: string }[] = [];
  const configFileNames = [
    "package.json",
    "tsconfig.json",
    "README.md",
    ".env.example",
    "prisma/schema.prisma",
  ];

  for (const fileName of configFileNames) {
    try {
      const content = await getFileContent(accessToken, owner, repo, fileName);
      if (content) {
        configFiles.push({ name: fileName, content: content.slice(0, 3000) }); // Limit size
      }
    } catch {
      // File doesn't exist, skip
    }
  }

  const configFilesSection = configFiles.length > 0
    ? configFiles.map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")
    : "No configuration files found.";

  // Build hierarchy context section
  let hierarchySection = "";
  if (parentTask) {
    hierarchySection = `
## Parent Context
This task is part of a larger ${parentTask.taskType.toLowerCase()}:
### ${parentTask.taskType}: ${parentTask.title}
${parentTask.description}
`;
  }

  // Build sprint context section
  let sprintSection = "";
  if (sprint) {
    sprintSection = `
## Sprint Context
- **Sprint**: ${sprint.name}
${sprint.goal ? `- **Sprint Goal**: ${sprint.goal}` : ""}
`;
  }

  const prompt = `# Task Implementation Request

## Project Information
- **Project**: ${projectName}
- **Repository**: ${githubRepo}

## Task Details
- **Type**: ${taskType}
### Title
${taskTitle}

### Description
${taskDescription}
${hierarchySection}${sprintSection}
## Repository Structure
\`\`\`
${repoStructure}
\`\`\`

## Configuration Files
${configFilesSection}

${additionalContext ? `## Additional Context\n${additionalContext}\n` : ""}

## Instructions

Please implement this task following these guidelines:

1. **Analyze the existing codebase** structure and patterns shown above
2. **Follow existing conventions** for code style, naming, and organization
3. **Create or modify files** as needed to implement the requested feature
4. **Include appropriate error handling** and edge cases
5. **Write tests for every newly added or modified line of code** using the project's existing testing framework and conventions
6. **Fix all currently failing tests** in any files you modify
7. **Fix all SonarQube linting issues** (code smells, bugs, vulnerabilities, security hotspots) in your changes
8. **Ensure overall test coverage remains >= 80%** — add tests to cover any gaps introduced by your changes
9. **Update documentation** if relevant

### Response Format

Return your implementation as a JSON object with the following structure:

\`\`\`json
{
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "content": "full file content here",
      "action": "create" | "update" | "delete"
    }
  ],
  "summary": "Brief description of changes made"
}
\`\`\`

Make sure to:
- Include the complete file content for each file
- Use the correct file paths relative to the repository root
- Specify whether each file is being created, updated, or deleted
- Keep the implementation focused and minimal - only change what's necessary
`;

  return prompt;
}

interface ReviewResponseOptions {
  taskTitle: string;
  taskDescription: string;
  reviewComments: {
    path: string;
    body: string;
    line: number | null;
  }[];
  currentFiles: {
    path: string;
    content: string;
  }[];
}

export function generateReviewResponsePrompt(options: ReviewResponseOptions): string {
  const { taskTitle, taskDescription, reviewComments, currentFiles } = options;

  const commentsSection = reviewComments
    .map(
      (c) =>
        `- **${c.path}**${c.line ? ` (line ${c.line})` : ""}: ${c.body}`
    )
    .join("\n");

  const filesSection = currentFiles
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  return `# Review Response Request

## Original Task
### Title
${taskTitle}

### Description
${taskDescription}

## Review Comments to Address
${commentsSection}

## Current Implementation
${filesSection}

## Instructions

Please address the review comments above by making the necessary changes. For each comment:

1. **Understand the feedback** and why it was given
2. **Make appropriate changes** to address the concern
3. **Maintain consistency** with the rest of the codebase

### Response Format

Return your changes as a JSON object:

\`\`\`json
{
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "content": "full updated file content",
      "action": "update"
    }
  ],
  "explanation": "Brief explanation of how each comment was addressed"
}
\`\`\`
`;
}
