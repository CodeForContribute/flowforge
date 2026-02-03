import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Test data IDs - consistent for testing
const TEST_USER_ID = "test-user-id";
const TEST_PROJECT_ID = "test-project-id";
const TEST_SPRINT_ID = "test-sprint-id";
const TEST_SPRINT_ACTIVE_ID = "test-sprint-active-id";

async function main() {
  console.log("Seeding test database...");

  // Clean up existing test data
  console.log("Cleaning up existing data...");
  await prisma.execution.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.sprint.deleteMany({});
  await prisma.label.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  // Create test user
  console.log("Creating test user...");
  const testUser = await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: "test@example.com",
      name: "Test User",
      githubId: "test-github-12345",
      accessToken: "encrypted-test-token",
      image: "https://avatars.githubusercontent.com/u/12345",
    },
  });

  // Create test project
  console.log("Creating test project...");
  const testProject = await prisma.project.create({
    data: {
      id: TEST_PROJECT_ID,
      name: "Test Project",
      description: "A project for E2E testing",
      githubRepo: "test-owner/test-repo",
      defaultBranch: "main",
      reviewers: ["reviewer1", "reviewer2"],
      userId: testUser.id,
      projectKey: "TP",
      taskCounter: 6, // Will be incremented by tasks created below
    },
  });

  // Create project member (owner)
  await prisma.projectMember.create({
    data: {
      projectId: testProject.id,
      userId: testUser.id,
      role: "OWNER",
    },
  });

  // Create test labels
  console.log("Creating test labels...");
  const labels = await Promise.all([
    prisma.label.create({
      data: {
        id: "label-bug",
        name: "bug",
        color: "#dc2626",
        projectId: testProject.id,
      },
    }),
    prisma.label.create({
      data: {
        id: "label-feature",
        name: "feature",
        color: "#16a34a",
        projectId: testProject.id,
      },
    }),
    prisma.label.create({
      data: {
        id: "label-urgent",
        name: "urgent",
        color: "#ea580c",
        projectId: testProject.id,
      },
    }),
  ]);

  // Create sprints
  console.log("Creating test sprints...");
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const planningSprint = await prisma.sprint.create({
    data: {
      id: TEST_SPRINT_ID,
      name: "Sprint 1",
      goal: "Complete initial setup and basic features",
      startDate: nextWeek,
      endDate: twoWeeksLater,
      status: "PLANNING",
      projectId: testProject.id,
    },
  });

  const activeSprint = await prisma.sprint.create({
    data: {
      id: TEST_SPRINT_ACTIVE_ID,
      name: "Sprint 2 (Active)",
      goal: "Implement core functionality",
      startDate: now,
      endDate: nextWeek,
      status: "ACTIVE",
      projectId: testProject.id,
    },
  });

  // Create test tasks
  console.log("Creating test tasks...");

  // Tasks in backlog (no sprint)
  await prisma.task.create({
    data: {
      id: "task-backlog-1",
      title: "Implement user settings page",
      description: "Create a settings page where users can update their preferences",
      status: "BACKLOG",
      priority: "MEDIUM",
      taskType: "STORY",
      storyPoints: 5,
      projectId: testProject.id,
      taskNumber: 1,
      taskKey: "TP-1",
      labels: { connect: [{ id: "label-feature" }] },
    },
  });

  await prisma.task.create({
    data: {
      id: "task-backlog-2",
      title: "Fix login redirect issue",
      description: "Users are not being redirected correctly after login",
      status: "BACKLOG",
      priority: "HIGH",
      taskType: "BUG",
      storyPoints: 2,
      projectId: testProject.id,
      taskNumber: 2,
      taskKey: "TP-2",
      labels: { connect: [{ id: "label-bug" }] },
    },
  });

  // Tasks in active sprint
  await prisma.task.create({
    data: {
      id: "task-todo-1",
      title: "Setup CI/CD pipeline",
      description: "Configure GitHub Actions for automated testing and deployment",
      status: "TODO",
      priority: "HIGH",
      taskType: "TASK",
      storyPoints: 3,
      projectId: testProject.id,
      sprintId: activeSprint.id,
      assigneeId: testUser.id,
      taskNumber: 3,
      taskKey: "TP-3",
    },
  });

  await prisma.task.create({
    data: {
      id: "task-inprogress-1",
      title: "Add authentication middleware",
      description: "Protect API routes with authentication checks",
      status: "IN_PROGRESS",
      priority: "URGENT",
      taskType: "TASK",
      storyPoints: 5,
      projectId: testProject.id,
      sprintId: activeSprint.id,
      assigneeId: testUser.id,
      taskNumber: 4,
      taskKey: "TP-4",
      labels: { connect: [{ id: "label-urgent" }] },
    },
  });

  await prisma.task.create({
    data: {
      id: "task-pr-open-1",
      title: "Update navigation component",
      description: "Refactor navigation to support mobile responsive design",
      status: "PR_OPEN",
      priority: "MEDIUM",
      taskType: "TASK",
      storyPoints: 3,
      projectId: testProject.id,
      sprintId: activeSprint.id,
      prNumber: 42,
      prUrl: "https://github.com/test-owner/test-repo/pull/42",
      branchName: "feature/navigation-update",
      taskNumber: 5,
      taskKey: "TP-5",
    },
  });

  await prisma.task.create({
    data: {
      id: "task-merged-1",
      title: "Add dark mode support",
      description: "Implement dark mode theme toggle",
      status: "MERGED",
      priority: "LOW",
      taskType: "STORY",
      storyPoints: 8,
      projectId: testProject.id,
      sprintId: activeSprint.id,
      prNumber: 38,
      prUrl: "https://github.com/test-owner/test-repo/pull/38",
      branchName: "feature/dark-mode",
      taskNumber: 6,
      taskKey: "TP-6",
    },
  });

  // Add some comments to a task
  await prisma.comment.createMany({
    data: [
      {
        taskId: "task-inprogress-1",
        userId: testUser.id,
        content: "Started working on this. Will need to coordinate with the API team.",
        isSystem: false,
      },
      {
        taskId: "task-inprogress-1",
        content: "Agent started code generation for this task.",
        isSystem: true,
      },
    ],
  });

  console.log("Test database seeded successfully!");
  console.log({
    user: testUser.email,
    project: testProject.name,
    sprints: [planningSprint.name, activeSprint.name],
    labels: labels.map((l) => l.name),
    tasks: 6,
  });
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
