import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getProjectAIConfig } from "@/lib/ai-config";
import { detectDependencies, type DependencyGraph } from "./dependency-detector";
import type { TaskStatus, TaskType, TaskPriority } from "@/types";

// Types for risk assessment
export interface RiskAssessmentRequest {
  sprintId: string;
  includeCodebaseAnalysis?: boolean;
}

export interface TaskRisk {
  taskId: string;
  title: string;
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: RiskFactor[];
  mitigations: string[];
}

export interface RiskFactor {
  category: "complexity" | "dependency" | "uncertainty" | "capacity" | "technical" | "deadline";
  factor: string;
  impact: number; // 0-100 contribution to risk
  description: string;
}

export interface SprintRiskAssessment {
  overallRiskScore: number; // 0-100
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  successProbability: number; // 0-100 percentage
  taskRisks: TaskRisk[];
  sprintRiskFactors: RiskFactor[];
  criticalTasks: string[]; // Task IDs that are high-risk
  recommendations: RiskRecommendation[];
  dependencyGraph: DependencyGraph;
  capacityAnalysis: CapacityAnalysis;
}

export interface RiskRecommendation {
  priority: "low" | "medium" | "high";
  recommendation: string;
  affectedTaskIds: string[];
  potentialImpact: string;
}

export interface CapacityAnalysis {
  totalCapacityHours: number;
  estimatedWorkHours: number;
  utilizationRate: number; // percentage
  overCommitted: boolean;
  bufferHours: number;
}

interface SprintTaskForRisk {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  taskType: TaskType;
  priority: TaskPriority;
  storyPoints: number | null;
  dueDate: Date | null;
  assignee: { id: string; name: string | null } | null;
  labels: { name: string }[];
  createdAt: Date;
  _count: { subtasks: number };
}

interface HistoricalTaskData {
  taskType: TaskType;
  storyPoints: number | null;
  completionTimeHours: number;
  wasSuccessful: boolean;
}

/**
 * Performs a comprehensive risk assessment for a sprint.
 */
export async function assessSprintRisk(
  request: RiskAssessmentRequest
): Promise<SprintRiskAssessment> {
  const { sprintId, includeCodebaseAnalysis = false } = request;

  // Fetch sprint with tasks
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      project: {
        select: { id: true, name: true, githubRepo: true },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          user: { select: { id: true, name: true } },
        },
      },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          labels: { select: { name: true } },
          _count: { select: { subtasks: true } },
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

  // Get dependency analysis
  const dependencyResult = await detectDependencies({
    projectId: sprint.project.id,
    sprintId,
  });

  // Calculate capacity analysis
  const teamSize =
    1 + (sprint.project.members?.length || 0); // Owner + members
  const sprintDurationDays = Math.ceil(
    (sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const capacityAnalysis = calculateCapacity(
    sprint.tasks,
    teamSize,
    sprintDurationDays
  );

  // Get historical data for calibration
  const historicalData = await fetchHistoricalData(sprint.project.id);

  // Assess individual task risks
  const taskRisks = assessTaskRisks(
    sprint.tasks,
    dependencyResult.graph,
    historicalData
  );

  // Build prompt for AI risk assessment
  const prompt = buildRiskAssessmentPrompt({
    sprint,
    tasks: sprint.tasks,
    taskRisks,
    dependencyGraph: dependencyResult.graph,
    capacityAnalysis,
    historicalData,
    includeCodebaseAnalysis,
  });

  // Call AI for risk analysis
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are an expert risk analyst for software sprints. You analyze task data, dependencies, capacity, and historical patterns to predict sprint success and identify risks.

Your analysis should:
1. Be data-driven and based on the provided metrics
2. Identify specific, actionable risks
3. Provide concrete mitigation strategies
4. Consider team capacity and dependencies
5. Flag critical issues that could derail the sprint

Risk scoring:
- 0-25: Low risk - Sprint likely to succeed
- 26-50: Medium risk - Some challenges expected
- 51-75: High risk - Significant challenges, intervention recommended
- 76-100: Critical risk - Sprint goals at serious risk

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
    const result = JSON.parse(jsonMatch[0]) as {
      overallRiskScore: number;
      sprintRiskFactors: RiskFactor[];
      recommendations: RiskRecommendation[];
      successProbability: number;
    };

    // Calculate overall risk level
    const overallRiskLevel = getRiskLevel(result.overallRiskScore);

    // Identify critical tasks
    const criticalTasks = taskRisks
      .filter((t) => t.riskLevel === "high" || t.riskLevel === "critical")
      .map((t) => t.taskId);

    return {
      overallRiskScore: Math.max(0, Math.min(100, result.overallRiskScore)),
      overallRiskLevel,
      successProbability: Math.max(0, Math.min(100, result.successProbability || 100 - result.overallRiskScore)),
      taskRisks,
      sprintRiskFactors: result.sprintRiskFactors || [],
      criticalTasks,
      recommendations: result.recommendations || [],
      dependencyGraph: dependencyResult.graph,
      capacityAnalysis,
    };
  } catch (error) {
    console.error("Error parsing risk assessment response:", error);
    console.error("Raw response:", textContent);
    throw new Error("Failed to parse AI risk assessment response");
  }
}

