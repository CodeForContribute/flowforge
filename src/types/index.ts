// Prisma enum types (defined manually to avoid build dependency on prisma generate)
export type TaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "GENERATING"
  | "AWAITING_CODE_REVIEW"
  | "PR_OPEN"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "HAS_CONFLICTS"
  | "MERGED"
  | "CLOSED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskType = "EPIC" | "STORY" | "TASK" | "SUBTASK" | "BUG";

export type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED";

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER";

export type ExecutionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type GeneratedCodeStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

export type GeneratedCodeType =
  | "INITIAL_EXECUTION"
  | "PR_COMMENT_RESPONSE"
  | "REVIEW_RESPONSE";

export type ExecutionStep =
  | "CREATE_BRANCH"
  | "GENERATE_CODE"
  | "AWAIT_CODE_REVIEW"
  | "COMMIT_FILES"
  | "CREATE_PR"
  | "REQUEST_REVIEWERS"
  | "RESPOND_TO_REVIEW"
  | "MERGE_PR"
  | "ANALYZE_COMMENT"
  | "RESPOND_TO_COMMENT"
  | "CHECK_CONFLICTS"
  | "UPDATE_BRANCH"
  | "RESOLVE_CONFLICTS";

export type LinkType = "BLOCKS" | "RELATES_TO" | "DUPLICATES";

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
  projectKey: string;
  taskCounter: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null; // Optional for org projects
  organizationId: string | null; // Optional for personal projects
}

// ============= ORGANIZATION/MULTI-TENANCY =============

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  role: OrganizationRole;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  userId: string;
}

export interface OrganizationWithMembers extends Organization {
  members: (OrganizationMember & { user: User })[];
  _count?: {
    members: number;
    projects: number;
  };
}

