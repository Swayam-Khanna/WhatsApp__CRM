"use client";

import { useState, useMemo, useEffect } from "react";
import type { HarvestJourneyData, HarvestStage, TransformationItem } from "@/lib/types/harvest";
import { HarvestHeader } from "./harvest-header";
import {
  JourneyTimeline,
  STANDARD_HARVEST_STAGES,
  matchRawStageToStandard,
  enrichWithUpcomingStages,
} from "./journey-timeline";
import { getSortedJourneyStages } from "@/lib/services/harvestJourneyService";
import { StageDetailPanel } from "./stage-detail-panel";
import { MidRowCards } from "./mid-row-cards";
import { TransformationStrip } from "./transformation-strip";
import { BatchPassport } from "./batch-passport";
import { HarvestLightbox } from "./harvest-lightbox";
import { Sprout } from "lucide-react";
import { isFarmerImage, getStandardStageImage, STANDARD_STAGE_LIST } from "./journey-image";

export function getCleanStageName(rawName?: string | null): string {
  if (!rawName) return "";
  let name = String(rawName).trim();

  // Strip status/lifecycle sentence fragments like "has been started", "has been completed", "is in progress", etc.
  name = name.replace(/\s+has\s+been\b.*$/gi, "");
  name = name.replace(/\s+is\s+(in\s+progress|underway|completed|done|started)\b.*$/gi, "");
  name = name.replace(/\s+shifted\s+to\b.*$/gi, "");
  name = name.replace(/\s*[-–—:]\s*(completed|in progress|started|done|active)\b.*$/gi, "");
  name = name.replace(/\s*\((completed|in progress|started|done|active)\)\s*$/gi, "");
  name = name.replace(/\s+(started|completed|done)\s*$/gi, "");

  // Check if canonical keywords match directly to standard clean name
  const lower = name.toLowerCase();
  if (lower.startsWith("harvest") || lower.includes("harvesting") || lower.includes("plucking")) return "Harvest";
  if (lower.startsWith("sun dry") || lower.includes("sun-dry") || lower.includes("drying")) return "Sun Drying";
  if (lower.includes("sort") || lower.includes("soting") || lower.includes("grading")) return "Sorting";
  if (lower.includes("quality") || lower.includes("check") || lower.includes("testing")) return "Quality Check";
  if (lower.includes("pack") || lower.includes("eco-pack")) return "Packing";
  if (lower.includes("dispatch") || lower.includes("transit") || lower.includes("shipping")) return "Dispatch";

  return name.trim() || String(rawName).trim();
}

/**
 * Stages must strictly use their own uploaded photos.
 * Never returns farmer portraits or misleading category photos.
 */
export function getStageFallbackImages(stage?: any): string[] {
  return [];
}

interface HarvestJourneyProps {
  journey: any;
  productName: string;
}

