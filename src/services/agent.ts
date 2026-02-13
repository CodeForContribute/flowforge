import OpenAI from "openai";
import type { CodeGenerationResult, ReviewResponseResult, GeneratedFile, CommentClassification, DiscussionReplyResult } from "@/types";

// Lazy initialization to avoid build-time errors when OPENAI_API_KEY is not set
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

interface GenerateCodeOptions {
  prompt: string;
  model?: string;
}

export async function generateCode(options: GenerateCodeOptions): Promise<CodeGenerationResult> {
  const { prompt, model = "gpt-4o" } = options;

  const response = await getOpenAI().chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are an expert software developer. You generate high-quality, production-ready code following best practices.

When implementing features:
1. Follow existing code patterns and conventions in the codebase
2. Write clean, maintainable, and well-documented code
3. Include appropriate error handling
4. Keep changes focused and minimal

Always respond with a valid JSON object in the format specified in the prompt. Do not include any text before or after the JSON.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract the text content
  const textContent = response.choices[0]?.message?.content;
  if (!textContent) {
    throw new Error("No text content in response");
  }

  // Parse the JSON response
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in response");
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as {
      files: GeneratedFile[];
      summary: string;
    };

    // Validate the structure
    if (!Array.isArray(result.files)) {
      throw new Error("Invalid response: files must be an array");
    }

    for (const file of result.files) {
      if (!file.path || typeof file.path !== "string") {
        throw new Error("Invalid response: each file must have a path");
      }
      if (!file.action || !["create", "update", "delete"].includes(file.action)) {
        throw new Error("Invalid response: each file must have a valid action");
      }
      if (file.action !== "delete" && (!file.content || typeof file.content !== "string")) {
        throw new Error("Invalid response: non-delete files must have content");
      }
    }

    return {
      files: result.files,
      summary: result.summary || "Implementation completed",
    };
  } catch (error) {
    console.error("Error parsing agent response:", error);
    console.error("Raw response:", textContent);
    throw new Error("Failed to parse code generation response");
  }
}

interface RespondToReviewOptions {
  prompt: string;
  model?: string;
}

export async function respondToReview(
  options: RespondToReviewOptions
): Promise<ReviewResponseResult> {
  const { prompt, model = "gpt-4o" } = options;

  const response = await getOpenAI().chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are an expert software developer responding to code review feedback. You make thoughtful improvements based on reviewer comments while maintaining code quality and consistency.

When addressing review comments:
1. Carefully read and understand each comment
2. Make appropriate changes that address the concern
3. Maintain consistency with the rest of the codebase
4. Don't make unnecessary changes beyond what's requested

Always respond with a valid JSON object in the format specified in the prompt. Do not include any text before or after the JSON.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract the text content
  const textContent = response.choices[0]?.message?.content;
  if (!textContent) {
    throw new Error("No text content in response");
  }

  // Parse the JSON response
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in response");
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as {
      files: GeneratedFile[];
      explanation: string;
    };

    // Validate the structure
    if (!Array.isArray(result.files)) {
      throw new Error("Invalid response: files must be an array");
    }

    return {
      files: result.files,
      explanation: result.explanation || "Review comments addressed",
    };
  } catch (error) {
    console.error("Error parsing agent response:", error);
    console.error("Raw response:", textContent);
    throw new Error("Failed to parse review response");
  }
}

interface ClassifyCommentOptions {
  commentBody: string;
  commentAuthor: string;
  taskTitle: string;
  taskDescription: string;
  prContext?: string;
  model?: string;
}

