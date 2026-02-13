import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getProjectAIConfig } from "@/lib/ai-config";
import type { TaskStatus, TaskPriority, TaskType } from "@/types";

// Types for sprint planning
export interface TeamMemberCapacity {
  userId: string;
  name: string;
  availableHours: number;
  skills?: string[];
}

export interface SprintPlanRequest {
  sprintId: string;
  backlogTaskIds?: string[]; // If not provided, uses all backlog tasks
  teamCapacity: TeamMemberCapacity[];
  sprintGoal?: string;
  maxStoryPoints?: number;
}

export interface SuggestedTask {
  taskId: string;
  title: string;
  storyPoints: number | null;
  priority: TaskPriority;
  taskType: TaskType;
  suggestedAssigneeId: string | null;
  suggestedAssigneeName: string | null;
  reasoning: string;
  order: number;
}

export interface RiskFactor {
  type: "dependency" | "complexity" | "capacity" | "unknown" | "deadline";
  description: string;
  severity: "low" | "medium" | "high";
  affectedTaskIds?: string[];
}

export interface SprintPlanSuggestion {
  suggestedTasks: SuggestedTask[];
  totalStoryPoints: number;
  capacityUtilization: number; // 0-100 percentage
  riskScore: number; // 0-100, higher = more risky
  riskFactors: RiskFactor[];
  summary: string;
  recommendations: string[];
}

interface BacklogTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints: number | null;
  dueDate: Date | null;
  assignee: { id: string; name: string | null } | null;
  parentTask: { id: string; title: string } | null;
  labels: { name: string }[];
}

interface CompletedSprintData {
  name: string;
  startDate: Date;
  endDate: Date;
  totalPoints: number;
  completedPoints: number;
  totalTasks: number;
  completedTasks: number;
}

/**
 * Generates an AI-powered sprint plan based on backlog analysis,
 * team capacity, and historical velocity data.
 */
