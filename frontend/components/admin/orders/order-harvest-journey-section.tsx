"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Circle,
  Trash2,
  RefreshCw,
  AlertCircle,
  Eye,
} from "lucide-react";
import { isFarmerImage } from "@/components/harvest-journey/journey-image";
import { toast } from "sonner";

export interface OrderHarvestStage {
  id: string;
  name: string;
  status: "done" | "current" | "upcoming" | "completed";
  stage_date?: string | null;
  detail?: string | null;
  image_url?: string | null;
  images?: string[];
}

export const DEFAULT_ORDER_STAGES: OrderHarvestStage[] = [
  {
    id: "stage-farm",
    name: "Farm / Planting",
    status: "done",
    stage_date: "High Altitude Organic Orchard",
    detail: "Wild glacier water nourished orchard soil",
    image_url: null,
  },
  {
    id: "stage-harvest",
    name: "Harvest / Plucking",
    status: "done",
    stage_date: "Selective Hand Pick",
    detail: "Hand-harvested at peak natural ripeness",
    image_url: null,
  },
  {
    id: "stage-packing",
    name: "Packing & Quality",
    status: "current",
    stage_date: "Eco-Packaging Hub",
    detail: "Graded for moisture purity and nitrogen-sealed",
    image_url: null,
  },
  {
    id: "stage-delivery-proof",
    name: "Delivery Proof",
    status: "upcoming",
    stage_date: "Transit Handoff",
    detail: "Doorstep courier transit verification",
    image_url: null,
  },
];

interface OrderHarvestJourneySectionProps {
  stages?: OrderHarvestStage[];
  onUpdateStages: (updatedStages: OrderHarvestStage[]) => Promise<boolean | void>;
  isSaving?: boolean;
}

export function OrderHarvestJourneySection({
  stages: propStages,
  onUpdateStages,
  isSaving = false,
}: OrderHarvestJourneySectionProps) {
  // Use existing order stages if present, otherwise initialize canonical 4 stages
  const effectiveStages = Array.isArray(propStages) && propStages.length > 0
    ? propStages
    : DEFAULT_ORDER_STAGES;

  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTriggerUpload = (index: number) => {
    setActiveUploadIndex(index);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeUploadIndex === null) return;

    // MIME type validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, WebP, AVIF).");
      return;
    }

    // Size limit check (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size exceeds the 10MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const updatedStages = [...effectiveStages];
      const targetStage = { ...updatedStages[activeUploadIndex] };

      targetStage.image_url = dataUrl;
      targetStage.images = [dataUrl];
      updatedStages[activeUploadIndex] = targetStage;

      // Clear from broken images if it was there
      setBrokenImages((prev) => {
        const next = new Set(prev);
        next.delete(dataUrl);
        return next;
      });

      const success = await onUpdateStages(updatedStages);
      if (success !== false) {
        toast.success(`Photo saved for ${targetStage.name}`);
      }
      setActiveUploadIndex(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async (index: number) => {
    const updatedStages = [...effectiveStages];
    const targetStage = { ...updatedStages[index] };
    targetStage.image_url = null;
    targetStage.images = [];
    updatedStages[index] = targetStage;

    const success = await onUpdateStages(updatedStages);
    if (success !== false) {
      toast.success(`Photo removed from ${targetStage.name}`);
    }
  };

  const handleToggleStageStatus = async (index: number) => {
    const updatedStages = [...effectiveStages];
    const targetStage = { ...updatedStages[index] };
    const nextStatus =
      targetStage.status === "done" || targetStage.status === "completed"
        ? "current"
        : targetStage.status === "current"
        ? "upcoming"
        : "done";

    targetStage.status = nextStatus;
    updatedStages[index] = targetStage;
    await onUpdateStages(updatedStages);
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
      />

      <div className="divide-y divide-border/60">
        {effectiveStages.map((stage, idx) => {
          const rawImg = stage.image_url || (stage.images && stage.images[0]) || null;
          // Guard against farmer images and broken URLs
          const hasFarmerLeak = isFarmerImage(rawImg);
          const isBroken = rawImg ? brokenImages.has(rawImg) : false;
          const validImage = (!hasFarmerLeak && !isBroken && rawImg) ? rawImg : null;

          const isCompleted = stage.status === "done" || stage.status === "completed";
          const isCurrent = stage.status === "current";

          return (
            <div
              key={stage.id || `stage-${idx}`}
              className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* Left Column: Status Dot, Thumbnail Slot, Stage Info */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Status Dot Button */}
                <button
                  type="button"
                  onClick={() => handleToggleStageStatus(idx)}
                  title={`Status: ${stage.status}. Click to cycle status.`}
                  className="shrink-0 flex items-center justify-center p-1 rounded-full hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isCompleted ? (
                    <span className="h-3 w-3 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.4)]" />
                  ) : isCurrent ? (
                    <span className="h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse" />
                  ) : (
                    <span className="h-3 w-3 rounded-full bg-border" />
                  )}
                </button>

                {/* Fixed-aspect Image Slot */}
                <div className="shrink-0 relative w-20 h-14 rounded-xl overflow-hidden border border-border/80 bg-secondary/30">
                  {validImage ? (
                    <div className="relative w-full h-full group">
                      <img
                        src={validImage}
                        alt={`${stage.name} documentation photo`}
                        loading="lazy"
                        decoding="async"
                        onError={() => {
                          setBrokenImages((prev) => new Set(prev).add(validImage));
                        }}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewModalUrl(validImage)}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        title="View photo preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Neutral striped placeholder with "No image added yet" */
                    <div
                      className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-secondary/50"
                      style={{
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.02) 6px, rgba(0,0,0,0.02) 12px)`,
                      }}
                      title="No field photo added yet for this stage"
                    >
                      <ImageIcon className="h-4 w-4 text-muted-foreground/60 mb-0.5" />
                      <span className="text-[8px] font-subhead font-medium text-muted-foreground/80 leading-tight">
                        No image added yet
                      </span>
                    </div>
                  )}
                </div>

                {/* Stage Name & Date / Detail */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-xs font-bold text-foreground truncate">
                      {stage.name}
                    </p>
                    <span
                      className={`text-[9px] font-subhead uppercase tracking-wider font-bold px-1.5 py-0.2 rounded-md ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : isCurrent
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {stage.status}
                    </span>
                  </div>
                  <p className="text-[11px] font-subhead text-muted-foreground truncate mt-0.5">
                    {stage.stage_date || stage.detail || "Field record pending update"}
                  </p>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {validImage ? (
                  <>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleTriggerUpload(idx)}
                      className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-subhead font-semibold text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Replace this photo"
                    >
                      <RefreshCw className="h-3 w-3 text-muted-foreground" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleRemovePhoto(idx)}
                      className="h-8 w-8 rounded-lg border border-border/80 bg-background hover:bg-destructive/10 hover:border-destructive/30 text-destructive flex items-center justify-center transition-colors cursor-pointer"
                      title="Remove photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleTriggerUpload(idx)}
                    className="h-8 px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-subhead font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Upload photo</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      {previewModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] bg-card rounded-2xl overflow-hidden border border-border shadow-2xl p-2 cursor-default"
          >
            <img
              src={previewModalUrl}
              alt="Harvest journey documentation photo preview"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
            <div className="pt-2 px-2 flex justify-between items-center text-xs text-muted-foreground">
              <span className="font-subhead font-medium">Harvest Stage Documentation</span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="px-3 py-1 bg-secondary rounded-lg font-semibold hover:bg-secondary/80 text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
