import { useState } from "react";
import { Leaf, Clock, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import type { HarvestJournalUpdate, HarvestUpdateModel } from "@/lib/types/harvest";
import { isFarmerImage } from "./journey-image";

interface LatestFarmUpdateProps {
  update?: HarvestJournalUpdate | HarvestUpdateModel;
  updatesList?: HarvestUpdateModel[];
  onOpenPhoto?: (imgUrl: string) => void;
}

export function LatestFarmUpdate({ update, updatesList, onOpenPhoto }: LatestFarmUpdateProps) {
  const displayUpdates = updatesList && updatesList.length > 0 ? updatesList : update ? [update] : [];
  
  if (displayUpdates.length === 0) {
    return (
      <div className="h-full rounded-2xl border border-[#E6E0D4] bg-white p-5 md:p-6 shadow-2xs flex flex-col justify-between min-h-[240px]">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
            <div className="flex items-center gap-2">
              <span className="text-[#3A5A40]">
                <Leaf className="h-5 w-5 fill-[#3A5A40] text-[#3A5A40]" />
              </span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#1F2937]">
                Today at Prajnaa
              </h3>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-semibold text-[#4B5563] hover:text-[#1F2937] transition cursor-pointer"
            >
              <span>View all updates</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#FAF6ED] text-[#8C6D3E]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">No field updates posted yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Real-time harvest notes, weather conditions, and packing announcements will appear here as work progresses.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F3F4F6] text-[11px] text-[#9CA3AF] flex items-center justify-between">
          <span>Verified directly by partner orchard</span>
          <span className="text-emerald-700 font-semibold">Live status</span>
        </div>
      </div>
    );
  }

  const primary = displayUpdates[0];
  const updateText =
    (primary as any).content ||
    (primary as any).text ||
    (primary as any).description ||
    (primary as any).quote ||
    "";
  const updateTitle = (primary as any).title || "Today at Prajnaa";
  const updateAuthor = (primary as any).author_name || (primary as any).author || "Team Prajnaa, Ladakh";
  const updateQuote = (primary as any).quote || updateText;
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const updateImages: string[] = (
    Array.isArray((primary as any).images) && (primary as any).images.length > 0
      ? (primary as any).images
      : []
  ).filter(
    (img: any) =>
      typeof img === "string" &&
      img.trim().length > 0 &&
      !isFarmerImage(img) &&
      !brokenImages.has(img)
  );

  return (
    <div className="h-full rounded-2xl border border-[#E6E0D4] bg-white p-5 md:p-6 shadow-2xs flex flex-col justify-between min-h-[240px]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-2">
            <span className="text-[#3A5A40]">
              <Leaf className="h-5 w-5 fill-[#3A5A40] text-[#3A5A40]" />
            </span>
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#1F2937]">
              {updateTitle}
            </h3>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-semibold text-[#4B5563] hover:text-[#1F2937] transition cursor-pointer"
          >
            <span>View all updates</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 3 Photos in a row if images present */}
        {updateImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {updateImages.slice(0, 3).map((img, i) => (
              <div
                key={i}
                onClick={() => onOpenPhoto?.(img)}
                className="group relative aspect-4/3 overflow-hidden rounded-xl border border-border/60 bg-secondary cursor-pointer shadow-2xs hover:border-primary transition"
              >
                <img
                  src={img}
                  alt={`Farm journal update photo ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  onError={() => setBrokenImages((prev) => new Set(prev).add(img))}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}

        {/* Quote */}
        {updateQuote && (
          <div className="mt-4 flex items-start gap-2">
            <span className="font-serif text-3xl font-bold text-[#D1D5DB] leading-none shrink-0 -mt-1 select-none">
              “
            </span>
            <div className="space-y-1">
              <p className="font-display italic text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                {updateQuote}
              </p>
              {updateAuthor && (
                <p className="text-right text-xs font-semibold text-[#6B7280]">
                  — {updateAuthor}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Additional recent updates snippet if multiple */}
        {displayUpdates.length > 1 && (
          <div className="mt-4 pt-3 border-t border-[#F9FAFB] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Recent Field Logs
            </span>
            {displayUpdates.slice(1, 3).map((upd, idx) => (
              <div key={upd.id || idx} className="text-xs text-[#6B7280] flex items-start gap-1.5">
                <span className="text-primary font-bold">·</span>
                <span className="line-clamp-1 flex-1">{(upd as any).text || (upd as any).description}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {(upd as any).created_at ? new Date((upd as any).created_at).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#F3F4F6] text-[11px] text-[#9CA3AF] flex items-center justify-between">
        <span>Verified directly by partner orchard</span>
        <span className="text-emerald-700 font-semibold">Live status</span>
      </div>
    </div>
  );
}
