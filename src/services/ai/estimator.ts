import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getProjectAIConfig } from "@/lib/ai-config";
import type { TaskStatus, TaskType, TaskPriority } from "@/types";

// Types for task estimation
export interface EstimationRequest {
  taskId: string;
  includeCodebaseAnalysis?: boolean;
}

export interface TimeEstimate {
  optimistic: number; // hours
  realistic: number; // hours
  pessimistic: number; // hours
}

export interface SimilarTask {
  taskId: string;
  title: string;
  actualPoints: number;
  actualCompletionTime: number | null; // hours
  similarity: number; // 0-1 score
  taskType: TaskType;
}

export interface ComplexityFactor {
  factor: string;
  impact: "low" | "medium" | "high";
  description: string;
}

export interface TaskEstimation {
  storyPoints: number;
  confidence: "low" | "medium" | "high";
  timeEstimate: TimeEstimate;
  reasoning: string;
  similarTasks: SimilarTask[];
  complexityFactors: ComplexityFactor[];
  suggestions?: string[];
}

interface TaskForEstimation {
  id: string;
  title: string;
  description: string;
  taskType: TaskType;
  priority: TaskPriority;
  parentTask: {
    id: string;
    title: string;
    description: string;
    storyPoints: number | null;
  } | null;
  labels: { name: string }[];
  project: {
    id: string;
    name: string;
    githubRepo: string;
  };
}

interface CompletedTaskForReference {
  id: string;
  title: string;
  description: string;
  taskType: TaskType;
  storyPoints: number | null;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  labels: { name: string }[];
}

/**
 * Generates an AI-powered estimation for a task based on its description,
 * similar completed tasks, and codebase context.
 */
