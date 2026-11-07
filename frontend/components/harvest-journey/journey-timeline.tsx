import React from "react";
import {
  Check,
  Sun,
  Package,
  Truck,
  Droplets,
  Search,
  Hand,
  Leaf,
  Sprout,
  Lock,
  LucideIcon,
  Sparkles,
} from "lucide-react";
import type { HarvestStage, IconType } from "@/lib/types/harvest";
import { StageIconRenderer } from "@/components/harvest-journey/stage-icon-renderer";
import { getLucideIcon } from "@/lib/utils/stage-icon-library";
import { getSortedJourneyStages } from "@/lib/services/harvestJourneyService";

export interface StandardStageDefinition {
  key: string;
  label: string;
  icon: LucideIcon;
  defaultDescription: string;
}

export const STANDARD_HARVEST_STAGES: StandardStageDefinition[] = [
  {
    key: "sprout",
    label: "Sprout",
    icon: Sprout,
    defaultDescription: "Seeds sprout in high-altitude Himalayan soil.",
  },
  {
    key: "harvest",
    label: "Harvest",
    icon: Leaf,
    defaultDescription: "Hand-picked at peak ripeness by local farmers.",
  },
  {
    key: "sun-drying",
    label: "Sun Drying",
    icon: Sun,
    defaultDescription: "Naturally sun-dried under pristine mountain sunlight.",
  },
  {
    key: "washing",
    label: "Washing",
    icon: Droplets,
    defaultDescription: "Cleaned with pure glacial spring water.",
  },
  {
    key: "hand-sorting",
    label: "Hand Sorting",
    icon: Hand,
    defaultDescription: "Carefully sorted and graded by skilled artisans.",
  },
  {
    key: "quality-check",
    label: "Quality Check",
    icon: Search,
    defaultDescription: "Tested for purity, moisture, and quality standards.",
  },
  {
    key: "eco-packaging",
    label: "Eco-Packaging",
    icon: Package,
    defaultDescription: "Packed in breathable eco-friendly pouches.",
  },
  {
    key: "dispatch",
    label: "Dispatch",
    icon: Truck,
    defaultDescription: "Dispatched from farm origins directly to you.",
  },
];

export function matchRawStageToStandard(rawStage: any): string | null {
  if (!rawStage) return null;
  const label = String(rawStage.label || rawStage.name || "").toLowerCase().trim();
  const icon = String(rawStage.icon || "").toLowerCase().trim();
  const id = String(rawStage.id || "").toLowerCase().trim();

  if (label.includes("sprout") || label.includes("seed") || label.includes("plant") || icon === "sprout" || id.includes("sprout")) {
    return "sprout";
  }
  if (label.includes("harvest") || label.includes("ripen") || label.includes("plucking") || icon === "leaf" || id.includes("harvest")) {
    return "harvest";
  }
  if (label.includes("sun") || label.includes("dry") || label.includes("drying") || icon === "sun" || id.includes("sun")) {
    return "sun-drying";
  }
  if (label.includes("wash") || label.includes("water") || label.includes("clean") || icon === "droplets" || id.includes("wash")) {
    return "washing";
  }
  if (label.includes("sort") || label.includes("hand") || label.includes("grading") || icon === "hand" || id.includes("sort")) {
    return "hand-sorting";
  }
  if (
    label.includes("quality") ||
    label.includes("check") ||
    label.includes("test") ||
    label.includes("lab") ||
    icon === "search" ||
    id.includes("quality") ||
    id.includes("check")
  ) {
    return "quality-check";
  }
  if (label.includes("pack") || label.includes("eco") || label.includes("box") || icon === "package" || id.includes("pack")) {
    return "eco-packaging";
  }
  if (
    label.includes("dispatch") ||
    label.includes("ship") ||
    label.includes("transit") ||
    label.includes("delivery") ||
    icon === "truck" ||
    id.includes("dispatch") ||
    id.includes("ship")
  ) {
    return "dispatch";
  }
  return null;
}

export interface TimelineItemStage {
  id: string;
  key: string;
  label: string;
  name?: string;
  icon?: LucideIcon;
  icon_type?: IconType | string | null;
  icon_value?: string | null;
  status: "completed" | "current" | "upcoming";
  isCompleted: boolean;
  isCurrent: boolean;
  isUpNext: boolean;
  isOtherUpcoming: boolean;
  isUpcoming: boolean;
  isClickable: boolean;
  dateDisplay?: string;
  description?: string;
  shortSummary?: string;
  rawStage?: any;
}

