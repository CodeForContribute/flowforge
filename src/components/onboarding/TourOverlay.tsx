"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TourOverlayProps {
  targetElement: HTMLElement | null;
  isActive: boolean;
  spotlight: boolean;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay({
  targetElement,
  isActive,
  spotlight,
}: TourOverlayProps) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!targetElement || !isActive || !spotlight) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const bounds = targetElement.getBoundingClientRect();
      const padding = 8;
      setRect({
        top: bounds.top - padding + window.scrollY,
        left: bounds.left - padding + window.scrollX,
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
      });
    };

    updateRect();

    // Update on scroll or resize
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [targetElement, isActive, spotlight]);

  if (!isActive) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9998] pointer-events-none",
        "transition-opacity duration-300",
        isActive ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Dark overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: "100vh", minWidth: "100vw" }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && spotlight && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#tour-spotlight-mask)"
          className="backdrop-blur-sm"
        />
      </svg>

      {/* Spotlight border glow */}
      {rect && spotlight && (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        >
          <div className="absolute inset-0 rounded-lg animate-pulse bg-primary/10" />
        </div>
      )}
    </div>
  );
}