function calculateCapacity(
  tasks: SprintTaskForRisk[],
  teamSize: number,
  sprintDays: number
): CapacityAnalysis {
  // Assume 6 productive hours per day per person
  const hoursPerDayPerPerson = 6;
  const totalCapacityHours = teamSize * sprintDays * hoursPerDayPerPerson;

  // Estimate work hours based on story points (assume 4 hours per point)
  const hoursPerPoint = 4;
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 2), 0);
  const estimatedWorkHours = totalPoints * hoursPerPoint;

  const utilizationRate = Math.round((estimatedWorkHours / totalCapacityHours) * 100);
  const overCommitted = utilizationRate > 85;
  const bufferHours = Math.max(0, totalCapacityHours - estimatedWorkHours);

  return {
    totalCapacityHours,
    estimatedWorkHours,
    utilizationRate,
    overCommitted,
    bufferHours,
  };
}

async function fetchHistoricalData(
  projectId: string
): Promise<HistoricalTaskData[]> {
  const completedStatuses: TaskStatus[] = ["MERGED", "CLOSED"];

  const completedTasks = await prisma.task.findMany({
    where: {
      projectId,
      status: { in: completedStatuses },
    },
    select: {
      taskType: true,
      storyPoints: true,
      createdAt: true,
      updatedAt: true,
      status: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return completedTasks.map((task) => {
    const completionTimeHours =
      (task.updatedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);

    return {
      taskType: task.taskType,
      storyPoints: task.storyPoints,
      completionTimeHours,
      wasSuccessful: task.status === "MERGED",
    };
  });
}

function assessTaskRisks(
  tasks: SprintTaskForRisk[],
  dependencyGraph: DependencyGraph,
  historicalData: HistoricalTaskData[]
): TaskRisk[] {
  const now = new Date();

  return tasks.map((task) => {
    const riskFactors: RiskFactor[] = [];

    // Find task in dependency graph
    const graphNode = dependencyGraph.nodes.find((n) => n.taskId === task.id);
    const blockedByCount = graphNode?.inDegree || 0;

    // 1. Dependency risk
    if (blockedByCount > 0) {
      const impact = Math.min(40, blockedByCount * 15);
      riskFactors.push({
        category: "dependency",
        factor: `Blocked by ${blockedByCount} task(s)`,
        impact,
        description: `This task depends on ${blockedByCount} other tasks to complete first`,
      });
    }

    // 2. Complexity risk (based on story points)
    const points = task.storyPoints || 0;
    if (points >= 13) {
      riskFactors.push({
        category: "complexity",
        factor: "Very high complexity",
        impact: 35,
        description: `${points} story points - consider breaking down into smaller tasks`,
      });
    } else if (points >= 8) {
      riskFactors.push({
        category: "complexity",
        factor: "High complexity",
        impact: 20,
        description: `${points} story points indicates significant complexity`,
      });
    }

    // 3. Uncertainty risk (no estimate or vague description)
    if (!task.storyPoints) {
      riskFactors.push({
        category: "uncertainty",
        factor: "No estimate",
        impact: 25,
        description: "Task has no story point estimate - unknown scope",
      });
    }

    if (task.description.length < 100) {
      riskFactors.push({
        category: "uncertainty",
        factor: "Vague description",
        impact: 15,
        description: "Short description may indicate unclear requirements",
      });
    }

    // 4. Deadline risk
    if (task.dueDate) {
      const daysUntilDue = Math.ceil(
        (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDue < 0) {
        riskFactors.push({
          category: "deadline",
          factor: "Past due",
          impact: 40,
          description: `Task is ${Math.abs(daysUntilDue)} days overdue`,
        });
      } else if (daysUntilDue <= 2) {
        riskFactors.push({
          category: "deadline",
          factor: "Imminent deadline",
          impact: 25,
          description: `Due in ${daysUntilDue} day(s)`,
        });
      }
    }

    // 5. Task type risk (bugs often have hidden complexity)
    if (task.taskType === "BUG") {
      riskFactors.push({
        category: "technical",
        factor: "Bug investigation",
        impact: 15,
        description: "Bugs may have hidden complexity or dependencies",
      });
    }

    // 6. Unassigned risk
    if (!task.assignee) {
      riskFactors.push({
        category: "capacity",
        factor: "Unassigned",
        impact: 20,
        description: "Task has no assignee - ownership unclear",
      });
    }

    // 7. Task age risk (been in sprint too long)
    const taskAgeDays = Math.ceil(
      (now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (taskAgeDays > 14 && task.status !== "MERGED" && task.status !== "CLOSED") {
      riskFactors.push({
        category: "technical",
        factor: "Stale task",
        impact: 15,
        description: `Task is ${taskAgeDays} days old - may be stuck or deprioritized`,
      });
    }

    // 8. Historical comparison risk
    const similarTasks = historicalData.filter(
      (h) => h.taskType === task.taskType && h.storyPoints === task.storyPoints
    );
    if (similarTasks.length > 0) {
      const failureRate =
        similarTasks.filter((t) => !t.wasSuccessful).length / similarTasks.length;

      if (failureRate > 0.2) {
        riskFactors.push({
          category: "technical",
          factor: "Historical failure pattern",
          impact: Math.round(failureRate * 30),
          description: `Similar tasks have ${Math.round(failureRate * 100)}% failure rate`,
        });
      }
    }

    // Calculate total risk score
    const riskScore = Math.min(
      100,
      riskFactors.reduce((sum, f) => sum + f.impact, 0)
    );

    // Generate mitigations
    const mitigations = generateMitigations(riskFactors);

    return {
      taskId: task.id,
      title: task.title,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      riskFactors,
      mitigations,
    };
  });
}

function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

function generateMitigations(riskFactors: RiskFactor[]): string[] {
  const mitigations: string[] = [];

  for (const factor of riskFactors) {
    switch (factor.category) {
      case "dependency":
        mitigations.push(
          "Prioritize completing blocking tasks first",
          "Consider if dependencies can be parallelized with stubs"
        );
        break;
      case "complexity":
        mitigations.push(
          "Consider breaking into smaller tasks",
          "Pair programming or mob programming for complex sections"
        );
        break;
      case "uncertainty":
        mitigations.push(
          "Add story point estimate before sprint start",
          "Clarify requirements with stakeholders"
        );
        break;
      case "deadline":
        mitigations.push(
          "Prioritize this task immediately",
          "Consider scope reduction if deadline is at risk"
        );
        break;
      case "capacity":
        mitigations.push(
          "Assign an owner to this task",
          "Review team capacity and redistribute if needed"
        );
        break;
      case "technical":
        mitigations.push(
          "Technical spike to reduce unknowns",
          "Code review early to catch issues"
        );
        break;
    }
  }

  // Remove duplicates
  return Array.from(new Set(mitigations));
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
  tasks: SprintTaskForRisk[];
  taskRisks: TaskRisk[];
  dependencyGraph: DependencyGraph;
  capacityAnalysis: CapacityAnalysis;
  historicalData: HistoricalTaskData[];
  includeCodebaseAnalysis: boolean;
}

function buildRiskAssessmentPrompt(params: BuildPromptParams): string {
  const {
    sprint,
    tasks,
    taskRisks,
    dependencyGraph,
    capacityAnalysis,
    historicalData,
  } = params;

  const completedStatuses: TaskStatus[] = ["MERGED", "CLOSED", "APPROVED"];
  const inProgressStatuses: TaskStatus[] = ["IN_PROGRESS", "GENERATING", "PR_OPEN", "IN_REVIEW"];

  const completedTasks = tasks.filter((t) => completedStatuses.includes(t.status));
  const inProgressTasks = tasks.filter((t) => inProgressStatuses.includes(t.status));
  const notStartedTasks = tasks.filter(
    (t) => !completedStatuses.includes(t.status) && !inProgressStatuses.includes(t.status)
  );

  const highRiskTasks = taskRisks.filter(
    (t) => t.riskLevel === "high" || t.riskLevel === "critical"
  );

  // Calculate days remaining
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((sprint.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Historical success rate
  const successRate =
    historicalData.length > 0
      ? Math.round(
          (historicalData.filter((h) => h.wasSuccessful).length /
            historicalData.length) *
            100
        )
      : null;

  const prompt = `## Sprint Risk Assessment

### Sprint Overview
- **Name:** ${sprint.name}
- **Goal:** ${sprint.goal || "Not specified"}
- **Status:** ${sprint.status}
- **Days Remaining:** ${daysRemaining}

### Current Progress
- Completed: ${completedTasks.length} tasks
- In Progress: ${inProgressTasks.length} tasks
- Not Started: ${notStartedTasks.length} tasks
- Total: ${tasks.length} tasks

### Capacity Analysis
- Team Capacity: ${capacityAnalysis.totalCapacityHours} hours
- Estimated Work: ${capacityAnalysis.estimatedWorkHours} hours
- Utilization: ${capacityAnalysis.utilizationRate}%
- Buffer: ${capacityAnalysis.bufferHours} hours
- Over-committed: ${capacityAnalysis.overCommitted ? "YES" : "No"}

### Dependency Analysis
- Critical Path Length: ${dependencyGraph.criticalPath.length} tasks
- Orphan Tasks (no dependencies): ${dependencyGraph.orphanTasks.length}
- Total Dependencies: ${dependencyGraph.edges.length}

### High-Risk Tasks (${highRiskTasks.length})
${highRiskTasks
  .map(
    (t) => `- "${t.title}" (Risk: ${t.riskScore}/100)
  Factors: ${t.riskFactors.map((f) => f.factor).join(", ")}`
  )
  .join("\n")}

### Task Details
${tasks
  .map(
    (t) => `- [${t.status}] ${t.title}
  Type: ${t.taskType}, Points: ${t.storyPoints || "?"}
  Assignee: ${t.assignee?.name || "Unassigned"}
  ${t.dueDate ? `Due: ${t.dueDate.toISOString().split("T")[0]}` : ""}`
  )
  .join("\n")}

${
  successRate !== null
    ? `### Historical Context
- Overall Task Success Rate: ${successRate}%
- Sample Size: ${historicalData.length} tasks`
    : ""
}

### Instructions

Analyze this sprint and provide a comprehensive risk assessment:

1. Calculate an overall risk score (0-100) considering:
   - Capacity vs. workload
   - Dependency chains
   - Individual task risks
   - Time remaining vs. work remaining
   - Historical patterns

2. Identify sprint-level risk factors

3. Provide specific, actionable recommendations

Respond with a JSON object:
{
  "overallRiskScore": 45,
  "successProbability": 65,
  "sprintRiskFactors": [
    {
      "category": "capacity",
      "factor": "Over-committed",
      "impact": 25,
      "description": "Team is committed to 120% of available capacity"
    }
  ],
  "recommendations": [
    {
      "priority": "high",
      "recommendation": "Remove 2-3 lower priority tasks from sprint scope",
      "affectedTaskIds": ["task_id_1", "task_id_2"],
      "potentialImpact": "Reduces risk score by 15 points"
    }
  ]
}`;

  return prompt;
}

/**
 * Quick risk check for a single task.
 */
export async function assessTaskRisk(taskId: string): Promise<TaskRisk> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true } },
      labels: { select: { name: true } },
      sprint: true,
      _count: { select: { subtasks: true } },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  // Get dependency info for this task
  const dependencyResult = await detectDependencies({
    projectId: task.projectId,
  });

  const historicalData = await fetchHistoricalData(task.projectId);

  const taskRisks = assessTaskRisks(
    [
      {
        ...task,
        _count: task._count,
      },
    ],
    dependencyResult.graph,
    historicalData
  );

  return taskRisks[0];
}
