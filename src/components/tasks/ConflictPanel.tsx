"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  GitBranch,
  GitMerge,
  RefreshCw,
  Sparkles,
  FileCode,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowDown,
  Edit,
} from "lucide-react";
import { ManualConflictDialog } from "./ManualConflictDialog";
import { cn } from "@/lib/utils";
import { MergeConflictInfo } from "@/types";

interface ConflictPanelProps {
  taskId: string;
  conflictInfo?: MergeConflictInfo | null;
  prNumber: number;
}

export function ConflictPanel({ taskId, conflictInfo }: ConflictPanelProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [currentConflictInfo, setCurrentConflictInfo] = useState<MergeConflictInfo | null>(
    conflictInfo || null
  );
  const [manualResolveOpen, setManualResolveOpen] = useState(false);

  async function checkForConflicts() {
    setIsChecking(true);
    setResult(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/conflicts`);
      const data = await response.json();

      if (response.ok) {
        setCurrentConflictInfo(data);
        if (!data.hasConflicts) {
          setResult({ type: "success", message: "No conflicts - ready to merge!" });
        }
      } else {
        setResult({ type: "error", message: data.error || "Failed to check conflicts" });
      }
    } catch {
      setResult({ type: "error", message: "Failed to check conflicts" });
    } finally {
      setIsChecking(false);
      router.refresh();
    }
  }

  async function updateBranch() {
    setIsUpdating(true);
    setResult(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_branch" }),
      });
      const data = await response.json();

      if (data.success) {
        setResult({
          type: "success",
          message: data.conflictsResolved
            ? "Branch updated and conflicts resolved!"
            : "Branch updated, but some conflicts remain",
        });
        if (data.conflictsResolved) {
          setCurrentConflictInfo(null);
        }
      } else {
        setResult({
          type: "error",
          message: data.message || "Failed to update branch",
        });
      }
    } catch {
      setResult({ type: "error", message: "Failed to update branch" });
    } finally {
      setIsUpdating(false);
      router.refresh();
    }
  }

  async function resolveWithAI() {
    setIsResolving(true);
    setResult(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_resolve" }),
      });
      const data = await response.json();

      if (data.success) {
        setResult({
          type: "success",
          message: `Conflicts resolved: ${data.summary}`,
        });
        setCurrentConflictInfo(null);
      } else {
        setResult({
          type: "error",
          message: data.message || "AI could not resolve conflicts",
        });
      }
    } catch {
      setResult({ type: "error", message: "Failed to resolve conflicts" });
    } finally {
      setIsResolving(false);
      router.refresh();
    }
  }

  const hasConflicts = currentConflictInfo?.hasConflicts;
  const isBehind = (currentConflictInfo?.behindByCommits || 0) > 0;

  return (
    <Card className={cn(
      "border-2",
      hasConflicts ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20" : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {hasConflicts ? (
            <>
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 dark:text-red-400">Merge Conflicts Detected</span>
            </>
          ) : isBehind ? (
            <>
              <ArrowDown className="h-5 w-5 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-400">Branch Behind Base</span>
            </>
          ) : (
            <>
              <GitMerge className="h-5 w-5 text-green-500" />
              <span className="text-green-700 dark:text-green-400">Ready to Merge</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conflict Info */}
        {currentConflictInfo && (
          <div className="space-y-3">
            {/* Branch Status */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {currentConflictInfo.headBranch}
                </span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {currentConflictInfo.baseBranch}
                </span>
              </div>
            </div>

            {/* Commit Status */}
            <div className="flex gap-4 text-sm">
              {currentConflictInfo.behindByCommits > 0 && (
                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  {currentConflictInfo.behindByCommits} commits behind
                </Badge>
              )}
              {currentConflictInfo.aheadByCommits > 0 && (
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  {currentConflictInfo.aheadByCommits} commits ahead
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  currentConflictInfo.mergeableState === "clean"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : currentConflictInfo.mergeableState === "dirty"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    : "bg-gray-100 dark:bg-gray-800/50"
                )}
              >
                {currentConflictInfo.mergeableState}
              </Badge>
            </div>

            {/* Conflicting Files */}
            {hasConflicts && currentConflictInfo.conflictingFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Conflicting Files ({currentConflictInfo.conflictingFiles.length}):
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {currentConflictInfo.conflictingFiles.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-center gap-2 text-sm bg-white dark:bg-gray-900 px-2 py-1 rounded"
                    >
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-xs">{file.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result Message */}
        {result && (
          <div
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg text-sm",
              result.type === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            )}
          >
            {result.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {result.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkForConflicts}
            disabled={isChecking || isUpdating || isResolving}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Check Status
          </Button>

          {isBehind && (
            <Button
              variant="outline"
              size="sm"
              onClick={updateBranch}
              disabled={isChecking || isUpdating || isResolving}
              className="border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <GitMerge className="h-4 w-4 mr-2" />
              )}
              Update Branch
            </Button>
          )}

          {hasConflicts && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManualResolveOpen(true)}
                disabled={isChecking || isUpdating || isResolving}
              >
                <Edit className="h-4 w-4 mr-2" />
                Manual Resolve
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={resolveWithAI}
                disabled={isChecking || isUpdating || isResolving}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {isResolving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Resolve with AI
              </Button>
            </>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground">
          {hasConflicts
            ? "AI will analyze both versions and create a merged result that preserves your changes."
            : isBehind
            ? "Your branch is behind the base branch. Update to include the latest changes."
            : "Your branch is up to date and ready to merge."}
        </p>
      </CardContent>

      {/* Manual Conflict Resolution Dialog */}
      <ManualConflictDialog
        open={manualResolveOpen}
        onOpenChange={setManualResolveOpen}
        taskId={taskId}
        onResolved={() => {
          setCurrentConflictInfo(null);
          setResult({ type: "success", message: "Conflicts resolved manually!" });
          router.refresh();
        }}
      />
    </Card>
  );
}
