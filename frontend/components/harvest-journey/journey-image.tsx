"use client";

import React, { useState, useEffect } from "react";
import {
  Sprout,
  Leaf,
  Sun,
  Droplets,
  Hand,
  Search,
  Package,
  Truck,
  Sparkles,
  Camera,
  ImageOff,
  LucideIcon,
} from "lucide-react";
import { StageIconRenderer } from "./stage-icon-renderer";

/**
 * Checks whether an image URL points to a farmer portrait or profile avatar.
 * Farmer portrait assets should NEVER be displayed as a stage photo.
 */
export function isFarmerImage(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase().trim();
  if (
    lower.includes("farmer-1") ||
    lower.includes("farmer-2") ||
    lower.includes("farmer-3") ||
    lower.includes("farmer-4") ||
    lower.includes("/farmer-") ||
    lower.includes("farmer_portrait") ||
    lower.includes("profiles/")
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves standard canonical Prajnaa stage images.
 * 1. Harvesting -> /assets/stages/stage-1-harvesting.jpg
 * 2. Sun Drying -> /assets/stages/stage-2-sun-drying.jpg
 * 3. Hand Sorting -> /assets/stages/stage-3-hand-sorting.jpg
 * 4. Quality Check -> /assets/stages/stage-4-quality-check.jpg
 * 5. Final Product -> /assets/stages/stage-5-final-product.jpg
 * 6. From Our Hands to Yours -> /assets/stages/stage-6-from-our-hands.jpg
 */
export function getStandardStageImage(stageOrName?: any): string {
  const label = typeof stageOrName === "string"
    ? stageOrName.toLowerCase().trim()
    : String(stageOrName?.label || stageOrName?.name || stageOrName?.title || stageOrName?.id || "").toLowerCase().trim();

  if (label.includes("harvest") || label.includes("pluck") || label.includes("ripen") || label.includes("pick") || label.includes("sprout") || label.includes("plant")) {
    return "/assets/stages/stage-1-harvesting.jpg";
  }
  if (label.includes("sun") || label.includes("dry") || label.includes("solar") || label.includes("curing")) {
    return "/assets/stages/stage-2-sun-drying.jpg";
  }
  if (label.includes("sort") || label.includes("grad") || label.includes("clean") || label.includes("wash") || label.includes("hand")) {
    return "/assets/stages/stage-3-hand-sorting.jpg";
  }
  if (label.includes("qual") || label.includes("check") || label.includes("test") || label.includes("lab") || label.includes("purity")) {
    return "/assets/stages/stage-4-quality-check.jpg";
  }
  if (label.includes("final") || label.includes("pack") || label.includes("product") || label.includes("box") || label.includes("eco")) {
    return "/assets/stages/stage-5-final-product.jpg";
  }
  if (label.includes("hand") || label.includes("deliver") || label.includes("dispatch") || label.includes("ship") || label.includes("transit") || label.includes("yours")) {
    return "/assets/stages/stage-6-from-our-hands.jpg";
  }

  return "/assets/stages/stage-1-harvesting.jpg";
}

export const STANDARD_STAGE_LIST = [
  { id: "stage-1-harvesting", label: "Harvesting", image: "/assets/stages/stage-1-harvesting.jpg" },
  { id: "stage-2-sun-drying", label: "Sun Drying", image: "/assets/stages/stage-2-sun-drying.jpg" },
  { id: "stage-3-hand-sorting", label: "Hand Sorting", image: "/assets/stages/stage-3-hand-sorting.jpg" },
  { id: "stage-4-quality-check", label: "Quality Check", image: "/assets/stages/stage-4-quality-check.jpg" },
  { id: "stage-5-final-product", label: "Final Product", image: "/assets/stages/stage-5-final-product.jpg" },
  { id: "stage-6-from-our-hands", label: "From Our Hands to Yours", image: "/assets/stages/stage-6-from-our-hands.jpg" },
];

/**
 * Extracts a valid stage photo from the stage's own fields,
 * or safely resolves to the canonical standard stage image.
 */
export function getJourneyStageImage(stage: any): string {
  if (!stage) return "/assets/stages/stage-1-harvesting.jpg";

  const candidates: (string | undefined | null)[] = [
    stage.transformation_photo_id,
    stage.image_url,
    ...(Array.isArray(stage.images) ? stage.images : []),
    ...(Array.isArray(stage.media) ? stage.media : []),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      if (!isFarmerImage(candidate)) {
        // If it's an old generic mock image, replace with standard stage image
        if (
          candidate.includes("cat-plants") ||
          candidate.includes("himalayan-landscape") ||
          candidate.includes("cat-dryfruits")
        ) {
          return getStandardStageImage(stage);
        }
        return candidate.trim();
      }
    }
  }

  return getStandardStageImage(stage);
}

export interface StagePlaceholderInfo {
  icon: LucideIcon;
  defaultTitle: string;
  defaultSubtitle: string;
}

/**
 * Resolves a neutral stage-specific icon and explanation for missing/pending photos.
 */
export function getStagePlaceholderInfo(stage?: any): StagePlaceholderInfo {
  const label = String(stage?.label || stage?.name || stage?.title || "").toLowerCase();
  const icon = String(stage?.icon || stage?.icon_value || "").toLowerCase();
  const key = String(stage?.key || stage?.id || "").toLowerCase();

  if (label.includes("sprout") || label.includes("plant") || icon === "sprout" || key.includes("sprout")) {
    return {
      icon: Sprout,
      defaultTitle: "Sprouting Stage",
      defaultSubtitle: "High-altitude germination photo pending field upload.",
    };
  }
  if (label.includes("harvest") || label.includes("pluck") || label.includes("ripen") || icon === "leaf" || key.includes("harvest")) {
    return {
      icon: Leaf,
      defaultTitle: "Harvest Stage",
      defaultSubtitle: "Hand-harvesting photos will appear as field operations proceed.",
    };
  }
  if (label.includes("sun") || label.includes("dry") || icon === "sun" || key.includes("dry")) {
    return {
      icon: Sun,
      defaultTitle: "Sun Drying",
      defaultSubtitle: "Solar curing photos will be added during valley drying.",
    };
  }
  if (label.includes("wash") || label.includes("clean") || label.includes("water") || icon === "droplets" || key.includes("wash")) {
    return {
      icon: Droplets,
      defaultTitle: "Spring Water Washing",
      defaultSubtitle: "Glacial washing documentation photo pending.",
    };
  }
  if (label.includes("sort") || label.includes("soting") || label.includes("grad") || icon === "hand" || key.includes("sort")) {
    return {
      icon: Hand,
      defaultTitle: "Hand Sorting",
      defaultSubtitle: "Grading and sorting photos will be uploaded from the hub.",
    };
  }
  if (label.includes("qual") || label.includes("check") || label.includes("test") || icon === "search" || key.includes("qual")) {
    return {
      icon: Search,
      defaultTitle: "Quality Check",
      defaultSubtitle: "Lab purity and moisture verification report pending.",
    };
  }
  if (label.includes("pack") || label.includes("eco") || icon === "package" || key.includes("pack")) {
    return {
      icon: Package,
      defaultTitle: "Eco-Packaging",
      defaultSubtitle: "Nitrogen sealing and batch packing photos pending.",
    };
  }
  if (label.includes("dispatch") || label.includes("ship") || label.includes("transit") || icon === "truck" || key.includes("dispatch")) {
    return {
      icon: Truck,
      defaultTitle: "Dispatch & Transit",
      defaultSubtitle: "Courier handoff documentation photo pending.",
    };
  }

  return {
    icon: Camera,
    defaultTitle: stage?.label || stage?.name || "Harvest Stage",
    defaultSubtitle: "Field photos will appear here as work progresses.",
  };
}

export interface JourneyImageProps {
  src?: string | null;
  alt?: string;
  stage?: any;
  className?: string;
  containerClassName?: string;
  aspectRatio?: string;
  mode?: "hero" | "card" | "thumbnail" | "strip";
  showEmptyNotice?: boolean;
  priority?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * Reusable JourneyImage component:
 * 1. Checks if src is valid and NOT a farmer portrait.
 * 2. Catches broken URLs (404 / load errors) with an onError guard that switches to neutral placeholder.
 * 3. Prevents layout shift (CLS) via fixed aspect ratio container and lazy loading.
 * 4. Displays a clear stage-specific neutral empty state when no photo exists.
 */
export function JourneyImage({
  src,
  alt,
  stage,
  className = "",
  containerClassName = "",
  aspectRatio = "aspect-[4/3]",
  mode = "hero",
  showEmptyNotice = true,
  priority = false,
  onClick,
  children,
}: JourneyImageProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Validate source: cannot be null/empty, cannot be a farmer portrait
  const isValidSrc = Boolean(
    src &&
    typeof src === "string" &&
    src.trim().length > 0 &&
    !isFarmerImage(src) &&
    !hasError
  );

  const cleanAlt =
    alt ||
    stage?.label ||
    stage?.name ||
    "Harvest Journey photo";

  const placeholderMeta = getStagePlaceholderInfo(stage);
  const PlaceholderIcon = placeholderMeta.icon;

  if (isValidSrc && src) {
    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden ${aspectRatio} ${containerClassName}`}
      >
        <img
          src={src.trim()}
          alt={cleanAlt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setHasError(true)}
          className={`h-full w-full object-cover ${className}`}
        />
        {children}
      </div>
    );
  }

  // --- NEUTRAL STAGE-SPECIFIC PLACEHOLDER (NO FARMER PHOTO) ---

  if (mode === "strip" || mode === "thumbnail") {
    return (
      <div
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center border border-dashed border-[#E6E0D4] bg-[#FAF8F5] text-center p-2.5 rounded-xl ${aspectRatio} ${containerClassName}`}
        title={`${cleanAlt} — Photo pending`}
      >
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-white border border-[#E6E0D4] text-[#C06A17] shadow-2xs mb-1">
          <StageIconRenderer
            iconType={stage?.icon_type}
            iconValue={stage?.icon_value}
            iconKey={stage?.icon || stage?.key}
            className="h-4 w-4"
            fallbackIcon={PlaceholderIcon}
          />
        </div>
        <span className="text-[10px] font-bold text-[#8C6D3E] uppercase tracking-wider line-clamp-1">
          Photo Pending
        </span>
        {children}
      </div>
    );
  }

  if (mode === "card") {
    return (
      <div
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center border border-dashed border-[#E6E0D4] bg-[#FAF8F5] text-center p-4 rounded-2xl ${aspectRatio} ${containerClassName}`}
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border border-[#E6E0D4] text-[#C06A17] shadow-2xs mb-2">
          <StageIconRenderer
            iconType={stage?.icon_type}
            iconValue={stage?.icon_value}
            iconKey={stage?.icon || stage?.key}
            className="h-5 w-5"
            fallbackIcon={PlaceholderIcon}
          />
        </div>
        <p className="font-display text-xs font-bold text-[#1F2937] line-clamp-1">
          {stage?.label || stage?.name || "Stage Photo"}
        </p>
        <p className="text-[11px] text-[#6B7280] mt-0.5 line-clamp-1">
          Field photo pending
        </p>
        {children}
      </div>
    );
  }

  // mode === "hero" (Default full panel placeholder)
  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center text-center p-6 sm:p-10 rounded-2xl sm:rounded-3xl border border-dashed border-[#E6E0D4] bg-[#FAF8F5] ${aspectRatio} min-h-[260px] ${containerClassName}`}
    >
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white border border-[#E6E0D4] text-[#C06A17] shadow-xs mb-3">
        <StageIconRenderer
          iconType={stage?.icon_type}
          iconValue={stage?.icon_value}
          iconKey={stage?.icon || stage?.key}
          className="h-7 w-7"
          fallbackIcon={PlaceholderIcon}
        />
      </div>

      <h4 className="font-display text-base sm:text-lg font-bold text-[#1F2937]">
        {stage?.label || stage?.name || placeholderMeta.defaultTitle}
      </h4>

      {showEmptyNotice && (
        <p className="text-xs text-[#6B7280] max-w-xs mt-1.5 leading-relaxed font-sans">
          {placeholderMeta.defaultSubtitle}
        </p>
      )}

      <div className="mt-3.5 flex items-center gap-1.5 rounded-full bg-[#FAF6ED] border border-[#E6E0D4] px-3 py-1 text-[11px] font-semibold text-[#8C6D3E]">
        <Camera className="h-3 w-3 text-[#8C6D3E]" />
        <span>No field photo uploaded yet</span>
      </div>

      {children}
    </div>
  );
}