export function HarvestJourney({ journey: initialJourney, productName }: HarvestJourneyProps) {
  const [liveJourney, setLiveJourney] = useState<any>(initialJourney);

  // Sync when prop changes
  useEffect(() => {
    if (initialJourney) {
      setLiveJourney(initialJourney);
    }
  }, [initialJourney]);

  // Real-time multi-channel listener (BroadcastChannel, CustomEvent, Storage, and Polling)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const matchesMe = (prodId?: string, prodSlug?: string, jId?: string, j?: any) => {
      const myProdId = String(liveJourney?.product_id || initialJourney?.product_id || "").toLowerCase().trim();
      const myJId = String(liveJourney?.id || initialJourney?.id || "").toLowerCase().trim();
      const mySlug = String((liveJourney as any)?.slug || (initialJourney as any)?.slug || "").toLowerCase().trim();
      const name = String(productName || "").toLowerCase().trim();

      const pId = prodId ? String(prodId).toLowerCase().trim() : "";
      const pSlug = prodSlug ? String(prodSlug).toLowerCase().trim() : "";
      const targetJId = jId ? String(jId).toLowerCase().trim() : "";

      // 1. Direct ID/slug/journey ID matches
      if (pId && (pId === myProdId || pId === mySlug)) return true;
      if (pSlug && (pSlug === mySlug || pSlug === myProdId)) return true;
      if (targetJId && targetJId === myJId) return true;
      if (j?.id && String(j.id).toLowerCase() === myJId) return true;
      if (j?.product_id && (String(j.product_id).toLowerCase() === myProdId || String(j.product_id).toLowerCase() === mySlug)) return true;

      // 2. URL Pathname matching (in browser /product/cashew-jz2y or /product/walnuts)
      if (typeof window !== "undefined") {
        const path = window.location.pathname.toLowerCase();
        if (pId && path.includes(pId)) return true;
        if (pSlug && path.includes(pSlug)) return true;
        if (targetJId && path.includes(targetJId)) return true;
      }

      // 3. Name vs Slug / ID fuzzy matching (e.g. Cashew vs cashew-jz2y)
      const cleanName = name.replace(/[^a-z0-9]/g, "");
      const cleanPId = pId.replace(/[^a-z0-9]/g, "");
      const cleanPSlug = pSlug.replace(/[^a-z0-9]/g, "");
      if (cleanName && cleanPId && (cleanPId.includes(cleanName) || cleanName.includes(cleanPId))) return true;
      if (cleanName && cleanPSlug && (cleanPSlug.includes(cleanName) || cleanName.includes(cleanPSlug))) return true;

      // 4. Fallback: If this is the only journey on the product page and has stages, accept it
      if (j && Array.isArray(j.stages) && j.stages.length > 0) {
        if (!myProdId && !mySlug) return true;
      }

      return false;
    };

    // 1. Cross-tab BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("prajnaa_harvest_journey_channel");
        bc.onmessage = (event) => {
          const data = event.data;
          if (data && data.journey) {
            if (matchesMe(data.productId, data.slug, data.journeyId, data.journey)) {
              setLiveJourney(data.journey);
            }
          }
        };
      }
    } catch (e) {}

    // 2. CustomEvent within same window
    const handleJourneyUpdate = (e: any) => {
      const detail = e.detail;
      if (detail && detail.journey) {
        if (matchesMe(detail.productId, detail.slug, detail.journeyId, detail.journey)) {
          setLiveJourney(detail.journey);
        }
      }
    };
    window.addEventListener("prajnaa_harvest_journey_updated", handleJourneyUpdate);

    // 3. Storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "prajnaa_harvest_journey_sync_tick" || (e.key && e.key.startsWith("prajnaa_harvest_journey_"))) {
        const myProdId = liveJourney?.product_id || initialJourney?.product_id;
        const mySlug = (liveJourney as any)?.slug || (initialJourney as any)?.slug;
        const raw =
          (myProdId ? localStorage.getItem(`prajnaa_harvest_journey_${myProdId}`) : null) ||
          (mySlug ? localStorage.getItem(`prajnaa_harvest_journey_${mySlug}`) : null) ||
          localStorage.getItem("prajnaa_harvest_journey_latest");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
              if (matchesMe(parsed.product_id, parsed.slug, parsed.id, parsed)) {
                setLiveJourney(parsed);
              }
            }
          } catch (err) {}
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Live polling (every 3 seconds) & window focus refetch
    const pollId = liveJourney?.product_id || initialJourney?.product_id || (liveJourney as any)?.slug || (initialJourney as any)?.slug;
    const fetchLatest = async () => {
      if (!pollId) return;
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(pollId)}/harvest-journey?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.journey && Array.isArray(data.journey.stages) && data.journey.stages.length > 0) {
            setLiveJourney(data.journey);
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(fetchLatest, 3000);
    const onFocus = () => fetchLatest();
    window.addEventListener("focus", onFocus);

    return () => {
      if (bc) try { bc.close(); } catch (e) {}
      window.removeEventListener("prajnaa_harvest_journey_updated", handleJourneyUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [liveJourney?.product_id, liveJourney?.id, initialJourney?.product_id, initialJourney?.id, productName]);

  const rawStages: any[] = liveJourney?.stages || initialJourney?.stages || [];

  // 1. Compute dynamic currentStageIndex (0..7) based on batch status & stages
  const currentStageIndex = useMemo(() => {
    if (rawStages.length > 0) {
      // Find explicitly current / in-progress stage
      const currentIdx = rawStages.findIndex((s) => {
        const st = String(s?.status || "").toLowerCase();
        return st === "current" || st === "in_progress";
      });
      if (currentIdx >= 0) return currentIdx;

      // Otherwise, the first stage that is NOT done/completed
      const firstUncompleted = rawStages.findIndex((s) => {
        const st = String(s?.status || "").toLowerCase();
        return st !== "completed" && st !== "done";
      });
      if (firstUncompleted >= 0) return firstUncompleted;

      // If all are completed, return last stage
      return rawStages.length - 1;
    }

    // Default to Harvest (index 1) or Sun Drying (index 2) as active Himalayan harvest stage
    return 1;
  }, [rawStages]);

  // 2. Build normalized stages with dynamic custom stages or standard preset templates
  const normalizedStages = useMemo(() => {
    if (Array.isArray(rawStages) && rawStages.length > 0) {
      const enriched = enrichWithUpcomingStages(rawStages);
      const sorted = getSortedJourneyStages(enriched);

      const targetStageId = liveJourney?.current_stage_id || liveJourney?.currentStageId;

      // 1. Explicit current / in_progress stage has priority
      let currentStage = sorted.find((s) => {
        const st = String(s.status || "").toLowerCase();
        return st === "current" || st === "in_progress";
      });

      // 2. Target stage ID if provided AND not completed
      if (!currentStage && targetStageId) {
        const candidate = sorted.find((s) => s.id === targetStageId || s.key === targetStageId);
        const candSt = String(candidate?.status || "").toLowerCase();
        if (candidate && candSt !== "completed" && candSt !== "done") {
          currentStage = candidate;
        }
      }

      // 3. Fallback: First stage that is NOT completed
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
        const isReached = isCompleted || isCurrent;
        const status = isCompleted ? "completed" : isCurrent ? "current" : "upcoming";

        let rawImgs = (
          Array.isArray(s.images) && s.images.length > 0
            ? s.images
            : Array.isArray(s.media) && s.media.length > 0
            ? s.media
            : s.image_url
            ? [s.image_url]
            : []
        ).filter((img: any) => typeof img === "string" && img.trim().length > 0 && !isFarmerImage(img));

        // Also check if transformationGallery has a valid non-farmer image for this stage
        if (rawImgs.length === 0 && Array.isArray(liveJourney?.transformationGallery)) {
          const cleanName = getCleanStageName(s.label || s.name).toLowerCase();
          const galleryItem = liveJourney.transformationGallery.find((g: any) => {
            const gName = getCleanStageName(g.label || g.name).toLowerCase();
            return (gName.includes(cleanName) || cleanName.includes(gName)) && !isFarmerImage(g.image);
          });
          if (galleryItem?.image && !isFarmerImage(galleryItem.image)) {
            rawImgs = [galleryItem.image];
          }
        }

        // If it is the active current stage and no photo is set, check latestUpdate (excluding farmer images)
        if (rawImgs.length === 0 && isCurrent && Array.isArray(liveJourney?.latestUpdate?.images) && liveJourney.latestUpdate.images.length > 0) {
          const updateImgs = liveJourney.latestUpdate.images.filter((img: any) => typeof img === "string" && !isFarmerImage(img));
          if (updateImgs.length > 0) {
            rawImgs = updateImgs;
          }
        }

        const iconVal = s.icon_value || s.icon || "sun";
        const iconType = s.icon_type || (["sprout", "sun", "leaf", "droplets", "search", "hand", "package", "truck"].includes(iconVal) ? "preset" : "library");

        return {
          id: s.id || `stage-${idx}`,
          key: s.id || `stage-${idx}`,
          name: s.label || s.name || `Stage ${idx + 1}`,
          label: s.label || s.name || `Stage ${idx + 1}`,
          icon: iconVal,
          icon_type: iconType,
          icon_value: iconVal,
          stage_type_id: s.stage_type_id,
          position: idx,
          sort_order: idx,
          status,
          isCompleted,
          isCurrent,
          isUpcoming,
          isReached,
          dateLabel: s.stage_date || s.dateLabel || (isCompleted ? "Completed" : isCurrent ? "Active" : undefined),
          stage_date: s.stage_date || s.dateLabel,
          description: s.description || "Fresh harvest processing verified by Prajnaa Farm standards.",
          shortSummary: s.shortSummary || s.summary,
          location: s.location || liveJourney?.batchInfo?.region || "Verified Farm Orchard",
          publicMessage: s.publicMessage || s.farmNote,
          image_url: rawImgs[0] || null,
          images: rawImgs,
          media: rawImgs,
          transformation_photo_id: s.transformation_photo_id && !isFarmerImage(s.transformation_photo_id) ? s.transformation_photo_id : (rawImgs[0] || null),
          show_in_transformation: s.show_in_transformation !== undefined ? s.show_in_transformation : rawImgs.length > 0,
        };
      });
    }

    // Default template when 0 stages are configured - keep image slots empty to trigger neutral stage placeholder
    return STANDARD_HARVEST_STAGES.map((std, idx) => {
      const isCompleted = idx < currentStageIndex;
      const isCurrent = idx === currentStageIndex;
      const isUpcoming = idx > currentStageIndex;
      const isReached = idx <= currentStageIndex;
      const status = isCompleted ? "completed" : isCurrent ? "current" : "upcoming";

      return {
        id: `stage-${std.key}`,
        key: std.key,
        name: std.label,
        label: std.label,
        icon: std.key,
        icon_type: "preset" as const,
        icon_value: std.key,
        status,
        isCompleted,
        isCurrent,
        isUpcoming,
        isReached,
        dateLabel: isCompleted ? "Completed" : isCurrent ? "Active" : undefined,
        stage_date: undefined,
        description: std.defaultDescription,
        shortSummary: undefined,
        location: liveJourney?.batchInfo?.region || "Verified Farm Orchard",
        publicMessage: undefined,
        image_url: null,
        images: [],
        media: [],
        transformation_photo_id: null,
        show_in_transformation: false,
        sort_order: idx + 1,
      };
    });
  }, [rawStages, currentStageIndex, liveJourney?.batchInfo?.region, liveJourney?.transformationGallery, liveJourney?.latestUpdate?.images, liveJourney?.current_stage_id, liveJourney?.currentStageId]);

  // Initial active selected stage ID points directly to Current Stage
  const initialStageId = useMemo(() => {
    const current = normalizedStages.find((s) => s.isCurrent) || normalizedStages.find((s) => !s.isCompleted) || normalizedStages[0];
    return current ? current.id : "stage-sun-drying";
  }, [normalizedStages]);

  const [selectedStageId, setSelectedStageId] = useState<string>(initialStageId);

  // Sync selected stage ID when current stage advances or component re-renders
  useEffect(() => {
    if (!selectedStageId || !normalizedStages.some((s) => s.id === selectedStageId || s.key === selectedStageId)) {
      setSelectedStageId(initialStageId);
    }
  }, [initialStageId, selectedStageId, normalizedStages]);

  // Formatted batch passport information
  const batchInfo = useMemo(() => {
    if (!liveJourney) return null;
    if (liveJourney.batchInfo) return liveJourney.batchInfo;
    const year = new Date().getFullYear();
    const batchNo =
      liveJourney.batch_number ||
      liveJourney.batchNumber ||
      `#${(productName || "PRJ").slice(0, 2).toUpperCase()}-${year}-01`;
    return {
      batchNumber: batchNo,
      region: liveJourney.region || "Ladakh, Himalayas",
      harvestYear: liveJourney.harvestYear || `${year}`,
      processingMethod: liveJourney.processingMethod || "Natural sun drying",
      currentStatusLabel: normalizedStages[currentStageIndex]?.label || "Sun Drying",
      expectedDispatch: liveJourney.expectedDispatch || `October ${year} (Tentative)`,
    };
  }, [liveJourney, productName, normalizedStages, currentStageIndex]);

  // Transformation gallery items (strictly real only, admin controlled)
  const transformationGallery = useMemo<TransformationItem[]>(() => {
    const items: TransformationItem[] = [];

    // Follow timeline order of normalized stages
    for (const stage of normalizedStages) {
      // 1. If show_in_transformation is explicitly false, skip this stage
      if (stage.show_in_transformation === false) {
        continue;
      }

      // Skip upcoming stages (only completed stages and the active current stage show in transformation)
      if (stage.isUpcoming) {
        continue;
      }

      // 2. Identify transformation photo:
      // Either stage.transformation_photo_id, or first photo from stage.images / stage.media / stage.image_url
      const allImgs = (
        Array.isArray(stage.images) && stage.images.length > 0
          ? stage.images
          : Array.isArray(stage.media) && stage.media.length > 0
          ? stage.media
          : stage.image_url
          ? [stage.image_url]
          : []
      ).filter((img: any) => typeof img === "string" && img.trim().length > 0 && !isFarmerImage(img));

      let selectedPhoto = stage.transformation_photo_id || allImgs[0] || stage.image_url || null;
      if (selectedPhoto && isFarmerImage(selectedPhoto)) {
        selectedPhoto = null;
      }

      // Also check if journey.transformationGallery had an image for this stage
      if (!selectedPhoto && Array.isArray(liveJourney?.transformationGallery)) {
        const cleanName = getCleanStageName(stage.label || stage.name).toLowerCase();
        const galleryItem = liveJourney.transformationGallery.find((g: any) => {
          const gName = getCleanStageName(g.label || g.name).toLowerCase();
          return (gName.includes(cleanName) || cleanName.includes(gName)) && !isFarmerImage(g.image);
        });
        if (galleryItem?.image && !isFarmerImage(galleryItem.image)) {
          selectedPhoto = galleryItem.image;
        }
      }

      // If it is the active current stage and no photo is set, check latestUpdate
      if (!selectedPhoto && stage.isCurrent && Array.isArray(liveJourney?.latestUpdate?.images) && liveJourney.latestUpdate.images.length > 0) {
        const validUpdateImgs = liveJourney.latestUpdate.images.filter((img: any) => typeof img === "string" && !isFarmerImage(img));
        if (validUpdateImgs.length > 0) {
          selectedPhoto = validUpdateImgs[0];
        }
      }

      // If no photo remains, hide the stage from the strip
      if (!selectedPhoto || isFarmerImage(selectedPhoto)) {
        continue;
      }

      items.push({
        id: stage.id,
        label: getCleanStageName(stage.label || stage.name),
        image: selectedPhoto,
      });
    }

    // 3. Final pack product tile ("Your Prajnaa pack")
    const finalPackPhoto =
      liveJourney?.final_pack_photo_url ||
      liveJourney?.batchInfo?.final_pack_photo_url;

    if (finalPackPhoto && typeof finalPackPhoto === "string" && finalPackPhoto.trim() && !isFarmerImage(finalPackPhoto)) {
      const finalCaption =
        liveJourney?.final_pack_caption ||
        liveJourney?.batchInfo?.final_pack_caption ||
        "Your Prajnaa pack";
      items.push({
        id: "final-pack",
        label: getCleanStageName(finalCaption.trim()) || "Your Prajnaa pack",
        image: finalPackPhoto.trim(),
      });
    }

    // Fallback: If no stage photos were available or incomplete, return canonical STANDARD_STAGE_LIST
    if (items.length < 4) {
      return STANDARD_STAGE_LIST;
    }

    return items.map((it) => ({
      ...it,
      image: (it.image && !it.image.includes("cat-plants") && !it.image.includes("himalayan-landscape") && !it.image.includes("cat-dryfruits"))
        ? it.image
        : getStandardStageImage(it.label),
    }));
  }, [
    normalizedStages,
    liveJourney?.final_pack_photo_url,
    liveJourney?.final_pack_caption,
    liveJourney?.batchInfo?.final_pack_photo_url,
    liveJourney?.batchInfo?.final_pack_caption,
    liveJourney?.transformationGallery,
  ]);

  // Live farm updates list (strictly real only)
  const effectiveUpdates = useMemo(() => {
    if (liveJourney?.updates && liveJourney.updates.length > 0) {
      return liveJourney.updates;
    }
    if (liveJourney?.latestUpdate) {
      return [liveJourney.latestUpdate];
    }
    return [];
  }, [liveJourney]);

  // Lightbox modal state
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    images: string[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  const handleOpenPhoto = (imgUrl: string, galleryList?: string[]) => {
    const list = galleryList && galleryList.length > 0 ? galleryList : [imgUrl];
    const idx = list.indexOf(imgUrl);
    setLightbox({
      isOpen: true,
      images: list,
      currentIndex: idx >= 0 ? idx : 0,
    });
  };

  const handleCloseLightbox = () => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
  };

  const handlePrevLightbox = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1,
    }));
  };

  const handleNextLightbox = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1 < prev.images.length ? prev.currentIndex + 1 : 0,
    }));
  };

  // Active selected stage resolution - ensures only unlocked (completed or ongoing) stages can be inspected
  const activeSelectedStage = useMemo(() => {
    let found = normalizedStages.find(
      (s) => (s.id === selectedStageId || s.key === selectedStageId) && !s.isUpcoming
    );
    if (!found) {
      found = normalizedStages.find((s) => s.isCurrent) || normalizedStages.filter((s) => s.isCompleted).pop() || normalizedStages[0];
    }
    return found;
  }, [normalizedStages, selectedStageId]);

  const selectedStageIndex = normalizedStages.findIndex(
    (s) => s.id === activeSelectedStage.id || s.key === activeSelectedStage.key
  );
  const nextStage =
    selectedStageIndex + 1 < normalizedStages.length
      ? normalizedStages[selectedStageIndex + 1]
      : undefined;

  // Handle stage selection (only completed or current ongoing stages are selectable; upcoming stages are locked)
  const handleSelectStage = (stageId: string) => {
    const target = normalizedStages.find((s) => s.id === stageId || s.key === stageId);
    if (target && !target.isUpcoming) {
      setSelectedStageId(target.id);
    }
  };

  return (
    <section
      id="harvest-journey"
      aria-label="Harvest Journey"
      className="mt-8 pt-2 pb-2 space-y-4 scroll-mt-20"
    >
      {/* 1 & 2. Unified Card: Centered 'Follow Your Harvest' Header + 8-Stage Stepper */}
      <div className="rounded-2xl border border-[#E6E0D4] bg-[#FAF8F5]/80 p-5 sm:p-6 shadow-xs space-y-4">
        <HarvestHeader
          headline={liveJourney?.headline || "Follow Your Harvest"}
          subheadline={liveJourney?.subheadline || "From the farmer's hands to your Prajnaa pack."}
          batchInfo={batchInfo}
        />

        <JourneyTimeline
          stages={rawStages}
          selectedStageId={activeSelectedStage.id}
          currentStageIndex={currentStageIndex}
          currentStageId={liveJourney?.current_stage_id || liveJourney?.currentStageId}
          currentStatusLabel={batchInfo?.currentStatusLabel}
          onSelectStage={handleSelectStage}
        />
      </div>

      {/* 3. Unified Harvest Stage Showcase Card (Single Component) */}
      {activeSelectedStage && (
        <StageDetailPanel
          key={activeSelectedStage.id}
          stage={activeSelectedStage as any}
          stages={normalizedStages as any}
          totalStages={normalizedStages.length}
          stageIndex={selectedStageIndex >= 0 ? selectedStageIndex : 0}
          nextStage={nextStage as any}
          batchInfo={batchInfo}
          latestUpdate={effectiveUpdates[0]}
          updatesList={effectiveUpdates}
          images={
            (activeSelectedStage as any).images?.length
              ? (activeSelectedStage as any).images
              : activeSelectedStage.image_url
              ? [activeSelectedStage.image_url]
              : activeSelectedStage.media?.length
              ? activeSelectedStage.media
              : getStageFallbackImages(activeSelectedStage)
          }
          onOpenPhoto={(img, allImgs) =>
            handleOpenPhoto(
              img,
              allImgs && allImgs.length > 0
                ? allImgs
                : (activeSelectedStage as any).images?.length
                ? (activeSelectedStage as any).images
                : activeSelectedStage.image_url
                ? [activeSelectedStage.image_url]
                : [img]
            )
          }
        />
      )}

      {/* 4. Three-Column Mid Row: What's Next + Nature Quote + Mountain Landscape */}
      <MidRowCards nextStage={nextStage as any} />

      {/* 5. Previous Season: Harvest to Pack Strip Gallery */}
      <TransformationStrip
        items={transformationGallery.length > 0 ? transformationGallery : STANDARD_STAGE_LIST}
        onOpenPhoto={(img) =>
          handleOpenPhoto(
            img,
            (transformationGallery.length > 0 ? transformationGallery : STANDARD_STAGE_LIST).map((t: any) => t.image)
          )
        }
      />

      {/* 6. Batch Integrity Passport */}
      {batchInfo && <BatchPassport batchInfo={batchInfo} />}

      {/* Accessible Photo Lightbox */}
      <HarvestLightbox
        isOpen={lightbox.isOpen}
        images={lightbox.images}
        currentIndex={lightbox.currentIndex}
        onClose={handleCloseLightbox}
        onPrev={handlePrevLightbox}
        onNext={handleNextLightbox}
      />
    </section>
  );
}
