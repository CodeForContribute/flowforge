"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Paperclip,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  Download,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: Date;
  uploadedBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface AttachmentsSectionProps {
  taskId: string;
  attachments: Attachment[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.includes("pdf") || type.includes("document")) return FileText;
  return File;
}

export function AttachmentsSection({ taskId, attachments: initialAttachments }: AttachmentsSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setAttachments((prev) => [data.attachment, ...prev]);
        } else {
          const error = await response.json();
          alert(error.error || "Failed to upload file");
        }
      }
      router.refresh();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("An error occurred while uploading");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    setDeletingId(attachmentId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete attachment");
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      alert("An error occurred while deleting");
    } finally {
      setDeletingId(null);
    }
  }

  function handleDownload(attachment: Attachment) {
    const link = document.createElement("a");
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            Attachments
            {attachments.length > 0 && (
              <span className="text-xs text-muted-foreground">({attachments.length})</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            accept="image/*,.pdf,.doc,.docx,.txt,.md,.json,.csv,.xls,.xlsx"
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
              "hover:border-primary/50 hover:bg-primary/5"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Images, PDFs, documents (max 10MB)
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.type);
              const isImage = attachment.type.startsWith("image/");

              return (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group"
                >
                  {isImage ? (
                    <div
                      className="h-10 w-10 rounded overflow-hidden cursor-pointer flex-shrink-0"
                      onClick={() => setPreviewUrl(attachment.url)}
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)} &bull;{" "}
                      {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(attachment)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deletingId === attachment.id}
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Add more files
            </Button>
          </div>
        )}

        {/* Image Preview Modal */}
        {previewUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
