"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, GitBranch } from "lucide-react";

interface ConflictFileEditorProps {
  path: string;
  baseContent: string | null;
  headContent: string | null;
  baseBranch: string;
  headBranch: string;
  mergedContent: string;
  onMergedContentChange: (content: string) => void;
}

export function ConflictFileEditor({
  path,
  baseContent,
  headContent,
  baseBranch,
  headBranch,
  mergedContent,
  onMergedContentChange,
}: ConflictFileEditorProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-mono text-muted-foreground">{path}</div>

      <div className="grid grid-cols-3 gap-3">
        {/* Base Branch Content (read-only) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GitBranch className="h-4 w-4 text-blue-500" />
              <span className="text-blue-600 dark:text-blue-400">{baseBranch}</span>
              <span className="text-muted-foreground">(base)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMergedContentChange(baseContent || "")}
              className="h-7 px-2 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy to Merged
            </Button>
          </div>
          <pre className="h-[400px] overflow-auto rounded-lg border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap break-all">
            {baseContent || "(file does not exist in this branch)"}
          </pre>
        </div>

        {/* Head Branch Content (read-only) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GitBranch className="h-4 w-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">{headBranch}</span>
              <span className="text-muted-foreground">(head)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMergedContentChange(headContent || "")}
              className="h-7 px-2 text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy to Merged
            </Button>
          </div>
          <pre className="h-[400px] overflow-auto rounded-lg border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap break-all">
            {headContent || "(file does not exist in this branch)"}
          </pre>
        </div>

        {/* Merged Content (editable) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-purple-600 dark:text-purple-400">Merged Result</span>
            <span className="text-muted-foreground">(editable)</span>
          </div>
          <Textarea
            value={mergedContent}
            onChange={(e) => onMergedContentChange(e.target.value)}
            className="h-[400px] font-mono text-xs resize-none"
            placeholder="Write your merged content here..."
          />
        </div>
      </div>
    </div>
  );
}
