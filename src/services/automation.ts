import { prisma } from "@/lib/prisma";
import {
  AutomationRule,
  AutomationTrigger,
  AutomationCondition,
  AutomationActionConfig,
  TaskStatus,
  TaskPriority,
  TaskType,
} from "@/types";

interface TaskContext {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  assigneeId: string | null;
  labelIds: string[];
  storyPoints: number | null;
  sprintId: string | null;
  projectId: string;
}

interface TriggerContext {
  trigger: AutomationTrigger;
  previousStatus?: TaskStatus;
  newStatus?: TaskStatus;
  assigneeId?: string;
  labelId?: string;
}

/**
 * Execute automation rules for a task based on a trigger event
 */
export async function executeAutomations(
  task: TaskContext,
  triggerContext: TriggerContext
): Promise<void> {
  try {
    // Get project automation rules
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      select: { automationRules: true },
    });

    if (!project?.automationRules) return;

    const rules = project.automationRules as unknown as AutomationRule[];
    const enabledRules = rules.filter((r) => r.enabled);

    for (const rule of enabledRules) {
      // Check if trigger matches
      if (!matchesTrigger(rule, triggerContext)) continue;

      // Check if all conditions are met
      if (!matchesConditions(rule.conditions, task)) continue;

      // Execute actions
      await executeActions(rule.actions, task);
    }
  } catch (error) {
    console.error("Error executing automations:", error);
    // Don't throw - automation failures shouldn't break the main operation
  }
}

function matchesTrigger(rule: AutomationRule, context: TriggerContext): boolean {
  if (rule.trigger !== context.trigger) return false;

  // For status change trigger, optionally check specific status
  if (rule.trigger === "on_status_change" && rule.triggerValue) {
    return context.newStatus === rule.triggerValue;
  }

  return true;
}

function matchesConditions(
  conditions: AutomationCondition[],
  task: TaskContext
): boolean {
  // If no conditions, always match
  if (conditions.length === 0) return true;

  // All conditions must match (AND logic)
  return conditions.every((condition) => matchCondition(condition, task));
}

function matchCondition(condition: AutomationCondition, task: TaskContext): boolean {
  const fieldValue = getFieldValue(condition.field, task);

  switch (condition.operator) {
    case "equals":
      if (Array.isArray(fieldValue)) {
        return Array.isArray(condition.value)
          ? condition.value.some((v) => fieldValue.includes(v))
          : fieldValue.includes(condition.value as string);
      }
      return fieldValue === condition.value;

    case "not_equals":
      if (Array.isArray(fieldValue)) {
        return Array.isArray(condition.value)
          ? !condition.value.some((v) => fieldValue.includes(v))
          : !fieldValue.includes(condition.value as string);
      }
      return fieldValue !== condition.value;

    case "contains":
      if (Array.isArray(fieldValue)) {
        return Array.isArray(condition.value)
          ? condition.value.some((v) => fieldValue.includes(v))
          : fieldValue.includes(condition.value as string);
      }
      return false;

    case "not_contains":
      if (Array.isArray(fieldValue)) {
        return Array.isArray(condition.value)
          ? !condition.value.some((v) => fieldValue.includes(v))
          : !fieldValue.includes(condition.value as string);
      }
      return true;

    case "greater_than":
      return typeof fieldValue === "number" && typeof condition.value === "number"
        ? fieldValue > condition.value
        : false;

    case "less_than":
      return typeof fieldValue === "number" && typeof condition.value === "number"
        ? fieldValue < condition.value
        : false;

    case "is_empty":
      return fieldValue === null || fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0);

    case "is_not_empty":
      return fieldValue !== null && fieldValue !== "" &&
        (!Array.isArray(fieldValue) || fieldValue.length > 0);

    default:
      return false;
  }
}

function getFieldValue(
  field: AutomationCondition["field"],
  task: TaskContext
): string | string[] | number | null {
  switch (field) {
    case "status":
      return task.status;
    case "priority":
      return task.priority;
    case "taskType":
      return task.taskType;
    case "assigneeId":
      return task.assigneeId;
    case "labelIds":
      return task.labelIds;
    case "storyPoints":
      return task.storyPoints;
    default:
      return null;
  }
}

async function executeActions(
  actions: AutomationActionConfig[],
  task: TaskContext
): Promise<void> {
  for (const action of actions) {
    try {
      await executeAction(action, task);
    } catch (error) {
      console.error(`Failed to execute automation action ${action.action}:`, error);
      // Continue with other actions even if one fails
    }
  }
}

async function executeAction(
  action: AutomationActionConfig,
  task: TaskContext
): Promise<void> {
  switch (action.action) {
    case "set_status":
      if (action.value && typeof action.value === "string") {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: action.value as TaskStatus },
        });
      }
      break;

    case "assign_user":
      if (action.value && typeof action.value === "string") {
        await prisma.task.update({
          where: { id: task.id },
          data: { assigneeId: action.value },
        });
      }
      break;

    case "add_label":
      if (action.value && typeof action.value === "string") {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            labels: {
              connect: { id: action.value },
            },
          },
        });
      }
      break;

    case "remove_label":
      if (action.value && typeof action.value === "string") {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            labels: {
              disconnect: { id: action.value },
            },
          },
        });
      }
      break;

    case "add_to_sprint":
      if (action.value && typeof action.value === "string") {
        await prisma.task.update({
          where: { id: task.id },
          data: { sprintId: action.value },
        });
      }
      break;

    case "send_notification":
      // TODO: Implement notification sending
      console.log(`Would send notification for task ${task.id}`);
      break;
  }
}

/**
 * Helper to build task context from a Prisma task
 */
export function buildTaskContext(task: {
  id: string;
  title: string;
  status: string;
  priority: string;
  taskType: string;
  assigneeId: string | null;
  labels?: { id: string }[];
  storyPoints: number | null;
  sprintId: string | null;
  projectId: string;
}): TaskContext {
  return {
    id: task.id,
    title: task.title,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    taskType: task.taskType as TaskType,
    assigneeId: task.assigneeId,
    labelIds: task.labels?.map((l) => l.id) || [],
    storyPoints: task.storyPoints,
    sprintId: task.sprintId,
    projectId: task.projectId,
  };
}
