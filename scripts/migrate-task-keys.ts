/**
 * Migration script to add projectKey and taskKey to existing data
 *
 * Run with: npx tsx scripts/migrate-task-keys.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generateProjectKey(name: string): string {
  const words = name.trim().split(/\s+/);
  let key = words
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  if (key.length < 2) {
    key = name
      .replace(/[^a-zA-Z]/g, "")
      .substring(0, 4)
      .toUpperCase();
  }

  if (key.length < 2) key = "PR";
  return key.substring(0, 10);
}

async function getUniqueProjectKey(baseKey: string, existingKeys: Set<string>): Promise<string> {
  let key = baseKey;
  let counter = 2;

  while (existingKeys.has(key)) {
    key = `${baseKey.substring(0, 8)}${counter}`;
    counter++;
  }

  existingKeys.add(key);
  return key;
}

async function main() {
  console.log("Starting migration...\n");

  // Get all projects that don't have a projectKey
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
  });

  const existingKeys = new Set<string>();

  // First pass: collect existing keys
  for (const project of projects) {
    if ((project as Record<string, unknown>).projectKey) {
      existingKeys.add((project as Record<string, unknown>).projectKey as string);
    }
  }

  console.log(`Found ${projects.length} projects to process.\n`);

  for (const project of projects) {
    const hasProjectKey = (project as Record<string, unknown>).projectKey;

    if (hasProjectKey) {
      console.log(`Project "${project.name}" already has key: ${hasProjectKey}`);
    } else {
      // Generate a unique project key
      const baseKey = generateProjectKey(project.name);
      const projectKey = await getUniqueProjectKey(baseKey, existingKeys);

      console.log(`Project "${project.name}" -> generating key: ${projectKey}`);

      // Update project with key and initialize counter
      await prisma.project.update({
        where: { id: project.id },
        data: {
          projectKey,
          taskCounter: 0,
        } as Record<string, unknown>,
      });
    }

    // Get tasks for this project, ordered by creation date
    const tasks = await prisma.task.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
    });

    // Get the project key (either existing or newly generated)
    const updatedProject = await prisma.project.findUnique({
      where: { id: project.id },
    });

    const projectKey = (updatedProject as Record<string, unknown>).projectKey as string;
    let taskCounter = 0;

    for (const task of tasks) {
      const hasTaskKey = (task as Record<string, unknown>).taskKey;

      if (hasTaskKey) {
        // Extract task number from existing key
        const match = (hasTaskKey as string).match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > taskCounter) taskCounter = num;
        }
        console.log(`  Task "${task.title}" already has key: ${hasTaskKey}`);
      } else {
        taskCounter++;
        const taskKey = `${projectKey}-${taskCounter}`;

        console.log(`  Task "${task.title}" -> generating key: ${taskKey}`);

        await prisma.task.update({
          where: { id: task.id },
          data: {
            taskNumber: taskCounter,
            taskKey,
          } as Record<string, unknown>,
        });
      }
    }

    // Update project's task counter
    await prisma.project.update({
      where: { id: project.id },
      data: {
        taskCounter,
      } as Record<string, unknown>,
    });

    console.log(`  Updated task counter to: ${taskCounter}\n`);
  }

  console.log("\nMigration completed successfully!");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
