"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TrendingDown,
  TrendingUp,
  Users,
  Link2,
  Lightbulb,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskFactor {
  category: string;
  factor: string;
  impact: number;
  description: string;
}

interface TaskRisk {
  taskId: string;
  title: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: RiskFactor[];
  mitigations: string[];
}

interface RiskRecommendation {
  priority: "low" | "medium" | "high";
  recommendation: string;
  affectedTaskIds: string[];
  potentialImpact: string;
}

interface DependencyNode {
  taskId: string;
  title: string;
  status: string;
  storyPoints: number | null;
  inDegree: number;
  outDegree: number;
  isCritical: boolean;
}

interface Dependency {
  fromTaskId: string;
  toTaskId: string;
  type: string;
}

interface DependencyGraph {
  nodes: DependencyNode[];
  edges: Dependency[];
  criticalPath: string[];
  orphanTasks: string[];
}

interface CapacityAnalysis {
  totalCapacityHours: number;
  estimatedWorkHours: number;
  utilizationRate: number;
  overCommitted: boolean;
  bufferHours: number;
}

interface SprintRiskAssessment {
  overallRiskScore: number;
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  successProbability: number;
  taskRisks: TaskRisk[];
  sprintRiskFactors: RiskFactor[];
  criticalTasks: string[];
  recommendations: RiskRecommendation[];
  dependencyGraph: DependencyGraph;
  capacityAnalysis: CapacityAnalysis;
}

interface RiskDashboardProps {
  sprintId: string;
  sprintName: string;
  aiEnabled?: boolean;
}