export function enrichWithUpcomingStages(rawStages: any[]): any[] {
  if (!Array.isArray(rawStages) || rawStages.length === 0) {
    return [];
  }

  const sorted = getSortedJourneyStages(rawStages);

  // If the stages array already has 5 or more stages, and already ends with a packaging/dispatch stage,
  // it is already a comprehensive journey.
  const hasPackingOrDispatch = sorted.some((s) => {
    const l = String(s.label || s.name || "").toLowerCase();
    const id = String(s.id || s.key || "").toLowerCase();
    return l.includes("pack") || l.includes("dispatch") || id.includes("pack") || id.includes("dispatch");
  });

  if (sorted.length >= 5 && hasPackingOrDispatch) {
    return sorted;
  }

  // Identify which standard downstream stages are already represented
  const hasSorting = sorted.some((s) => {
    const l = String(s.label || s.name || "").toLowerCase();
    return l.includes("sort") || l.includes("grad") || s.icon === "hand" || s.icon_value === "hand";
  });
  const hasQuality = sorted.some((s) => {
    const l = String(s.label || s.name || "").toLowerCase();
    return l.includes("qual") || l.includes("check") || l.includes("test") || l.includes("lab") || s.icon === "search" || s.icon_value === "search";
  });
  const hasPacking = sorted.some((s) => {
    const l = String(s.label || s.name || "").toLowerCase();
    return l.includes("pack") || l.includes("eco") || s.icon === "package" || s.icon_value === "package";
  });

  const appended = [...sorted];
  let maxPos = sorted.reduce((max, s) => {
    const p = typeof s.position === "number" ? s.position : (typeof s.sort_order === "number" ? s.sort_order : 0);
    return Math.max(max, p);
  }, 0);

  if (!hasSorting) {
    maxPos += 1;
    appended.push({
      id: "stage-sorting-upcoming",
      key: "hand-sorting",
      label: "Sorting",
      name: "Sorting",
      icon: "hand",
      icon_type: "preset",
      icon_value: "hand",
      status: "upcoming",
      position: maxPos,
      sort_order: maxPos,
      description: "Carefully sorted and graded by skilled artisans.",
    });
  }

  if (!hasQuality) {
    maxPos += 1;
    appended.push({
      id: "stage-quality-upcoming",
      key: "quality-check",
      label: "Quality Check",
      name: "Quality Check",
      icon: "search",
      icon_type: "preset",
      icon_value: "search",
      status: "upcoming",
      position: maxPos,
      sort_order: maxPos,
      description: "Tested for purity, moisture, and quality standards.",
    });
  }

  if (!hasPacking) {
    maxPos += 1;
    appended.push({
      id: "stage-packing-upcoming",
      key: "eco-packaging",
      label: "Packing",
      name: "Packing",
      icon: "package",
      icon_type: "preset",
      icon_value: "package",
      status: "upcoming",
      position: maxPos,
      sort_order: maxPos,
      description: "Packed with care in breathable eco-friendly pouches.",
    });
  }

  return getSortedJourneyStages(appended);
}

interface JourneyTimelineProps {
  stages?: HarvestStage[] | any[];
  selectedStageId: string;
  onSelectStage: (stageId: string) => void;
  currentStageIndex?: number;
  currentStageId?: string;
  currentStatusLabel?: string;
}

