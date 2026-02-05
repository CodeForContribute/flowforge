"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  Plus,
  Trash2,
  Timer,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { TimeLog, formatTimeSpent, parseTimeToMinutes } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeTrackingSectionProps {
  taskId: string;
  originalEstimate: number | null;
  timeRemaining: number | null;
}

interface TimeLogWithUser extends TimeLog {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export function TimeTrackingSection({
  taskId,
  originalEstimate: initialEstimate,
  timeRemaining: initialRemaining,
}: TimeTrackingSectionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [timeLogs, setTimeLogs] = useState<TimeLogWithUser[]>([]);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [originalEstimate, setOriginalEstimate] = useState(initialEstimate);
  const [timeRemaining, setTimeRemaining] = useState(initialRemaining);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showEstimateDialog, setShowEstimateDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Log form state
  const [logTime, setLogTime] = useState("");
  const [logDate, setLogDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [logDescription, setLogDescription] = useState("");

  // Estimate form state
  const [estimateTime, setEstimateTime] = useState(
    initialEstimate ? formatTimeSpent(initialEstimate) : ""
  );

  useEffect(() => {
    fetchTimeLogs();
  }, [taskId]);

  async function fetchTimeLogs() {
    try {
      const response = await fetch(`/api/tasks/${taskId}/time-logs`);
      if (response.ok) {
        const data = await response.json();
        setTimeLogs(data.timeLogs);
        setTotalTimeSpent(data.totalTimeSpent);
        setOriginalEstimate(data.originalEstimate);
        setTimeRemaining(data.timeRemaining);
      }
    } catch (error) {
      console.error("Error fetching time logs:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogTime() {
    const minutes = parseTimeToMinutes(logTime);
    if (!minutes) {
      alert("Please enter a valid time (e.g., 2h 30m, 45m, 1.5h)");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/time-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeSpent: minutes,
          date: logDate,
          description: logDescription || undefined,
        }),
      });

      if (response.ok) {
        setShowLogDialog(false);
        setLogTime("");
        setLogDescription("");
        setLogDate(format(new Date(), "yyyy-MM-dd"));
        fetchTimeLogs();
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to log time");
      }
    } catch (error) {
      console.error("Error logging time:", error);
      alert("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetEstimate() {
    const minutes = parseTimeToMinutes(estimateTime);
    if (!minutes && estimateTime.trim()) {
      alert("Please enter a valid time (e.g., 2h 30m, 45m, 1.5h)");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalEstimate: minutes || null,
          timeRemaining: minutes ? Math.max(0, minutes - totalTimeSpent) : null,
        }),
      });

      if (response.ok) {
        setShowEstimateDialog(false);
        setOriginalEstimate(minutes || null);
        setTimeRemaining(minutes ? Math.max(0, minutes - totalTimeSpent) : null);
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update estimate");
      }
    } catch (error) {
      console.error("Error updating estimate:", error);
      alert("An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLog(logId: string) {
    if (!confirm("Delete this time log entry?")) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/time-logs/${logId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTimeLogs();
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete time log");
      }
    } catch (error) {
      console.error("Error deleting time log:", error);
      alert("An error occurred");
    }
  }

  const progressPercent =
    originalEstimate && totalTimeSpent
      ? Math.min(100, (totalTimeSpent / originalEstimate) * 100)
      : 0;

  const isOverEstimate = originalEstimate && totalTimeSpent > originalEstimate;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Tracking
          </CardTitle>
          <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Time</DialogTitle>
                <DialogDescription>
                  Record time spent working on this task
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="time">Time Spent</Label>
                  <Input
                    id="time"
                    placeholder="e.g., 2h 30m, 45m, 1.5h"
                    value={logTime}
                    onChange={(e) => setLogTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What did you work on?"
                    value={logDescription}
                    onChange={(e) => setLogDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowLogDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLogTime} disabled={isSaving || !logTime}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Log Time
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Time Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <Dialog open={showEstimateDialog} onOpenChange={setShowEstimateDialog}>
            <DialogTrigger asChild>
              <button className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Estimate
                </div>
                <div className="font-semibold">
                  {originalEstimate ? formatTimeSpent(originalEstimate) : "—"}
                </div>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Original Estimate</DialogTitle>
                <DialogDescription>
                  How long do you think this task will take?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="estimate">Estimated Time</Label>
                  <Input
                    id="estimate"
                    placeholder="e.g., 4h, 2d, 1w"
                    value={estimateTime}
                    onChange={(e) => setEstimateTime(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use formats like: 2h, 30m, 2h 30m, 1.5h
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEstimateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSetEstimate} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Logged
            </div>
            <div className={cn("font-semibold", isOverEstimate && "text-red-500")}>
              {totalTimeSpent > 0 ? formatTimeSpent(totalTimeSpent) : "—"}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Remaining
            </div>
            <div className={cn("font-semibold", timeRemaining !== null && timeRemaining <= 0 && "text-red-500")}>
              {timeRemaining !== null ? (
                timeRemaining > 0 ? formatTimeSpent(timeRemaining) : "0m"
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {originalEstimate && (
          <div className="space-y-1">
            <Progress
              value={progressPercent}
              className={cn("h-2", isOverEstimate && "[&>div]:bg-red-500")}
            />
            <p className="text-xs text-muted-foreground text-right">
              {Math.round(progressPercent)}% of estimate used
            </p>
          </div>
        )}

        {/* Time Logs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : timeLogs.length > 0 ? (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {timeLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 group"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={log.user.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {log.user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {formatTimeSpent(log.timeSpent)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteLog(log.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                  {log.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {log.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No time logged yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
