"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Check, Plus, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelSelectorProps {
  projectId: string;
  value: Label[];
  onChange: (value: Label[]) => void;
  disabled?: boolean;
}

const predefinedColors = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function LabelSelector({
  projectId,
  value,
  onChange,
  disabled,
}: LabelSelectorProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(predefinedColors[4]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function fetchLabels() {
      try {
        const response = await fetch(`/api/projects/${projectId}/labels`);
        if (response.ok) {
          const data = await response.json();
          setLabels(data.labels);
        }
      } catch (error) {
        console.error("Error fetching labels:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLabels();
  }, [projectId]);

  function isSelected(labelId: string) {
    return value.some((l) => l.id === labelId);
  }

  function toggleLabel(label: Label) {
    if (isSelected(label.id)) {
      onChange(value.filter((l) => l.id !== label.id));
    } else {
      onChange([...value, label]);
    }
  }

  async function createLabel() {
    if (!newLabelName.trim()) return;
    setCreating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLabelName, color: newLabelColor }),
      });

      if (response.ok) {
        const data = await response.json();
        setLabels([...labels, data.label]);
        onChange([...value, data.label]);
        setNewLabelName("");
        setNewLabelColor(predefinedColors[Math.floor(Math.random() * predefinedColors.length)]);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create label");
      }
    } catch (error) {
      console.error("Error creating label:", error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Selected labels display */}
      <div className="flex flex-wrap gap-1">
        {value.map((label) => (
          <Badge
            key={label.id}
            style={{ backgroundColor: label.color }}
            className="text-white gap-1"
          >
            {label.name}
            <button
              onClick={() => toggleLabel(label)}
              disabled={disabled}
              className="hover:bg-white/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || loading}
              className="h-6 gap-1"
            >
              <Tag className="h-3 w-3" />
              Add Label
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              {/* Existing labels */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {labels.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    No labels yet
                  </p>
                ) : (
                  labels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-sm",
                        isSelected(label.id) && "bg-accent"
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-left">{label.name}</span>
                      {isSelected(label.id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Create new label */}
              <div className="border-t pt-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="New label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        createLabel();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className={cn(
                          "w-5 h-5 rounded-full border-2",
                          newLabelColor === color
                            ? "border-foreground"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={createLabel}
                    disabled={!newLabelName.trim() || creating}
                    className="h-7"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
