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
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ExecutionLogsProps {
  executions: Execution[];
}

const stepConfig: Record<ExecutionStep, { label: string; icon: typeof GitBranch }> = {
  CREATE_BRANCH: { label: "Create Branch", icon: GitBranch },
  GENERATE_CODE: { label: "Generate Code", icon: Code },
  COMMIT_FILES: { label: "Commit Files", icon: FileCode },
  CREATE_PR: { label: "Create Pull Request", icon: GitPullRequest },
  REQUEST_REVIEWERS: { label: "Request Reviewers", icon: Users },
  RESPOND_TO_REVIEW: { label: "Respond to Review", icon: MessageSquare },
  MERGE_PR: { label: "Merge Pull Request", icon: GitMerge },
  ANALYZE_COMMENT: { label: "Analyze Comment", icon: Search },
  RESPOND_TO_COMMENT: { label: "Respond to Comment", icon: Reply },
};

const statusConfig: Record<ExecutionStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  PENDING: { label: "Pending", icon: Clock, className: "text-muted-foreground" },
  RUNNING: { label: "Running", icon: Loader2, className: "text-blue-500 animate-spin" },
  COMPLETED: { label: "Completed", icon: CheckCircle, className: "text-green-500" },
  FAILED: { label: "Failed", icon: XCircle, className: "text-red-500" },
};

export function ExecutionLogs({ executions }: ExecutionLogsProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Execution History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {sortedExecutions.map((execution) => {
              const step = stepConfig[execution.step];
              const status = statusConfig[execution.status];
              const StepIcon = step.icon;
              const StatusIcon = status.icon;
              const isOpen = openItems.has(execution.id);

              return (
                <Collapsible
                  key={execution.id}
                  open={isOpen}
                  onOpenChange={() => toggleItem(execution.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      {/* Status indicator */}
                      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border">
                        <StatusIcon className={cn("h-4 w-4", status.className)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <StepIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{step.label}</span>
                          <Badge variant={execution.status === "FAILED" ? "destructive" : "secondary"}>
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
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-12 pl-4 border-l space-y-3 pb-4">
                      {/* Input */}
                      {execution.input != null ? (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Input:</span>
                          <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(execution.input, null, 2)}
                          </pre>
                        </div>
                      ) : null}

                      {/* Output */}
                      {execution.output != null ? (
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Output:</span>
                          <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(execution.output, null, 2)}
                          </pre>
                        </div>
                      ) : null}

                      {/* Error */}
                      {execution.error && (
                        <div>
                          <span className="text-xs font-medium text-destructive">Error:</span>
                          <pre className="mt-1 bg-destructive/10 text-destructive p-2 rounded text-xs overflow-x-auto">
                            {execution.error}
                          </pre>
                        </div>
                      )}

                      {/* Timing */}
                      {execution.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          Completed: {formatDateTime(execution.completedAt)}
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
