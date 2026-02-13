import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { canAccessProject, canManageProject, getProjectRole } from "@/lib/authorization";

const boardColumnSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(50),
  order: z.number().int().min(0),
});

const workflowTransitionSchema = z.object({
  from: z.string(),
  to: z.array(z.string()),
});

const workflowSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isDefault: z.boolean(),
  transitions: z.array(workflowTransitionSchema),
  initialStatus: z.string(),
  doneStatuses: z.array(z.string()),
}).nullable();

const automationConditionSchema = z.object({
  field: z.enum(["status", "priority", "taskType", "assigneeId", "labelIds", "storyPoints"]),
  operator: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"]),
  value: z.union([z.string(), z.array(z.string()), z.number(), z.null()]),
});

const automationActionSchema = z.object({
  action: z.enum(["set_status", "assign_user", "add_label", "remove_label", "send_notification", "add_to_sprint"]),
  value: z.union([z.string(), z.array(z.string()), z.null()]),
});

const automationRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  enabled: z.boolean(),
  trigger: z.enum(["on_create", "on_status_change", "on_assign", "on_label_add", "on_label_remove", "on_comment", "on_due_date_passed"]),
  triggerValue: z.string().optional(),
  conditions: z.array(automationConditionSchema),
  actions: z.array(automationActionSchema),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  githubRepo: z.string().optional(),
  defaultBranch: z.string().optional(),
  reviewers: z.array(z.string()).optional(),
  agentModel: z.string().optional(),
  wipLimits: z.record(z.string(), z.number().min(0).max(100)).optional(),
  boardColumns: z.array(boardColumnSchema).min(1).max(12).optional(),
  workflow: workflowSchema.optional(),
  automationRules: z.array(automationRuleSchema).optional(),
});

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user can access this project
    const hasAccess = await canAccessProject(session.user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: { tasks: true },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get user's role for this project
    const userRole = await getProjectRole(session.user.id, projectId);

    return NextResponse.json({ project: { ...project, userRole } });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateProjectSchema.parse(body);

    // Verify user can manage this project
    const hasPermission = await canManageProject(session.user.id, projectId);
    if (!hasPermission) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Separate JSON fields that need special null handling from regular fields
    const { workflow, automationRules, ...regularData } = data;

    // Build update data, converting null to Prisma.DbNull for JSON fields
    const updateData: Prisma.ProjectUpdateInput = {
      ...regularData,
      ...(workflow !== undefined && {
        workflow: workflow === null ? Prisma.DbNull : (workflow as Prisma.InputJsonValue),
      }),
      ...(automationRules !== undefined && {
        automationRules: automationRules === null ? Prisma.DbNull : (automationRules as Prisma.InputJsonValue),
      }),
    };

    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's role - only OWNER can delete
    const userRole = await getProjectRole(session.user.id, projectId);
    if (userRole !== "OWNER") {
      return NextResponse.json({ error: "Only project owners can delete projects" }, { status: 403 });
    }

    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
