"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeEstimate {
  optimistic: number;
  realistic: number;
  pessimistic: number;
}

interface SimilarTask {
  taskId: string;
  title: string;
  actualPoints: number;
  actualCompletionTime: number | null;
  similarity: number;
  taskType: string;
}

interface ComplexityFactor {
  factor: string;
  impact: "low" | "medium" | "high";
  description: string;
}

interface TaskEstimation {
  storyPoints: number;
  confidence: "low" | "medium" | "high";
  timeEstimate: TimeEstimate;
  reasoning: string;
  similarTasks: SimilarTask[];
  complexityFactors: ComplexityFactor[];
  suggestions?: string[];
}

interface AIEstimateBadgeProps {
  taskId: string;
  currentStoryPoints: number | null;
  compact?: boolean;
  aiEnabled?: boolean;
  onEstimateApplied?: (points: number) => void;
}

export function AIEstimateBadge({
  taskId,
  currentStoryPoints,
  compact = false,
  aiEnabled = true,
  onEstimateApplied,
}: AIEstimateBadgeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [estimation, setEstimation] = useState<TaskEstimation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleEstimate() {
    setIsEstimating(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to estimate");
      }

      const data = await response.json();
      setEstimation(data.estimation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsEstimating(false);
    }
  }

  async function handleApply() {
    if (!estimation) return;

    setIsApplying(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/estimate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyPoints: estimation.storyPoints }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to apply estimate");
      }

      setOpen(false);
      router.refresh();
      onEstimateApplied?.(estimation.storyPoints);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsApplying(false);
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-green-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getConfidenceValue = (confidence: string) => {
    switch (confidence) {
      case "high":
        return 90;
      case "medium":
        return 60;
      case "low":
        return 30;
      default:
        return 50;
    }
  };

  if (!aiEnabled) {
    const disabledButton = (
      <Button
        variant="ghost"
        size="sm"
        className={cn("gap-1 opacity-50 cursor-not-allowed", compact ? "h-6 px-2 text-xs" : "gap-2")}
        disabled
      >
        <Sparkles className={compact ? "h-3 w-3" : "h-4 w-4"} />
        {compact ? "AI" : "AI Estimate"}
      </Button>
    );

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{disabledButton}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>AI Estimate uses AI to analyze task complexity and suggest story points. Enable AI in project settings to use this feature.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              if (!estimation) {
                handleEstimate();
              }
            }}
          >
            <Sparkles className="h-3 w-3" />
            {isEstimating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "AI"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
          {renderContent()}
        </PopoverContent>
      </Popover>
    );
  }

  function renderContent() {
    if (error) {
      return (
        <div className="text-center py-4">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleEstimate}>
            Try Again
          </Button>
        </div>
      );
    }

    if (isEstimating) {
      return (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Analyzing task...</p>
        </div>
      );
    }

    if (!estimation) {
      return (
        <div className="text-center py-4">
          <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Get an AI-powered estimate for this task
          </p>
          <Button onClick={handleEstimate} size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Estimate
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Main Estimate */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{estimation.storyPoints}</span>
              <span className="text-sm text-muted-foreground">points</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-sm font-medium capitalize", getConfidenceColor(estimation.confidence))}>
                {estimation.confidence} confidence
              </span>
            </div>
          </div>
          {currentStoryPoints !== null && currentStoryPoints !== estimation.storyPoints && (
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Current</span>
              <div className="text-lg font-medium text-muted-foreground line-through">
                {currentStoryPoints}
              </div>
            </div>
          )}
        </div>

        <Progress value={getConfidenceValue(estimation.confidence)} className="h-1" />

        <Separator />

        {/* Time Estimate */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            Time Estimate
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-green-500/10">
              <div className="text-sm font-medium text-green-600">
                {estimation.timeEstimate.optimistic}h
              </div>
              <div className="text-xs text-muted-foreground">Best</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <div className="text-sm font-medium text-blue-600">
                {estimation.timeEstimate.realistic}h
              </div>
              <div className="text-xs text-muted-foreground">Likely</div>
            </div>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <div className="text-sm font-medium text-orange-600">
                {estimation.timeEstimate.pessimistic}h
              </div>
              <div className="text-xs text-muted-foreground">Worst</div>
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4" />
            Reasoning
          </div>
          <p className="text-xs text-muted-foreground">
            {estimation.reasoning}
          </p>
        </div>

        {/* Complexity Factors */}
        {estimation.complexityFactors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Complexity Factors
            </div>
            <div className="space-y-1">
              {estimation.complexityFactors.slice(0, 3).map((factor, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 text-xs p-1.5 rounded",
                    factor.impact === "high"
                      ? "bg-red-500/10 text-red-600"
                      : factor.impact === "medium"
                      ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-blue-500/10 text-blue-600"
                  )}
                >
                  <Badge variant="outline" className="text-[10px] h-4">
                    {factor.impact}
                  </Badge>
                  <span>{factor.factor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Tasks */}
        {estimation.similarTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4" />
              Similar Tasks
            </div>
            <div className="space-y-1">
              {estimation.similarTasks.slice(0, 2).map((task, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50"
                >
                  <span className="truncate max-w-[180px]">{task.title}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {task.actualPoints} pts
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {estimation.suggestions && estimation.suggestions.length > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <strong>Tip:</strong> {estimation.suggestions[0]}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setEstimation(null);
              handleEstimate();
            }}
          >
            Re-estimate
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Apply
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            if (!estimation) {
              handleEstimate();
            }
          }}
        >
          <Sparkles className="h-4 w-4" />
          {isEstimating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "AI Estimate"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {renderContent()}
      </PopoverContent>
    </Popover>
  );
}
