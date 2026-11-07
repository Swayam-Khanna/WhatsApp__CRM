import Link from "next/link";
import { MapPin, Sprout, Leaf, TreePine, Trees, ShieldCheck, Star } from "lucide-react";
import type { Farmer } from "@/lib/mock/types";
import { resolveFarmerImage } from "@/lib/farmers-store";

export function FarmerCard({ farmer }: { farmer: Farmer }) {
  const years = farmer.yearsExperience || 20;

  const landAcres = farmer.totalLandAcres
    ? `${farmer.totalLandAcres} Acres`
    : farmer.slug === "ramesh-singh"
    ? "12 Acres"
    : farmer.slug === "lakshmi-devi"
    ? "18 Acres"
    : farmer.slug === "asha-patel"
    ? "2 Acres"
    : "10 Acres";

  const landType = farmer.slug === "ramesh-singh"
    ? "Orchard Land"
    : farmer.slug === "lakshmi-devi"
    ? "Cultivated Land"
    : farmer.slug === "asha-patel"
    ? "Herb Garden"
    : farmer.region ? `${farmer.region} Land` : "Cultivated Land";

  const cropLabel = farmer.slug === "ramesh-singh"
    ? "3 Crops"
    : farmer.slug === "lakshmi-devi"
    ? "4 Crops"
    : farmer.slug === "asha-patel"
    ? "10+ Herbs"
    : farmer.crops?.length
    ? `${farmer.crops.length} Crops`
    : "3 Crops";

  const cropSubtext = farmer.slug === "ramesh-singh"
    ? "Almonds, Apricots, Walnuts"
    : farmer.slug === "lakshmi-devi"
    ? "Groundnut, Jowar, Ragi, Bengal Gram"
    : farmer.slug === "asha-patel"
    ? "Basil, Mint, Coriander & more"
    : farmer.crops?.map((c) => c.name.split(" ")[0]).join(", ") ||
      farmer.upcomingHarvests?.map((h) => h.split("·")[0].trim()).slice(0, 3).join(", ") ||
      "Organic Farm Produce";

  const story = farmer.slug === "ramesh-singh"
    ? "Almond and apricot orchards tended the same way for over 30 years."
    : farmer.slug === "lakshmi-devi"
    ? "Two generations of growing groundnut and millets with care and patience."
    : farmer.slug === "asha-patel"
    ? "A first-generation farmer growing kitchen herbs and greens naturally."
    : farmer.storyPreview || farmer.story;

  const isVerified = Boolean(
    farmer.is_prajnaa_verified ||
    farmer.isVerified ||
    (farmer as any).verified === true ||
    (farmer as any).has_active_certificate === true
  );

  return (
    <Link
      href={`/farmer/${farmer.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300"
    >
      {/* Top Half: Compact Farmer Photo with Map Badge */}
      <div className="relative h-56 sm:h-60 w-full overflow-hidden bg-secondary/30">
        <img
          src={resolveFarmerImage(farmer.image)}
          alt={farmer.name}
          loading="lazy"
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* State Location Tag at Top-Left */}
        <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1F3B2C] shadow-sm backdrop-blur-md dark:bg-black/85 dark:text-emerald-300">
          <MapPin className="h-3 w-3 text-emerald-700 fill-emerald-700/20 shrink-0" />
          <span>{farmer.state}</span>
        </div>

        {/* Prajnaa Verified Badge at Top-Right - Only when officially certified */}
        {isVerified && (
          <div className="absolute right-3.5 top-3.5 flex items-center gap-1 rounded-full bg-[#0F3D2E]/95 text-[#FCFBF7] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md border border-[#D4AF37]/30 animate-in fade-in duration-200">
            <ShieldCheck className="h-3 w-3 text-[#D4AF37] shrink-0" />
            <span>Prajnaa Verified</span>
          </div>
        )}

        {/* Star Rating Badge at Bottom-Right */}
        {farmer.rating != null && (
          <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1 rounded-full bg-background/95 text-amber-500 px-2.5 py-1 text-[10px] font-bold shadow-sm backdrop-blur-md border border-amber-400/30">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
            <span>{typeof farmer.rating === "number" ? farmer.rating.toFixed(1) : farmer.rating}</span>
          </div>
        )}
      </div>

      {/* Bottom Half: Clean White Content Area */}
      <div className="flex flex-1 flex-col justify-between p-5 md:p-6 bg-card">
        <div>
          {/* Header Row: Circular Sprout Avatar + Location & Name */}
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBF3ED] text-[#1F3B2C] dark:bg-emerald-950/60 dark:text-emerald-300">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="font-subhead text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground truncate">
                  {farmer.village}, {farmer.state}
                </p>
                {isVerified && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> Verified
                  </span>
                )}
              </div>
              <h3 className="font-display mt-0.5 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {farmer.name}
              </h3>
            </div>
          </div>

          {/* Story Snippet */}
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {story}
          </p>
        </div>

        {/* Footer Metrics Row */}
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/60 pt-4 text-left">
          {/* Metric 1: Years */}
          <div>
            <div className="flex items-center gap-1 font-display text-xs font-bold text-foreground">
              <Leaf className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>{years}+</span>
            </div>
            <p className="mt-0.5 text-[9px] text-muted-foreground leading-tight">
              Years of Farming
            </p>
          </div>

          {/* Metric 2: Land Acres */}
          <div>
            <div className="flex items-center gap-1 font-display text-xs font-bold text-foreground">
              <TreePine className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="truncate">{landAcres}</span>
            </div>
            <p className="mt-0.5 text-[9px] text-muted-foreground leading-tight truncate">
              {landType}
            </p>
          </div>

          {/* Metric 3: Crops */}
          <div>
            <div className="flex items-center gap-1 font-display text-xs font-bold text-foreground">
              <Trees className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="truncate">{cropLabel}</span>
            </div>
            <p className="mt-0.5 text-[9px] text-muted-foreground leading-tight truncate" title={cropSubtext}>
              {cropSubtext}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