export async function estimateTask(
  request: EstimationRequest
): Promise<TaskEstimation> {
  const { taskId, includeCodebaseAnalysis = false } = request;

  // Fetch the task
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: { id: true, name: true, githubRepo: true },
      },
      parentTask: {
        select: { id: true, title: true, description: true, storyPoints: true },
      },
      labels: { select: { name: true } },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  // Get AI configuration
  const aiConfig = await getProjectAIConfig(task.project.id);

  if (!aiConfig.aiEnabled) {
    throw new Error("AI features are not enabled for this project");
  }

  const apiKey = aiConfig.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No AI API key configured");
  }

  const openai = new OpenAI({ apiKey });

  // Fetch similar completed tasks for reference
  const similarTasks = await fetchSimilarCompletedTasks(task);

  // Build the prompt
  const prompt = buildEstimationPrompt(task, similarTasks, includeCodebaseAnalysis);

  // Call AI for estimation
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content: `You are an expert software project estimator. You analyze task descriptions, consider complexity factors, and reference similar completed tasks to provide accurate story point estimates.

Story Point Guidelines (Fibonacci scale):
- 1 point: Trivial change, < 1 hour work
- 2 points: Simple change, 1-2 hours work
- 3 points: Small feature, 2-4 hours work
- 5 points: Medium feature, 4-8 hours work
- 8 points: Large feature, 1-2 days work
- 13 points: Complex feature, 2-4 days work
- 21 points: Very complex, should probably be broken down

Your estimates should:
1. Be based on the task description and requirements
2. Consider complexity factors (technical debt, dependencies, unknowns)
3. Reference similar completed tasks when available
4. Account for the task type (bugs often have hidden complexity)
5. Provide confidence levels based on clarity of requirements

Always respond with a valid JSON object. Do not include any text before or after the JSON.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = response.choices[0]?.message?.content;
  if (!textContent) {
    throw new Error("No response from AI");
  }

  // Parse the response
  const jsonMatch = textContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not find JSON in AI response");
  }

  try {
    const result = JSON.parse(jsonMatch[0]) as TaskEstimation;

    // Validate and normalize the response
    return validateEstimation(result, similarTasks);
  } catch (error) {
    console.error("Error parsing estimation response:", error);
    console.error("Raw response:", textContent);
    throw new Error("Failed to parse AI estimation response");
  }
}

async function fetchSimilarCompletedTasks(
  task: TaskForEstimation
): Promise<CompletedTaskForReference[]> {
  // Completed statuses
  const completedStatuses: TaskStatus[] = ["MERGED", "CLOSED"];

  // Fetch completed tasks from the same project
  const completedTasks = await prisma.task.findMany({
    where: {
      projectId: task.project.id,
      status: { in: completedStatuses },
      storyPoints: { not: null },
      id: { not: task.id },
    },
    include: {
      labels: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50, // Get last 50 completed tasks for comparison
  });

  // Calculate simple similarity scores based on:
  // - Same task type
  // - Overlapping labels
  // - Title/description keyword overlap
  const taskLabels = new Set(task.labels.map((l) => l.name));
  const taskKeywords = extractKeywords(task.title + " " + task.description);

  const scoredTasks = completedTasks.map((ct) => {
    let score = 0;

    // Task type match (weight: 30%)
    if (ct.taskType === task.taskType) {
      score += 0.3;
    }

    // Label overlap (weight: 30%)
    const ctLabels = new Set(ct.labels.map((l) => l.name));
    const labelOverlap = Array.from(taskLabels).filter((l) => ctLabels.has(l)).length;
    if (taskLabels.size > 0) {
      score += 0.3 * (labelOverlap / taskLabels.size);
    }

    // Keyword overlap (weight: 40%)
    const ctKeywords = extractKeywords(ct.title + " " + ct.description);
    const keywordOverlap = Array.from(taskKeywords).filter((k) =>
      ctKeywords.has(k)
    ).length;
    if (taskKeywords.size > 0) {
      score += 0.4 * (keywordOverlap / taskKeywords.size);
    }

    return { task: ct, score };
  });

  // Sort by similarity and take top 5
  return scoredTasks
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .filter((st) => st.score > 0.1) // Only include if somewhat similar
    .map((st) => ({
      ...st.task,
      similarity: st.score,
    })) as (CompletedTaskForReference & { similarity: number })[];
}

function extractKeywords(text: string): Set<string> {
  // Simple keyword extraction - remove common words and extract meaningful terms
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "this",
    "that", "these", "those", "it", "its", "not", "no", "we", "you",
    "i", "me", "my", "your", "our", "their", "they", "them", "what",
    "when", "where", "which", "who", "how", "why", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such",
    "than", "too", "very", "just", "also", "now", "then", "so", "if",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  return new Set(words);
}

function buildEstimationPrompt(
  task: TaskForEstimation,
  similarTasks: CompletedTaskForReference[],
  includeCodebaseAnalysis: boolean
): string {
  const prompt = `## Task Estimation Request

### Task Details
- **Title:** ${task.title}
- **Type:** ${task.taskType}
- **Priority:** ${task.priority}
- **Labels:** ${task.labels.map((l) => l.name).join(", ") || "None"}
${task.parentTask ? `- **Parent Task:** ${task.parentTask.title} (${task.parentTask.storyPoints || "unestimated"} points)` : ""}

### Description
${task.description}

### Similar Completed Tasks (for reference)
${
  similarTasks.length > 0
    ? similarTasks
        .map(
          (st, i) => `${i + 1}. "${st.title}"
   - Type: ${st.taskType}
   - Story Points: ${st.storyPoints}
   - Labels: ${st.labels.map((l) => l.name).join(", ") || "None"}
   - Similarity Score: ${Math.round(((st as { similarity?: number }).similarity || 0) * 100)}%`
        )
        .join("\n\n")
    : "No similar completed tasks found for reference."
}

${includeCodebaseAnalysis ? "### Note: Consider codebase complexity factors in your estimate." : ""}

### Instructions
Analyze this task and provide a story point estimate. Consider:
1. The scope and complexity of work described
2. Similar completed tasks as calibration points
3. Technical complexity factors
4. Potential unknowns or risks
5. The task type (bugs often have hidden complexity)

