import { useState } from "react";
import {
  Sun,
  Calendar,
  Sparkles,
  CheckCircle2,
  Package,
  Truck,
  Droplets,
  Search,
  Hand,
  Leaf,
  Sprout,
  MapPin,
  Maximize2,
  LucideIcon,
  Camera,
} from "lucide-react";
import type { HarvestStage, HarvestUpdateModel, HarvestJournalUpdate, HarvestBatchInfo } from "@/lib/types/harvest";

import { StageIconRenderer } from "@/components/harvest-journey/stage-icon-renderer";
import { isFarmerImage } from "./journey-image";

interface StageDetailPanelProps {
  stage: HarvestStage;
  stages?: HarvestStage[];
  totalStages: number;
  stageIndex: number;
  nextStage?: HarvestStage;
  batchInfo?: HarvestBatchInfo | null;
  latestUpdate?: HarvestUpdateModel | HarvestJournalUpdate | null;
  updatesList?: any[];
  images?: string[];
  onOpenPhoto: (imgUrl: string, allImages?: string[]) => void;
}

function getPanelStageIcon(iconKey?: string, name?: string, status?: string): LucideIcon {
  const s = String(status || "").toLowerCase();
  if (s === "completed" || s === "done") return CheckCircle2;
  const text = (iconKey || name || "").toLowerCase();
  if (text.includes("sun") || text.includes("dry")) return Sun;
  if (text.includes("wash") || text.includes("clean") || text.includes("water")) return Droplets;
  if (text.includes("pack")) return Package;
  if (text.includes("dispatch") || text.includes("ship")) return Truck;
  if (text.includes("check") || text.includes("quality") || text.includes("test")) return Search;
  if (text.includes("sort") || text.includes("hand")) return Hand;
  if (text.includes("harvest") || text.includes("leaf")) return Leaf;
  if (text.includes("sprout") || text.includes("plant")) return Sprout;
  return Sparkles;
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "16 Jul 2026";
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const day = parsed.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  }
  return dateStr;
}

