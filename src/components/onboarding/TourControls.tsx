"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface TourControlsProps {
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isLastStep: boolean;
}

export function TourControls({
  currentStep,
  onNext,
  onPrev,
  onSkip,
  isLastStep,
}: TourControlsProps) {
  return (
    <div className="flex items-center justify-between gap-2 pt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onSkip}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4 mr-1" />
        Skip tour
      </Button>

      <div className="flex items-center gap-2">
        {currentStep > 0 && (
          <Button variant="outline" size="sm" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        )}
        <Button variant="gradient" size="sm" onClick={onNext}>
          {isLastStep ? (
            "Finish"
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
