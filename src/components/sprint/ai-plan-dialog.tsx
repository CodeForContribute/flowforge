"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedTask {
  taskId: string;
  title: string;
  storyPoints: number | null;
  priority: string;
  taskType: string;
  suggestedAssigneeId: string | null;
  suggestedAssigneeName: string | null;
  reasoning: string;
  order: number;
}

interface RiskFactor {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  affectedTaskIds?: string[];
}

interface SprintPlanSuggestion {
  suggestedTasks: SuggestedTask[];
  totalStoryPoints: number;
  capacityUtilization: number;
  riskScore: number;
  riskFactors: RiskFactor[];
  summary: string;
  recommendations: string[];
}

interface TeamMember {
  userId: string;
  name: string;
  image?: string;
  availableHours: number;
}

interface AIPlanDialogProps {
  sprintId: string;
  sprintName: string;
  sprintStatus: string;
  teamMembers?: TeamMember[];
  aiEnabled?: boolean;
  onPlanApplied?: () => void;
}

export function AIPlanDialog({
  sprintId,
  sprintName,
  sprintStatus,
  teamMembers = [],
  aiEnabled = true,
  onPlanApplied,
}: AIPlanDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [plan, setPlan] = useState<SprintPlanSuggestion | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = sprintStatus === "PLANNING";

  async function handleGeneratePlan() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/sprints/${sprintId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamCapacity: teamMembers.map((m) => ({
            userId: m.userId,
            name: m.name,
            availableHours: m.availableHours,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate plan");
      }

      const data = await response.json();
      setPlan(data.plan);

      // Select all tasks by default
      setSelectedTasks(new Set(data.plan.suggestedTasks.map((t: SuggestedTask) => t.taskId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleApplyPlan() {
    if (!plan || selectedTasks.size === 0) return;

    setIsApplying(true);
    setError(null);

    try {
      const taskAssignments = plan.suggestedTasks
        .filter((t) => selectedTasks.has(t.taskId))
        .map((t) => ({
          taskId: t.taskId,
          assigneeId: t.suggestedAssigneeId,
        }));

      const response = await fetch(`/api/sprints/${sprintId}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskAssignments }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to apply plan");
      }

      setOpen(false);
      setPlan(null);
      setSelectedTasks(new Set());
      router.refresh();
      onPlanApplied?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsApplying(false);
    }
  }

  function toggleTask(taskId: string) {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  }

  function selectAll() {
    if (plan) {
      setSelectedTasks(new Set(plan.suggestedTasks.map((t) => t.taskId)));
    }
  }

  function deselectAll() {
    setSelectedTasks(new Set());
  }

  const getRiskColor = (score: number) => {
    if (score <= 25) return "text-green-500";
    if (score <= 50) return "text-yellow-500";
    if (score <= 75) return "text-orange-500";
    return "text-red-500";
  };

  const getRiskBg = (score: number) => {
    if (score <= 25) return "bg-green-500/10";
    if (score <= 50) return "bg-yellow-500/10";
    if (score <= 75) return "bg-orange-500/10";
    return "bg-red-500/10";
  };

  const selectedPoints = plan
    ? plan.suggestedTasks
        .filter((t) => selectedTasks.has(t.taskId))
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    : 0;

  if (!aiEnabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button variant="outline" disabled className="gap-2 opacity-50 cursor-not-allowed">
              <Sparkles className="h-4 w-4" />
              AI Plan
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>AI Plan uses AI to analyze your backlog and suggest optimal task selection based on team capacity and velocity. Enable AI in project settings to use this feature.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={!canGenerate}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          AI Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            AI Sprint Planning
          </DialogTitle>
          <DialogDescription>
            Generate an AI-powered sprint plan for &quot;{sprintName}&quot; based on your backlog,
            team capacity, and historical velocity.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!plan ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            {isGenerating ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing backlog and generating optimal sprint plan...
                </p>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium">Ready to plan your sprint</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Our AI will analyze your backlog, team capacity, and past velocity
                    to suggest the optimal sprint composition.
                  </p>
                </div>
                <Button onClick={handleGeneratePlan} className="mt-4">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Plan
                </Button>
              </>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Summary */}
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">{plan.summary}</p>
                </CardContent>
              </Card>

              {/* Metrics Row */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <BarChart3 className="h-4 w-4" />
                      Story Points
                    </div>
                    <div className="text-2xl font-bold">{selectedPoints}</div>
                    <div className="text-xs text-muted-foreground">
                      of {plan.totalStoryPoints} suggested
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      Capacity
                    </div>
                    <div className="text-2xl font-bold">{plan.capacityUtilization}%</div>
                    <Progress value={plan.capacityUtilization} className="mt-2 h-1" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      Risk Score
                    </div>
                    <div className={cn("text-2xl font-bold", getRiskColor(plan.riskScore))}>
                      {plan.riskScore}
                    </div>
                    <div className={cn("text-xs px-2 py-0.5 rounded-full inline-block mt-1", getRiskBg(plan.riskScore), getRiskColor(plan.riskScore))}>
                      {plan.riskScore <= 25 ? "Low Risk" : plan.riskScore <= 50 ? "Medium Risk" : plan.riskScore <= 75 ? "High Risk" : "Critical"}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Tasks
                    </div>
                    <div className="text-2xl font-bold">{selectedTasks.size}</div>
                    <div className="text-xs text-muted-foreground">
                      of {plan.suggestedTasks.length} selected
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Factors */}
              {plan.riskFactors.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Risk Factors
                    </h4>
                    <div className="space-y-2">
                      {plan.riskFactors.map((risk, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-start gap-3 p-2 rounded-lg",
                            risk.severity === "high"
                              ? "bg-red-500/10"
                              : risk.severity === "medium"
                              ? "bg-yellow-500/10"
                              : "bg-blue-500/10"
                          )}
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              risk.severity === "high"
                                ? "border-red-500 text-red-500"
                                : risk.severity === "medium"
                                ? "border-yellow-500 text-yellow-500"
                                : "border-blue-500 text-blue-500"
                            )}
                          >
                            {risk.severity}
                          </Badge>
                          <div className="flex-1">
                            <span className="text-sm font-medium capitalize">
                              {risk.type.replace("_", " ")}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {risk.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {plan.recommendations.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <button
                      onClick={() => setShowRecommendations(!showRecommendations)}
                      className="w-full flex items-center justify-between"
                    >
                      <h4 className="font-medium flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Recommendations ({plan.recommendations.length})
                      </h4>
                      {showRecommendations ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {showRecommendations && (
                      <ul className="mt-3 space-y-2">
                        {plan.recommendations.map((rec, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-primary mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Suggested Tasks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Suggested Tasks</h4>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deselectAll}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {plan.suggestedTasks.map((task) => (
                    <div
                      key={task.taskId}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        selectedTasks.has(task.taskId)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Checkbox
                        checked={selectedTasks.has(task.taskId)}
                        onCheckedChange={() => toggleTask(task.taskId)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {task.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {task.taskType}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              task.priority === "URGENT"
                                ? "border-red-500 text-red-500"
                                : task.priority === "HIGH"
                                ? "border-orange-500 text-orange-500"
                                : task.priority === "MEDIUM"
                                ? "border-yellow-500 text-yellow-500"
                                : "border-gray-500 text-gray-500"
                            )}
                          >
                            {task.priority}
                          </Badge>
                          {task.storyPoints && (
                            <Badge variant="secondary" className="text-xs">
                              {task.storyPoints} pts
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.reasoning}
                        </p>
                        {task.suggestedAssigneeName && (
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Suggested: {task.suggestedAssigneeName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {plan && (
            <>
              <Button variant="outline" onClick={() => setPlan(null)}>
                Regenerate
              </Button>
              <Button
                onClick={handleApplyPlan}
                disabled={isApplying || selectedTasks.size === 0}
              >
                {isApplying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Apply Plan ({selectedTasks.size} tasks)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
