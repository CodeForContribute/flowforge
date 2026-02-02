import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getProjectAIConfig } from "@/lib/ai-config";
import type { TaskType, TaskPriority, TaskStatus } from "@/types";

// Types for dependency detection
export interface Dependency {
  fromTaskId: string;
  fromTaskTitle: string;
  toTaskId: string;
  toTaskTitle: string;
  type: "blocks" | "requires" | "relates_to";
  confidence: number; // 0-1
  reasoning: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: Dependency[];
  criticalPath: string[]; // Task IDs in critical path order
  orphanTasks: string[]; // Tasks with no dependencies
}

export interface DependencyNode {
  taskId: string;
  title: string;
  status: TaskStatus;
  storyPoints: number | null;
  inDegree: number; // Number of tasks this depends on
  outDegree: number; // Number of tasks that depend on this
  isCritical: boolean;
}

export interface DependencyDetectionRequest {
  projectId: string;
  taskIds?: string[]; // If not provided, analyzes all backlog/sprint tasks
  sprintId?: string; // If provided, only analyze tasks in this sprint
}

export interface DependencyDetectionResult {
  dependencies: Dependency[];
  graph: DependencyGraph;
  warnings: DependencyWarning[];
  suggestions: string[];
}

export interface DependencyWarning {
  type: "circular" | "blocked_path" | "missing_dependency" | "overloaded_task";
  severity: "low" | "medium" | "high";
  message: string;
  affectedTaskIds: string[];
}

interface TaskForAnalysis {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  taskType: TaskType;
  priority: TaskPriority;
  storyPoints: number | null;
  parentTaskId: string | null;
  labels: { name: string }[];
}

/**
 * Detects implicit dependencies between tasks by analyzing their
 * titles, descriptions, and relationships.
 */
export async function detectDependencies(
  request: DependencyDetectionRequest
): Promise<DependencyDetectionResult> {
  const { projectId, taskIds, sprintId } = request;

  // Get AI configuration
  const aiConfig = await getProjectAIConfig(projectId);

  if (!aiConfig.aiEnabled) {
    throw new Error("AI features are not enabled for this project");
  }

  const apiKey = aiConfig.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No AI API key configured");
  }

  const openai = new OpenAI({ apiKey });

  // Fetch tasks to analyze
  const tasks = await fetchTasksForAnalysis(projectId, taskIds, sprintId);

  if (tasks.length === 0) {
    return {
      dependencies: [],
      graph: { nodes: [], edges: [], criticalPath: [], orphanTasks: [] },
      warnings: [],
      suggestions: ["No tasks found to analyze"],
    };
  }

  if (tasks.length === 1) {
    return {
      dependencies: [],
      graph: {
        nodes: [
          {
            taskId: tasks[0].id,
            title: tasks[0].title,
            status: tasks[0].status,
            storyPoints: tasks[0].storyPoints,
            inDegree: 0,
            outDegree: 0,
            isCritical: true,
          },
        ],
        edges: [],
        criticalPath: [tasks[0].id],
        orphanTasks: [],
      },
      warnings: [],
      suggestions: [],
    };
  }

  // Build prompt for dependency detection
  const prompt = buildDependencyDetectionPrompt(tasks);

  // Call AI for dependency analysis
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are an expert software architect analyzing task dependencies. You identify implicit dependencies between tasks by analyzing their descriptions, technical requirements, and logical relationships.

Types of dependencies:
- "blocks": Task A must be completed before Task B can start (hard dependency)
- "requires": Task A provides something Task B needs, but B could start with stubs (soft dependency)
- "relates_to": Tasks are related but can be done independently (informational)

Look for these patterns:
1. Shared components or modules mentioned
2. Sequential workflows (login before dashboard)
3. Data dependencies (API before frontend)
4. Infrastructure requirements (database before queries)
5. Feature flags or configuration dependencies

Be conservative - only identify clear dependencies. False negatives are better than false positives.

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
      dependencies: Dependency[];
      suggestions: string[];
    };

    // Build the dependency graph
    const graph = buildDependencyGraph(tasks, result.dependencies);

    // Detect warnings
    const warnings = detectWarnings(graph, result.dependencies);

    return {
      dependencies: result.dependencies,
      graph,
      warnings,
      suggestions: result.suggestions || [],
    };
  } catch (error) {
    console.error("Error parsing dependency detection response:", error);
    console.error("Raw response:", textContent);
    throw new Error("Failed to parse AI dependency detection response");
  }
}

