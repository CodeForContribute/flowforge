// Prisma enum types (defined manually to avoid build dependency on prisma generate)
export type TaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "GENERATING"
  | "PR_OPEN"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "MERGED"
  | "CLOSED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskType = "EPIC" | "STORY" | "TASK" | "SUBTASK" | "BUG";

export type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED";

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export type ExecutionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type ExecutionStep =
  | "CREATE_BRANCH"
  | "GENERATE_CODE"
  | "COMMIT_FILES"
  | "CREATE_PR"
  | "REQUEST_REVIEWERS"
  | "RESPOND_TO_REVIEW"
  | "MERGE_PR"
  | "ANALYZE_COMMENT"
  | "RESPOND_TO_COMMENT";

// Comment classification types
export type CommentIntent = "code_change" | "discussion";

export interface CommentClassification {
  intent: CommentIntent;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
}

export interface DiscussionReplyResult {
  reply: string;
}

// Prisma model types (defined manually)
export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  githubId: string;
  accessToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  githubRepo: string;
  defaultBranch: string;
  reviewers: string[];
  agentModel: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  projectId: string;
}

export interface ProjectMember {
  id: string;
  role: MemberRole;
  createdAt: Date;
  projectId: string;
  userId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints: number | null;
  dueDate: Date | null;
  branchName: string | null;
  prNumber: number | null;
  prUrl: string | null;
  generatedPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  assigneeId: string | null;
  sprintId: string | null;
  parentTaskId: string | null;
}

export interface Comment {
  id: string;
  content: string;
  isSystem: boolean;
  createdAt: Date;
  taskId: string;
  userId: string | null;
}

export interface Execution {
  id: string;
  status: ExecutionStatus;
  step: ExecutionStep;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  taskId: string;
}

export interface WebhookEvent {
  id: string;
  eventType: string;
  payload: unknown;
  processed: boolean;
  processedAt: Date | null;
  error: string | null;
  createdAt: Date;
}

// Extended types with relations
export type TaskWithRelations = Task & {
  project: Project;
  comments: Comment[];
  executions: Execution[];
  assignee?: User | null;
  sprint?: Sprint | null;
  parentTask?: Task | null;
  subtasks?: Task[];
  labels?: Label[];
};

export type ProjectWithRelations = Project & {
  user: User;
  tasks: Task[];
  sprints?: Sprint[];
  labels?: Label[];
  members?: (ProjectMember & { user: User })[];
};

export type SprintWithTasks = Sprint & {
  tasks: Task[];
};

export type ProjectMemberWithUser = ProjectMember & {
  user: User;
};

export type CommentWithUser = Comment & {
  user: User | null;
};

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// GitHub types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  html_url: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: "open" | "closed";
  merged: boolean;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export interface GitHubReviewComment {
  id: number;
  body: string;
  path: string;
  position: number | null;
  line: number | null;
  user: {
    login: string;
  };
}

export interface GitHubReview {
  id: number;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";
  body: string | null;
  user: {
    login: string;
  };
  submitted_at: string | null;
}

// Agent types
export interface CodeGenerationResult {
  files: GeneratedFile[];
  summary: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  action: "create" | "update" | "delete";
}

export interface ReviewResponseResult {
  files: GeneratedFile[];
  explanation: string;
}

// Queue job types
export interface ExecuteTaskJob {
  taskId: string;
  userId: string;
}

export interface HandleReviewJob {
  taskId: string;
  prNumber: number;
  reviewId: number;
}

export interface HandleApprovalJob {
  taskId: string;
  prNumber: number;
}

export interface HandlePRCommentJob {
  taskId: string;
  prNumber: number;
  commentId: number;
  commentBody: string;
  commentAuthor: string;
}

// Kanban types
export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}

// Session types (extended from NextAuth)
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  accessToken: string;
}
