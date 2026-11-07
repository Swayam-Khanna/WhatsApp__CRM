import { Leaf } from "lucide-react";
import type { HarvestBatchInfo } from "@/lib/types/harvest";

interface HarvestHeaderProps {
  headline?: string;
  subheadline?: string;
  batchInfo?: HarvestBatchInfo;
}

export function HarvestHeader({
  headline = "Follow Your Harvest",
  subheadline = "From the farmer's hands to your Prajnaa pack.",
  batchInfo,
}: HarvestHeaderProps) {
  return (
    <div className="relative pt-1 pb-3 text-center">
      <div className="flex flex-col items-center justify-center">
        {/* Centered Title with Organic Double Leaf Motif */}
        <div className="flex items-center justify-center gap-2.5 mb-1.5 pt-1">
          <span className="text-[#3A5A40] shrink-0">
            <Leaf className="h-5 w-5 sm:h-6 sm:w-6 fill-[#3A5A40] text-[#3A5A40] -rotate-12" />
          </span>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-[#0F3D2E] leading-normal sm:leading-tight">
            {headline}
          </h2>
          <span className="text-[#3A5A40] shrink-0">
            <Leaf className="h-5 w-5 sm:h-6 sm:w-6 fill-[#3A5A40] text-[#3A5A40] rotate-12 scale-x-[-1]" />
          </span>
        </div>

        {/* Centered Editorial Subheadline */}
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium leading-relaxed max-w-xl mx-auto">
          {subheadline}
        </p>

        {batchInfo?.batchNumber && (
          <span className="font-mono text-[11px] sm:text-xs font-semibold text-[#6B7280] mt-1.5 inline-block bg-[#FAF6ED] px-3 py-0.5 rounded-full border border-[#E6E0D4]">
            Batch #{batchInfo.batchNumber}
          </span>
        )}
      </div>
    </div>
  );
}