async function fetchTasksForAnalysis(
  projectId: string,
  taskIds?: string[],
  sprintId?: string
): Promise<TaskForAnalysis[]> {
  const whereClause: {
    projectId: string;
    id?: { in: string[] };
    sprintId?: string | null;
    status?: { in: TaskStatus[] };
  } = { projectId };

  if (taskIds?.length) {
    whereClause.id = { in: taskIds };
  } else if (sprintId) {
    whereClause.sprintId = sprintId;
  } else {
    // Analyze non-completed tasks
    whereClause.status = {
      in: [
        "BACKLOG",
        "TODO",
        "IN_PROGRESS",
        "GENERATING",
        "PR_OPEN",
        "IN_REVIEW",
        "CHANGES_REQUESTED",
      ],
    };
  }

  return prisma.task.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      taskType: true,
      priority: true,
      storyPoints: true,
      parentTaskId: true,
      labels: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

function buildDependencyDetectionPrompt(tasks: TaskForAnalysis[]): string {
  const prompt = `## Dependency Detection Request

### Tasks to Analyze (${tasks.length} tasks)

${tasks
  .map(
    (t, i) => `### Task ${i + 1}: [${t.id}]
**Title:** ${t.title}
**Type:** ${t.taskType} | **Priority:** ${t.priority} | **Status:** ${t.status}
**Labels:** ${t.labels.map((l) => l.name).join(", ") || "None"}
${t.parentTaskId ? `**Parent Task ID:** ${t.parentTaskId}` : ""}

**Description:**
${t.description.substring(0, 500)}${t.description.length > 500 ? "..." : ""}
`
  )
  .join("\n---\n")}

### Instructions

Analyze these tasks and identify dependencies between them. For each dependency:
1. Identify which task must come first (fromTaskId)
2. Identify which task depends on it (toTaskId)
3. Classify the dependency type
4. Assign a confidence score (0-1)
5. Explain the reasoning

Consider:
- Technical dependencies (APIs, components, infrastructure)
- Workflow dependencies (features that build on each other)
- Data dependencies (one task creates data another uses)
- Explicit mentions ("after X is done", "requires Y")
- Parent-child relationships

Respond with a JSON object:
{
  "dependencies": [
    {
      "fromTaskId": "task_id_that_must_come_first",
      "fromTaskTitle": "task title",
      "toTaskId": "task_id_that_depends_on_first",
      "toTaskTitle": "task title",
      "type": "blocks",
      "confidence": 0.85,
      "reasoning": "Why this dependency exists"
    }
  ],
  "suggestions": [
    "Suggestions for the team about task organization or missing tasks"
  ]
}

If no clear dependencies exist, return an empty dependencies array.`;

  return prompt;
}

function buildDependencyGraph(
  tasks: TaskForAnalysis[],
  dependencies: Dependency[]
): DependencyGraph {
  // Create node map
  const nodeMap = new Map<string, DependencyNode>();
  for (const task of tasks) {
    nodeMap.set(task.id, {
      taskId: task.id,
      title: task.title,
      status: task.status,
      storyPoints: task.storyPoints,
      inDegree: 0,
      outDegree: 0,
      isCritical: false,
    });
  }

  // Calculate degrees
  const validDependencies = dependencies.filter(
    (d) => nodeMap.has(d.fromTaskId) && nodeMap.has(d.toTaskId)
  );

  for (const dep of validDependencies) {
    const fromNode = nodeMap.get(dep.fromTaskId);
    const toNode = nodeMap.get(dep.toTaskId);
    if (fromNode && toNode) {
      fromNode.outDegree++;
      toNode.inDegree++;
    }
  }

  // Find critical path using topological sort with longest path
  const criticalPath = findCriticalPath(
    Array.from(nodeMap.values()),
    validDependencies
  );

  // Mark critical path nodes
  const criticalSet = new Set(criticalPath);
  for (const entry of Array.from(nodeMap.entries())) {
    const [id, node] = entry;
    node.isCritical = criticalSet.has(id);
  }

  // Find orphan tasks (no dependencies in or out)
  const orphanTasks = Array.from(nodeMap.values())
    .filter((n) => n.inDegree === 0 && n.outDegree === 0)
    .map((n) => n.taskId);

  return {
    nodes: Array.from(nodeMap.values()),
    edges: validDependencies,
    criticalPath,
    orphanTasks,
  };
}

function findCriticalPath(
  nodes: DependencyNode[],
  edges: Dependency[]
): string[] {
  if (nodes.length === 0) return [];
  if (edges.length === 0) {
    // No dependencies, return highest priority task
    return nodes.length > 0 ? [nodes[0].taskId] : [];
  }

  // Build adjacency list
  const adj = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>();
  const nodeIds = new Set(nodes.map((n) => n.taskId));

  for (const node of nodes) {
    adj.set(node.taskId, []);
    reverseAdj.set(node.taskId, []);
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.fromTaskId) && nodeIds.has(edge.toTaskId)) {
      adj.get(edge.fromTaskId)?.push(edge.toTaskId);
      reverseAdj.get(edge.toTaskId)?.push(edge.fromTaskId);
    }
  }

  // Find nodes with no incoming edges (start nodes)
  const startNodes = nodes.filter((n) => {
    const incoming = reverseAdj.get(n.taskId) || [];
    return incoming.length === 0;
  });

  // Find longest path from each start node
  const nodePoints = new Map(nodes.map((n) => [n.taskId, n.storyPoints || 1]));

  let longestPath: string[] = [];
  let longestWeight = 0;

  for (const start of startNodes) {
    const { path, weight } = findLongestPathFrom(
      start.taskId,
      adj,
      nodePoints,
      new Set()
    );
    if (weight > longestWeight) {
      longestPath = path;
      longestWeight = weight;
    }
  }

  // If no path found (circular dependencies or isolated nodes), return first node
  if (longestPath.length === 0 && nodes.length > 0) {
    return [nodes[0].taskId];
  }

  return longestPath;
}

