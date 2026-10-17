import { useEffect, useRef, useState, useMemo, Fragment } from "react";
import { ArrowRight, Leaf } from "lucide-react";
import type { TransformationItem } from "@/lib/types/harvest";
import { getCleanStageName } from "./index";
import { isFarmerImage, getStandardStageImage, STANDARD_STAGE_LIST } from "./journey-image";

interface TransformationStripProps {
  items: TransformationItem[];
  onOpenPhoto: (imgUrl: string) => void;
}

export function TransformationStrip({ items, onOpenPhoto }: TransformationStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure standard canonical stage photos for all stages
  const displayItems = useMemo(() => {
    if (!items || items.length < 4) {
      return STANDARD_STAGE_LIST;
    }
    return items.map((it) => {
      let img = it.image;
      if (
        !img ||
        img.includes("cat-plants") ||
        img.includes("himalayan-landscape") ||
        img.includes("cat-dryfruits") ||
        isFarmerImage(img)
      ) {
        img = getStandardStageImage(it.label);
      }
      return {
        ...it,
        image: img,
      };
    });
  }, [items]);

  const validItems = displayItems.filter(
    (it) =>
      it &&
      it.image &&
      typeof it.image === "string" &&
      it.image.trim().length > 0 &&
      !isFarmerImage(it.image) &&
      !brokenImages.has(it.image)
  );

  // Dynamic CSS grid columns: 1fr for each card, auto for each arrow between
  const gridTemplate = useMemo(() => {
    if (!validItems || validItems.length === 0) return "1fr";
    return validItems
      .map((_, i) => (i < validItems.length - 1 ? "1fr auto" : "1fr"))
      .join(" ");
  }, [validItems]);

  // Auto-scroll loop on mobile
  useEffect(() => {
    if (!validItems || validItems.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      // Pause if tab is in background or desktop screen
      if (typeof document !== "undefined" && document.hidden) return;
      // Only auto scroll on mobile / tablet screens (< 1024px)
      if (typeof window !== "undefined" && window.innerWidth >= 1024) return;

      setActiveIndex((prev) => {
        const next = (prev + 1) % validItems.length;
        if (scrollRef.current) {
          const container = scrollRef.current;
          const targetChild = container.querySelector<HTMLElement>(`[data-slide-index="${next}"]`);
          if (targetChild) {
            container.scrollTo({
              left: targetChild.offsetLeft - container.offsetLeft,
              behavior: "smooth",
            });
          }
        }
        return next;
      });
    }, 4000);

    return () => {
      clearInterval(timer);
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, [validItems, isPaused]);

  if (!validItems || validItems.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-[#E6E0D4] bg-white p-5 md:p-6 shadow-2xs"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => {
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
        setIsPaused(true);
      }}
      onTouchEnd={() => {
        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
        touchTimerRef.current = setTimeout(() => setIsPaused(false), 3000);
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#F3F4F6] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[#3A5A40]">
            <Leaf className="h-5 w-5 fill-[#3A5A40] text-[#3A5A40]" />
          </span>
          <h3 className="font-display text-lg sm:text-xl font-bold text-[#1F2937]">
            Previous Season: Harvest to Pack
          </h3>
        </div>
        <span className="text-xs text-[#6B7280]">
          From fresh harvest to your Prajnaa pack
        </span>
      </div>

      {/* Responsive Horizontal Strip that occupies the whole space with zero negative margin */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto pb-2 pt-1 select-none scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          className="w-full items-center gap-1.5 sm:gap-2.5 md:gap-3 min-w-[520px] sm:min-w-full"
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplate,
            width: "100%",
          }}
        >
          {validItems.map((item, idx) => {
            const isLast = idx === validItems.length - 1;
            const stableKey = `${item.label}-${idx}`;

            return (
              <Fragment key={stableKey}>
                <div
                  data-slide-index={idx}
                  className="w-full min-w-0"
                >
                  <div
                    onClick={() => onOpenPhoto(item.image)}
                    title={getCleanStageName(item.label)}
                    className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl border border-border/80 bg-secondary shadow-2xs transition-all duration-300 hover:scale-[1.03] hover:border-primary hover:shadow-xs"
                  >
                    <img
                      src={item.image}
                      alt={getCleanStageName(item.label)}
                      loading="lazy"
                      decoding="async"
                      onError={() => setBrokenImages((prev) => new Set(prev).add(item.image))}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {!isLast && (
                  <div className="flex items-center justify-center text-[#1F4A38] shrink-0 px-0.5">
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.25]" />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile Slider Dots Indicator */}
      <div className="flex lg:hidden items-center justify-center gap-1.5 mt-2.5">
        {validItems.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => {
              setActiveIndex(i);
              if (scrollRef.current) {
                const container = scrollRef.current;
                const target = container.querySelector<HTMLElement>(`[data-slide-index="${i}"]`);
                if (target) {
                  container.scrollTo({
                    left: target.offsetLeft - container.offsetLeft,
                    behavior: "smooth",
                  });
                }
              }
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              activeIndex === i ? "w-5 bg-[#1F4A38]" : "w-1.5 bg-[#D1D5DB]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