export async function classifyComment(
  options: ClassifyCommentOptions
): Promise<CommentClassification> {
  const { commentBody, commentAuthor, taskTitle, taskDescription, prContext, model = "gpt-4o" } = options;

  const response = await getOpenAI().chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `You are an AI assistant that analyzes PR comments to determine if they require code changes or are just discussion/questions.

Classify comments into two categories:
1. "code_change" - The comment explicitly or implicitly requests modifications to the code, such as:
   - Bug fixes
   - Feature additions or modifications
   - Refactoring requests
   - Performance improvements
   - Style/formatting changes
   - Adding tests
   - Fixing typos in code

2. "discussion" - The comment is informational, asks questions, or doesn't require code changes, such as:
   - Questions about implementation decisions
   - Requests for clarification
   - General feedback or praise
   - Design discussions
   - Documentation questions (not requesting doc changes)
   - Approval comments

Respond with a JSON object containing:
- intent: "code_change" or "discussion"
- confidence: number between 0 and 1 indicating confidence level
- reasoning: brief explanation of why this classification was chosen
- suggestedAction: what action should be taken based on this comment`,
      },
      {
        role: "user",
        content: `Analyze this PR comment and classify it:

**Task:** ${taskTitle}
**Description:** ${taskDescription}
${prContext ? `**PR Context:** ${prContext}` : ""}

**Comment by ${commentAuthor}:**
${commentBody}

Respond with a valid JSON object only.`,
      },
    ],
  });

  const textContent = response.choices[0]?.message?.content;
  if (!textContent) {
    throw new Error("No text content in response");
  }

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in response");
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as CommentClassification;

    // Validate and normalize the response
    if (!["code_change", "discussion"].includes(result.intent)) {
      result.intent = "discussion"; // Default to discussion if unclear
    }
    result.confidence = Math.max(0, Math.min(1, result.confidence || 0.5));
    result.reasoning = result.reasoning || "No reasoning provided";
    result.suggestedAction = result.suggestedAction || "Review the comment";

    return result;
  } catch (error) {
    console.error("Error parsing classification response:", error);
    // Return a default classification on error
    return {
      intent: "discussion",
      confidence: 0.5,
      reasoning: "Failed to parse AI response, defaulting to discussion",
      suggestedAction: "Review the comment manually",
    };
  }
}

interface GenerateDiscussionReplyOptions {
  commentBody: string;
  commentAuthor: string;
  taskTitle: string;
  taskDescription: string;
  currentFiles?: { path: string; content: string }[];
  model?: string;
}

export async function generateDiscussionReply(
  options: GenerateDiscussionReplyOptions
): Promise<DiscussionReplyResult> {
  const { commentBody, commentAuthor, taskTitle, taskDescription, currentFiles, model = "gpt-4o" } = options;

  const filesContext = currentFiles?.length
    ? `\n\n**Relevant Files:**\n${currentFiles.map((f) => `- ${f.path}`).join("\n")}`
    : "";

  const response = await getOpenAI().chat.completions.create({
    model,
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content: `You are an AI assistant responding to PR comments on behalf of a development team. Your responses should be:
- Professional and helpful
- Clear and concise
- Technical when appropriate
- Friendly but not overly casual

When answering questions:
- Explain the reasoning behind implementation decisions
- Reference specific parts of the code when relevant
- Acknowledge good points and valid concerns
- Offer to make changes if the commenter has a compelling argument

Respond with a JSON object containing:
- reply: the response text to post as a PR comment (use markdown formatting)`,
      },
      {
        role: "user",
        content: `Generate a reply to this PR comment:

**Task:** ${taskTitle}
**Description:** ${taskDescription}${filesContext}

**Comment by ${commentAuthor}:**
${commentBody}

Respond with a valid JSON object only.`,
      },
    ],
  });

  const textContent = response.choices[0]?.message?.content;
  if (!textContent) {
    throw new Error("No text content in response");
  }

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in response");
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as DiscussionReplyResult;
    return {
      reply: result.reply || "Thank you for your comment. I'll look into this.",
    };
  } catch (error) {
    console.error("Error parsing discussion reply response:", error);
    throw new Error("Failed to parse discussion reply response");
  }
}

interface GenerateCodeFromCommentOptions {
  commentBody: string;
  commentAuthor: string;
  taskTitle: string;
  taskDescription: string;
  currentFiles: { path: string; content: string }[];
  model?: string;
}

