import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getProjectAIConfig } from "@/lib/ai-config";
import type { TaskStatus, TaskType, TaskPriority, ExecutionStatus } from "@/types";

// Types for retrospective analysis
export interface RetrospectiveRequest {
  sprintId: string;
  includeComments?: boolean;
  includePRAnalysis?: boolean;
}

export interface Achievement {
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  relatedTaskIds?: string[];
}

export interface Challenge {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  rootCause?: string;
  relatedTaskIds?: string[];
}

export interface Recommendation {
  title: string;
  description: string;
  category: "process" | "technical" | "team" | "planning";
  priority: "low" | "medium" | "high";
  actionable: boolean;
}

export interface ActionItem {
  title: string;
  description: string;
  owner?: string;
  dueDate?: string;
  category: "process" | "technical" | "team" | "planning";
}

export interface SprintMetrics {
  plannedPoints: number;
  completedPoints: number;
  velocity: number;
  completionRate: number; // percentage
  totalTasks: number;
  completedTasks: number;
  addedMidSprint: number;
  removedMidSprint: number;
  averageTaskAge: number; // days from creation to completion
  blockedTime: number; // estimated hours tasks were blocked
}

export interface VelocityTrend {
  sprintName: string;
  velocity: number;
  completionRate: number;
}

export interface SprintRetrospective {
  summary: string;
  achievements: Achievement[];
  challenges: Challenge[];
  recommendations: Recommendation[];
  actionItems: ActionItem[];
  metrics: SprintMetrics;
  velocityTrend: VelocityTrend[];
  teamSentiment: "positive" | "neutral" | "negative";
  overallScore: number; // 1-10
}

interface SprintTaskData {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints: number | null;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: string; name: string | null } | null;
  labels: { name: string }[];
  executions: {
    status: ExecutionStatus;
    step: string;
    error: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }[];
  _count: { comments: number };
}


/**
 * Generates an AI-powered sprint retrospective with achievements,
 * challenges, and actionable recommendations.
 */
