// AI Services - FlowForge's competitive moat
// These AI features transform how teams plan and execute sprints

export {
  generateSprintPlan,
  applySprintPlan,
  type SprintPlanRequest,
  type SprintPlanSuggestion,
  type SuggestedTask,
  type TeamMemberCapacity,
  type RiskFactor,
} from "./sprint-planner";

export {
  estimateTask,
  estimateTasks,
  applyEstimation,
  type EstimationRequest,
  type TaskEstimation,
  type TimeEstimate,
  type SimilarTask,
  type ComplexityFactor,
} from "./estimator";

export {
  generateRetrospective,
  compareSprintRetros,
  type RetrospectiveRequest,
  type SprintRetrospective,
  type Achievement,
  type Challenge,
  type Recommendation,
  type ActionItem,
  type SprintMetrics,
  type VelocityTrend,
} from "./retrospective";

export {
  detectDependencies,
  getTaskDependencies,
  type DependencyDetectionRequest,
  type DependencyDetectionResult,
  type Dependency,
  type DependencyGraph,
  type DependencyNode,
  type DependencyWarning,
} from "./dependency-detector";

export {
  assessSprintRisk,
  assessTaskRisk,
  type RiskAssessmentRequest,
  type SprintRiskAssessment,
  type TaskRisk,
  type RiskRecommendation,
  type CapacityAnalysis,
} from "./risk-assessor";
