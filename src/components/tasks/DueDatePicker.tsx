"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format, isPast, isToday, isTomorrow, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface DueDatePickerProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  disabled?: boolean;
}

export function DueDatePicker({ value, onChange, disabled }: DueDatePickerProps) {
  const date = value ? new Date(value) : null;
  const isOverdue = date && isPast(startOfDay(date)) && !isToday(date);

  function getDateLabel() {
    if (!date) return "No due date";
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  }

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground",
              isOverdue && "border-destructive text-destructive"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDateLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date || undefined}
            onSelect={(newDate) => onChange(newDate || null)}
            initialFocus
          />
          <div className="p-3 pt-0 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => onChange(new Date())}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                onChange(tomorrow);
              }}
            >
              Tomorrow
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                onChange(nextWeek);
              }}
            >
              +1 Week
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {date && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(null)}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
