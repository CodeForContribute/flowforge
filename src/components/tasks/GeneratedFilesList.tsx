"use client";

import { GeneratedFileCard } from "./GeneratedFileCard";
import type { GeneratedFile } from "@/types";

interface GeneratedFilesListProps {
  files: GeneratedFile[];
  onFileContentChange?: (path: string, newContent: string) => void;
}

export function GeneratedFilesList({ files, onFileContentChange }: GeneratedFilesListProps) {
  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No files generated
      </div>
    );
  }

  return (
    <div className="divide-y">
      {files.map((file, index) => (
        <GeneratedFileCard
          key={`${file.path}-${index}`}
          file={file}
          onContentChange={onFileContentChange}
        />
      ))}
    </div>
  );
}
