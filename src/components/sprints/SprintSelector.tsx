"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SprintStatus } from "@/types";

interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
}

interface SprintSelectorProps {
  projectId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  showNone?: boolean;
  filterStatus?: SprintStatus[];
}

const statusColors: Record<SprintStatus, string> = {
  PLANNING: "bg-slate-500",
  ACTIVE: "bg-green-500",
  COMPLETED: "bg-blue-500",
};

export function SprintSelector({
  projectId,
  value,
  onChange,
  placeholder = "Select sprint",
  showNone = true,
  filterStatus,
}: SprintSelectorProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSprints() {
      try {
        const statusParam = filterStatus ? `?status=${filterStatus.join(",")}` : "";
        const response = await fetch(`/api/projects/${projectId}/sprints${statusParam}`);
        if (response.ok) {
          const data = await response.json();
          setSprints(data.sprints);
        }
      } catch (error) {
        console.error("Error fetching sprints:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSprints();
  }, [projectId, filterStatus]);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={value || "none"}
      onValueChange={(val) => onChange(val === "none" ? null : val)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showNone && <SelectItem value="none">No Sprint</SelectItem>}
        {sprints.map((sprint) => (
          <SelectItem key={sprint.id} value={sprint.id}>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${statusColors[sprint.status]}`}
              />
              {sprint.name}
            </div>
          </SelectItem>
        ))}
        {sprints.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No sprints available
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