export function RiskDashboard({ sprintId, sprintName, aiEnabled = true }: RiskDashboardProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [assessment, setAssessment] = useState<SprintRiskAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAssessRisk() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sprints/${sprintId}/risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assess risk");
      }

      const data = await response.json();
      setAssessment(data.assessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "low":
        return <ShieldCheck className="h-6 w-6 text-green-500" />;
      case "medium":
        return <Shield className="h-6 w-6 text-yellow-500" />;
      case "high":
        return <ShieldAlert className="h-6 w-6 text-orange-500" />;
      case "critical":
        return <ShieldX className="h-6 w-6 text-red-500" />;
      default:
        return <Shield className="h-6 w-6" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "high":
        return "text-orange-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-500/10";
      case "medium":
        return "bg-yellow-500/10";
      case "high":
        return "bg-orange-500/10";
      case "critical":
        return "bg-red-500/10";
      default:
        return "bg-muted";
    }
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 80) return "text-green-500";
    if (probability >= 60) return "text-yellow-500";
    if (probability >= 40) return "text-orange-500";
    return "text-red-500";
  };

  if (!aiEnabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button variant="outline" disabled className="gap-2 opacity-50 cursor-not-allowed">
              <AlertTriangle className="h-4 w-4" />
              Risk Assessment
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>Risk Assessment uses AI to analyze sprint risks, dependencies, and success probability. Enable AI in project settings to use this feature.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Risk Assessment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            Sprint Risk Assessment
          </DialogTitle>
          <DialogDescription>
            AI-powered risk analysis for &quot;{sprintName}&quot;
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!assessment ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            {isLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing sprint risks and dependencies...
                </p>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-orange-500" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium">Assess Sprint Risk</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Identify potential risks, analyze dependencies, and get
                    recommendations to improve sprint success probability.
                  </p>
                </div>
                <Button onClick={handleAssessRisk} className="mt-4">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Run Assessment
                </Button>
              </>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks">Task Risks</TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 pr-4">
                {/* Risk Score Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className={cn(getRiskBg(assessment.overallRiskLevel))}>
                    <CardContent className="pt-6 text-center">
                      {getRiskIcon(assessment.overallRiskLevel)}
                      <div className={cn("text-4xl font-bold mt-2", getRiskColor(assessment.overallRiskLevel))}>
                        {assessment.overallRiskScore}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Risk Score
                      </div>
                      <Badge
                        className={cn(
                          "mt-2",
                          getRiskBg(assessment.overallRiskLevel),
                          getRiskColor(assessment.overallRiskLevel)
                        )}
                      >
                        {assessment.overallRiskLevel.toUpperCase()} RISK
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      {assessment.successProbability >= 60 ? (
                        <TrendingUp className="h-6 w-6 mx-auto text-green-500" />
                      ) : (
                        <TrendingDown className="h-6 w-6 mx-auto text-red-500" />
                      )}
                      <div className={cn("text-4xl font-bold mt-2", getSuccessColor(assessment.successProbability))}>
                        {assessment.successProbability}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Success Probability
                      </div>
                      <Progress
                        value={assessment.successProbability}
                        className="h-2 mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      <AlertCircle className="h-6 w-6 mx-auto text-orange-500" />
                      <div className="text-4xl font-bold mt-2 text-orange-500">
                        {assessment.criticalTasks.length}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Critical Tasks
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        of {assessment.taskRisks.length} total
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Capacity Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Capacity Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {assessment.capacityAnalysis.totalCapacityHours}h
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total Capacity
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {assessment.capacityAnalysis.estimatedWorkHours}h
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Estimated Work
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={cn(
                          "text-2xl font-bold",
                          assessment.capacityAnalysis.overCommitted ? "text-red-500" : "text-green-500"
                        )}>
                          {assessment.capacityAnalysis.utilizationRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Utilization
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={cn(
                          "text-2xl font-bold",
                          assessment.capacityAnalysis.bufferHours > 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {assessment.capacityAnalysis.bufferHours}h
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Buffer
                        </div>
                      </div>
                    </div>
                    {assessment.capacityAnalysis.overCommitted && (
                      <div className="mt-4 p-3 rounded-lg bg-red-500/10 flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                        <span className="text-sm text-red-600">
                          Sprint is over-committed. Consider reducing scope or extending timeline.
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sprint Risk Factors */}
                {assessment.sprintRiskFactors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Sprint Risk Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {assessment.sprintRiskFactors.map((factor, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-orange-500">
                                {factor.impact}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm capitalize">
                                  {factor.category.replace("_", " ")}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {factor.factor}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {factor.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Task Risks Tab */}
              <TabsContent value="tasks" className="space-y-4 pr-4">
                <div className="grid gap-3">
                  {assessment.taskRisks
                    .sort((a, b) => b.riskScore - a.riskScore)
                    .map((task) => (
                      <Card
                        key={task.taskId}
                        className={cn(
                          "border-l-4",
                          task.riskLevel === "critical"
                            ? "border-l-red-500"
                            : task.riskLevel === "high"
                            ? "border-l-orange-500"
                            : task.riskLevel === "medium"
                            ? "border-l-yellow-500"
                            : "border-l-green-500"
                        )}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{task.title}</span>
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    getRiskBg(task.riskLevel),
                                    getRiskColor(task.riskLevel)
                                  )}
                                >
                                  {task.riskScore}
                                </Badge>
                              </div>

                              {task.riskFactors.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {task.riskFactors.map((factor, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {factor.factor}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {task.mitigations.length > 0 && (
                                <div className="mt-3 space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">
                                    Mitigations:
                                  </div>
                                  {task.mitigations.slice(0, 2).map((m, i) => (
                                    <div
                                      key={i}
                                      className="text-xs text-muted-foreground flex items-start gap-1"
                                    >
                                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />
                                      {m}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={cn("text-2xl font-bold", getRiskColor(task.riskLevel))}>
                                {task.riskScore}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {task.riskLevel}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              {/* Dependencies Tab */}
              <TabsContent value="dependencies" className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        Critical Path
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {assessment.dependencyGraph.criticalPath.length > 0 ? (
                        <div className="space-y-2">
                          {assessment.dependencyGraph.criticalPath.map((taskId, i) => {
                            const node = assessment.dependencyGraph.nodes.find(
                              (n) => n.taskId === taskId
                            );
                            return (
                              <div
                                key={taskId}
                                className="flex items-center gap-2"
                              >
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                                  {i + 1}
                                </div>
                                <span className="text-sm truncate">
                                  {node?.title || taskId}
                                </span>
                                {node?.storyPoints && (
                                  <Badge variant="secondary" className="text-xs ml-auto">
                                    {node.storyPoints} pts
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No critical path identified
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dependency Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Dependencies</span>
                          <span className="font-medium">
                            {assessment.dependencyGraph.edges.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Critical Path Length</span>
                          <span className="font-medium">
                            {assessment.dependencyGraph.criticalPath.length} tasks
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Orphan Tasks</span>
                          <span className="font-medium">
                            {assessment.dependencyGraph.orphanTasks.length}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Dependency Nodes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Task Dependencies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {assessment.dependencyGraph.nodes
                        .sort((a, b) => b.inDegree + b.outDegree - (a.inDegree + a.outDegree))
                        .slice(0, 10)
                        .map((node) => (
                          <div
                            key={node.taskId}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg",
                              node.isCritical ? "bg-primary/10" : "bg-muted/50"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {node.title}
                                </span>
                                {node.isCritical && (
                                  <Badge variant="default" className="text-xs">
                                    Critical
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {node.status}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <div className="text-center">
                                <div className="font-medium">{node.inDegree}</div>
                                <div className="text-muted-foreground">Blocked by</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium">{node.outDegree}</div>
                                <div className="text-muted-foreground">Blocks</div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="space-y-4 pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Recommendations ({assessment.recommendations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {assessment.recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-4 rounded-lg border",
                            rec.priority === "high"
                              ? "border-red-500/50 bg-red-500/5"
                              : rec.priority === "medium"
                              ? "border-yellow-500/50 bg-yellow-500/5"
                              : "border-blue-500/50 bg-blue-500/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs shrink-0",
                                rec.priority === "high"
                                  ? "border-red-500 text-red-500"
                                  : rec.priority === "medium"
                                  ? "border-yellow-500 text-yellow-500"
                                  : "border-blue-500 text-blue-500"
                              )}
                            >
                              {rec.priority}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {rec.recommendation}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {rec.potentialImpact}
                              </p>
                              {rec.affectedTaskIds.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  Affects {rec.affectedTaskIds.length} task(s)
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
