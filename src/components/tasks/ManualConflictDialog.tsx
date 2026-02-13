"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConflictFileEditor } from "./ConflictFileEditor";
import { GitBranch, Loader2, CheckCircle, XCircle, FileCode } from "lucide-react";

interface ConflictFile {
  path: string;
  baseContent: string | null;
  headContent: string | null;
}

interface ManualConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  onResolved: () => void;
}

export function ManualConflictDialog({
  open,
  onOpenChange,
  taskId,
  onResolved,
}: ManualConflictDialogProps) {
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [baseBranch, setBaseBranch] = useState("");
  const [headBranch, setHeadBranch] = useState("");
  const [conflictFiles, setConflictFiles] = useState<ConflictFile[]>([]);
  const [mergedContents, setMergedContents] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchConflictDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId]);

  async function fetchConflictDetails() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/conflicts`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch conflict details");
      }

      setBaseBranch(data.baseBranch);
      setHeadBranch(data.headBranch);

      // Fetch detailed content for each conflicting file
      const detailsResponse = await fetch(`/api/tasks/${taskId}/conflicts/details`);

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        setConflictFiles(detailsData.conflicts || []);
        setBaseBranch(detailsData.baseBranch);
        setHeadBranch(detailsData.headBranch);

        // Initialize merged contents with head content as default
        const initialMerged: Record<string, string> = {};
        for (const file of detailsData.conflicts || []) {
          initialMerged[file.path] = file.headContent || file.baseContent || "";
        }
        setMergedContents(initialMerged);

        // Set first file as active tab
        if (detailsData.conflicts?.length > 0) {
          setActiveTab(detailsData.conflicts[0].path);
        }
      } else {
        // Fallback: use the conflict info from the first response
        const files = data.conflictingFiles?.map((f: { path: string }) => ({
          path: f.path,
          baseContent: null,
          headContent: null,
        })) || [];
        setConflictFiles(files);

        if (files.length > 0) {
          setActiveTab(files[0].path);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conflict details");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    setCommitting(true);
    setResult(null);

    try {
      const resolvedFiles = conflictFiles.map((file) => ({
        path: file.path,
        content: mergedContents[file.path] || "",
      }));

      const response = await fetch(`/api/tasks/${taskId}/conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_resolve",
          resolvedFiles,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({ type: "success", message: "Conflicts resolved successfully!" });
        setTimeout(() => {
          onOpenChange(false);
          onResolved();
        }, 1500);
      } else {
        setResult({ type: "error", message: data.message || "Failed to resolve conflicts" });
      }
    } catch (err) {
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to commit resolved files",
      });
    } finally {
      setCommitting(false);
    }
  }

  function updateMergedContent(path: string, content: string) {
    setMergedContents((prev) => ({ ...prev, [path]: content }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Manual Conflict Resolution
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <span>
              Merging <span className="font-mono text-green-600 dark:text-green-400">{headBranch}</span>
              {" into "}
              <span className="font-mono text-blue-600 dark:text-blue-400">{baseBranch}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading conflict details...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-500">
              <XCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          ) : conflictFiles.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No conflicting files found
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="w-full justify-start overflow-x-auto">
                {conflictFiles.map((file) => (
                  <TabsTrigger key={file.path} value={file.path} className="font-mono text-xs">
                    {file.path.split("/").pop()}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex-1 overflow-auto mt-4">
                {conflictFiles.map((file) => (
                  <TabsContent key={file.path} value={file.path} className="m-0">
                    <ConflictFileEditor
                      path={file.path}
                      baseContent={file.baseContent}
                      headContent={file.headContent}
                      baseBranch={baseBranch}
                      headBranch={headBranch}
                      mergedContent={mergedContents[file.path] || ""}
                      onMergedContentChange={(content) => updateMergedContent(file.path, content)}
                    />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          )}
        </div>

        {result && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              result.type === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {result.message}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={committing}>
            Cancel
          </Button>
          <Button
            onClick={handleCommit}
            disabled={loading || committing || conflictFiles.length === 0}
          >
            {committing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Committing...
              </>
            ) : (
              "Commit Resolved Files"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