export async function generateSprintPlan(
  projectId: string,
  request: SprintPlanRequest
): Promise<SprintPlanSuggestion> {
  // Get AI configuration for the project
  const aiConfig = await getProjectAIConfig(projectId);

  if (!aiConfig.aiEnabled) {
    throw new Error("AI features are not enabled for this project");
  }

  const apiKey = aiConfig.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No AI API key configured");
  }

  const openai = new OpenAI({ apiKey });

  // Fetch sprint details
  const sprint = await prisma.sprint.findUnique({
    where: { id: request.sprintId },
    include: {
      project: true,
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!sprint) {
    throw new Error("Sprint not found");
  }

  // Calculate sprint duration in days
  const sprintDurationDays = Math.ceil(
    (sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Fetch backlog tasks
  const backlogTasks = await fetchBacklogTasks(projectId, request.backlogTaskIds);

  // Fetch historical velocity data
  const velocityData = await fetchHistoricalVelocity(projectId);

  // Fetch team members if capacity not fully specified
  const teamMembers = await fetchTeamMembers(projectId, request.teamCapacity);

  // Build the prompt for AI
  const prompt = buildSprintPlanningPrompt({
    sprint,
    sprintDurationDays,
    backlogTasks,
    velocityData,
    teamMembers,
    sprintGoal: request.sprintGoal || sprint.goal || undefined,
    maxStoryPoints: request.maxStoryPoints,
    existingSprintTasks: sprint.tasks,
  });

  // Call AI to generate the plan
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are an expert Agile coach and sprint planning assistant. You analyze backlogs, team capacity, and historical data to suggest optimal sprint compositions.

Your goals:
1. Maximize value delivery while respecting capacity constraints
2. Balance workload across team members based on their skills and availability
3. Identify and flag risks (dependencies, complexity, unknowns)
4. Consider task priorities and due dates
5. Suggest a realistic plan that the team can commit to

Always respond with a valid JSON object in the specified format. Do not include any text before or after the JSON.`,
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
    const result = JSON.parse(jsonMatch[0]) as SprintPlanSuggestion;

    // Validate and enrich the response
    return validateAndEnrichPlan(result, backlogTasks, teamMembers);
  } catch (error) {
    console.error("Error parsing sprint plan response:", error);
    console.error("Raw response:", textContent);
    throw new Error("Failed to parse AI sprint plan response");
  }
}

async function fetchBacklogTasks(
  projectId: string,
  taskIds?: string[]
): Promise<BacklogTask[]> {
  const whereClause = taskIds?.length
    ? { id: { in: taskIds }, projectId }
    : { projectId, status: "BACKLOG" as TaskStatus, sprintId: null };

  return prisma.task.findMany({
    where: whereClause,
    include: {
      assignee: { select: { id: true, name: true } },
      parentTask: { select: { id: true, title: true } },
      labels: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

async function fetchHistoricalVelocity(
  projectId: string
): Promise<CompletedSprintData[]> {
  const completedSprints = await prisma.sprint.findMany({
    where: {
      projectId,
      status: "COMPLETED",
    },
    include: {
      tasks: {
        select: {
          status: true,
          storyPoints: true,
        },
      },
    },
    orderBy: { endDate: "desc" },
    take: 5, // Last 5 sprints for velocity calculation
  });

  return completedSprints.map((sprint) => {
    const completedStatuses: TaskStatus[] = ["MERGED", "CLOSED"];
    const completedTasks = sprint.tasks.filter((t) =>
      completedStatuses.includes(t.status)
    );

    return {
      name: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      totalPoints: sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
      completedPoints: completedTasks.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0
      ),
      totalTasks: sprint.tasks.length,
      completedTasks: completedTasks.length,
    };
  });
}

async function fetchTeamMembers(
  projectId: string,
  providedCapacity: TeamMemberCapacity[]
): Promise<TeamMemberCapacity[]> {
  // If capacity is fully provided, use it
  if (providedCapacity.length > 0) {
    return providedCapacity;
  }

  // Fetch project members
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      user: { select: { id: true, name: true } },
      members: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!project) {
    return [];
  }

  const ownerCapacity = project.user ? [{
    userId: project.user.id,
    name: project.user.name || "Project Owner",
    availableHours: 40, // Default to full-time
  }] : [];

  const members: TeamMemberCapacity[] = [
    ...ownerCapacity,
    ...project.members.map((m) => ({
      userId: m.user.id,
      name: m.user.name || "Team Member",
      availableHours: 40,
    })),
  ];

  return members;
}

interface BuildPromptParams {
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    startDate: Date;
    endDate: Date;
  };
  sprintDurationDays: number;
  backlogTasks: BacklogTask[];
  velocityData: CompletedSprintData[];
  teamMembers: TeamMemberCapacity[];
  sprintGoal?: string;
  maxStoryPoints?: number;
  existingSprintTasks: { id: string; title: string; storyPoints: number | null }[];
}

function buildSprintPlanningPrompt(params: BuildPromptParams): string {
  const {
    sprint,
    sprintDurationDays,
    backlogTasks,
    velocityData,
    teamMembers,
    sprintGoal,
    maxStoryPoints,
    existingSprintTasks,
  } = params;

  // Calculate average velocity
  const avgVelocity =
    velocityData.length > 0
      ? Math.round(
          velocityData.reduce((sum, s) => sum + s.completedPoints, 0) /
            velocityData.length
        )
      : null;

  // Calculate total available hours
  const totalAvailableHours = teamMembers.reduce(
    (sum, m) => sum + m.availableHours,
    0
  );

  // Existing sprint points
  const existingPoints = existingSprintTasks.reduce(
    (sum, t) => sum + (t.storyPoints || 0),
    0
  );

  const prompt = `## Sprint Planning Request

### Sprint Details
- **Name:** ${sprint.name}
- **Goal:** ${sprintGoal || "Not specified"}
- **Duration:** ${sprintDurationDays} days (${sprint.startDate.toISOString().split("T")[0]} to ${sprint.endDate.toISOString().split("T")[0]})
- **Existing tasks in sprint:** ${existingSprintTasks.length} tasks (${existingPoints} points)
${maxStoryPoints ? `- **Maximum story points:** ${maxStoryPoints}` : ""}

### Team Capacity
Total available hours: ${totalAvailableHours}
${teamMembers.map((m) => `- ${m.name} (${m.userId}): ${m.availableHours} hours${m.skills?.length ? `, skills: ${m.skills.join(", ")}` : ""}`).join("\n")}

### Historical Velocity
${
  velocityData.length > 0
    ? `Average velocity: ${avgVelocity} points/sprint
Recent sprints:
${velocityData.map((s) => `- ${s.name}: ${s.completedPoints}/${s.totalPoints} points (${s.completedTasks}/${s.totalTasks} tasks)`).join("\n")}`
    : "No historical data available (first sprint)"
}

### Backlog Tasks (${backlogTasks.length} items)
${backlogTasks
  .map(
    (t, i) => `${i + 1}. [${t.id}] ${t.title}
   - Type: ${t.taskType}, Priority: ${t.priority}
   - Story Points: ${t.storyPoints ?? "Not estimated"}
   - Description: ${t.description.substring(0, 200)}${t.description.length > 200 ? "..." : ""}
   - Labels: ${t.labels.map((l) => l.name).join(", ") || "None"}
   ${t.parentTask ? `- Parent: ${t.parentTask.title}` : ""}
   ${t.dueDate ? `- Due: ${t.dueDate.toISOString().split("T")[0]}` : ""}`
  )
  .join("\n\n")}

### Instructions
Analyze the backlog and suggest which tasks should be included in this sprint. Consider:
1. Sprint goal alignment
2. Team capacity and skills
3. Task priorities and due dates
4. Dependencies between tasks (infer from titles/descriptions)
5. Historical velocity as a guide
6. Balance workload across team members

Respond with a JSON object in this exact format:
{
  "suggestedTasks": [
    {
      "taskId": "task_id_here",
      "title": "task title",
      "storyPoints": 3,
      "priority": "HIGH",
      "taskType": "TASK",
      "suggestedAssigneeId": "user_id or null",
      "suggestedAssigneeName": "user name or null",
      "reasoning": "Why this task is included and assigned to this person",
      "order": 1
    }
  ],
  "totalStoryPoints": 21,
  "capacityUtilization": 85,
  "riskScore": 35,
  "riskFactors": [
    {
      "type": "dependency",
      "description": "Task X depends on Task Y",
      "severity": "medium",
      "affectedTaskIds": ["task_id_1", "task_id_2"]
    }
  ],
  "summary": "A brief summary of the suggested sprint plan",
  "recommendations": [
    "Specific recommendations for the team"
  ]
}`;

  return prompt;
}

function validateAndEnrichPlan(
  plan: SprintPlanSuggestion,
  backlogTasks: BacklogTask[],
  teamMembers: TeamMemberCapacity[]
): SprintPlanSuggestion {
  // Create lookup maps
  const taskMap = new Map(backlogTasks.map((t) => [t.id, t]));
  const memberMap = new Map(teamMembers.map((m) => [m.userId, m]));

  // Validate and enrich suggested tasks
  const validatedTasks = plan.suggestedTasks
    .filter((st) => taskMap.has(st.taskId))
    .map((st, index) => {
      const task = taskMap.get(st.taskId)!;
      const assignee = st.suggestedAssigneeId
        ? memberMap.get(st.suggestedAssigneeId)
        : null;

      return {
        ...st,
        title: task.title, // Use actual title
        storyPoints: task.storyPoints, // Use actual story points
        priority: task.priority, // Use actual priority
        taskType: task.taskType, // Use actual type
        suggestedAssigneeName: assignee?.name || st.suggestedAssigneeName,
        order: st.order || index + 1,
      };
    });

  // Recalculate totals based on validated tasks
  const totalStoryPoints = validatedTasks.reduce(
    (sum, t) => sum + (t.storyPoints || 0),
    0
  );

  // Ensure risk score is within bounds
  const riskScore = Math.max(0, Math.min(100, plan.riskScore || 0));

  // Ensure capacity utilization is within bounds
  const capacityUtilization = Math.max(
    0,
    Math.min(100, plan.capacityUtilization || 0)
  );

  return {
    suggestedTasks: validatedTasks,
    totalStoryPoints,
    capacityUtilization,
    riskScore,
    riskFactors: plan.riskFactors || [],
    summary: plan.summary || "Sprint plan generated",
    recommendations: plan.recommendations || [],
  };
}

/**
 * Applies a sprint plan by adding tasks to the sprint and optionally assigning them.
 */
export async function applySprintPlan(
  sprintId: string,
  taskAssignments: { taskId: string; assigneeId?: string | null }[]
): Promise<{ updatedCount: number }> {
  const updates = await Promise.all(
    taskAssignments.map(({ taskId, assigneeId }) =>
      prisma.task.update({
        where: { id: taskId },
        data: {
          sprintId,
          assigneeId: assigneeId || undefined,
          status: "TODO", // Move from BACKLOG to TODO when added to sprint
        },
      })
    )
  );

  return { updatedCount: updates.length };
}