export async function generateCodeFromComment(
  options: GenerateCodeFromCommentOptions
): Promise<ReviewResponseResult> {
  const { commentBody, commentAuthor, taskTitle, taskDescription, currentFiles, model = "gpt-4o" } = options;

  const filesContext = currentFiles
    .map((f) => `**File: ${f.path}**\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  const response = await getOpenAI().chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are an expert software developer implementing code changes based on PR comments. Make precise, focused changes that address the comment while maintaining code quality.

Guidelines:
1. Only modify files that need to change
2. Keep changes minimal and focused
3. Maintain consistency with existing code style
4. Include appropriate error handling
5. Don't make unrelated improvements

Respond with a JSON object containing:
- files: array of { path: string, content: string, action: "create" | "update" | "delete" }
- explanation: brief explanation of the changes made`,
      },
      {
        role: "user",
        content: `Implement the changes requested in this PR comment:

**Task:** ${taskTitle}
**Description:** ${taskDescription}

**Comment by ${commentAuthor}:**
${commentBody}

**Current Files:**
${filesContext}

Respond with a valid JSON object only.`,
      },
    ],
  });

  const textContent = response.choices[0]?.message?.content;
  if (!textContent) {
    throw new Error("No text content in response");
  }

  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in response");
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as ReviewResponseResult;

    if (!Array.isArray(result.files)) {
      throw new Error("Invalid response: files must be an array");
    }

    return {
      files: result.files,
      explanation: result.explanation || "Changes implemented based on comment",
    };
  } catch (error) {
    console.error("Error parsing code generation response:", error);
    throw new Error("Failed to parse code generation response");
  }
}

// ============= MERGE CONFLICT RESOLUTION =============

interface ConflictFile {
  path: string;
  baseContent: string | null;
  headContent: string | null;
}

interface ConflictResolutionResult {
  success: boolean;
  resolvedFiles: { path: string; content: string; action: "create" | "update" | "delete" }[];
  summary: string;
  error?: string;
}

export async function generateConflictResolution(
  taskTitle: string,
  taskDescription: string,
  conflicts: ConflictFile[],
  baseBranch: string,
  headBranch: string
): Promise<ConflictResolutionResult> {
  const conflictDescriptions = conflicts
    .map((c) => {
      let desc = `File: ${c.path}\n`;
      if (c.baseContent && c.headContent) {
        desc += `Both branches modified this file.\n`;
        desc += `--- ${baseBranch} (base) ---\n${c.baseContent.substring(0, 2000)}${c.baseContent.length > 2000 ? "\n... (truncated)" : ""}\n`;
        desc += `--- ${headBranch} (feature) ---\n${c.headContent.substring(0, 2000)}${c.headContent.length > 2000 ? "\n... (truncated)" : ""}\n`;
      } else if (c.baseContent) {
        desc += `File exists in ${baseBranch} but was deleted/missing in ${headBranch}\n`;
        desc += `--- ${baseBranch} ---\n${c.baseContent.substring(0, 2000)}${c.baseContent.length > 2000 ? "\n... (truncated)" : ""}\n`;
      } else if (c.headContent) {
        desc += `File created in ${headBranch}, doesn't exist in ${baseBranch}\n`;
        desc += `--- ${headBranch} ---\n${c.headContent.substring(0, 2000)}${c.headContent.length > 2000 ? "\n... (truncated)" : ""}\n`;
      }
      return desc;
    })
    .join("\n---\n");

  const systemPrompt = `You are an expert code merge conflict resolver. Your task is to intelligently merge conflicting files while preserving the intent of both changes.

Guidelines:
1. Understand the purpose of changes in both branches
2. Combine changes logically - don't just pick one side
3. Ensure the merged result is syntactically correct
4. Preserve all functionality from both branches where possible
5. If changes are truly incompatible, prefer the feature branch (${headBranch}) changes as they represent new work
6. Add helpful comments if the merge is complex

Respond with JSON in this exact format:
{
  "success": true,
  "resolvedFiles": [
    {
      "path": "path/to/file.ts",
      "content": "full merged file content",
      "action": "update"
    }
  ],
  "summary": "Brief explanation of how conflicts were resolved"
}

If you cannot resolve the conflicts, respond with:
{
  "success": false,
  "resolvedFiles": [],
  "summary": "",
  "error": "Explanation of why conflicts cannot be auto-resolved"
}`;

  const userPrompt = `Task: ${taskTitle}
Description: ${taskDescription}

Please resolve the following merge conflicts between "${baseBranch}" (base) and "${headBranch}" (feature branch):

${conflictDescriptions}

Merge these changes intelligently, preserving the intent of the task while incorporating any necessary changes from the base branch.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        resolvedFiles: [],
        summary: "",
        error: "No response from AI",
      };
    }

    // Parse JSON response
    const result = JSON.parse(content) as ConflictResolutionResult;
    return result;
  } catch (error) {
    console.error("Error generating conflict resolution:", error);
    return {
      success: false,
      resolvedFiles: [],
      summary: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
