"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Hash, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryPointsInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

const fibonacciPoints = [1, 2, 3, 5, 8, 13, 21];

export function StoryPointsInput({
  value,
  onChange,
  disabled,
}: StoryPointsInputProps) {
  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "justify-start font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <Hash className="mr-2 h-4 w-4" />
            {value ? `${value} pts` : "No estimate"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-4 gap-1">
            {fibonacciPoints.map((points) => (
              <Button
                key={points}
                variant={value === points ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(points)}
                className="h-8 w-10"
              >
                {points}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="h-8 w-10 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {value && (
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
