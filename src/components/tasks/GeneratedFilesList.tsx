"use client";

import { GeneratedFileCard } from "./GeneratedFileCard";
import type { GeneratedFile } from "@/types";

interface GeneratedFilesListProps {
  files: GeneratedFile[];
}

export function GeneratedFilesList({ files }: GeneratedFilesListProps) {
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
        <GeneratedFileCard key={`${file.path}-${index}`} file={file} />
      ))}
    </div>
  );
}