export interface OrganizationMemberWithUser extends OrganizationMember {
  user: User;
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
  taskNumber: number;
  taskKey: string;
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

export type CommentType = "COMMENT" | "ACTIVITY";

export interface CommentReaction {
  id: string;
  emoji: string;
  createdAt: Date;
  commentId: string;
  userId: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface Comment {
  id: string;
  content: string;
  type?: CommentType;
  isSystem: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt?: Date;
  taskId: string;
  userId: string | null;
  reactions?: CommentReaction[];
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

export interface GeneratedCode {
  id: string;
  files: GeneratedFile[];
  summary: string;
  userFeedback: string | null;
  version: number;
  status: GeneratedCodeStatus;
  type: GeneratedCodeType;
  prCommentId: string | null;
  prCommentBody: string | null;
  prCommentAuthor: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
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

// Attachment type matching Prisma schema
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: Date;
  taskId: string;
  uploadedById: string;
  uploadedBy?: User;
}

// Task Link types
export interface TaskLink {
  id: string;
  linkType: LinkType;
  createdAt: Date;
  sourceTaskId: string;
  targetTaskId: string;
  sourceTask?: TaskLinkTask;
  targetTask?: TaskLinkTask;
}

export interface TaskLinkTask {
  id: string;
  title: string;
  taskKey: string;
  status: TaskStatus;
  taskType: TaskType;
}

// Board Column types
export interface BoardColumn {
  id: TaskStatus;
  title: string;
  order: number;
}

// Default board columns
export const DEFAULT_BOARD_COLUMNS: BoardColumn[] = [
  { id: "TODO", title: "To Do", order: 0 },
  { id: "IN_PROGRESS", title: "In Progress", order: 1 },
  { id: "IN_REVIEW", title: "In Review", order: 2 },
  { id: "MERGED", title: "Merged", order: 3 },
];

// All available statuses for board configuration
export const ALL_TASK_STATUSES: { id: TaskStatus; title: string }[] = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "GENERATING", title: "Generating" },
  { id: "AWAITING_CODE_REVIEW", title: "Awaiting Code Review" },
  { id: "PR_OPEN", title: "PR Open" },
  { id: "IN_REVIEW", title: "In Review" },
  { id: "CHANGES_REQUESTED", title: "Changes Requested" },
  { id: "APPROVED", title: "Approved" },
  { id: "HAS_CONFLICTS", title: "Has Conflicts" },
  { id: "MERGED", title: "Merged" },
  { id: "CLOSED", title: "Closed" },
];

// Saved Filter types
export interface FilterCriteria {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string | null;
  sprintId?: string | null;
  labelIds?: string[];
  taskType?: TaskType[];
  search?: string;
  dueBefore?: string;
  dueAfter?: string;
  overdue?: boolean;
  noSprint?: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterCriteria;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  userId: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
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
  attachments?: Attachment[];
  conflictInfo?: MergeConflictInfo | null;
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
  mergeable?: boolean | null;
  mergeable_state?: "clean" | "dirty" | "blocked" | "behind" | "unknown" | "unstable";
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

// Merge conflict types
export interface ConflictFile {
  path: string;
  conflictMarkers?: string;
  ourContent?: string;
  theirContent?: string;
}

export interface MergeConflictInfo {
  hasConflicts: boolean;
  mergeableState: string;
  conflictingFiles: ConflictFile[];
  behindByCommits: number;
  aheadByCommits: number;
  baseBranch: string;
  headBranch: string;
  lastChecked: Date;
}

export interface ConflictResolutionResult {
  success: boolean;
  resolvedFiles: GeneratedFile[];
  summary: string;
  error?: string;
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

export interface ContinueExecutionJob {
  taskId: string;
  userId: string;
  generatedCodeId: string;
}

export interface ContinueCommentResponseJob {
  taskId: string;
  userId: string;
  generatedCodeId: string;
  prNumber: number;
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

// Workflow types
export interface WorkflowTransition {
  from: TaskStatus;
  to: TaskStatus[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  transitions: WorkflowTransition[];
  initialStatus: TaskStatus;
  doneStatuses: TaskStatus[];
}

// Default workflow transitions - allows common status flows
export const DEFAULT_WORKFLOW: WorkflowDefinition = {
  id: "default",
  name: "Default Workflow",
  description: "Standard development workflow with PR review flow",
  isDefault: true,
  initialStatus: "TODO",
  doneStatuses: ["MERGED", "CLOSED"],
  transitions: [
    { from: "BACKLOG", to: ["TODO", "CLOSED"] },
    { from: "TODO", to: ["IN_PROGRESS", "BACKLOG", "CLOSED"] },
    { from: "IN_PROGRESS", to: ["TODO", "PR_OPEN", "IN_REVIEW", "CLOSED"] },
    { from: "GENERATING", to: ["AWAITING_CODE_REVIEW", "IN_PROGRESS", "CLOSED"] },
    { from: "AWAITING_CODE_REVIEW", to: ["IN_PROGRESS", "PR_OPEN", "CLOSED"] },
    { from: "PR_OPEN", to: ["IN_REVIEW", "IN_PROGRESS", "CLOSED"] },
    { from: "IN_REVIEW", to: ["CHANGES_REQUESTED", "APPROVED", "IN_PROGRESS", "CLOSED"] },
    { from: "CHANGES_REQUESTED", to: ["IN_PROGRESS", "IN_REVIEW", "CLOSED"] },
    { from: "APPROVED", to: ["MERGED", "IN_REVIEW", "CLOSED"] },
    { from: "HAS_CONFLICTS", to: ["IN_PROGRESS", "IN_REVIEW", "CLOSED"] },
    { from: "MERGED", to: ["CLOSED"] },
    { from: "CLOSED", to: ["BACKLOG", "TODO"] },
  ],
};

// Simple workflow - for projects that don't need PR flow
export const SIMPLE_WORKFLOW: WorkflowDefinition = {
  id: "simple",
  name: "Simple Workflow",
  description: "Basic To Do → In Progress → Done flow",
  isDefault: false,
  initialStatus: "TODO",
  doneStatuses: ["MERGED", "CLOSED"],
  transitions: [
    { from: "BACKLOG", to: ["TODO", "CLOSED"] },
    { from: "TODO", to: ["IN_PROGRESS", "BACKLOG", "CLOSED"] },
    { from: "IN_PROGRESS", to: ["TODO", "MERGED", "CLOSED"] },
    { from: "MERGED", to: ["CLOSED"] },
    { from: "CLOSED", to: ["BACKLOG", "TODO"] },
  ],
};

// Kanban workflow - no restrictions
export const KANBAN_WORKFLOW: WorkflowDefinition = {
  id: "kanban",
  name: "Kanban (No Restrictions)",
  description: "Any status can transition to any other status",
  isDefault: false,
  initialStatus: "TODO",
  doneStatuses: ["MERGED", "CLOSED"],
  transitions: ALL_TASK_STATUSES.map((status) => ({
    from: status.id,
    to: ALL_TASK_STATUSES.filter((s) => s.id !== status.id).map((s) => s.id),
  })),
};

// All built-in workflows
export const BUILT_IN_WORKFLOWS: WorkflowDefinition[] = [
  DEFAULT_WORKFLOW,
  SIMPLE_WORKFLOW,
  KANBAN_WORKFLOW,
];

// Helper function to get allowed transitions from a status
export function getAllowedTransitions(
  workflow: WorkflowDefinition,
  currentStatus: TaskStatus
): TaskStatus[] {
  const transition = workflow.transitions.find((t) => t.from === currentStatus);
  return transition?.to || [];
}

// Automation types
export type AutomationTrigger =
  | "on_create"
  | "on_status_change"
  | "on_assign"
  | "on_label_add"
  | "on_label_remove"
  | "on_comment"
  | "on_due_date_passed";

export type AutomationAction =
  | "set_status"
  | "assign_user"
  | "add_label"
  | "remove_label"
  | "send_notification"
  | "add_to_sprint";

export interface AutomationCondition {
  field: "status" | "priority" | "taskType" | "assigneeId" | "labelIds" | "storyPoints";
  operator: "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: string | string[] | number | null;
}

export interface AutomationActionConfig {
  action: AutomationAction;
  value: string | string[] | null; // status, userId, labelId, etc.
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  triggerValue?: string; // e.g., specific status for on_status_change
  conditions: AutomationCondition[];
  actions: AutomationActionConfig[];
  createdAt: Date;
  updatedAt: Date;
}

// ============= TIME TRACKING =============

export interface TimeLog {
  id: string;
  timeSpent: number; // Time spent in minutes
  date: Date | string;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  taskId: string;
  userId: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

// Helper to format minutes to human readable string
export function formatTimeSpent(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

// Helper to parse time string like "2h 30m" or "45m" or "3h" to minutes
export function parseTimeToMinutes(timeStr: string): number | null {
  const trimmed = timeStr.trim().toLowerCase();

  // Match patterns like "2h 30m", "2h30m", "2h", "30m", "2.5h"
  const hoursMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutesMatch = trimmed.match(/(\d+)\s*m/);

  let totalMinutes = 0;

  if (hoursMatch) {
    totalMinutes += parseFloat(hoursMatch[1]) * 60;
  }

  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }

  // If no match, try parsing as just a number (assume minutes)
  if (!hoursMatch && !minutesMatch) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return Math.round(num);
    }
    return null;
  }

