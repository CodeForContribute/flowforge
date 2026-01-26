"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { SprintStatus } from "@/types";

interface SprintFormProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    id: string;
    name: string;
    goal: string | null;
    startDate: Date | string;
    endDate: Date | string;
    status: SprintStatus;
  };
}

export function SprintForm({ projectId, open, onOpenChange, initialData }: SprintFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    goal: initialData?.goal || "",
    startDate: initialData ? new Date(initialData.startDate) : new Date(),
    endDate: initialData ? new Date(initialData.endDate) : addDays(new Date(), 14),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = initialData
        ? `/api/sprints/${initialData.id}`
        : `/api/projects/${projectId}/sprints`;
      const method = initialData ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          goal: formData.goal || undefined,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString(),
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        router.refresh();
        // Reset form for next time
        if (!initialData) {
          setFormData({
            name: "",
            goal: "",
            startDate: new Date(),
            endDate: addDays(new Date(), 14),
          });
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save sprint");
      }
    } catch (error) {
      console.error("Error saving sprint:", error);
      alert("An error occurred while saving the sprint");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {initialData ? "Edit Sprint" : "Create Sprint"}
            </DialogTitle>
            <DialogDescription>
              {initialData
                ? "Update the sprint details."
                : "Plan a new sprint for your project."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Sprint Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Sprint 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal">Sprint Goal (Optional)</Label>
              <Textarea
                id="goal"
                value={formData.goal}
                onChange={(e) =>
                  setFormData({ ...formData, goal: e.target.value })
                }
                placeholder="What do you want to achieve in this sprint?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate
                        ? format(formData.startDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) =>
                        date && setFormData({ ...formData, startDate: date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate
                        ? format(formData.endDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) =>
                        date && setFormData({ ...formData, endDate: date })
                      }
                      disabled={(date) => date < formData.startDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Create Sprint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
