"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  TourStep,
  TourSection,
  SectionTour,
  ToursCompletedState,
  getTourForPath,
  getTourBySection,
} from "./tour-steps";
import { TourOverlay } from "./TourOverlay";
import { TourPopover } from "./TourPopover";

export interface TourContextValue {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  currentTour: SectionTour | null;
  totalSteps: number;
  toursCompleted: ToursCompletedState;
  startTour: (section?: TourSection) => void;
  endTour: (completed: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  restartTour: (section: TourSection) => void;
}

export const TourContext = createContext<TourContextValue | null>(null);

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const { status } = useSession();
  const pathname = usePathname();

  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentTour, setCurrentTour] = useState<SectionTour | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [toursCompleted, setToursCompleted] = useState<ToursCompletedState>({});
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);

  const isInitializing = useRef(false);
  const lastCheckedPath = useRef<string | null>(null);

  // Current step from current tour
  const currentStep = currentTour?.steps[currentStepIndex] || null;
  const totalSteps = currentTour?.steps.length || 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Load tour preferences on mount
  useEffect(() => {
    if (status !== "authenticated" || hasLoadedPreferences) return;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const { preferences } = await response.json();
          if (preferences?.toursCompleted) {
            const completed = typeof preferences.toursCompleted === "string"
              ? JSON.parse(preferences.toursCompleted)
              : preferences.toursCompleted;
            setToursCompleted(completed);
          }
        }
      } catch (error) {
        console.error("Failed to load tour preferences:", error);
      } finally {
        setHasLoadedPreferences(true);
      }
    }

    loadPreferences();
  }, [status, hasLoadedPreferences]);

  // Auto-start tour for current section if not completed
  useEffect(() => {
    if (!hasLoadedPreferences || isActive || isInitializing.current) return;
    if (lastCheckedPath.current === pathname) return;

    lastCheckedPath.current = pathname;

    const tour = getTourForPath(pathname);
    if (tour && !toursCompleted[tour.id]) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        setCurrentTour(tour);
        setCurrentStepIndex(0);
        setIsActive(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pathname, hasLoadedPreferences, isActive, toursCompleted]);

  // Find and set target element when step changes
  useEffect(() => {
    if (!isActive || !currentStep) {
      setTargetElement(null);
      return;
    }

    const findTarget = () => {
      const element = document.querySelector(
        currentStep.targetSelector
      ) as HTMLElement | null;

      if (element) {
        setTargetElement(element);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        // Element not found, skip to next step or end tour
        if (currentStepIndex < totalSteps - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          setTargetElement(null);
        }
      }
    };

    const timer = setTimeout(findTarget, 150);
    return () => clearTimeout(timer);
  }, [isActive, currentStep, currentStepIndex, totalSteps]);

  const saveTourCompletion = useCallback(async (section: TourSection) => {
    const newToursCompleted = { ...toursCompleted, [section]: true };
    setToursCompleted(newToursCompleted);

    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toursCompleted: newToursCompleted,
        }),
      });
    } catch (error) {
      console.error("Failed to save tour completion:", error);
    }
  }, [toursCompleted]);

  const startTour = useCallback((section?: TourSection) => {
    const tour = section ? getTourBySection(section) : getTourForPath(pathname);
    if (tour) {
      setCurrentTour(tour);
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  }, [pathname]);

  const endTour = useCallback((completed: boolean) => {
    if (completed && currentTour) {
      saveTourCompletion(currentTour.id);
    }
    setIsActive(false);
    setCurrentStepIndex(0);
    setCurrentTour(null);
    setTargetElement(null);
  }, [currentTour, saveTourCompletion]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      endTour(true);
    }
  }, [currentStepIndex, totalSteps, endTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    if (currentTour) {
      saveTourCompletion(currentTour.id);
    }
    setIsActive(false);
    setCurrentStepIndex(0);
    setCurrentTour(null);
    setTargetElement(null);
  }, [currentTour, saveTourCompletion]);

  const restartTour = useCallback(async (section: TourSection) => {
    // Remove from completed tours
    const newToursCompleted = { ...toursCompleted };
    delete newToursCompleted[section];
    setToursCompleted(newToursCompleted);

    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toursCompleted: newToursCompleted,
        }),
      });
    } catch (error) {
      console.error("Failed to update tour preferences:", error);
    }

    // Start the tour
    const tour = getTourBySection(section);
    if (tour) {
      setCurrentTour(tour);
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  }, [toursCompleted]);

  const contextValue: TourContextValue = {
    isActive,
    currentStepIndex,
    currentStep,
    currentTour,
    totalSteps,
    toursCompleted,
    startTour,
    endTour,
    nextStep,
    prevStep,
    skipTour,
    restartTour,
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {isActive && currentStep && currentTour && (
        <>
          <TourOverlay
            targetElement={targetElement}
            isActive={isActive}
            spotlight={currentStep.spotlight}
          />
          <TourPopover
            step={currentStep}
            targetElement={targetElement}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
            tourName={currentTour.name}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTour}
            isLastStep={isLastStep}
          />
        </>
      )}
    </TourContext.Provider>
  );
}
