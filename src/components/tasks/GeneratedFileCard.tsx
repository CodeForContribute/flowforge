"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FilePlus,
  FileEdit,
  FileX,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedFile } from "@/types";

interface GeneratedFileCardProps {
  file: GeneratedFile;
}

const actionConfig = {
  create: {
    label: "Create",
    icon: FilePlus,
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  update: {
    label: "Update",
    icon: FileEdit,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  delete: {
    label: "Delete",
    icon: FileX,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

function getFileExtension(path: string): string {
  const parts = path.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    cpp: "c++",
    c: "c",
    h: "c",
    cs: "c#",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    dockerfile: "dockerfile",
    prisma: "prisma",
  };
  return map[ext.toLowerCase()] || ext || "text";
}

export function GeneratedFileCard({ file }: GeneratedFileCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = actionConfig[file.action];
  const ActionIcon = config.icon;
  const ext = getFileExtension(file.path);
  const language = getLanguageFromExtension(ext);
  const lineCount = file.content.split("\n").length;

  async function handleCopy() {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}

          <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <span className="font-mono text-sm truncate block">{file.path}</span>
          </div>

          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {lineCount} lines
          </Badge>

          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 gap-1", config.className)}
          >
            <ActionIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 pb-3">
          <div className="relative rounded-lg border bg-zinc-950 dark:bg-zinc-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900 dark:bg-zinc-800/50">
              <span className="text-xs text-zinc-400 font-mono">{language}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Code content */}
            <div className="overflow-x-auto max-h-[400px]">
              <pre className="p-4 text-sm">
                <code className="text-zinc-200 font-mono whitespace-pre">
                  {file.action === "delete" ? (
                    <span className="text-red-400 italic">
                      This file will be deleted
                    </span>
                  ) : (
                    file.content
                  )}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
