import Anthropic from "@anthropic-ai/sdk";
import type { CodeGenerationResult, ReviewResponseResult, GeneratedFile } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateCodeOptions {
  prompt: string;
  model?: string;
}

export async function generateCode(options: GenerateCodeOptions): Promise<CodeGenerationResult> {
  const { prompt, model = "claude-sonnet-4-20250514" } = options;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    system: `You are an expert software developer. You generate high-quality, production-ready code following best practices.

When implementing features:
1. Follow existing code patterns and conventions in the codebase
2. Write clean, maintainable, and well-documented code
3. Include appropriate error handling
4. Keep changes focused and minimal

Always respond with a valid JSON object in the format specified in the prompt. Do not include any text before or after the JSON.`,
  });

  // Extract the text content
  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in response");
  }

  // Parse the JSON response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
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
    console.error("Raw response:", textContent.text);
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
  const { prompt, model = "claude-sonnet-4-20250514" } = options;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    system: `You are an expert software developer responding to code review feedback. You make thoughtful improvements based on reviewer comments while maintaining code quality and consistency.

When addressing review comments:
1. Carefully read and understand each comment
2. Make appropriate changes that address the concern
3. Maintain consistency with the rest of the codebase
4. Don't make unnecessary changes beyond what's requested

Always respond with a valid JSON object in the format specified in the prompt. Do not include any text before or after the JSON.`,
  });

  // Extract the text content
  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in response");
  }

  // Parse the JSON response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
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
    console.error("Raw response:", textContent.text);
    throw new Error("Failed to parse review response");
  }
}
