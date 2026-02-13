import { prisma } from "@/lib/prisma";

/**
 * Check if a string looks like a project key (2-10 uppercase letters)
 */
export function isProjectKey(identifier: string): boolean {
  return /^[A-Z]{2,10}$/.test(identifier);
}

/**
 * Find a project by either its CUID or projectKey, with user access check
 */
export async function findProjectByIdentifier(
  identifier: string,
  userId: string,
  options?: {
    includeMembers?: boolean;
    includeLabels?: boolean;
    includeSprints?: boolean;
    includeAiSettings?: boolean;
  }
) {
  const include = {
    members: options?.includeMembers
      ? { include: { user: { select: { id: true, name: true, email: true, image: true } } } }
      : false,
    labels: options?.includeLabels ?? false,
    sprints: options?.includeSprints
      ? { orderBy: { startDate: "desc" as const } }
      : false,
    aiSettings: options?.includeAiSettings ?? false,
  };

  // Build where clause based on identifier type
  const whereClause = isProjectKey(identifier)
    ? { projectKey: identifier }
    : { id: identifier };

  return prisma.project.findFirst({
    where: {
      ...whereClause,
      OR: [
        { userId },
        { members: { some: { userId } } },
      ],
    },
    include,
  });
}

/**
 * Parse a task key like "FF-123" into its components
 */
export function parseTaskKey(key: string): { projectKey: string; taskNumber: number } | null {
  const match = key.match(/^([A-Z]+)-(\d+)$/);
  if (!match) {
    return null;
  }
  return {
    projectKey: match[1],
    taskNumber: parseInt(match[2], 10),
  };
}

/**
 * Check if a string looks like a task key (e.g., "FF-123")
 */
export function isTaskKey(identifier: string): boolean {
  return /^[A-Z]+-\d+$/.test(identifier);
}

/**
 * Check if a string looks like a CUID (e.g., "clxyz123...")
 */
export function isCuid(identifier: string): boolean {
  // CUIDs are typically 25 characters starting with 'c'
  return /^c[a-z0-9]{20,}$/i.test(identifier);
}

/**
 * Find a task by either its CUID or taskKey, with user access check
 */
export async function findTaskByIdentifier(
  identifier: string,
  userId: string,
  options?: {
    includeProject?: boolean;
    includeComments?: boolean;
    includeExecutions?: boolean;
    includeAssignee?: boolean;
    includeSprint?: boolean;
    includeParentTask?: boolean;
    includeSubtasks?: boolean;
    includeLabels?: boolean;
  }
) {
  const include = {
    project: options?.includeProject ?? false,
    comments: options?.includeComments
      ? { include: { user: true }, orderBy: { createdAt: "asc" as const } }
      : false,
    executions: options?.includeExecutions
      ? { orderBy: { createdAt: "desc" as const } }
      : false,
    assignee: options?.includeAssignee
      ? { select: { id: true, name: true, email: true, image: true } }
      : false,
    sprint: options?.includeSprint
      ? { select: { id: true, name: true, status: true, startDate: true, endDate: true } }
      : false,
    parentTask: options?.includeParentTask
      ? { select: { id: true, title: true, taskType: true, status: true, taskKey: true } }
      : false,
    subtasks: options?.includeSubtasks
      ? {
          select: {
            id: true,
            title: true,
            taskType: true,
            status: true,
            priority: true,
            storyPoints: true,
            taskKey: true,
            assignee: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "asc" as const },
        }
      : false,
    labels: options?.includeLabels ?? false,
  };

  // Build the where clause based on identifier type
  if (isTaskKey(identifier)) {
    const parsed = parseTaskKey(identifier);
    if (!parsed) return null;

    return prisma.task.findFirst({
      where: {
        taskKey: identifier,
        project: {
          OR: [
            { userId },
            { members: { some: { userId } } },
          ],
        },
      },
      include,
    });
  } else {
    // Assume it's a CUID
    return prisma.task.findFirst({
      where: {
        id: identifier,
        project: {
          OR: [
            { userId },
            { members: { some: { userId } } },
          ],
        },
      },
      include,
    });
  }
}

/**
 * Generate the next task key for a project (atomically increments counter)
 */
export async function generateNextTaskKey(projectId: string): Promise<{ taskNumber: number; taskKey: string }> {
  // Atomically increment the task counter and get the project key
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { taskCounter: { increment: 1 } },
    select: { projectKey: true, taskCounter: true },
  });

  const taskNumber = project.taskCounter;
  const taskKey = `${project.projectKey}-${taskNumber}`;

  return { taskNumber, taskKey };
}

/**
 * Get all tasks matching a search that could be a task key pattern
 * E.g., "FF-" returns all tasks starting with FF-
 */
export async function searchTasksByKeyPattern(
  pattern: string,
  projectId: string,
  userId: string,
  limit: number = 10
) {
  // Verify user has access to project
  const hasAccess = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  if (!hasAccess) return [];

  return prisma.task.findMany({
    where: {
      projectId,
      taskKey: {
        startsWith: pattern.toUpperCase(),
      },
    },
    select: {
      id: true,
      taskKey: true,
      title: true,
      status: true,
    },
    take: limit,
    orderBy: { taskNumber: "desc" },
  });
}