Respond with a JSON object in this exact format:
{
  "storyPoints": 5,
  "confidence": "medium",
  "timeEstimate": {
    "optimistic": 4,
    "realistic": 6,
    "pessimistic": 10
  },
  "reasoning": "Detailed explanation of the estimate",
  "similarTasks": [
    {
      "taskId": "task_id",
      "title": "Similar task title",
      "actualPoints": 5,
      "actualCompletionTime": null,
      "similarity": 0.75,
      "taskType": "TASK"
    }
  ],
  "complexityFactors": [
    {
      "factor": "Integration complexity",
      "impact": "medium",
      "description": "Requires integration with multiple services"
    }
  ],
  "suggestions": [
    "Consider breaking this into smaller tasks if estimate is > 8 points"
  ]
}`;

  return prompt;
}

function validateEstimation(
  estimation: TaskEstimation,
  referenceTasks: CompletedTaskForReference[]
): TaskEstimation {
  // Validate story points (must be Fibonacci-ish)
  const validPoints = [1, 2, 3, 5, 8, 13, 21];
  const closestPoint = validPoints.reduce((prev, curr) =>
    Math.abs(curr - estimation.storyPoints) < Math.abs(prev - estimation.storyPoints)
      ? curr
      : prev
  );

  // Validate confidence
  const validConfidence = ["low", "medium", "high"];
  const confidence = validConfidence.includes(estimation.confidence)
    ? estimation.confidence
    : "medium";

  // Validate time estimates
  const timeEstimate = {
    optimistic: Math.max(0.5, estimation.timeEstimate?.optimistic || closestPoint * 0.5),
    realistic: Math.max(1, estimation.timeEstimate?.realistic || closestPoint * 1),
    pessimistic: Math.max(
      2,
      estimation.timeEstimate?.pessimistic || closestPoint * 2
    ),
  };

  // Ensure pessimistic > realistic > optimistic
  if (timeEstimate.realistic < timeEstimate.optimistic) {
    timeEstimate.realistic = timeEstimate.optimistic * 1.5;
  }
  if (timeEstimate.pessimistic < timeEstimate.realistic) {
    timeEstimate.pessimistic = timeEstimate.realistic * 1.5;
  }

  // Enrich similar tasks with reference data
  const similarTasks = estimation.similarTasks
    ?.map((st) => {
      const refTask = referenceTasks.find((rt) => rt.id === st.taskId);
      if (refTask) {
        return {
          ...st,
          title: refTask.title,
          actualPoints: refTask.storyPoints || st.actualPoints,
          taskType: refTask.taskType,
        };
      }
      return st;
    })
    .filter((st) => st.similarity > 0) || [];

  // Validate complexity factors
  const complexityFactors = (estimation.complexityFactors || []).map((cf) => ({
    factor: cf.factor || "Unknown factor",
    impact: (["low", "medium", "high"].includes(cf.impact) ? cf.impact : "medium") as
      | "low"
      | "medium"
      | "high",
    description: cf.description || cf.factor,
  }));

  return {
    storyPoints: closestPoint,
    confidence: confidence as "low" | "medium" | "high",
    timeEstimate,
    reasoning: estimation.reasoning || "Estimation based on task description and complexity.",
    similarTasks,
    complexityFactors,
    suggestions: estimation.suggestions || [],
  };
}

/**
 * Bulk estimate multiple tasks at once.
 */
export async function estimateTasks(
  taskIds: string[]
): Promise<Map<string, TaskEstimation>> {
  const results = new Map<string, TaskEstimation>();

  // Estimate tasks in parallel, but with some rate limiting
  const batchSize = 3;
  for (let i = 0; i < taskIds.length; i += batchSize) {
    const batch = taskIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (taskId) => {
        try {
          const estimation = await estimateTask({ taskId });
          return { taskId, estimation, error: null };
        } catch (error) {
          console.error(`Error estimating task ${taskId}:`, error);
          return { taskId, estimation: null, error };
        }
      })
    );

    for (const result of batchResults) {
      if (result.estimation) {
        results.set(result.taskId, result.estimation);
      }
    }
  }

  return results;
}

/**
 * Apply an estimation to a task.
 */
export async function applyEstimation(
  taskId: string,
  storyPoints: number
): Promise<void> {
  await prisma.task.update({
    where: { id: taskId },
    data: { storyPoints },
  });
}
