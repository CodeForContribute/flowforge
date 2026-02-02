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

// AI Sprint Planning types
export interface TeamMemberCapacity {
  userId: string;
  name: string;
  availableHours: number;
  skills?: string[];
}

export interface SprintPlanRequest {
  sprintId: string;
  backlogTaskIds?: string[];
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

export interface AIRiskFactor {
  type: "dependency" | "complexity" | "capacity" | "unknown" | "deadline";
  description: string;
  severity: "low" | "medium" | "high";
  affectedTaskIds?: string[];
}

export interface SprintPlanSuggestion {
  suggestedTasks: SuggestedTask[];
  totalStoryPoints: number;
  capacityUtilization: number;
  riskScore: number;
  riskFactors: AIRiskFactor[];
  summary: string;
  recommendations: string[];
}

// AI Task Estimation types
export interface TimeEstimate {
  optimistic: number;
  realistic: number;
  pessimistic: number;
}

export interface SimilarTask {
  taskId: string;
  title: string;
  actualPoints: number;
  actualCompletionTime: number | null;
  similarity: number;
  taskType: TaskType;
}

export interface ComplexityFactor {
  factor: string;
  impact: "low" | "medium" | "high";
  description: string;
}

export interface TaskEstimation {
  storyPoints: number;
  confidence: "low" | "medium" | "high";
  timeEstimate: TimeEstimate;
  reasoning: string;
  similarTasks: SimilarTask[];
  complexityFactors: ComplexityFactor[];
  suggestions?: string[];
}

// AI Retrospective types
export interface Achievement {
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  relatedTaskIds?: string[];
}

export interface Challenge {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  rootCause?: string;
  relatedTaskIds?: string[];
}

export interface Recommendation {
  title: string;
  description: string;
  category: "process" | "technical" | "team" | "planning";
  priority: "low" | "medium" | "high";
  actionable: boolean;
}

export interface ActionItem {
  title: string;
  description: string;
  owner?: string;
  dueDate?: string;
  category: "process" | "technical" | "team" | "planning";
}

export interface SprintMetrics {
  plannedPoints: number;
  completedPoints: number;
  velocity: number;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  addedMidSprint: number;
  removedMidSprint: number;
  averageTaskAge: number;
  blockedTime: number;
}

export interface VelocityTrend {
  sprintName: string;
  velocity: number;
  completionRate: number;
}

export interface SprintRetrospective {
  summary: string;
  achievements: Achievement[];
  challenges: Challenge[];
  recommendations: Recommendation[];
  actionItems: ActionItem[];
  metrics: SprintMetrics;
  velocityTrend: VelocityTrend[];
  teamSentiment: "positive" | "neutral" | "negative";
  overallScore: number;
}

// AI Risk Assessment types
export interface TaskRisk {
  taskId: string;
  title: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: ComplexityFactor[];
  mitigations: string[];
}

export interface RiskRecommendation {
  priority: "low" | "medium" | "high";
  recommendation: string;
  affectedTaskIds: string[];
  potentialImpact: string;
}

export interface CapacityAnalysis {
  totalCapacityHours: number;
  estimatedWorkHours: number;
  utilizationRate: number;
  overCommitted: boolean;
  bufferHours: number;
}

export interface DependencyNode {
  taskId: string;
  title: string;
  status: TaskStatus;
  storyPoints: number | null;
  inDegree: number;
  outDegree: number;
  isCritical: boolean;
}

export interface Dependency {
  fromTaskId: string;
  fromTaskTitle: string;
  toTaskId: string;
  toTaskTitle: string;
  type: "blocks" | "requires" | "relates_to";
  confidence: number;
  reasoning: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: Dependency[];
  criticalPath: string[];
  orphanTasks: string[];
}

export interface SprintRiskAssessment {
  overallRiskScore: number;
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  successProbability: number;
  taskRisks: TaskRisk[];
  sprintRiskFactors: ComplexityFactor[];
  criticalTasks: string[];
  recommendations: RiskRecommendation[];
  dependencyGraph: DependencyGraph;
  capacityAnalysis: CapacityAnalysis;
}
