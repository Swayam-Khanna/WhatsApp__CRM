"use client";

import React, { useState } from "react";
import { Sparkles, type LucideIcon } from "lucide-react";
import { getLucideIcon } from "@/lib/utils/stage-icon-library";
import type { IconType } from "@/lib/types/harvest";

interface StageIconRendererProps {
  iconType?: IconType | string | null;
  iconValue?: string | null;
  iconKey?: string | null;
  className?: string;
  fallbackIcon?: LucideIcon;
  alt?: string;
}

export function StageIconRenderer({
  iconType,
  iconValue,
  iconKey,
  className = "h-4 w-4",
  fallbackIcon = Sparkles,
  alt = "Stage Icon",
}: StageIconRendererProps) {
  const [imgError, setImgError] = useState(false);

  // 1. Resolve raw value: prioritize iconValue, then iconKey
  const rawValue = (iconValue || iconKey || "").trim();

  // 2. Check if the value is an image or upload (data URI, image URL, or svg snippet)
  let resolvedSrc = rawValue;
  if (rawValue.startsWith("<svg")) {
    resolvedSrc = `data:image/svg+xml;utf8,${encodeURIComponent(rawValue)}`;
  }

  const isImageUpload =
    !imgError &&
    (iconType === "upload" ||
      resolvedSrc.startsWith("data:image/") ||
      resolvedSrc.startsWith("http://") ||
      resolvedSrc.startsWith("https://") ||
      resolvedSrc.startsWith("/") ||
      resolvedSrc.startsWith("blob:"));

  if (isImageUpload && resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
        alt={alt}
        onError={() => setImgError(true)}
        className={`object-contain ${className}`}
        style={{ maxHeight: "100%", maxWidth: "100%" }}
      />
    );
  }

  // 3. Lucide or Preset Icon
  const IconComponent = getLucideIcon(rawValue || iconKey || "sparkles", fallbackIcon);

  return <IconComponent className={className} />;
}
