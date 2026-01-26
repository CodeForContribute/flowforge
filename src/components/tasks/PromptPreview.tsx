"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Loader2 } from "lucide-react";

interface PromptPreviewProps {
  prompt: string;
  onUpdate: (prompt: string) => void;
  taskId: string;
}

export function PromptPreview({ prompt, onUpdate, taskId }: PromptPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatedPrompt: editedPrompt }),
      });
      if (response.ok) {
        onUpdate(editedPrompt);
        setIsEditing(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save prompt");
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
      alert("An error occurred while saving the prompt");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Textarea
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          rows={20}
          className="font-mono text-sm"
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditedPrompt(prompt);
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
      </div>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
        {prompt}
      </pre>
    </div>
  );
}
