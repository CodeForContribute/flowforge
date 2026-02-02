"use client";

import { useContext } from "react";
import { TourContext, TourContextValue } from "@/components/onboarding/TourProvider";

export function useTour(): TourContextValue {
  const context = useContext(TourContext);

  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }

  return context;
}

export type { TourContextValue };
