"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GeneratedFilesList } from "./GeneratedFilesList";
import { FeedbackDialog } from "./FeedbackDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bot,
  Check,
  X,
  MessageSquarePlus,
  Loader2,
  FileCode,
  RefreshCw,
} from "lucide-react";
import type { GeneratedFile } from "@/types";

interface GeneratedCodeData {
  id: string;
  files: GeneratedFile[];
  summary: string;
  version: number;
  status: string;
  userFeedback: string | null;
  createdAt: string;
}

interface CodeReviewPanelProps {
  taskId: string;
}

export function CodeReviewPanel({ taskId }: CodeReviewPanelProps) {
  const router = useRouter();
  const [generatedCode, setGeneratedCode] = useState<GeneratedCodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    async function fetchGeneratedCode() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tasks/${taskId}/generated-code`);
        if (response.ok) {
          const data = await response.json();
          setGeneratedCode(data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to fetch generated code");
        }
      } catch (err) {
        setError("An error occurred while fetching generated code");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGeneratedCode();
  }, [taskId]);

  async function handleApprove() {
    if (!generatedCode) return;

    setIsApproving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/code-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          generatedCodeId: generatedCode.id,
        }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to approve code");
      }
    } catch (err) {
      setError("An error occurred while approving code");
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  }

  async function handleRequestChanges(feedback: string) {
    if (!generatedCode) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/code-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_changes",
          generatedCodeId: generatedCode.id,
          feedback,
        }),
      });

      if (response.ok) {
        setShowFeedbackDialog(false);
        router.refresh();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to request changes");
      }
    } catch (err) {
      setError("An error occurred while requesting changes");
      console.error(err);
    }
  }

  async function handleReject(deleteBranch: boolean) {
    if (!generatedCode) return;

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/code-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          generatedCodeId: generatedCode.id,
          deleteBranch,
        }),
      });

      if (response.ok) {
        setShowRejectDialog(false);
        router.refresh();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to reject code");
      }
    } catch (err) {
      setError("An error occurred while rejecting code");
      console.error(err);
    } finally {
      setIsRejecting(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          <span className="ml-2 text-amber-700 dark:text-amber-400">Loading generated code...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !generatedCode) {
    return (
      <Card className="border-red-500/30 bg-red-50/50 dark:bg-red-950/20">
        <CardContent className="py-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error || "No generated code found"}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              Code Review
              {generatedCode.version > 1 && (
                <Badge variant="secondary" className="ml-2">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  v{generatedCode.version}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-background">
                <FileCode className="h-3 w-3 mr-1" />
                {generatedCode.files.length} file{generatedCode.files.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="p-4 rounded-lg bg-background/50 border">
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">Summary</h4>
            <p className="text-sm leading-relaxed">{generatedCode.summary}</p>
          </div>

          {/* Previous feedback if exists */}
          {generatedCode.userFeedback && (
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <h4 className="text-sm font-medium mb-2 text-orange-700 dark:text-orange-400">
                Previous Feedback (Applied)
              </h4>
              <p className="text-sm text-orange-600 dark:text-orange-300 leading-relaxed">
                {generatedCode.userFeedback}
              </p>
            </div>
          )}

          {/* Files List */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Generated Files</h4>
            <ScrollArea className="h-[400px] rounded-lg border bg-background">
              <GeneratedFilesList files={generatedCode.files} />
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Approve & Continue
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowFeedbackDialog(true)}
              disabled={isApproving || isRejecting}
              className="flex-1"
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Request Changes
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={isApproving || isRejecting}
              className="text-destructive hover:bg-destructive/10"
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        onSubmit={handleRequestChanges}
      />

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Generated Code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard the generated code and return the task to an editable state.
              You can optionally delete the branch that was created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleReject(false)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject (Keep Branch)
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleReject(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject & Delete Branch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