export function JourneyTimeline({
  stages: rawStages = [],
  selectedStageId,
  onSelectStage,
  currentStageIndex: explicitCurrentIndex,
  currentStageId: explicitCurrentStageId,
  currentStatusLabel,
}: JourneyTimelineProps) {
  // Compute the current stage index dynamically from props/journey data (0..7)
  const currentStageIndex = React.useMemo(() => {
    if (typeof explicitCurrentIndex === "number" && explicitCurrentIndex >= 0 && explicitCurrentIndex < STANDARD_HARVEST_STAGES.length) {
      return explicitCurrentIndex;
    }

    // Check explicit currentStageId matching standard keys or raw stage IDs
    if (explicitCurrentStageId) {
      const idx = STANDARD_HARVEST_STAGES.findIndex(
        (s) => s.key === explicitCurrentStageId || matchRawStageToStandard({ id: explicitCurrentStageId, label: explicitCurrentStageId }) === s.key
      );
      if (idx >= 0) return idx;
    }

    // Check raw stages array for a stage marked 'current' or 'in_progress'
    if (Array.isArray(rawStages) && rawStages.length > 0) {
      const currentRaw = rawStages.find((s) => {
        const st = String(s?.status || "").toLowerCase();
        return st === "current" || st === "in_progress";
      });
      if (currentRaw) {
        const stdKey = matchRawStageToStandard(currentRaw);
        if (stdKey) {
          const idx = STANDARD_HARVEST_STAGES.findIndex((s) => s.key === stdKey);
          if (idx >= 0) return idx;
        }
      }
    }

    // Check currentStatusLabel string (e.g. "Sun Drying" or "Quality Check")
    if (currentStatusLabel) {
      const stdKey = matchRawStageToStandard({ label: currentStatusLabel });
      if (stdKey) {
        const idx = STANDARD_HARVEST_STAGES.findIndex((s) => s.key === stdKey);
        if (idx >= 0) return idx;
      }
    }

    // Check completed count from raw stages
    if (Array.isArray(rawStages) && rawStages.length > 0) {
      const completedStages = rawStages.filter((s) => {
        const st = String(s?.status || "").toLowerCase();
        return st === "completed" || st === "done";
      });
      if (completedStages.length > 0) {
        return Math.min(completedStages.length, STANDARD_HARVEST_STAGES.length - 1);
      }
    }

    // Default to Harvest (index 1) or Sun Drying (index 2) as typical active harvest batch stage
    return 1;
  }, [explicitCurrentIndex, explicitCurrentStageId, rawStages, currentStatusLabel]);

  // Construct normalized stages (using custom admin stages or fallback to standard presets)
  const timelineStages: TimelineItemStage[] = React.useMemo(() => {
    if (Array.isArray(rawStages) && rawStages.length > 0) {
      const enriched = enrichWithUpcomingStages(rawStages);
      const sorted = getSortedJourneyStages(enriched);

      // 1. Explicit in_progress or current stage takes top priority
      let currentStage = sorted.find((s) => {
        const st = String(s.status || "").toLowerCase();
        return st === "current" || st === "in_progress";
      });

      // 2. Target stage ID if provided AND not marked completed/done
      if (!currentStage && explicitCurrentStageId) {
        const cand = sorted.find((s) => s.id === explicitCurrentStageId || s.key === explicitCurrentStageId);
        const candSt = String(cand?.status || "").toLowerCase();
        if (cand && candSt !== "completed" && candSt !== "done") {
          currentStage = cand;
        }
      }

      // 3. Fallback: First stage that is NOT marked completed/done
      if (!currentStage) {
        currentStage = sorted.find((s) => {
          const st = String(s.status || "").toLowerCase();
          return st !== "completed" && st !== "done";
        });
      }

      const activeIdx = currentStage ? sorted.indexOf(currentStage) : sorted.length - 1;

      return sorted.map((s, idx) => {
        const rawSt = String(s.status || "").toLowerCase();
        const isExplicitDone = rawSt === "completed" || rawSt === "done";
        const isExplicitCurrent = rawSt === "current" || rawSt === "in_progress";

        // Real status logic: Completed if explicitly done, or if preceding activeIdx without being upcoming
        const isCompleted = isExplicitDone || (idx < activeIdx && rawSt !== "upcoming" && rawSt !== "not_started");
        const isCurrent = !isCompleted && (isExplicitCurrent || (currentStage ? s === currentStage : idx === activeIdx));
        const isUpcoming = !isCompleted && !isCurrent;
        const isUpNext = !isCompleted && !isCurrent && (idx === activeIdx + 1);
        const isOtherUpcoming = isUpcoming && !isUpNext;
        const isClickable = !isUpcoming;

        const status: "completed" | "current" | "upcoming" = isCompleted
          ? "completed"
          : isCurrent
          ? "current"
          : "upcoming";

        const iconVal = s.icon_value || s.icon || "sun";
        const iconType = s.icon_type || (["sprout", "sun", "leaf", "droplets", "search", "hand", "package", "truck"].includes(iconVal) ? "preset" : "library");

        const dateDisplay =
          s.stage_date ||
          s.dateLabel ||
          s.completedAt ||
          (isCompleted ? "Done" : isCurrent ? "Active" : undefined);

        return {
          id: s.id || `stage-${idx}`,
          key: s.id || `stage-${idx}`,
          label: s.label || s.name || `Stage ${idx + 1}`,
          name: s.label || s.name || `Stage ${idx + 1}`,
          icon: getLucideIcon(iconVal, Sparkles),
          icon_type: iconType,
          icon_value: iconVal,
          status,
          isCompleted,
          isCurrent,
          isUpNext,
          isOtherUpcoming,
          isUpcoming,
          isClickable,
          dateDisplay,
          description: s.description || "Fresh harvest processing verified by Prajnaa Farm standards.",
          shortSummary: s.shortSummary || s.summary,
          rawStage: s,
        };
      });
    }

    // Default template when 0 stages are configured
    return STANDARD_HARVEST_STAGES.map((std, idx) => {
      const isCompleted = idx < currentStageIndex;
      const isCurrent = idx === currentStageIndex;
      const isUpNext = idx === currentStageIndex + 1;
      const isOtherUpcoming = idx > currentStageIndex + 1;
      const isUpcoming = idx > currentStageIndex;
      const isClickable = !isUpcoming;

      const status: "completed" | "current" | "upcoming" = isCompleted
        ? "completed"
        : isCurrent
        ? "current"
        : "upcoming";

      const dateDisplay = isCompleted ? "Done" : isCurrent ? "Active" : undefined;

      return {
        id: `stage-${std.key}`,
        key: std.key,
        label: std.label,
        name: std.label,
        icon: std.icon,
        icon_type: "preset" as const,
        icon_value: std.key,
        status,
        isCompleted,
        isCurrent,
        isUpNext,
        isOtherUpcoming,
        isUpcoming,
        isClickable,
        dateDisplay,
        description: std.defaultDescription,
        shortSummary: undefined,
        rawStage: null,
      };
    });
  }, [rawStages, currentStageIndex]);

  // Click handler allowing stage selection on click (only for clickable stages)
  const handleStageClick = (item: TimelineItemStage) => {
    if (!item.isClickable) return;
    onSelectStage(item.id);
  };

  return (
    <div className="w-full">
      {/* ========================================================================= */}
      {/* HORIZONTAL CONNECTED TIMELINE TRACK: 100% Guaranteed Non-Clipping Headroom */}
      {/* ========================================================================= */}
      <div className="w-full overflow-x-auto pb-4 pt-1 px-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60">
        <div
          className="relative flex items-start justify-between w-full pt-14 pb-2"
          style={{ minWidth: `${Math.max(780, timelineStages.length * 105)}px` }}
        >
          {/* Segmented Connector Lines centered vertically behind 40px node buttons (top = 56px + 20px = 76px) */}
          <div className="absolute top-[76px] left-0 right-0 h-[2px] z-0 pointer-events-none">
            {timelineStages.slice(0, -1).map((_, i) => {
              const leftPercent = (i + 0.5) * (100 / timelineStages.length);
              const widthPercent = 100 / timelineStages.length;

              const activeCurrentIdx = timelineStages.findIndex((s) => s.isCurrent);
              const effectiveIdx = activeCurrentIdx !== -1 ? activeCurrentIdx : currentStageIndex;

              const isCompletedSegment = i < effectiveIdx - 1;
              const isConnectingToCurrent = i === effectiveIdx - 1;

              return (
                <div
                  key={`track-segment-${i}`}
                  className="absolute top-0"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                >
                  {isCompletedSegment ? (
                    /* Solid Green */
                    <div className="h-[2.5px] w-full bg-[#2D5A27] transition-colors duration-300" />
                  ) : isConnectingToCurrent ? (
                    /* Green to Orange Gradient */
                    <div className="h-[2.5px] w-full bg-gradient-to-r from-[#2D5A27] to-[#E8A317] transition-colors duration-300" />
                  ) : (
                    /* Dashed Soft Sage Connector into upcoming locked stages */
                    <div className="w-full border-t-2 border-dashed border-[#a9b9a6] dark:border-[#4d6553] -translate-y-[1px]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Stage Nodes */}
          {timelineStages.map((item, idx) => {
            const isSelected = item.id === selectedStageId || item.key === selectedStageId;
            const Icon = item.icon;

            return (
              <div
                key={item.key}
                className="group relative z-10 flex flex-col items-center text-center select-none min-w-[100px]"
                style={{ width: `${100 / timelineStages.length}%` }}
              >
                {/* Stage Node Circle Container */}
                <div className="relative flex items-center justify-center">
                  {/* Hover Tooltip for Upcoming Stages ("Locked — stage not started yet") */}
                  {item.isUpcoming && (
                    <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-all duration-150 ease-out pointer-events-none transform group-hover:-translate-y-0.5">
                      <div className="relative bg-[#1b3d22] text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-md whitespace-nowrap leading-none flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-amber-300" />
                        <span>Locked — stage will unlock after current stage completes</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1b3d22] rotate-45" />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    id={`timeline-stage-btn-${item.key}`}
                    onClick={() => {
                      if (!item.isClickable) return;
                      handleStageClick(item);
                    }}
                    disabled={!item.isClickable}
                    tabIndex={item.isClickable ? 0 : -1}
                    aria-label={`Stage ${idx + 1}: ${item.label}. Status: ${
                      item.isCompleted
                        ? "Completed"
                        : item.isCurrent
                        ? "Current stage"
                        : "Upcoming (Locked)"
                    }`}
                    aria-pressed={isSelected}
                    aria-disabled={!item.isClickable}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 outline-none ${
                      item.isCompleted
                        ? "bg-[#2D5A27] text-white shadow-xs hover:scale-[1.07] active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2D5A27] cursor-pointer"
                        : item.isCurrent
                        ? "bg-[#E8A317] text-white shadow-sm ring-4 ring-[#E8A317]/30 scale-110 hover:scale-[1.17] active:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E8A317] cursor-pointer"
                        : "border-2 border-dashed border-[#a9b9a6] dark:border-[#4d6553] bg-[#e9efe6]/80 dark:bg-[#25352a]/60 text-[#7c8f7f] dark:text-[#8fa693] shadow-none cursor-not-allowed select-none"
                    } ${isSelected && item.isClickable ? "ring-3 ring-offset-2 ring-[#C06A17] scale-110" : ""}`}
                  >
                    {item.isCompleted ? (
                      <Check className="h-4.5 w-4.5 stroke-[2.75]" />
                    ) : (
                      <StageIconRenderer
                        iconType={item.icon_type}
                        iconValue={item.icon_value}
                        iconKey={item.icon_value || item.key}
                        className={`h-4.5 w-4.5 ${
                          item.isCurrent
                            ? "animate-pulse stroke-[2.25] text-white"
                            : "text-[#7c8f7f] dark:text-[#8fa693] stroke-[1.75]"
                        }`}
                      />
                    )}
                  </button>

                  {/* Lock Badge on ALL Upcoming Stages */}
                  {item.isUpcoming && (
                    <div
                      className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-white dark:bg-[#1a2e22] border-[1.5px] border-[#a9b9a6] dark:border-[#4d6553] flex items-center justify-center shadow-2xs pointer-events-none"
                      title="Locked"
                    >
                      <Lock className="h-[9.5px] w-[9.5px] text-[#6f8272] dark:text-[#8fa693] stroke-[2.5]" />
                    </div>
                  )}
                </div>

                {/* Stage Label */}
                <div
                  onClick={() => {
                    if (item.isClickable) handleStageClick(item);
                  }}
                  className={`mt-2.5 flex flex-col items-center justify-start min-h-[46px] ${
                    item.isClickable ? "cursor-pointer" : "cursor-not-allowed select-none"
                  }`}
                >
                  <span
                    className={`font-subhead text-xs leading-tight text-center max-w-[96px] transition-colors break-words ${
                      item.isCurrent
                        ? "text-[#D97706] dark:text-[#F59E0B] font-bold"
                        : item.isCompleted
                        ? "text-[#1F2937] dark:text-gray-100 font-semibold group-hover:text-[#2D5A27]"
                        : "text-[#7c8f7f] dark:text-[#8fa693] font-medium"
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Sub-label Pill / Status Indicator */}
                  <div className="mt-1.5 flex items-center justify-center">
                    {item.isCurrent ? (
                      <span className="text-[11px] font-bold text-[#D97706] dark:text-[#F59E0B] whitespace-nowrap">
                        Current Stage
                      </span>
                    ) : item.isCompleted ? (
                      <span className="text-[11px] font-medium text-[#059669] whitespace-nowrap">
                        {item.dateDisplay || "Done"}
                      </span>
                    ) : (
                      /* "Locked" Crisp Sage Pill with Lock icon */
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-[1px] rounded-full bg-[#e9efe6] dark:bg-[#25352a] text-[#6f8272] dark:text-[#8fa693] whitespace-nowrap">
                        <Lock className="h-2.5 w-2.5 text-[#6f8272] dark:text-[#8fa693]" />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