export function StageDetailPanel({
  stage,
  stages = [],
  totalStages,
  stageIndex,
  nextStage,
  batchInfo,
  latestUpdate,
  updatesList = [],
  images = [],
  onOpenPhoto,
}: StageDetailPanelProps) {
  const rawStatus = String(stage.status || "").toLowerCase();
  const isCompleted = rawStatus === "completed" || rawStatus === "done";
  const isInProgress = rawStatus === "in_progress" || rawStatus === "current" || !rawStatus;
  const stageName = (stage as any).label || stage.name || `Stage ${stageIndex + 1}`;
  
  // Completed stages counter (e.g. "2 of 5 stages completed")
  const completedCount = stages.length > 0
    ? stages.filter((s: any) => {
        const st = String(s.status || "").toLowerCase();
        return st === "completed" || st === "done";
      }).length
    : isCompleted
    ? stageIndex + 1
    : stageIndex;

  const stageBadgeText =
    completedCount > 0
      ? `${completedCount} of ${totalStages} stages completed`
      : totalStages > 1
      ? `Stage ${stageIndex + 1} of ${totalStages}`
      : `Stage 1 of 1`;

  const dateValue =
    (stage as any).stage_date ||
    stage.dateLabel ||
    stage.completedAt ||
    stage.startedAt ||
    (stage as any).updated_at ||
    (latestUpdate as any)?.created_at ||
    "";

  const formattedDate = formatDisplayDate(dateValue || new Date().toISOString());
  const Icon = getPanelStageIcon(stage.icon, stageName, stage.status);

  // Real content supplied by Admin (strictly real data, NO hardcoded fake apricot text)
  const shortSummary = stage.shortSummary || (stage as any).summary || "";
  const description = stage.description || "";
  
  // If shortSummary is identical to description, don't duplicate it
  const showSummary = Boolean(shortSummary && shortSummary.trim() !== description.trim());
  const showDescription = Boolean(description && description.trim().length > 0);

  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // Real images uploaded by admin or stage image props - strictly excludes any farmer photos and broken URLs
  const uploadedImages: string[] = (
    Array.isArray((stage as any).images) && (stage as any).images.length > 0
      ? (stage as any).images
      : Array.isArray(stage.media) && stage.media.length > 0
      ? stage.media
      : (stage as any).image_url
      ? [(stage as any).image_url]
      : Array.isArray(images) && images.length > 0
      ? images
      : []
  ).filter((img: any) => typeof img === "string" && img.trim().length > 0 && !isFarmerImage(img) && !brokenImages.has(img));

  const mainImage = uploadedImages[0] || "";
  const sideImages = uploadedImages.slice(1);
  const remainingCount = uploadedImages.length > 3 ? uploadedImages.length - 3 : 0;

  const locationText =
    stage.location ||
    batchInfo?.region ||
    "Verified Farm Orchard";

  const processMethodTag =
    (stage as any).processTag ||
    (stage as any).processingMethod ||
    batchInfo?.processingMethod ||
    "FIELD PHOTO";

  return (
    <div className="w-full rounded-2xl border border-[#E6E0D4] bg-white p-4 sm:p-5 md:p-6 shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
        {/* Left Side: Written Content, Editorial Typography, Status */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3 sm:space-y-4">
          <div>
            {/* Top Row: Stage Icon + Stage completion pill */}
            <div className="flex items-center gap-2.5">
              <div className="text-[#C06A17] shrink-0 h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center">
                <StageIconRenderer
                  iconType={stage.icon_type}
                  iconValue={stage.icon_value}
                  iconKey={stage.icon || (stage as any).key}
                  className="h-5 w-5 sm:h-6 sm:w-6 stroke-[1.75]"
                  fallbackIcon={Icon}
                />
              </div>
              <span className="rounded-md bg-[#FAF6ED] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-[#8C6D3E] border border-[#E6E0D4]">
                {stageBadgeText}
              </span>
            </div>

            {/* Heading: Currently / Completed / Upcoming [Stage Name] */}
            <div className="mt-2.5 sm:mt-3">
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#111827] leading-tight">
                {isCompleted ? "Completed:" : isInProgress ? "Currently:" : "Upcoming:"}
              </h2>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#C06A17] leading-tight mt-0.5">
                {stageName}
              </h3>
            </div>

            {/* Real Short Lead Summary */}
            {showSummary && (
              <p className="mt-2 font-display text-sm sm:text-[15px] font-semibold text-[#1F2937] leading-snug">
                {shortSummary}
              </p>
            )}

            {/* Real Description */}
            {showDescription && (
              <p className="mt-1.5 text-xs sm:text-[13px] text-[#4B5563] leading-relaxed">
                {description}
              </p>
            )}

            {/* Field Notice if set */}
            {stage.publicMessage && (
              <div className="mt-3 rounded-xl border border-amber-300/80 bg-amber-50/80 p-2.5 text-xs text-amber-900 leading-relaxed shadow-2xs">
                <strong>Notice:</strong> {stage.publicMessage}
              </div>
            )}
          </div>

          {/* Footer: Calendar Icon + LAST UPDATED date */}
          <div className="mt-4 sm:mt-5 pt-3 border-t border-[#F3F4F6] flex items-center justify-between gap-3 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-[#8C6D3E] shrink-0" />
              <div>
                <span className="block text-[9px] sm:text-[10px] text-[#9CA3AF] uppercase tracking-wider font-bold">
                  {isCompleted ? "COMPLETED DATE" : "LAST UPDATED"}
                </span>
                <span className="font-bold text-xs sm:text-[13px] text-[#374151]">
                  {formattedDate}
                </span>
              </div>
            </div>

            <span
              className={`font-semibold rounded-full px-2.5 sm:px-3 py-0.5 text-[11px] ${
                isInProgress
                  ? "bg-amber-100/80 text-amber-900 border border-amber-200/50"
                  : isCompleted
                  ? "bg-emerald-100/80 text-emerald-800 border border-emerald-200/50"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {isInProgress ? "In Progress" : isCompleted ? "Completed" : "Upcoming"}
            </span>
          </div>
        </div>

        {/* Right Side: Fixed Size Photo Gallery across all stages */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
          <div className="w-full max-w-[440px] h-[240px] sm:h-[260px]">
            {uploadedImages.length === 0 ? (
              /* Clean placeholder if admin hasn't uploaded photos yet */
              <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-[#E6E0D4] bg-[#FAF8F5] h-full w-full">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white border border-[#E6E0D4] text-[#C06A17] shadow-xs mb-2.5">
                  <StageIconRenderer
                    iconType={stage.icon_type}
                    iconValue={stage.icon_value}
                    iconKey={stage.icon || (stage as any).key}
                    className="h-6 w-6"
                    fallbackIcon={Icon}
                  />
                </div>
                <h4 className="font-display text-sm sm:text-base font-bold text-[#1F2937]">
                  {stageName}
                </h4>
                <p className="text-[11px] text-[#6B7280] max-w-xs mt-1 leading-relaxed font-sans">
                  No field photo added yet for this stage. Live orchard photos will appear here as field operations proceed.
                </p>
                <div className="mt-3 flex items-center gap-1.5 rounded-full bg-[#FAF6ED] border border-[#E6E0D4] px-2.5 py-0.5 text-[10px] font-semibold text-[#8C6D3E]">
                  <Camera className="h-3 w-3 text-[#8C6D3E]" />
                  <span>Verified Stage · {stageBadgeText}</span>
                </div>
              </div>
            ) : uploadedImages.length === 1 ? (
              /* Single verified photo: Fixed height & width */
              <div
                onClick={() => onOpenPhoto(mainImage, uploadedImages)}
                className="relative h-full w-full rounded-2xl overflow-hidden border border-border/60 bg-[#FAF8F5] cursor-pointer group shadow-xs hover:border-primary/60 transition-all duration-300"
              >
                <img
                  src={mainImage}
                  alt={`${stageName} harvest verification photo`}
                  loading="lazy"
                  decoding="async"
                  onError={() => setBrokenImages((prev) => new Set(prev).add(mainImage))}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />

                {/* Location / Process Method Badge Bottom-Left */}
                <div className="absolute bottom-3 left-3 sm:bottom-3.5 sm:left-3.5 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 text-white border border-white/15 shadow-sm max-w-[90%]">
                  <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white leading-tight">
                      {locationText}
                    </p>
                    <p className="text-[8px] uppercase tracking-widest text-white/80 font-bold leading-tight mt-0.5">
                      {processMethodTag}
                    </p>
                  </div>
                </div>

                {/* Expand Icon Bottom-Right on Hover */}
                <div className="absolute bottom-3 right-3 h-7 w-7 rounded-lg bg-black/50 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="h-3.5 w-3.5" />
                </div>
              </div>
            ) : uploadedImages.length === 2 ? (
              /* 2 uploaded photos: Balanced 2-card grid within fixed frame */
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 h-full w-full">
                {uploadedImages.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => onOpenPhoto(img, uploadedImages)}
                    className="relative h-full w-full rounded-2xl overflow-hidden border border-border/60 bg-[#FAF8F5] cursor-pointer group shadow-xs hover:border-primary/60 transition-all duration-300"
                  >
                    <img
                      src={img}
                      alt={`${stageName} field photo ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      onError={() => setBrokenImages((prev) => new Set(prev).add(img))}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-lg text-white text-[10px] font-semibold flex items-center gap-1 border border-white/10">
                      <MapPin className="h-2.5 w-2.5 text-amber-400" />
                      <span className="truncate max-w-[90px]">{i === 0 ? locationText : `Photo ${i + 1}`}</span>
                    </div>
                    <div className="absolute bottom-2 right-2 h-6 w-6 rounded-lg bg-black/50 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="h-3 w-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 3+ uploaded photos: 1 Main Feature + Stacked Side Photos within fixed frame */
              <div className="grid grid-cols-12 gap-2.5 sm:gap-3 h-full w-full">
                {/* Primary / Feature Photo */}
                <div
                  onClick={() => onOpenPhoto(mainImage, uploadedImages)}
                  className="col-span-8 relative h-full w-full rounded-2xl overflow-hidden border border-border/60 bg-[#FAF8F5] cursor-pointer group shadow-xs hover:border-primary/60 transition-all duration-300"
                >
                  <img
                    src={mainImage}
                    alt={`${stageName} primary photo`}
                    loading="lazy"
                    decoding="async"
                    onError={() => setBrokenImages((prev) => new Set(prev).add(mainImage))}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />

                  {/* Location / Process Method Badge Bottom-Left */}
                  <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-white border border-white/15 shadow-sm max-w-[90%]">
                    <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-white leading-tight truncate">
                        {locationText}
                      </p>
                      <p className="text-[8px] uppercase tracking-widest text-white/80 font-bold leading-tight mt-0.5">
                        {processMethodTag}
                      </p>
                    </div>
                  </div>

                  {/* Expand Icon Bottom-Right on Hover */}
                  <div className="absolute bottom-2.5 right-2.5 h-6 w-6 rounded-lg bg-black/50 backdrop-blur text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="h-3 w-3" />
                  </div>
                </div>

                {/* Side Stacked Photos */}
                <div className="col-span-4 flex flex-col gap-2.5 h-full">
                  {sideImages[0] && (
                    <div
                      onClick={() => onOpenPhoto(sideImages[0], uploadedImages)}
                      className="flex-1 relative h-1/2 w-full rounded-xl overflow-hidden border border-border/60 bg-[#FAF8F5] cursor-pointer group shadow-xs hover:border-primary/60 transition-all duration-300"
                    >
                      <img
                        src={sideImages[0]}
                        alt={`${stageName} process photo 2`}
                        loading="lazy"
                        decoding="async"
                        onError={() => setBrokenImages((prev) => new Set(prev).add(sideImages[0]))}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}

                  {sideImages[1] && (
                    <div
                      onClick={() => onOpenPhoto(sideImages[1], uploadedImages)}
                      className="flex-1 relative h-1/2 w-full rounded-xl overflow-hidden border border-border/60 bg-[#FAF8F5] cursor-pointer group shadow-xs hover:border-primary/60 transition-all duration-300"
                    >
                      <img
                        src={sideImages[1]}
                        alt={`${stageName} process photo 3`}
                        loading="lazy"
                        decoding="async"
                        onError={() => setBrokenImages((prev) => new Set(prev).add(sideImages[1]))}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {remainingCount > 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[11px] font-bold">
                          +{remainingCount}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