  return Math.round(totalMinutes);
}

// ============= CUSTOM FIELDS =============

export type CustomFieldType = "text" | "number" | "date" | "select" | "multiselect" | "checkbox" | "url";

export interface CustomFieldOption {
  id: string;
  label: string;
  color?: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  description?: string;
  required: boolean;
  options?: CustomFieldOption[]; // For select/multiselect
  defaultValue?: string | number | boolean | string[];
  order: number;
}

export type CustomFieldValue = string | number | boolean | string[] | null;

export interface CustomFieldValues {
  [fieldId: string]: CustomFieldValue;
}

// ============= VERSIONS/RELEASES =============

export type VersionStatus = "UNRELEASED" | "RELEASED" | "ARCHIVED";

export interface Version {
  id: string;
  name: string;
  description: string | null;
  releaseDate: Date | string | null;
  status: VersionStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  projectId: string;
  _count?: {
    tasks: number;
  };
}

// ============= ADVANCED SEARCH (JQL-LIKE) =============

export type SearchOperator =
  | "=" | "!=" | "~" | "!~"  // equals, not equals, contains, not contains
  | ">" | ">=" | "<" | "<="  // comparison
  | "in" | "not in"          // list membership
  | "is" | "is not";         // null checks (is empty, is not empty)

export interface SearchClause {
  field: string;
  operator: SearchOperator;
  value: string | string[] | number | boolean | null;
}

export type SearchLogicalOperator = "AND" | "OR";

export interface SearchExpression {
  clauses: SearchClause[];
  logicalOperator: SearchLogicalOperator;
  subExpressions?: SearchExpression[];
}

// Searchable fields mapping
export const SEARCHABLE_FIELDS: Record<string, { type: "string" | "number" | "date" | "enum" | "array"; enumValues?: string[] }> = {
  status: { type: "enum", enumValues: ["BACKLOG", "TODO", "IN_PROGRESS", "GENERATING", "AWAITING_CODE_REVIEW", "PR_OPEN", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "HAS_CONFLICTS", "MERGED", "CLOSED"] },
  priority: { type: "enum", enumValues: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
  type: { type: "enum", enumValues: ["EPIC", "STORY", "TASK", "SUBTASK", "BUG"] },
  assignee: { type: "string" },
  reporter: { type: "string" },
  sprint: { type: "string" },
  label: { type: "array" },
  version: { type: "string" },
  created: { type: "date" },
  updated: { type: "date" },
  due: { type: "date" },
  storyPoints: { type: "number" },
  text: { type: "string" }, // Full-text search on title and description
};
