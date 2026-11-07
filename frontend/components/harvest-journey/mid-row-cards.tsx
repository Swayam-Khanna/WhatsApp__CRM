"use client";

import {
  Hand,
  Leaf,
  Search,
  Package,
  Truck,
  Sun,
  Droplets,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import Image from "next/image";
import type { HarvestStage } from "@/lib/types/harvest";

interface MidRowCardsProps {
  nextStage?: HarvestStage;
}

function getNextStageIcon(name?: string): LucideIcon {
  const text = (name || "").toLowerCase();
  if (text.includes("sort") || text.includes("hand")) return Hand;
  if (text.includes("qual") || text.includes("check") || text.includes("test")) return Search;
  if (text.includes("pack")) return Package;
  if (text.includes("dispatch") || text.includes("ship")) return Truck;
  if (text.includes("sun") || text.includes("dry")) return Sun;
  if (text.includes("wash") || text.includes("clean")) return Droplets;
  return Sparkles;
}

export function MidRowCards({ nextStage }: MidRowCardsProps) {
  const nextStageName = (nextStage as any)?.label || nextStage?.name;
  const nextStageDesc = (nextStage as any)?.description || nextStage?.shortSummary;
  const NextIcon = getNextStageIcon(nextStageName);

  return (
    <div className="flex flex-col md:flex-row gap-3 items-stretch w-full">
      {/* 1. What's Next? Card (37.5%) */}
      <div
        style={{ height: "155px" }}
        className="w-full md:w-[37.5%] rounded-2xl border border-[#E6E0D4] bg-[#FAF8F5] p-4 sm:p-5 flex flex-col justify-start gap-2.5 shadow-2xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#EAE5D9]/70 border border-[#E6E0D4] flex items-center justify-center text-[#2D5A3C] shrink-0">
            <NextIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#6B7280] block uppercase tracking-wider leading-none">
              What&apos;s Next?
            </span>
            <h4 className="font-display text-sm sm:text-base font-bold text-[#1F2937] leading-tight mt-0.5">
              {nextStageName || "Upcoming Farm Step"}
            </h4>
          </div>
        </div>
        <p className="text-xs text-[#556052] leading-relaxed line-clamp-3">
          {nextStageDesc ||
            "Field operations are actively proceeding according to the season's natural timetable."}
        </p>
      </div>

      {/* 2. Brand Quote Card (25%) */}
      <div
        style={{ height: "155px" }}
        className="w-full md:w-[25%] rounded-2xl border border-[#E6E0D4] bg-[#FAF8F5] px-4 py-3.5 flex flex-col items-center justify-center text-center shadow-2xs"
      >
        <Leaf className="h-4.5 w-4.5 fill-[#2D5A3C] text-[#2D5A3C] mb-1.5 shrink-0" />
        <p className="font-display italic text-xs sm:text-[13px] text-[#2A3328] font-medium leading-snug">
          &ldquo;Good food takes time. We let nature lead the way.&rdquo;
        </p>
        <span className="mt-1.5 font-display italic text-[11px] text-[#6B7280]">
          &ndash; Prajnaa
        </span>
      </div>

      {/* 3. Mountain Landscape Image Card (37.5%) */}
      <div
        style={{ height: "155px" }}
        className="w-full md:w-[37.5%] relative rounded-2xl overflow-hidden border border-[#E6E0D4] shadow-2xs group"
      >
        <img
          src="/assets/himalayan-landscape.jpg"
          alt="From our mountains to your home"
          className="h-full w-full object-cover object-[center_35%] transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5 bg-black/30 backdrop-blur-[2px] px-2.5 py-1 rounded-full text-white">
          <span className="font-display italic text-[11px] sm:text-xs font-medium drop-shadow-sm">
            From our mountains to your home
          </span>
          <Leaf className="h-3 w-3 text-emerald-300 shrink-0 drop-shadow-sm fill-emerald-300/40" />
        </div>
      </div>
    </div>
  );
}
