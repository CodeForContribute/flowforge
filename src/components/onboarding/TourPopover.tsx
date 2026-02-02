"use client";

import { useEffect, useState, useRef } from "react";
import { TourStep, TourStepPosition } from "./tour-steps";
import { TourProgress } from "./TourProgress";
import { TourControls } from "./TourControls";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface TourPopoverProps {
  step: TourStep;
  targetElement: HTMLElement | null;
  currentStepIndex: number;
  totalSteps: number;
  tourName?: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isLastStep: boolean;
}

interface PopoverPosition {
  top: number;
  left: number;
  transformOrigin: string;
}

const POPOVER_WIDTH = 320;
const POPOVER_GAP = 16;

function calculatePosition(
  targetRect: DOMRect,
  preferredPosition: TourStepPosition
): PopoverPosition & { actualPosition: TourStepPosition } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Estimated popover height (will adjust after render)
  const estimatedHeight = 200;

  // Calculate available space in each direction
  const spaceTop = targetRect.top;
  const spaceBottom = viewportHeight - targetRect.bottom;
  const spaceLeft = targetRect.left;
  const spaceRight = viewportWidth - targetRect.right;

  // Determine best position based on available space
  let actualPosition = preferredPosition;

  // Check if preferred position has enough space
  const hasSpaceTop = spaceTop > estimatedHeight + POPOVER_GAP;
  const hasSpaceBottom = spaceBottom > estimatedHeight + POPOVER_GAP;
  const hasSpaceLeft = spaceLeft > POPOVER_WIDTH + POPOVER_GAP;
  const hasSpaceRight = spaceRight > POPOVER_WIDTH + POPOVER_GAP;

  if (preferredPosition === "top" && !hasSpaceTop) {
    actualPosition = hasSpaceBottom ? "bottom" : hasSpaceRight ? "right" : "left";
  } else if (preferredPosition === "bottom" && !hasSpaceBottom) {
    actualPosition = hasSpaceTop ? "top" : hasSpaceRight ? "right" : "left";
  } else if (preferredPosition === "left" && !hasSpaceLeft) {
    actualPosition = hasSpaceRight ? "right" : hasSpaceBottom ? "bottom" : "top";
  } else if (preferredPosition === "right" && !hasSpaceRight) {
    actualPosition = hasSpaceLeft ? "left" : hasSpaceBottom ? "bottom" : "top";
  }

  let top = 0;
  let left = 0;
  let transformOrigin = "center center";

  switch (actualPosition) {
    case "top":
      top = targetRect.top - POPOVER_GAP;
      left = targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2;
      transformOrigin = "bottom center";
      break;
    case "bottom":
      top = targetRect.bottom + POPOVER_GAP;
      left = targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2;
      transformOrigin = "top center";
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2;
      left = targetRect.left - POPOVER_WIDTH - POPOVER_GAP;
      transformOrigin = "right center";
      break;
    case "right":
      top = targetRect.top + targetRect.height / 2;
      left = targetRect.right + POPOVER_GAP;
      transformOrigin = "left center";
      break;
  }

  // Ensure popover stays within viewport bounds
  left = Math.max(16, Math.min(left, viewportWidth - POPOVER_WIDTH - 16));
  top = Math.max(16, top);

  return { top, left, transformOrigin, actualPosition };
}

export function TourPopover({
  step,
  targetElement,
  currentStepIndex,
  totalSteps,
  tourName,
  onNext,
  onPrev,
  onSkip,
  isLastStep,
}: TourPopoverProps) {
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!targetElement) {
      // Center the popover if no target (e.g., welcome step)
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2 - POPOVER_WIDTH / 2,
        transformOrigin: "center center",
      });
      setIsVisible(true);
      return;
    }

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const pos = calculatePosition(rect, step.position);
      setPosition(pos);
    };

    // Initial position
    updatePosition();

    // Delay visibility for animation
    const timer = setTimeout(() => setIsVisible(true), 50);

    // Update on scroll or resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [targetElement, step.position]);

  // Adjust vertical position after render to account for actual height
  useEffect(() => {
    if (!popoverRef.current || !position || !targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();

    // For left/right positions, center vertically
    if (step.position === "left" || step.position === "right") {
      const centeredTop = rect.top + rect.height / 2 - popoverRect.height / 2;
      const adjustedTop = Math.max(16, Math.min(centeredTop, window.innerHeight - popoverRect.height - 16));
      if (Math.abs(adjustedTop - position.top) > 10) {
        setPosition((prev) => prev ? { ...prev, top: adjustedTop } : null);
      }
    }

    // For top position, adjust to be above target
    if (step.position === "top") {
      const adjustedTop = rect.top - popoverRect.height - POPOVER_GAP;
      if (adjustedTop > 16 && Math.abs(adjustedTop - position.top) > 10) {
        setPosition((prev) => prev ? { ...prev, top: adjustedTop } : null);
      }
    }
  }, [position, targetElement, step.position]);

  if (!position) return null;

  return (
    <div
      ref={popoverRef}
      className={cn(
        "fixed z-[9999] w-80 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/20",
        "transition-all duration-300 ease-out",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      style={{
        top: position.top,
        left: position.left,
        transformOrigin: position.transformOrigin,
      }}
    >
      {/* Tour Name Badge */}
      {tourName && (
        <div className="mb-2">
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {tourName}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{step.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <TourProgress currentStep={currentStepIndex} totalSteps={totalSteps} />
        <span className="text-xs text-muted-foreground">
          {currentStepIndex + 1} of {totalSteps}
        </span>
      </div>

      {/* Controls */}
      <TourControls
        currentStep={currentStepIndex}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        isLastStep={isLastStep}
      />
    </div>
  );
}
