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
  Sparkles,
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  Lightbulb,
  ListChecks,
  Clock,
  Users,
  Minus,
  ThumbsUp,
  ThumbsDown,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Achievement {
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  relatedTaskIds?: string[];
}

interface Challenge {
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  rootCause?: string;
  relatedTaskIds?: string[];
}

interface Recommendation {
  title: string;
  description: string;
  category: "process" | "technical" | "team" | "planning";
  priority: "low" | "medium" | "high";
  actionable: boolean;
}

interface ActionItem {
  title: string;
  description: string;
  owner?: string;
  dueDate?: string;
  category: string;
}

interface SprintMetrics {
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

interface VelocityTrend {
  sprintName: string;
  velocity: number;
  completionRate: number;
}

interface SprintRetrospective {
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

interface AIRetroViewProps {
  sprintId: string;
  sprintName: string;
}

export function AIRetroView({
  sprintId,
  sprintName,
}: AIRetroViewProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [retro, setRetro] = useState<SprintRetrospective | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateRetro() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sprints/${sprintId}/retro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate retrospective");
      }

      const data = await response.json();
      setRetro(data.retrospective);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="h-5 w-5 text-green-500" />;
      case "negative":
        return <ThumbsDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    if (score >= 4) return "text-orange-500";
    return "text-red-500";
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "border-green-500 text-green-500 bg-green-500/10";
      case "medium":
        return "border-yellow-500 text-yellow-500 bg-yellow-500/10";
      default:
        return "border-blue-500 text-blue-500 bg-blue-500/10";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-500 text-red-500 bg-red-500/10";
      case "medium":
        return "border-orange-500 text-orange-500 bg-orange-500/10";
      default:
        return "border-yellow-500 text-yellow-500 bg-yellow-500/10";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "process":
        return "bg-blue-500/10 text-blue-600";
      case "technical":
        return "bg-purple-500/10 text-purple-600";
      case "team":
        return "bg-green-500/10 text-green-600";
      case "planning":
        return "bg-orange-500/10 text-orange-600";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Retrospective
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            AI Sprint Retrospective
          </DialogTitle>
          <DialogDescription>
            AI-generated insights and analysis for &quot;{sprintName}&quot;
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!retro ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            {isLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing sprint data and generating insights...
                </p>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-medium">Ready for retrospective</p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Generate AI-powered insights from sprint data including task completion,
                    blockers, and team performance patterns.
                  </p>
                </div>
                <Button onClick={handleGenerateRetro} className="mt-4">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Retrospective
                </Button>
              </>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="achievements">Wins</TabsTrigger>
                <TabsTrigger value="challenges">Challenges</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 pr-4">
                {/* Summary Card */}
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">{retro.summary}</p>
                  </CardContent>
                </Card>

                {/* Score and Sentiment */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className={cn("text-4xl font-bold", getScoreColor(retro.overallScore))}>
                        {retro.overallScore}/10
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Overall Score
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getSentimentIcon(retro.teamSentiment)}
                        <span className="text-lg font-medium capitalize">
                          {retro.teamSentiment}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Team Sentiment
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-4xl font-bold text-primary">
                        {retro.metrics.velocity}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Velocity (points)
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        Completion
                      </div>
                      <div className="mt-2">
                        <div className="text-2xl font-bold">
                          {retro.metrics.completionRate}%
                        </div>
                        <Progress value={retro.metrics.completionRate} className="h-1 mt-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        Tasks Done
                      </div>
                      <div className="text-2xl font-bold mt-2">
                        {retro.metrics.completedTasks}/{retro.metrics.totalTasks}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Avg Task Age
                      </div>
                      <div className="text-2xl font-bold mt-2">
                        {retro.metrics.averageTaskAge} days
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        Blocked Time
                      </div>
                      <div className="text-2xl font-bold mt-2">
                        ~{retro.metrics.blockedTime}h
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Velocity Trend */}
                {retro.velocityTrend.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Velocity Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-4 h-24">
                        {retro.velocityTrend.map((trend, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-primary/20 rounded-t"
                              style={{
                                height: `${Math.max(10, (trend.velocity / Math.max(...retro.velocityTrend.map(t => t.velocity))) * 80)}%`,
                              }}
                            />
                            <div className="text-xs text-muted-foreground mt-1 truncate max-w-full">
                              {trend.sprintName}
                            </div>
                            <div className="text-xs font-medium">{trend.velocity} pts</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Recommendations */}
                {retro.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        Top Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {retro.recommendations.slice(0, 3).map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <Badge className={cn("text-xs", getCategoryColor(rec.category))}>
                              {rec.category}
                            </Badge>
                            <div>
                              <div className="font-medium text-sm">{rec.title}</div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {rec.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value="achievements" className="space-y-4 pr-4">
                <div className="grid gap-3">
                  {retro.achievements.map((achievement, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{achievement.title}</span>
                              <Badge variant="outline" className={cn("text-xs", getImpactColor(achievement.impact))}>
                                {achievement.impact} impact
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {achievement.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Challenges Tab */}
              <TabsContent value="challenges" className="space-y-4 pr-4">
                <div className="grid gap-3">
                  {retro.challenges.map((challenge, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{challenge.title}</span>
                              <Badge variant="outline" className={cn("text-xs", getSeverityColor(challenge.severity))}>
                                {challenge.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {challenge.description}
                            </p>
                            {challenge.rootCause && (
                              <div className="mt-2 text-xs bg-muted/50 p-2 rounded">
                                <strong>Root Cause:</strong> {challenge.rootCause}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="space-y-4 pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      Action Items ({retro.actionItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {retro.actionItems.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg border"
                        >
                          <div className="h-6 w-6 rounded-full border-2 border-primary/50 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{item.title}</span>
                              <Badge className={cn("text-xs", getCategoryColor(item.category))}>
                                {item.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.description}
                            </p>
                            {item.owner && (
                              <div className="flex items-center gap-2 mt-2">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {item.owner}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      All Recommendations ({retro.recommendations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {retro.recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
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
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{rec.title}</span>
                              <Badge className={cn("text-xs", getCategoryColor(rec.category))}>
                                {rec.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {rec.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Planned</span>
                          <span className="font-medium">{retro.metrics.plannedPoints}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="font-medium">{retro.metrics.completedPoints}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Velocity</span>
                          <span className="font-medium">{retro.metrics.velocity}</span>
                        </div>
                        <Progress value={retro.metrics.completionRate} />
                        <div className="text-center text-sm text-muted-foreground">
                          {retro.metrics.completionRate}% Completion Rate
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-medium">{retro.metrics.totalTasks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="font-medium">{retro.metrics.completedTasks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Added Mid-Sprint</span>
                          <span className="font-medium">{retro.metrics.addedMidSprint}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Task Age</span>
                          <span className="font-medium">{retro.metrics.averageTaskAge} days</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Time Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 p-4 rounded-lg bg-muted/50 text-center">
                        <div className="text-2xl font-bold">{retro.metrics.averageTaskAge}</div>
                        <div className="text-xs text-muted-foreground">Avg Days to Complete</div>
                      </div>
                      <div className="flex-1 p-4 rounded-lg bg-orange-500/10 text-center">
                        <div className="text-2xl font-bold text-orange-600">~{retro.metrics.blockedTime}h</div>
                        <div className="text-xs text-muted-foreground">Estimated Blocked Time</div>
                      </div>
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
