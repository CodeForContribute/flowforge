import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { CustomFieldDefinition } from "@/types";

const customFieldOptionSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(100),
  color: z.string().optional(),
});

const createCustomFieldSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["text", "number", "date", "select", "multiselect", "checkbox", "url"]),
  description: z.string().max(500).optional(),
  required: z.boolean().optional(),
  options: z.array(customFieldOptionSchema).optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).nullable().optional(),
});

const updateCustomFieldSchema = createCustomFieldSchema.partial().extend({
  id: z.string(),
  order: z.number().optional(),
});

// GET /api/projects/[projectId]/custom-fields - List custom fields
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      select: {
        customFields: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const customFields = (project.customFields as CustomFieldDefinition[] | null) || [];
    return NextResponse.json(customFields);
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json({ error: "Failed to fetch custom fields" }, { status: 500 });
  }
}

// POST /api/projects/[projectId]/custom-fields - Create a new custom field
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createCustomFieldSchema.parse(body);

    // Verify project access (owner or admin only)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
      select: {
        customFields: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or not authorized" }, { status: 404 });
    }

    const existingFields = (project.customFields as CustomFieldDefinition[] | null) || [];

    // Check for duplicate name
    if (existingFields.some((f) => f.name.toLowerCase() === data.name.toLowerCase())) {
      return NextResponse.json({ error: "A custom field with this name already exists" }, { status: 400 });
    }

    // Create new field
    const newField: CustomFieldDefinition = {
      id: `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      type: data.type,
      description: data.description,
      required: data.required || false,
      options: data.options,
      defaultValue: data.defaultValue ?? undefined,
      order: existingFields.length,
    };

    // Update project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        customFields: JSON.parse(JSON.stringify([...existingFields, newField])) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(newField, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error creating custom field:", error);
    return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 });
  }
}

// PATCH /api/projects/[projectId]/custom-fields - Update a custom field
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateCustomFieldSchema.parse(body);

    // Verify project access (owner or admin only)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
      select: {
        customFields: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or not authorized" }, { status: 404 });
    }

    const existingFields = (project.customFields as CustomFieldDefinition[] | null) || [];
    const fieldIndex = existingFields.findIndex((f) => f.id === data.id);

    if (fieldIndex === -1) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    // Check for duplicate name (excluding current field)
    if (data.name && existingFields.some((f, i) => i !== fieldIndex && f.name.toLowerCase() === data.name!.toLowerCase())) {
      return NextResponse.json({ error: "A custom field with this name already exists" }, { status: 400 });
    }

    // Update field
    const { defaultValue, ...restData } = data;
    const updatedField: CustomFieldDefinition = {
      ...existingFields[fieldIndex],
      ...restData,
      ...(defaultValue !== undefined && { defaultValue: defaultValue ?? undefined }),
    };

    const updatedFields = [...existingFields];
    updatedFields[fieldIndex] = updatedField;

    // Update project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        customFields: JSON.parse(JSON.stringify(updatedFields)) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updatedField);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Error updating custom field:", error);
    return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 });
  }
}

// DELETE /api/projects/[projectId]/custom-fields - Delete a custom field
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get("fieldId");

    if (!fieldId) {
      return NextResponse.json({ error: "Field ID required" }, { status: 400 });
    }

    // Verify project access (owner or admin only)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: session.user.id },
          { members: { some: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
      select: {
        customFields: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or not authorized" }, { status: 404 });
    }

    const existingFields = (project.customFields as CustomFieldDefinition[] | null) || [];
    const updatedFields = existingFields.filter((f) => f.id !== fieldId);

    if (updatedFields.length === existingFields.length) {
      return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    }

    // Reorder remaining fields
    const reorderedFields = updatedFields.map((f, i) => ({ ...f, order: i }));

    // Update project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        customFields: JSON.parse(JSON.stringify(reorderedFields)) as Prisma.InputJsonValue,
      },
    });

    // Remove field values from tasks
    const tasks = await prisma.task.findMany({
      where: { projectId },
      select: { id: true, customFieldValues: true },
    });

    for (const task of tasks) {
      if (task.customFieldValues) {
        const values = task.customFieldValues as Record<string, unknown>;
        if (fieldId in values) {
          delete values[fieldId];
          await prisma.task.update({
            where: { id: task.id },
            data: { customFieldValues: JSON.parse(JSON.stringify(values)) as Prisma.InputJsonValue },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom field:", error);
    return NextResponse.json({ error: "Failed to delete custom field" }, { status: 500 });
  }
}
