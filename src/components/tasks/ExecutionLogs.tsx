"use client";

import { useState } from "react";
import { Execution, ExecutionStatus, ExecutionStep } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  GitBranch,
  Code,
  FileCode,
  GitPullRequest,
  Users,
  MessageSquare,
  GitMerge,
  ChevronDown,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Search,
  Reply,
  History,
  Eye,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ExecutionLogsProps {
  executions: Execution[];
  maxVisible?: number;
}

const stepConfig: Record<ExecutionStep, { label: string; icon: typeof GitBranch; color: string }> = {
  CREATE_BRANCH: { label: "Create Branch", icon: GitBranch, color: "text-cyan-500" },
  GENERATE_CODE: { label: "Generate Code", icon: Code, color: "text-violet-500" },
  AWAIT_CODE_REVIEW: { label: "Awaiting Code Review", icon: Eye, color: "text-amber-500" },
  COMMIT_FILES: { label: "Commit Files", icon: FileCode, color: "text-blue-500" },
  CREATE_PR: { label: "Create Pull Request", icon: GitPullRequest, color: "text-green-500" },
  REQUEST_REVIEWERS: { label: "Request Reviewers", icon: Users, color: "text-amber-500" },
  RESPOND_TO_REVIEW: { label: "Respond to Review", icon: MessageSquare, color: "text-orange-500" },
  MERGE_PR: { label: "Merge Pull Request", icon: GitMerge, color: "text-emerald-500" },
  ANALYZE_COMMENT: { label: "Analyze Comment", icon: Search, color: "text-indigo-500" },
  RESPOND_TO_COMMENT: { label: "Respond to Comment", icon: Reply, color: "text-pink-500" },
  CHECK_CONFLICTS: { label: "Check Conflicts", icon: AlertTriangle, color: "text-yellow-500" },
  UPDATE_BRANCH: { label: "Update Branch", icon: RefreshCw, color: "text-blue-400" },
  RESOLVE_CONFLICTS: { label: "Resolve Conflicts", icon: Sparkles, color: "text-purple-500" },
};

const statusConfig: Record<ExecutionStatus, { label: string; icon: typeof CheckCircle; className: string; bgColor: string }> = {
  PENDING: { label: "Pending", icon: Clock, className: "text-muted-foreground", bgColor: "bg-muted" },
  RUNNING: { label: "Running", icon: Loader2, className: "text-blue-500 animate-spin", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  COMPLETED: { label: "Completed", icon: CheckCircle, className: "text-green-500", bgColor: "bg-green-100 dark:bg-green-900/30" },
  FAILED: { label: "Failed", icon: XCircle, className: "text-red-500", bgColor: "bg-red-100 dark:bg-red-900/30" },
};

export function ExecutionLogs({ executions, maxVisible = 5 }: ExecutionLogsProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  function toggleItem(id: string) {
    const newSet = new Set(openItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setOpenItems(newSet);
  }

  // Sort executions by creation date, newest first
  const sortedExecutions = [...executions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Limit visible executions unless showAll is true
  const visibleExecutions = showAll ? sortedExecutions : sortedExecutions.slice(0, maxVisible);
  const hiddenCount = sortedExecutions.length - maxVisible;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Execution History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-border to-border" />

          <div className="space-y-3">
            {visibleExecutions.map((execution, index) => {
              const step = stepConfig[execution.step];
              const status = statusConfig[execution.status];
              const StepIcon = step.icon;
              const StatusIcon = status.icon;
              const isOpen = openItems.has(execution.id);
              const isFirst = index === 0;

              return (
                <Collapsible
                  key={execution.id}
                  open={isOpen}
                  onOpenChange={() => toggleItem(execution.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className={cn(
                      "flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
                      "hover:bg-muted/50",
                      isFirst && "bg-muted/30"
                    )}>
                      {/* Status indicator */}
                      <div className={cn(
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                        status.bgColor,
                        execution.status === "COMPLETED" ? "border-green-500" :
                        execution.status === "FAILED" ? "border-red-500" :
                        execution.status === "RUNNING" ? "border-blue-500" : "border-border"
                      )}>
                        <StatusIcon className={cn("h-4 w-4", status.className)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <StepIcon className={cn("h-4 w-4", step.color)} />
                          <span className="font-medium text-sm">{step.label}</span>
                          <Badge
                            variant={
                              execution.status === "FAILED" ? "destructive" :
                              execution.status === "COMPLETED" ? "success" :
                              execution.status === "RUNNING" ? "info" : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {execution.startedAt
                            ? formatDateTime(execution.startedAt)
                            : formatDateTime(execution.createdAt)}
                        </p>
                      </div>

                      {/* Expand icon */}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-12 pl-4 border-l-2 border-border/50 space-y-3 pb-4 animate-fade-in">
                      {/* Input */}
                      {execution.input != null ? (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Input</span>
                          <pre className="mt-1.5 bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto font-mono border border-border/50">
                            {JSON.stringify(execution.input, null, 2)}
                          </pre>
                        </div>
                      ) : null}

                      {/* Output */}
                      {execution.output != null ? (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Output</span>
                          <pre className="mt-1.5 bg-muted/50 p-3 rounded-lg text-xs overflow-x-auto font-mono border border-border/50">
                            {JSON.stringify(execution.output, null, 2)}
                          </pre>
                        </div>
                      ) : null}

                      {/* Error */}
                      {execution.error && (
                        <div>
                          <span className="text-xs font-medium text-destructive uppercase tracking-wider">Error</span>
                          <pre className="mt-1.5 bg-destructive/10 text-destructive p-3 rounded-lg text-xs overflow-x-auto font-mono border border-destructive/20">
                            {execution.error}
                          </pre>
                        </div>
                      )}

                      {/* Timing */}
                      {execution.completedAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed: {formatDateTime(execution.completedAt)}
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {/* Show more/less button */}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="ml-12 flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <History className="h-4 w-4" />
                {showAll ? "Show less" : `Show ${hiddenCount} more execution${hiddenCount > 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
