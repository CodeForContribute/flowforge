"use client";

import { cn } from "@/lib/utils";

interface TourProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function TourProgress({ currentStep, totalSteps }: TourProgressProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === currentStep
              ? "w-4 bg-primary"
              : i < currentStep
                ? "w-1.5 bg-primary/60"
                : "w-1.5 bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}
