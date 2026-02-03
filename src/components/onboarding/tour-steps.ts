export type TourStepPosition = "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: string;
  targetSelector: string; // data-tour-id="xxx" selector
  title: string;
  description: string;
  position: TourStepPosition;
  spotlight: boolean;
}

export type TourSection = "dashboard" | "project" | "taskDetail" | "sprint";

export interface SectionTour {
  id: TourSection;
  name: string;
  description: string;
  pathPattern: RegExp;
  steps: TourStep[];
}

// Dashboard Tour - shown on /dashboard
const dashboardTour: SectionTour = {
  id: "dashboard",
  name: "Dashboard Tour",
  description: "Learn the basics of FlowForge",
  pathPattern: /^\/dashboard$/,
  steps: [
    {
      id: "welcome",
      targetSelector: '[data-tour-id="dashboard-header"]',
      title: "Welcome to FlowForge!",
      description:
        "This is your dashboard where you can see all your projects at a glance. Let's take a quick tour!",
      position: "bottom",
      spotlight: false,
    },
    {
      id: "sidebar",
      targetSelector: '[data-tour-id="sidebar"]',
      title: "Project Navigation",
      description:
        "The sidebar shows all your projects. Click any project to open it, or use the dashboard link to return here.",
      position: "right",
      spotlight: true,
    },
    {
      id: "create-project",
      targetSelector: '[data-tour-id="new-project-button"]',
      title: "Create a Project",
      description:
        "Click here to create a new project by connecting a GitHub repository. This is where the magic begins!",
      position: "bottom",
      spotlight: true,
    },
    {
      id: "notifications",
      targetSelector: '[data-tour-id="notification-bell"]',
      title: "Notifications",
      description:
        "Stay updated on PR status changes, review requests, task completions, and mentions. Never miss an important update.",
      position: "bottom",
      spotlight: true,
    },
    {
      id: "theme-toggle",
      targetSelector: '[data-tour-id="theme-toggle"]',
      title: "Theme Settings",
      description:
        "Switch between light, dark, or system theme to match your preference.",
      position: "bottom",
      spotlight: true,
    },
    {
      id: "user-menu",
      targetSelector: '[data-tour-id="user-menu"]',
      title: "Your Account",
      description:
        "Access your profile, settings, and sign out from here. You can also restart any tour from Settings!",
      position: "bottom",
      spotlight: true,
    },
    {
      id: "settings-link",
      targetSelector: '[data-tour-id="settings-link"]',
      title: "Settings",
      description:
        "Configure your preferences, notifications, and restart tours anytime from here. That's the dashboard tour complete!",
      position: "right",
      spotlight: true,
    },
  ],
};

// Project/Kanban Tour - shown on /project/[id]
const projectTour: SectionTour = {
  id: "project",
  name: "Project Tour",
  description: "Learn about the Kanban board and task management",
  pathPattern: /^\/project\/[^/]+$/,
  steps: [
    {
      id: "project-welcome",
      targetSelector: '[data-tour-id="kanban-board"]',
      title: "Welcome to Your Project!",
      description:
        "This is the Kanban board - your visual workflow management tool. Tasks flow from left to right as they progress.",
      position: "top",
      spotlight: true,
    },
    {
      id: "task-card",
      targetSelector: '[data-tour-id="task-card"]',
      title: "Task Cards",
      description:
        "Each card represents a task. You can see the priority, assignee, labels, story points, and PR status at a glance. Drag cards between columns to update status.",
      position: "right",
      spotlight: true,
    },
    {
      id: "new-task",
      targetSelector: '[data-tour-id="new-task-button"]',
      title: "Create Tasks",
      description:
        "Click here to create a new task. Describe what you want to build, and FlowForge's AI can help generate the code automatically!",
      position: "bottom",
      spotlight: true,
    },
  ],
};

// Task Detail Tour - shown on /project/[id]/task/[taskId] (but NOT /task/new or /task/[id]/edit)
const taskDetailTour: SectionTour = {
  id: "taskDetail",
  name: "Task Detail Tour",
  description: "Learn about AI-powered task execution",
  pathPattern: /^\/project\/[^/]+\/task\/(?!new$)[^/]+$/,
  steps: [
    {
      id: "task-overview",
      targetSelector: '[data-tour-id="generate-prompt-button"]',
      title: "AI Prompt Generation",
      description:
        "Click this button to generate an AI-optimized prompt from your task description. The AI analyzes your requirements and creates a detailed implementation plan.",
      position: "bottom",
      spotlight: true,
    },
    {
      id: "execute-task",
      targetSelector: '[data-tour-id="execute-button"]',
      title: "Execute with AI",
      description:
        "Once you have a prompt, click Execute to let the AI agent create a branch, generate code, and open a pull request automatically. Watch the magic happen!",
      position: "bottom",
      spotlight: true,
    },
    {
      id: "ai-estimate",
      targetSelector: '[data-tour-id="ai-estimate-badge"]',
      title: "AI Story Point Estimation",
      description:
        "Get AI-powered story point estimates based on task complexity and historical data from similar completed tasks in your project.",
      position: "bottom",
      spotlight: true,
    },
  ],
};

// Sprint Tour - shown on /project/[id]/sprint/[sprintId]
const sprintTour: SectionTour = {
  id: "sprint",
  name: "Sprint Tour",
  description: "Learn about sprint management and AI planning",
  pathPattern: /^\/project\/[^/]+\/sprint\/[^/]+$/,
  steps: [
    {
      id: "sprint-board",
      targetSelector: '[data-tour-id="sprint-board"]',
      title: "Sprint Management",
      description:
        "This is the sprint board. Organize your work into time-boxed sprints by dragging tasks from the backlog into the sprint.",
      position: "top",
      spotlight: true,
    },
    {
      id: "ai-planning",
      targetSelector: '[data-tour-id="ai-plan-button"]',
      title: "AI Sprint Planning",
      description:
        "Let AI suggest optimal task selection based on team capacity, velocity, and task dependencies. Smart planning made easy!",
      position: "bottom",
      spotlight: true,
    },
  ],
};

// All section tours
export const sectionTours: SectionTour[] = [
  dashboardTour,
  projectTour,
  taskDetailTour,
  sprintTour,
];

// Get tour for a specific section
export function getTourBySection(section: TourSection): SectionTour | undefined {
  return sectionTours.find((tour) => tour.id === section);
}

// Get tour for current pathname
export function getTourForPath(pathname: string): SectionTour | undefined {
  return sectionTours.find((tour) => tour.pathPattern.test(pathname));
}

// Get all section IDs
export function getAllSectionIds(): TourSection[] {
  return sectionTours.map((tour) => tour.id);
}

// Type for tours completed state
export type ToursCompletedState = Partial<Record<TourSection, boolean>>;
