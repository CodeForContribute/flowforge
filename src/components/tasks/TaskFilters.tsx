"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Filter,
  X,
  User,
  Calendar,
  Tag,
  Layers,
  Target,
} from "lucide-react";
import { TaskStatus, TaskPriority, TaskType, SprintStatus, MemberRole } from "@/types";
import { cn } from "@/lib/utils";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Sprint {
  id: string;
  name: string;
  status: SprintStatus;
}

interface Member {
  id: string;
  userId: string;
  role: MemberRole;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface TaskFiltersProps {
  projectId: string;
  onFiltersChange?: (filters: FilterState) => void;
}

export interface FilterState {
  search: string;
  assignee: string | null;
  sprint: string | null;
  labels: string[];
  type: TaskType | null;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  overdue: boolean;
}

const defaultFilters: FilterState = {
  search: "",
  assignee: null,
  sprint: null,
  labels: [],
  type: null,
  status: null,
  priority: null,
  overdue: false,
};

const taskTypes: TaskType[] = ["EPIC", "STORY", "TASK", "SUBTASK", "BUG"];
const priorities: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const statuses: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "GENERATING",
  "PR_OPEN",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "MERGED",
  "CLOSED",
];

export function TaskFilters({ projectId, onFiltersChange }: TaskFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() => ({
    search: searchParams.get("search") || "",
    assignee: searchParams.get("assignee"),
    sprint: searchParams.get("sprint"),
    labels: searchParams.get("labels")?.split(",").filter(Boolean) || [],
    type: (searchParams.get("type") as TaskType) || null,
    status: (searchParams.get("status") as TaskStatus) || null,
    priority: (searchParams.get("priority") as TaskPriority) || null,
    overdue: searchParams.get("overdue") === "true",
  }));

  const [labels, setLabels] = useState<Label[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch filter options
  useEffect(() => {
    async function fetchData() {
      try {
        const [labelsRes, sprintsRes, membersRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/labels`),
          fetch(`/api/projects/${projectId}/sprints`),
          fetch(`/api/projects/${projectId}/members`),
        ]);

        if (labelsRes.ok) {
          const data = await labelsRes.json();
          setLabels(data.labels);
        }
        if (sprintsRes.ok) {
          const data = await sprintsRes.json();
          setSprints(data.sprints);
        }
        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data.members);
        }
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    }

    fetchData();
  }, [projectId]);

  // Update URL and notify parent when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.assignee) params.set("assignee", filters.assignee);
    if (filters.sprint) params.set("sprint", filters.sprint);
    if (filters.labels.length > 0) params.set("labels", filters.labels.join(","));
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.overdue) params.set("overdue", "true");

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });

    onFiltersChange?.(filters);
  }, [filters, pathname, router, onFiltersChange]);

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  function toggleLabel(labelId: string) {
    setFilters((prev) => ({
      ...prev,
      labels: prev.labels.includes(labelId)
        ? prev.labels.filter((id) => id !== labelId)
        : [...prev.labels, labelId],
    }));
  }

  const activeFilterCount =
    (filters.assignee ? 1 : 0) +
    (filters.sprint ? 1 : 0) +
    filters.labels.length +
    (filters.type ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.overdue ? 1 : 0);

  const selectedMember = members.find((m) => m.user.id === filters.assignee);
  const selectedSprint = sprints.find((s) => s.id === filters.sprint);

  return (
    <div className="space-y-3">
      {/* Search and Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant={showFilters || activeFilterCount > 0 ? "secondary" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMember && (
            <Badge variant="secondary" className="gap-1">
              <User className="h-3 w-3" />
              {selectedMember.user.name || "User"}
              <button onClick={() => updateFilter("assignee", null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedSprint && (
            <Badge variant="secondary" className="gap-1">
              <Target className="h-3 w-3" />
              {selectedSprint.name}
              <button onClick={() => updateFilter("sprint", null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.labels.map((labelId) => {
            const label = labels.find((l) => l.id === labelId);
            return label ? (
              <Badge
                key={labelId}
                style={{ backgroundColor: label.color }}
                className="text-white gap-1"
              >
                {label.name}
                <button onClick={() => toggleLabel(labelId)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
          {filters.type && (
            <Badge variant="secondary" className="gap-1">
              <Layers className="h-3 w-3" />
              {filters.type}
              <button onClick={() => updateFilter("type", null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              {filters.status.replace("_", " ")}
              <button onClick={() => updateFilter("status", null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="gap-1">
              {filters.priority}
              <button onClick={() => updateFilter("priority", null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.overdue && (
            <Badge variant="destructive" className="gap-1">
              <Calendar className="h-3 w-3" />
              Overdue
              <button onClick={() => updateFilter("overdue", false)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 border rounded-lg bg-muted/30">
          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Assignee
            </label>
            <Select
              value={filters.assignee || "any"}
              onValueChange={(val) => updateFilter("assignee", val === "any" ? null : val)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.user.id} value={member.user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={member.user.image || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {member.user.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {member.user.name || "User"}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sprint */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Sprint
            </label>
            <Select
              value={filters.sprint || "any"}
              onValueChange={(val) => updateFilter("sprint", val === "any" ? null : val)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {sprints.map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Type
            </label>
            <Select
              value={filters.type || "any"}
              onValueChange={(val) =>
                updateFilter("type", val === "any" ? null : (val as TaskType))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {taskTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={filters.status || "any"}
              onValueChange={(val) =>
                updateFilter("status", val === "any" ? null : (val as TaskStatus))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Priority
            </label>
            <Select
              value={filters.priority || "any"}
              onValueChange={(val) =>
                updateFilter("priority", val === "any" ? null : (val as TaskPriority))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {priorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Labels
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-9 justify-start">
                  <Tag className="mr-2 h-3 w-3" />
                  {filters.labels.length > 0
                    ? `${filters.labels.length} selected`
                    : "Select labels"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {labels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-sm",
                        filters.labels.includes(label.id) && "bg-accent"
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-left">{label.name}</span>
                    </button>
                  ))}
                  {labels.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      No labels
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Overdue Toggle */}
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <label className="text-xs font-medium text-muted-foreground">
              Due Date
            </label>
            <Button
              variant={filters.overdue ? "destructive" : "outline"}
              className="w-full h-9"
              onClick={() => updateFilter("overdue", !filters.overdue)}
            >
              <Calendar className="mr-2 h-3 w-3" />
              Overdue Only
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