export async function generateRetrospective(
  request: RetrospectiveRequest
): Promise<SprintRetrospective> {
  const { sprintId, includeComments = true, includePRAnalysis = false } = request;

  // Fetch sprint with tasks
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      project: {
        select: { id: true, name: true, githubRepo: true },
      },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          labels: { select: { name: true } },
          executions: {
            select: {
              status: true,
              step: true,
              error: true,
              createdAt: true,
              completedAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { comments: true } },
        },
      },
    },
  });

  if (!sprint) {
    throw new Error("Sprint not found");
  }

  // Get AI configuration
  const aiConfig = await getProjectAIConfig(sprint.project.id);

  if (!aiConfig.aiEnabled) {
    throw new Error("AI features are not enabled for this project");
  }

  const apiKey = aiConfig.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No AI API key configured");
  }

  const openai = new OpenAI({ apiKey });

  // Calculate sprint metrics
  const metrics = calculateSprintMetrics(sprint.tasks, sprint.startDate, sprint.endDate);

  // Fetch velocity trend from previous sprints
  const velocityTrend = await fetchVelocityTrend(sprint.project.id, sprintId);

  // Fetch comments if requested
  let commentsData: { taskTitle: string; content: string; isSystem: boolean }[] = [];
  if (includeComments) {
    const taskIds = sprint.tasks.map((t) => t.id);
    const comments = await prisma.comment.findMany({
      where: { taskId: { in: taskIds } },
      include: {
        task: { select: { title: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    commentsData = comments.map((c) => ({
      taskTitle: c.task.title,
      content: c.content,
      isSystem: c.isSystem,
    }));
  }

  // Build the prompt
  const prompt = buildRetrospectivePrompt({
    sprint,
    tasks: sprint.tasks,
    metrics,
    velocityTrend,
    comments: commentsData,
    includePRAnalysis,
  });

  // Call AI for retrospective analysis
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are an expert Agile coach conducting a sprint retrospective. You analyze sprint data to identify achievements, challenges, and provide actionable recommendations.

Your analysis should be:
1. Data-driven: Base insights on actual metrics and patterns
2. Constructive: Focus on improvement, not blame
3. Actionable: Provide specific, implementable recommendations
4. Balanced: Highlight both successes and areas for improvement
5. Team-focused: Consider team dynamics and workload distribution

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
    const result = JSON.parse(jsonMatch[0]) as Omit<
      SprintRetrospective,
      "metrics" | "velocityTrend"
    >;

    // Combine AI analysis with calculated metrics
    return {
      ...result,
      metrics,
      velocityTrend,
      achievements: result.achievements || [],
      challenges: result.challenges || [],
      recommendations: result.recommendations || [],
      actionItems: result.actionItems || [],
      teamSentiment: result.teamSentiment || "neutral",
      overallScore: Math.max(1, Math.min(10, result.overallScore || 5)),
    };
  } catch (error) {
    console.error("Error parsing retrospective response:", error);
    console.error("Raw response:", textContent);
    throw new Error("Failed to parse AI retrospective response");
  }
}

function calculateSprintMetrics(
  tasks: SprintTaskData[],
  startDate: Date,
  endDate: Date
): SprintMetrics {
  const completedStatuses: TaskStatus[] = ["MERGED", "CLOSED"];

  const completedTasks = tasks.filter((t) => completedStatuses.includes(t.status));

  const plannedPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedPoints = completedTasks.reduce(
    (sum, t) => sum + (t.storyPoints || 0),
    0
  );

  // Calculate tasks added mid-sprint
  const addedMidSprint = tasks.filter(
    (t) => t.createdAt > startDate && t.createdAt < endDate
  ).length;

  // Calculate average task age for completed tasks
  let totalAge = 0;
  for (const task of completedTasks) {
    const age = (task.updatedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    totalAge += age;
  }
  const averageTaskAge = completedTasks.length > 0 ? totalAge / completedTasks.length : 0;

  // Estimate blocked time based on execution failures
  let blockedTime = 0;
  for (const task of tasks) {
    const failedExecutions = task.executions.filter((e) => e.status === "FAILED");
    blockedTime += failedExecutions.length * 2; // Assume 2 hours per failure
  }

  return {
    plannedPoints,
    completedPoints,
    velocity: completedPoints,
    completionRate:
      plannedPoints > 0 ? Math.round((completedPoints / plannedPoints) * 100) : 0,
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    addedMidSprint,
    removedMidSprint: 0, // Would need task history to calculate
    averageTaskAge: Math.round(averageTaskAge * 10) / 10,
    blockedTime,
  };
}

async function fetchVelocityTrend(
  projectId: string,
  currentSprintId: string
): Promise<VelocityTrend[]> {
  const completedStatuses: TaskStatus[] = ["MERGED", "CLOSED"];

  const previousSprints = await prisma.sprint.findMany({
    where: {
      projectId,
      status: "COMPLETED",
      id: { not: currentSprintId },
    },
    include: {
      tasks: {
        select: { status: true, storyPoints: true },
      },
    },
    orderBy: { endDate: "desc" },
    take: 5,
  });

  return previousSprints
    .map((sprint) => {
      const totalPoints = sprint.tasks.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0
      );
      const completedPoints = sprint.tasks
        .filter((t) => completedStatuses.includes(t.status))
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      return {
        sprintName: sprint.name,
        velocity: completedPoints,
        completionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      };
    })
    .reverse(); // Chronological order
}

interface BuildPromptParams {
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    startDate: Date;
    endDate: Date;
    status: string;
  };
  tasks: SprintTaskData[];
  metrics: SprintMetrics;
  velocityTrend: VelocityTrend[];
  comments: { taskTitle: string; content: string; isSystem: boolean }[];
  includePRAnalysis: boolean;
}

function buildRetrospectivePrompt(params: BuildPromptParams): string {
  const { sprint, tasks, metrics, velocityTrend, comments } = params;

  const completedStatuses: TaskStatus[] = ["MERGED", "CLOSED"];

  const completedTasks = tasks.filter((t) => completedStatuses.includes(t.status));
  const incompleteTasks = tasks.filter((t) => !completedStatuses.includes(t.status));
  const blockedTasks = tasks.filter((t) => t.status === "CHANGES_REQUESTED");

  // Analyze execution patterns
  const failedExecutions = tasks.flatMap((t) =>
    t.executions.filter((e) => e.status === "FAILED").map((e) => ({
      taskTitle: t.title,
      step: e.step,
      error: e.error,
    }))
  );

  // Team workload distribution
  const workloadByAssignee = new Map<string, { name: string; tasks: number; points: number }>();
  for (const task of tasks) {
    const assigneeId = task.assignee?.id || "unassigned";
    const assigneeName = task.assignee?.name || "Unassigned";
    const current = workloadByAssignee.get(assigneeId) || { name: assigneeName, tasks: 0, points: 0 };
    current.tasks += 1;
    current.points += task.storyPoints || 0;
    workloadByAssignee.set(assigneeId, current);
  }

  const prompt = `## Sprint Retrospective Analysis

### Sprint Overview
- **Name:** ${sprint.name}
- **Goal:** ${sprint.goal || "Not specified"}
- **Duration:** ${sprint.startDate.toISOString().split("T")[0]} to ${sprint.endDate.toISOString().split("T")[0]}
- **Status:** ${sprint.status}

### Sprint Metrics
- **Velocity:** ${metrics.velocity} points (${metrics.completionRate}% completion)
- **Tasks:** ${metrics.completedTasks}/${metrics.totalTasks} completed
- **Points:** ${metrics.completedPoints}/${metrics.plannedPoints} completed
- **Added Mid-Sprint:** ${metrics.addedMidSprint} tasks
- **Average Task Age:** ${metrics.averageTaskAge} days
- **Blocked Time:** ~${metrics.blockedTime} hours

### Velocity Trend (Last 5 Sprints)
${
  velocityTrend.length > 0
    ? velocityTrend
        .map((v) => `- ${v.sprintName}: ${v.velocity} points (${v.completionRate}% completion)`)
        .join("\n")
    : "No historical data available"
}

### Team Workload Distribution
${Array.from(workloadByAssignee.values())
  .map((w) => `- ${w.name}: ${w.tasks} tasks, ${w.points} points`)
  .join("\n")}

### Completed Tasks (${completedTasks.length})
${completedTasks
  .map((t) => `- [${t.taskType}] ${t.title} (${t.storyPoints || 0} pts) - ${t.assignee?.name || "Unassigned"}`)
  .join("\n")}

### Incomplete Tasks (${incompleteTasks.length})
${incompleteTasks
  .map((t) => `- [${t.status}] ${t.title} (${t.storyPoints || 0} pts) - ${t.assignee?.name || "Unassigned"}`)
  .join("\n")}

${
  blockedTasks.length > 0
    ? `### Blocked Tasks (${blockedTasks.length})
${blockedTasks.map((t) => `- ${t.title}: ${t.status}`).join("\n")}`
    : ""
}

${
  failedExecutions.length > 0
    ? `### Failed Executions (${failedExecutions.length})
${failedExecutions.map((e) => `- ${e.taskTitle}: ${e.step} - ${e.error?.substring(0, 100) || "Unknown error"}`).join("\n")}`
    : ""
}

${
  comments.length > 0
    ? `### Discussion Highlights (${comments.filter((c) => !c.isSystem).length} user comments)
${comments
  .filter((c) => !c.isSystem)
  .slice(0, 10)
  .map((c) => `- "${c.taskTitle}": ${c.content.substring(0, 100)}${c.content.length > 100 ? "..." : ""}`)
  .join("\n")}`
    : ""
}

### Instructions
Analyze this sprint data and generate a comprehensive retrospective. Include:

1. **Achievements**: What went well? (3-5 items)
2. **Challenges**: What didn't go well? (3-5 items)
3. **Recommendations**: How can the team improve? (3-5 items)
4. **Action Items**: Specific, actionable tasks for improvement (2-4 items)
5. **Overall Assessment**: Team sentiment and score

Respond with a JSON object in this exact format:
{
  "summary": "A 2-3 sentence summary of the sprint",
  "achievements": [
    {
      "title": "Achievement title",
      "description": "What was achieved and why it matters",
      "impact": "high",
      "relatedTaskIds": ["task_id"]
    }
  ],
  "challenges": [
    {
      "title": "Challenge title",
      "description": "What happened and its impact",
      "severity": "medium",
      "rootCause": "Underlying cause if identifiable",
      "relatedTaskIds": ["task_id"]
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Specific suggestion for improvement",
      "category": "process",
      "priority": "high",
      "actionable": true
    }
  ],
  "actionItems": [
    {
      "title": "Action item title",
      "description": "What needs to be done",
      "owner": "Team or role",
      "category": "process"
    }
  ],
  "teamSentiment": "positive",
  "overallScore": 7
}`;

  return prompt;
}

/**
 * Compare two sprints to identify improvements or regressions.
 */
export async function compareSprintRetros(
  sprintId1: string,
  sprintId2: string
): Promise<{
  sprint1Metrics: SprintMetrics;
  sprint2Metrics: SprintMetrics;
  improvements: string[];
  regressions: string[];
}> {
  const [sprint1, sprint2] = await Promise.all([
    prisma.sprint.findUnique({
      where: { id: sprintId1 },
      include: {
        tasks: {
          include: {
            executions: {
              select: {
                status: true,
                step: true,
                error: true,
                createdAt: true,
                completedAt: true,
              },
            },
            assignee: { select: { id: true, name: true } },
            labels: { select: { name: true } },
            _count: { select: { comments: true } },
          },
        },
      },
    }),
    prisma.sprint.findUnique({
      where: { id: sprintId2 },
      include: {
        tasks: {
          include: {
            executions: {
              select: {
                status: true,
                step: true,
                error: true,
                createdAt: true,
                completedAt: true,
              },
            },
            assignee: { select: { id: true, name: true } },
            labels: { select: { name: true } },
            _count: { select: { comments: true } },
          },
        },
      },
    }),
  ]);

  if (!sprint1 || !sprint2) {
    throw new Error("One or both sprints not found");
  }

  const metrics1 = calculateSprintMetrics(sprint1.tasks, sprint1.startDate, sprint1.endDate);
  const metrics2 = calculateSprintMetrics(sprint2.tasks, sprint2.startDate, sprint2.endDate);

  const improvements: string[] = [];
  const regressions: string[] = [];

  // Compare metrics
  if (metrics2.velocity > metrics1.velocity) {
    improvements.push(
      `Velocity improved from ${metrics1.velocity} to ${metrics2.velocity} points`
    );
  } else if (metrics2.velocity < metrics1.velocity) {
    regressions.push(
      `Velocity decreased from ${metrics1.velocity} to ${metrics2.velocity} points`
    );
  }

  if (metrics2.completionRate > metrics1.completionRate) {
    improvements.push(
      `Completion rate improved from ${metrics1.completionRate}% to ${metrics2.completionRate}%`
    );
  } else if (metrics2.completionRate < metrics1.completionRate) {
    regressions.push(
      `Completion rate decreased from ${metrics1.completionRate}% to ${metrics2.completionRate}%`
    );
  }

  if (metrics2.averageTaskAge < metrics1.averageTaskAge) {
    improvements.push(
      `Average task completion time improved from ${metrics1.averageTaskAge} to ${metrics2.averageTaskAge} days`
    );
  } else if (metrics2.averageTaskAge > metrics1.averageTaskAge) {
    regressions.push(
      `Average task completion time increased from ${metrics1.averageTaskAge} to ${metrics2.averageTaskAge} days`
    );
  }

  if (metrics2.blockedTime < metrics1.blockedTime) {
    improvements.push(
      `Blocked time reduced from ~${metrics1.blockedTime} to ~${metrics2.blockedTime} hours`
    );
  } else if (metrics2.blockedTime > metrics1.blockedTime) {
    regressions.push(
      `Blocked time increased from ~${metrics1.blockedTime} to ~${metrics2.blockedTime} hours`
    );
  }

  return {
    sprint1Metrics: metrics1,
    sprint2Metrics: metrics2,
    improvements,
    regressions,
  };
}