function findLongestPathFrom(
  nodeId: string,
  adj: Map<string, string[]>,
  weights: Map<string, number>,
  visited: Set<string>
): { path: string[]; weight: number } {
  if (visited.has(nodeId)) {
    return { path: [], weight: 0 }; // Cycle detected
  }

  visited.add(nodeId);
  const neighbors = adj.get(nodeId) || [];
  const nodeWeight = weights.get(nodeId) || 1;

  if (neighbors.length === 0) {
    visited.delete(nodeId);
    return { path: [nodeId], weight: nodeWeight };
  }

  let bestPath: string[] = [nodeId];
  let bestWeight = nodeWeight;

  for (const neighbor of neighbors) {
    const result = findLongestPathFrom(neighbor, adj, weights, visited);
    const totalWeight = nodeWeight + result.weight;
    if (totalWeight > bestWeight) {
      bestPath = [nodeId, ...result.path];
      bestWeight = totalWeight;
    }
  }

  visited.delete(nodeId);
  return { path: bestPath, weight: bestWeight };
}

function detectWarnings(
  graph: DependencyGraph,
  dependencies: Dependency[]
): DependencyWarning[] {
  const warnings: DependencyWarning[] = [];

  // Check for circular dependencies
  const circularDeps = detectCircularDependencies(dependencies);
  if (circularDeps.length > 0) {
    warnings.push({
      type: "circular",
      severity: "high",
      message: `Circular dependency detected: ${circularDeps.join(" -> ")}`,
      affectedTaskIds: circularDeps,
    });
  }

  // Check for tasks with too many dependencies
  const overloadedTasks = graph.nodes.filter((n) => n.inDegree > 3);
  for (const task of overloadedTasks) {
    warnings.push({
      type: "overloaded_task",
      severity: "medium",
      message: `Task "${task.title}" has ${task.inDegree} blockers - consider breaking it down or parallelizing work`,
      affectedTaskIds: [task.taskId],
    });
  }

  // Check for blocked paths (completed task depends on incomplete task)
  const completedStatuses: TaskStatus[] = ["MERGED", "CLOSED", "APPROVED"];
  const incompleteStatuses: TaskStatus[] = [
    "BACKLOG",
    "TODO",
    "IN_PROGRESS",
    "GENERATING",
  ];

  for (const dep of dependencies) {
    const fromNode = graph.nodes.find((n) => n.taskId === dep.fromTaskId);
    const toNode = graph.nodes.find((n) => n.taskId === dep.toTaskId);

    if (fromNode && toNode) {
      // If a task is started but its dependency is not done
      if (
        incompleteStatuses.includes(fromNode.status) &&
        !incompleteStatuses.includes(toNode.status) &&
        !completedStatuses.includes(toNode.status)
      ) {
        warnings.push({
          type: "blocked_path",
          severity: "medium",
          message: `Task "${toNode.title}" is ${toNode.status} but depends on "${fromNode.title}" which is not complete`,
          affectedTaskIds: [dep.fromTaskId, dep.toTaskId],
        });
      }
    }
  }

  return warnings;
}

function detectCircularDependencies(dependencies: Dependency[]): string[] {
  const adj = new Map<string, string[]>();

  // Build adjacency list
  for (const dep of dependencies) {
    if (!adj.has(dep.fromTaskId)) {
      adj.set(dep.fromTaskId, []);
    }
    adj.get(dep.fromTaskId)?.push(dep.toTaskId);
  }

  // DFS to detect cycles
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): string[] | null {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor);
        if (cycle) return cycle;
      } else if (recStack.has(neighbor)) {
        // Found cycle - return the cycle path
        const cycleStart = path.indexOf(neighbor);
        return [...path.slice(cycleStart), neighbor];
      }
    }

    path.pop();
    recStack.delete(node);
    return null;
  }

  for (const node of Array.from(adj.keys())) {
    if (!visited.has(node)) {
      const cycle = dfs(node);
      if (cycle) return cycle;
    }
  }

  return [];
}

/**
 * Get dependencies for a specific task.
 */
export async function getTaskDependencies(taskId: string): Promise<{
  blockedBy: Dependency[];
  blocks: Dependency[];
}> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const result = await detectDependencies({
    projectId: task.projectId,
  });

  return {
    blockedBy: result.dependencies.filter((d) => d.toTaskId === taskId),
    blocks: result.dependencies.filter((d) => d.fromTaskId === taskId),
  };
}
