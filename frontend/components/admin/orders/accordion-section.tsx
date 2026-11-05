"use client";

import React, { useId } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionSectionProps {
  id?: string;
  title: string;
  icon?: React.ReactNode;
  summary?: React.ReactNode;
  badge?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable accessible AccordionSection card matching Prajnaa Farm admin reference.
 * - Semantic <h3> wrapping <button>
 * - aria-expanded and aria-controls for screen readers
 * - Keyboard operable (Enter, Space) with visible focus ring
 * - Rotating chevron icon
 * - One-line summary (right-aligned, hidden on mobile)
 * - Smooth 180ms expand animation respecting prefers-reduced-motion
 */
export function AccordionSection({
  id: propId,
  title,
  icon,
  summary,
  badge,
  isOpen,
  onToggle,
  children,
  className = "",
}: AccordionSectionProps) {
  const generatedId = useId();
  const sectionId = propId || generatedId;
  const headerId = `acc-header-${sectionId}`;
  const contentId = `acc-content-${sectionId}`;

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm transition-colors duration-200 overflow-hidden ${className}`}
    >
      <h3>
        <button
          type="button"
          id={headerId}
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left font-display text-sm font-semibold transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[48px] cursor-pointer"
        >
          {/* Left: Icon, Title & Optional Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-secondary text-primary shrink-0">
                {icon}
              </span>
            )}
            <span className="text-foreground tracking-tight truncate">{title}</span>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>

          {/* Right: Real-data Summary (hidden on mobile) & Animated Chevron */}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {summary && (
              <span className="hidden sm:inline-block text-xs font-subhead font-medium text-muted-foreground truncate max-w-[280px]">
                {summary}
              </span>
            )}
            <span
              className={`flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${
                isOpen ? "rotate-180 text-foreground" : "rotate-0"
              }`}
              aria-hidden="true"
            >
              <ChevronDown className="h-4 w-4" />
            </span>
          </div>
        </button>
      </h3>

      {/* Accordion Content Panel */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        hidden={!isOpen}
        className={`transition-all duration-200 motion-reduce:transition-none ${
          isOpen ? "block animate-in fade-in-50 duration-200" : "hidden"
        }`}
      >
        <div className="border-t border-border/70 p-5 pt-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
