"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sprout,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Camera,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Sun,
  Droplets,
  Package,
  Truck,
  Search,
  Hand,
  Leaf,
  MessageSquare,
  ShieldAlert,
  Upload,
  Image as ImageIcon,
  Check,
  HelpCircle,
  Info,
  Filter,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { fileToBase64 } from "@/lib/file-to-base64";
import { DEFAULT_STAGE_TYPES, getSortedJourneyStages } from "@/lib/services/harvestJourneyService";
import { SEARCHABLE_ICON_LIBRARY, PRESET_ICONS, type IconDefinition } from "@/lib/utils/stage-icon-library";
import { StageIconRenderer } from "@/components/harvest-journey/stage-icon-renderer";
import { isFarmerImage } from "@/components/harvest-journey/journey-image";
import type {
  HarvestJourneyModel,
  HarvestStageModel,
  HarvestUpdateModel,
  HarvestStageType,
  IconType,
  DbStageStatus,
} from "@/lib/types/harvest";

interface AdminHarvestJourneyManagerProps {
  product: {
    id: string;
    name: string;
    is_preorder?: boolean;
    slug?: string;
  };
  onClose?: () => void;
}

export function AdminHarvestJourneyManager({
  product,
  onClose,
}: AdminHarvestJourneyManagerProps) {
  const qc = useQueryClient();
  const isPreorder = Boolean(product.is_preorder);

  // Form & Editing states
  const [batchNumber, setBatchNumber] = useState("");
  const [savingBatch, setSavingBatch] = useState(false);
  const [initStageModal, setInitStageModal] = useState(false);

  // Final Product Pack ("Your Prajnaa pack") state
  const [finalPackPhoto, setFinalPackPhoto] = useState<string>("");
  const [finalPackCaption, setFinalPackCaption] = useState<string>("Your Prajnaa pack");
  const [savingBatchSettings, setSavingBatchSettings] = useState(false);
  const [uploadingFinalPack, setUploadingFinalPack] = useState(false);

  // Stage Modal State
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<HarvestStageModel | null>(null);
  const [stageForm, setStageForm] = useState<{
    label: string;
    icon: string;
    icon_type: IconType;
    icon_value: string;
    stage_type_id: string | null;
    status: DbStageStatus;
    stage_date: string;
    description: string;
    image_url: string;
    images: string[];
    transformation_photo_id: string | null;
    show_in_transformation: boolean;
  }>({
    label: "",
    icon: "sun",
    icon_type: "preset",
    icon_value: "sun",
    stage_type_id: "00000000-0000-0000-0000-000000000002",
    status: "upcoming",
    stage_date: new Date().toISOString().split("T")[0],
    description: "",
    image_url: "",
    images: [],
    transformation_photo_id: null,
    show_in_transformation: true,
  });
  const [savingStage, setSavingStage] = useState(false);
  const [uploadingStageImg, setUploadingStageImg] = useState(false);

  // Custom Stage Type Sub-Panel & Management States
  const [customPanelOpen, setCustomPanelOpen] = useState(false);
  const [editingCustomType, setEditingCustomType] = useState<HarvestStageType | null>(null);
  const [customTypeName, setCustomTypeName] = useState("");
  const [customIconTab, setCustomIconTab] = useState<"library" | "upload">("library");
  const [customLibraryIcon, setCustomLibraryIcon] = useState("Flame");
  const [customUploadData, setCustomUploadData] = useState<string>("");
  const [customUploadName, setCustomUploadName] = useState<string>("");
  const [customIconSearch, setCustomIconSearch] = useState("");
  const [customCategoryFilter, setCustomCategoryFilter] = useState<string>("All");
  const [isOneOffOnly, setIsOneOffOnly] = useState(false);
  const [savingCustomType, setSavingCustomType] = useState(false);
  const [customTypeError, setCustomTypeError] = useState<string | null>(null);

  // Delete confirmation for custom stage type
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTypeData, setDeletingTypeData] = useState<HarvestStageType | null>(null);
  const [isDeletingType, setIsDeletingType] = useState(false);

  // Query stage types
  const {
    data: stageTypes = DEFAULT_STAGE_TYPES,
    refetch: refetchStageTypes,
  } = useQuery({
    queryKey: ["admin-stage-types"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/admin/stage-types?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.stageTypes)) {
            return json.stageTypes as HarvestStageType[];
          }
        }
      } catch (e) {
        console.warn("[AdminHarvestJourneyManager] stageTypes query note:", e);
      }
      return DEFAULT_STAGE_TYPES;
    },
  });

  // Filtered searchable Lucide icons for custom stage type creation
  const filteredLibraryIcons = useMemo(() => {
    return SEARCHABLE_ICON_LIBRARY.filter((item) => {
      const matchesCategory =
        customCategoryFilter === "All" || item.category === customCategoryFilter;
      const query = customIconSearch.toLowerCase().trim();
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.label.toLowerCase().includes(query) ||
        item.keywords.some((k) => k.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [customCategoryFilter, customIconSearch]);

  // Update Form State
  const [updateText, setUpdateText] = useState("");
  const [updateAuthor, setUpdateAuthor] = useState("Prajnaa Farm Desk");
  const [postingUpdate, setPostingUpdate] = useState(false);

  // Local state for instant and resilient journey updates
  const [localJourney, setLocalJourney] = useState<HarvestJourneyModel | null>(null);

  // Query journey data
  const {
    data: journeyResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-product-journey", product.id || product.slug],
    queryFn: async () => {
      const targetId = encodeURIComponent(product.id || product.slug || "");
      try {
        const res = await fetch(`/api/admin/products/${targetId}/journey?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            success: boolean;
            is_preorder: boolean;
            journey: HarvestJourneyModel | null;
          };
          if (data.success && data.journey) {
            let mergedJourney = data.journey;
            if (typeof window !== "undefined") {
              try {
                const localRaw =
                  (product.id ? localStorage.getItem(`prajnaa_harvest_journey_${product.id}`) : null) ||
                  (product.slug ? localStorage.getItem(`prajnaa_harvest_journey_${product.slug}`) : null) ||
                  (data.journey.id ? localStorage.getItem(`prajnaa_harvest_journey_id_${data.journey.id}`) : null) ||
                  localStorage.getItem("prajnaa_harvest_journey_latest");
                if (localRaw) {
                  const localJ = JSON.parse(localRaw) as HarvestJourneyModel;
                  if (
                    localJ &&
                    Array.isArray(localJ.stages) &&
                    localJ.stages.length > (data.journey.stages?.length || 0)
                  ) {
                    mergedJourney = {
                      ...data.journey,
                      stages: localJ.stages,
                      current_stage_id: localJ.current_stage_id || data.journey.current_stage_id,
                      updates: (localJ.updates?.length || 0) > (data.journey.updates?.length || 0) ? localJ.updates : data.journey.updates,
                    };
                  }
                }
              } catch (e) {}

              if (mergedJourney.stages && mergedJourney.stages.length > 0) {
                if (product.id) localStorage.setItem(`prajnaa_harvest_journey_${product.id}`, JSON.stringify(mergedJourney));
                if (product.slug) localStorage.setItem(`prajnaa_harvest_journey_${product.slug}`, JSON.stringify(mergedJourney));
                if (mergedJourney.id) localStorage.setItem(`prajnaa_harvest_journey_id_${mergedJourney.id}`, JSON.stringify(mergedJourney));
                localStorage.setItem("prajnaa_harvest_journey_latest", JSON.stringify(mergedJourney));
              }
            }
            return {
              ...data,
              journey: mergedJourney,
            };
          }
        }
      } catch (e) {
        console.warn("[AdminHarvestJourneyManager] Fetch warning:", e);
      }

      // LocalStorage fallback for offline/instant resilience
      if (typeof window !== "undefined") {
        try {
          const raw =
            (product.id ? localStorage.getItem(`prajnaa_harvest_journey_${product.id}`) : null) ||
            (product.slug ? localStorage.getItem(`prajnaa_harvest_journey_${product.slug}`) : null) ||
            localStorage.getItem("prajnaa_harvest_journey_latest");
          if (raw) {
            const parsed = JSON.parse(raw);
            return {
              success: true,
              is_preorder: true,
              journey: parsed,
            };
          }
        } catch (e) {}
      }

      return {
        success: true,
        is_preorder: true,
        journey: null,
      };
    },
    enabled: Boolean(product.id || product.slug),
  });

  // Load from localStorage immediately on mount / product change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const keys = [
        product.id ? `prajnaa_harvest_journey_${product.id}` : null,
        product.slug ? `prajnaa_harvest_journey_${product.slug}` : null,
        "prajnaa_harvest_journey_latest",
      ].filter(Boolean) as string[];

      for (const k of keys) {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored) as HarvestJourneyModel;
          if (parsed && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
            setLocalJourney((prev) => {
              if (!prev || (prev.stages?.length || 0) < (parsed.stages?.length || 0)) {
                return parsed;
              }
              return prev;
            });
            break;
          }
        }
      }
    } catch (e) {}
  }, [product.id, product.slug]);

  // Sync with journeyResponse when query resolves
  useEffect(() => {
    if (journeyResponse?.journey) {
      setLocalJourney((prev) => {
        const incomingStages = journeyResponse.journey?.stages || [];
        const prevStages = prev?.stages || [];
        if (incomingStages.length >= prevStages.length) {
          return journeyResponse.journey;
        }
        if (prev) {
          return {
            ...journeyResponse.journey,
            stages: prev.stages,
            updates: (prev.updates?.length || 0) > (journeyResponse.journey.updates?.length || 0)
              ? prev.updates
              : journeyResponse.journey.updates,
          };
        }
        return journeyResponse.journey;
      });
    }
  }, [journeyResponse?.journey]);

  // Real-time events listener for multi-tab / customer view sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleJourneySync = (j: HarvestJourneyModel) => {
      if (!j) return;
      const isTarget =
        (product.id && (j.product_id === product.id || j.id === product.id)) ||
        (product.slug && ((j as any).slug === product.slug || j.product_id === product.slug)) ||
        j.id === localJourney?.id;
      if (isTarget || (!product.id && !product.slug)) {
        setLocalJourney(j);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.journey) {
        handleJourneySync(customEvent.detail.journey);
      }
    };

    window.addEventListener("prajnaa_harvest_journey_updated", handleCustomEvent);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("prajnaa_harvest_journey_channel");
        bc.onmessage = (event) => {
          if (event.data?.journey) {
            handleJourneySync(event.data.journey);
          }
        };
      }
    } catch (e) {}

    return () => {
      window.removeEventListener("prajnaa_harvest_journey_updated", handleCustomEvent);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
    };
  }, [product.id, product.slug, localJourney?.id]);

  const effectiveJourney: HarvestJourneyModel | null = useMemo(() => {
    if (localJourney && Array.isArray(localJourney.stages) && localJourney.stages.length > 0) {
      if (
        journeyResponse?.journey &&
        Array.isArray(journeyResponse.journey.stages) &&
        journeyResponse.journey.stages.length > localJourney.stages.length
      ) {
        return journeyResponse.journey;
      }
      return localJourney;
    }
    return localJourney || journeyResponse?.journey || null;
  }, [localJourney, journeyResponse?.journey]);

  const journey = effectiveJourney;


  useEffect(() => {
    if (journey) {
      if (journey.batch_number) {
        setBatchNumber(journey.batch_number);
      }
      setFinalPackPhoto(journey.final_pack_photo_url || "");
      setFinalPackCaption(journey.final_pack_caption || "Your Prajnaa pack");
    }
  }, [journey]);

  // Keyboard accessibility: ESC key dismisses modals and inline sub-panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteConfirmOpen) {
          setDeleteConfirmOpen(false);
          setDeletingTypeData(null);
        } else if (customPanelOpen) {
          setCustomPanelOpen(false);
          setEditingCustomType(null);
          setCustomTypeError(null);
        } else if (stageModalOpen) {
          setStageModalOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteConfirmOpen, customPanelOpen, stageModalOpen]);

  // Helper: Ensure journey exists before performing sub-operations
  const ensureJourneyInitialized = async (): Promise<HarvestJourneyModel> => {
    if (journey && journey.id) return journey;
    const targetId = encodeURIComponent(product.id || product.slug || "");
    try {
      const res = await fetch(`/api/admin/products/${targetId}/journey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_number: batchNumber.trim() || `BATCH-${new Date().getFullYear()}-01`,
          product_name: product.name,
          slug: product.slug,
          is_preorder: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.journey) {
        return data.journey;
      }
    } catch (e) {}

    // Resilient fallback: Construct valid journey model immediately
    const fallbackJourney: HarvestJourneyModel = {
      id: `hj-${product.id || product.slug || Date.now()}`,
      product_id: product.id || product.slug || "prod-default",
      batch_number: batchNumber.trim() || `BATCH-${new Date().getFullYear()}-01`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stages: [],
      updates: [],
    };
    broadcastAndPersistJourney(fallbackJourney);
    return fallbackJourney;
  };

  // Helper: Broadcast and persist updated journey everywhere
  const broadcastAndPersistJourney = (updatedJourney: HarvestJourneyModel) => {
    if (!updatedJourney) return;
    setLocalJourney(updatedJourney);

    // Dynamically resolve current_stage_id based on latest stage status
    const sorted = getSortedJourneyStages(updatedJourney.stages || []);
    const explicitCurrent = sorted.find((s) => s.status === "current");
    const firstUncompleted = sorted.find((s) => (s.status as string) !== "done" && (s.status as string) !== "completed");
    const nextCurrentId = explicitCurrent?.id || firstUncompleted?.id || (sorted.length > 0 ? sorted[sorted.length - 1]?.id : null);
    updatedJourney.current_stage_id = nextCurrentId;
    (updatedJourney as any).currentStageId = nextCurrentId;

    if (typeof window !== "undefined") {
      try {
        if (product.id) localStorage.setItem(`prajnaa_harvest_journey_${product.id}`, JSON.stringify(updatedJourney));
        if (product.slug) localStorage.setItem(`prajnaa_harvest_journey_${product.slug}`, JSON.stringify(updatedJourney));
        if (updatedJourney.id) localStorage.setItem(`prajnaa_harvest_journey_id_${updatedJourney.id}`, JSON.stringify(updatedJourney));
        localStorage.setItem("prajnaa_harvest_journey_latest", JSON.stringify(updatedJourney));
        localStorage.setItem("prajnaa_harvest_journey_sync_tick", Date.now().toString());

        // Cross-tab broadcast channel for immediate multi-window synchronization
        try {
          if (typeof BroadcastChannel !== "undefined") {
            const bc = new BroadcastChannel("prajnaa_harvest_journey_channel");
            bc.postMessage({
              productId: product.id,
              slug: product.slug,
              journeyId: updatedJourney.id,
              journey: updatedJourney,
              timestamp: Date.now(),
            });
            setTimeout(() => {
              try { bc.close(); } catch (e) {}
            }, 2000);
          }
        } catch (e) {}

        // Real-time custom event to immediately notify all storefront customer pages in current/open tabs
        window.dispatchEvent(
          new CustomEvent("prajnaa_harvest_journey_updated", {
            detail: {
              productId: product.id,
              slug: product.slug,
              journeyId: updatedJourney.id,
              journey: updatedJourney,
              timestamp: Date.now(),
            },
          })
        );
      } catch (e) {}
    }

    // Direct React Query cache update for instant UI feedback
    qc.setQueryData(["admin-product-journey", product.id || product.slug], {
      success: true,
      is_preorder: true,
      journey: updatedJourney,
    });
    if (product.id) {
      qc.setQueryData(["admin-product-journey", product.id], {
        success: true,
        is_preorder: true,
        journey: updatedJourney,
      });
      qc.setQueryData(["public-harvest-journey", product.id], {
        success: true,
        is_preorder: true,
        journey: updatedJourney,
      });
    }
    if (product.slug) {
      qc.setQueryData(["admin-product-journey", product.slug], {
        success: true,
        is_preorder: true,
        journey: updatedJourney,
      });
      qc.setQueryData(["public-harvest-journey", product.slug], {
        success: true,
        is_preorder: true,
        journey: updatedJourney,
      });
    }
  };

  // Handler: Initialize journey
  const handleCreateJourney = async () => {
    try {
      setSavingBatch(true);
      const newJourney = await ensureJourneyInitialized();

      broadcastAndPersistJourney(newJourney);
      toast.success("Harvest Journey created. Add your first stage below!");
      qc.invalidateQueries({ queryKey: ["admin-product-journey"], exact: false });
      qc.invalidateQueries({ queryKey: ["public-harvest-journey"], exact: false });
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingBatch(false);
    }
  };

  // Handler: Save Batch Settings & Final Pack Photo
  const handleSaveBatchSettings = async () => {
    try {
      setSavingBatchSettings(true);
      const activeJourney = await ensureJourneyInitialized();
      const res = await fetch(`/api/admin/journeys/${activeJourney.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_number: batchNumber.trim(),
          final_pack_photo_url: finalPackPhoto.trim() || null,
          final_pack_caption: finalPackCaption.trim() || "Your Prajnaa pack",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save batch settings");

      const updatedJourney: HarvestJourneyModel = {
        ...activeJourney,
        batch_number: batchNumber.trim(),
        final_pack_photo_url: finalPackPhoto.trim() || null,
        final_pack_caption: finalPackCaption.trim() || "Your Prajnaa pack",
        updated_at: new Date().toISOString(),
      };
      broadcastAndPersistJourney(updatedJourney);

      toast.success("Batch passport & Transformation settings saved");
      qc.invalidateQueries({ queryKey: ["admin-product-journey"], exact: false });
      qc.invalidateQueries({ queryKey: ["public-harvest-journey"], exact: false });
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingBatchSettings(false);
    }
  };

  // Handler: Upload Final Pack Photo
  const handleFinalPackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAllowedType =
      ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) ||
      /\.(jpe?g|png|webp|avif)$/i.test(file.name);
    if (!isAllowedType) {
      toast.error(`"${file.name}" is not a supported format. Please upload JPG, PNG, or WebP.`);
      e.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds 8 MB limit`);
      e.target.value = "";
      return;
    }

    setUploadingFinalPack(true);
    try {
      const compressed = await compressImage(file, 900, 0.75);
      const base64 = await fileToBase64(compressed);
      setFinalPackPhoto(base64);
      toast.success("Final pack photo selected. Click 'Save Pack Settings' to apply.");
    } catch (err: any) {
      toast.error(err.message || "Failed to read image");
    } finally {
      setUploadingFinalPack(false);
      e.target.value = "";
    }
  };

  // Handler: Remove Final Pack Photo
  const handleRemoveFinalPackPhoto = () => {
    setFinalPackPhoto("");
    toast.info("Final pack photo removed. Remember to Save Pack Settings.");
  };

  // Handler: Open Add/Edit Stage Modal
  const openStageModal = (stage?: HarvestStageModel) => {
    setCustomPanelOpen(false);
    setEditingCustomType(null);
    setCustomTypeError(null);

    if (stage) {
      setEditingStage(stage);
      const existingImages = (
        Array.isArray(stage.images) && stage.images.length > 0
          ? stage.images
          : Array.isArray(stage.media) && stage.media.length > 0
          ? stage.media
          : stage.image_url
          ? [stage.image_url]
          : []
      ).filter((img) => typeof img === "string" && img.trim().length > 0 && !isFarmerImage(img));

      const iconVal = stage.icon_value || stage.icon || "sun";
      const iconType = stage.icon_type || (stage.icon && ["sprout","sun","leaf","droplets","search","hand","package","truck"].includes(stage.icon) ? "preset" : "library");

      const transPhoto = (stage.transformation_photo_id && existingImages.includes(stage.transformation_photo_id) && !isFarmerImage(stage.transformation_photo_id))
        ? stage.transformation_photo_id
        : (existingImages.length > 0 ? existingImages[0] : null);

      const validImageUrl = stage.image_url && !isFarmerImage(stage.image_url) ? stage.image_url : (existingImages[0] || "");

      setStageForm({
        label: stage.label || "",
        icon: iconVal,
        icon_type: iconType as IconType,
        icon_value: iconVal,
        stage_type_id: stage.stage_type_id || null,
        status: stage.status || "upcoming",
        stage_date: stage.stage_date || "",
        description: stage.description || "",
        image_url: validImageUrl,
        images: existingImages,
        transformation_photo_id: transPhoto,
        show_in_transformation: stage.show_in_transformation !== undefined ? stage.show_in_transformation : existingImages.length > 0,
      });
    } else {
      setEditingStage(null);
      setStageForm({
        label: "",
        icon: "sun",
        icon_type: "preset",
        icon_value: "sun",
        stage_type_id: "00000000-0000-0000-0000-000000000002",
        status: "upcoming",
        stage_date: new Date().toISOString().split("T")[0],
        description: "",
        image_url: "",
        images: [],
        transformation_photo_id: null,
        show_in_transformation: true,
      });
    }
    setStageModalOpen(true);
  };

  // Handler: Select a Stage Type from Icon Grid
  const handleSelectStageType = (type: HarvestStageType) => {
    setStageForm((prev) => {
      const shouldPrefill = !prev.label.trim();
      return {
        ...prev,
        label: shouldPrefill ? (type.is_custom ? type.name : type.name.split("/")[0].trim()) : prev.label,
        icon: type.icon_value,
        icon_type: type.icon_type,
        icon_value: type.icon_value,
        stage_type_id: type.id,
      };
    });
  };

  // Handler: Open Inline Custom Stage Type Panel
  const handleOpenCustomPanel = (typeToEdit?: HarvestStageType) => {
    setCustomTypeError(null);
    if (typeToEdit) {
      setEditingCustomType(typeToEdit);
      setCustomTypeName(typeToEdit.name);
      if (typeToEdit.icon_type === "upload") {
        setCustomIconTab("upload");
        setCustomUploadData(typeToEdit.icon_value);
        setCustomUploadName("Uploaded Custom Icon");
      } else {
        setCustomIconTab("library");
        setCustomLibraryIcon(typeToEdit.icon_value);
      }
      setIsOneOffOnly(false);
    } else {
      setEditingCustomType(null);
      setCustomTypeName("");
      setCustomIconTab("library");
      setCustomLibraryIcon("Flame");
      setCustomUploadData("");
      setCustomUploadName("");
      setCustomIconSearch("");
      setCustomCategoryFilter("All");
      setIsOneOffOnly(false);
    }
    setCustomPanelOpen(true);
  };

  // Handler: Upload Custom Icon (SVG/PNG <= 500KB)
  const handleCustomIconFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error(`"${file.name}" exceeds the 500KB limit`);
      return;
    }

    const isSvg = file.type === "image/svg+xml" || file.name.endsWith(".svg");
    const isPng = file.type === "image/png" || file.name.endsWith(".png") || file.type.startsWith("image/");
    if (!isSvg && !isPng) {
      toast.error("Please upload an SVG or PNG icon");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setCustomUploadData(base64);
      setCustomUploadName(file.name);
      toast.success("Custom icon loaded");
    } catch (err: any) {
      toast.error("Failed to read icon file");
    } finally {
      e.target.value = "";
    }
  };

  // Handler: Save Custom Stage Type
  const handleSaveCustomStageType = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customTypeName.trim();
    if (!trimmed) {
      setCustomTypeError("Stage type name is required");
      return;
    }
    if (trimmed.length > 40) {
      setCustomTypeError("Name cannot exceed 40 characters");
      return;
    }

    // Client-side duplicate check across existing presets and custom types
    if (!isOneOffOnly) {
      const isDuplicate = stageTypes.some(
        (t) =>
          (!editingCustomType || t.id !== editingCustomType.id) &&
          t.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        setCustomTypeError(`A stage type named "${trimmed}" already exists`);
        return;
      }
    }

    const iconType: IconType = customIconTab === "upload" ? "upload" : "library";
    const iconValue = customIconTab === "upload" ? customUploadData : customLibraryIcon;

    if (!iconValue) {
      setCustomTypeError("Please select or upload an icon");
      return;
    }

    // One-off option: applies directly to this stage without saving to reusable list
    if (isOneOffOnly) {
      setStageForm((prev) => ({
        ...prev,
        label: prev.label.trim() ? prev.label : trimmed,
        icon: iconValue,
        icon_type: iconType,
        icon_value: iconValue,
        stage_type_id: null,
      }));
      toast.success(`Applied one-off custom stage "${trimmed}"`);
      setCustomPanelOpen(false);
      return;
    }

    setSavingCustomType(true);
    setCustomTypeError(null);

    try {
      if (editingCustomType) {
        const res = await fetch(`/api/admin/stage-types/${editingCustomType.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            icon_type: iconType,
            icon_value: iconValue,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update stage type");

        toast.success("Stage type updated");
        await refetchStageTypes();
        qc.invalidateQueries({ queryKey: ["admin-stage-types"] });
        setStageForm((prev) => ({
          ...prev,
          label: prev.label.trim() ? prev.label : trimmed,
          icon: iconValue,
          icon_type: iconType,
          icon_value: iconValue,
          stage_type_id: editingCustomType.id,
        }));
        setCustomPanelOpen(false);
      } else {
        const res = await fetch(`/api/admin/stage-types`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            icon_type: iconType,
            icon_value: iconValue,
            is_custom: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add stage type");

        toast.success("Stage type added");
        await refetchStageTypes();
        qc.invalidateQueries({ queryKey: ["admin-stage-types"] });
        const newType = data.stageType;
        setStageForm((prev) => ({
          ...prev,
          label: prev.label.trim() ? prev.label : trimmed,
          icon: iconValue,
          icon_type: iconType,
          icon_value: iconValue,
          stage_type_id: newType?.id || null,
        }));
        setCustomPanelOpen(false);
      }
    } catch (err: any) {
      setCustomTypeError(err.message || "Failed to save stage type");
      toast.error(err.message || "Failed to save stage type");
    } finally {
      setSavingCustomType(false);
    }
  };

  // Handler: Delete Custom Stage Type with In-Use Guard
  const handleDeleteCustomStageType = (type: HarvestStageType) => {
    setDeletingTypeData(type);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteCustomType = async () => {
    if (!deletingTypeData) return;
    setIsDeletingType(true);
    try {
      const res = await fetch(`/api/admin/stage-types/${deletingTypeData.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete stage type");

      toast.success(data.message || "Stage type deleted");
      await refetchStageTypes();
      qc.invalidateQueries({ queryKey: ["admin-stage-types"] });
      setDeleteConfirmOpen(false);
      setDeletingTypeData(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete stage type");
    } finally {
      setIsDeletingType(false);
    }
  };

  // Handler: Multiple Image Upload for Stage
  const handleStageImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((f) => {
      const isAllowedType =
        ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(f.type) ||
        /\.(jpe?g|png|webp|avif)$/i.test(f.name);
      if (!isAllowedType) {
        toast.error(`"${f.name}" is not a supported format. Please upload JPG, PNG, or WebP.`);
        return false;
      }
      if (f.size > 8 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 8 MB limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    setUploadingStageImg(true);
    try {
      const processed = await Promise.all(
        validFiles.map(async (file) => {
          const compressed = await compressImage(file, 800, 0.7);
          return fileToBase64(compressed);
        })
      );

      setStageForm((prev) => {
        const combined = [...prev.images, ...processed].filter((img) => !isFarmerImage(img));
        // Default: the first uploaded photo is selected automatically
        const currentTrans = prev.transformation_photo_id;
        const nextTrans = currentTrans && combined.includes(currentTrans) && !isFarmerImage(currentTrans)
          ? currentTrans
          : (combined[0] || null);

        return {
          ...prev,
          images: combined,
          image_url: combined[0] || "",
          transformation_photo_id: nextTrans,
          show_in_transformation: prev.show_in_transformation || combined.length > 0,
        };
      });

      toast.success(`${validFiles.length} photo${validFiles.length > 1 ? "s" : ""} added`);
    } catch (err: any) {
      toast.error(err.message || "Failed to process photo(s)");
    } finally {
      setUploadingStageImg(false);
      e.target.value = "";
    }
  };

  // Handler: Replace Photo at Specific Index
  const handleReplacePhoto = async (indexToReplace: number, file?: File | null) => {
    if (!file) return;
    const isAllowedType =
      ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) ||
      /\.(jpe?g|png|webp|avif)$/i.test(file.name);
    if (!isAllowedType) {
      toast.error(`"${file.name}" is not a supported format. Please upload JPG, PNG, or WebP.`);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds 8 MB limit`);
      return;
    }

    try {
      const compressed = await compressImage(file, 800, 0.7);
      const base64 = await fileToBase64(compressed);
      setStageForm((prev) => {
        const nextImgs = [...prev.images];
        const oldPhoto = nextImgs[indexToReplace];
        nextImgs[indexToReplace] = base64;
        let transPhoto = prev.transformation_photo_id;
        if (transPhoto === oldPhoto) {
          transPhoto = base64;
        }
        return {
          ...prev,
          images: nextImgs,
          image_url: indexToReplace === 0 ? base64 : (prev.image_url || nextImgs[0] || ""),
          transformation_photo_id: transPhoto,
        };
      });
      toast.success("Photo replaced successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to replace photo");
    }
  };

  // Handler: Remove Photo from Stage
  const handleRemovePhoto = (indexToRemove: number) => {
    setStageForm((prev) => {
      const removedPhoto = prev.images[indexToRemove];
      const filtered = prev.images.filter((_, idx) => idx !== indexToRemove);

      // If the admin deletes the selected photo, fall back to the next available photo.
      // If no photos remain, hide the stage from the strip (transformation_photo_id = null).
      let nextTrans = prev.transformation_photo_id;
      if (nextTrans === removedPhoto || !filtered.includes(nextTrans || "")) {
        nextTrans = filtered.length > 0 ? filtered[0] : null;
      }

      return {
        ...prev,
        images: filtered,
        image_url: filtered[0] || "",
        transformation_photo_id: nextTrans,
        show_in_transformation: filtered.length > 0 ? prev.show_in_transformation : false,
      };
    });
  };

  // Handler: Mark Photo as Transformation Photo (only one selected at a time)
  const handleSetTransformationPhoto = (photoUrl: string) => {
    if (isFarmerImage(photoUrl)) {
      toast.error("Farmer profile images cannot be used as stage transformation photos");
      return;
    }
    setStageForm((prev) => ({
      ...prev,
      transformation_photo_id: photoUrl,
    }));
    toast.success("Transformation photo selected for this stage");
  };

  // Handler: Set as Cover Photo
  const handleSetCoverPhoto = (indexToCover: number) => {
    setStageForm((prev) => {
      const selected = prev.images[indexToCover];
      if (!selected) return prev;
      const rest = prev.images.filter((_, idx) => idx !== indexToCover);
      const reordered = [selected, ...rest];
      return {
        ...prev,
        images: reordered,
        image_url: selected,
      };
    });
    toast.success("Cover photo updated");
  };

  // Handler: Save Stage
  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageForm.label.trim()) {
      toast.error("Stage label is required");
      return;
    }

    setSavingStage(true);
    try {
      const activeJourney = await ensureJourneyInitialized();
      let savedStage: HarvestStageModel | null = null;

      const stageImages = (Array.isArray(stageForm.images) && stageForm.images.length > 0
        ? stageForm.images
        : stageForm.image_url
        ? [stageForm.image_url]
        : []
      ).filter((img) => typeof img === "string" && img.trim().length > 0 && !isFarmerImage(img));

      const primaryImage = stageImages[0] || null;
      const transPhoto = (stageForm.transformation_photo_id && stageImages.includes(stageForm.transformation_photo_id) && !isFarmerImage(stageForm.transformation_photo_id))
        ? stageForm.transformation_photo_id
        : (stageImages.length > 0 ? stageImages[0] : null);

      if (editingStage) {
        // Update Stage
        const payload = {
          ...stageForm,
          journey_id: activeJourney.id,
          product_id: product.id || product.slug,
        };
        try {
          const res = await fetch(`/api/admin/stages/${editingStage.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.stage) {
            savedStage = data.stage;
          } else {
            console.warn("[handleSaveStage] PATCH /stages notice:", data?.error);
            // Attempt fallback to journey stages endpoint
            try {
              const postRes = await fetch(`/api/admin/journeys/${activeJourney.id}/stages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...payload,
                  sort_order: editingStage.sort_order ?? 0,
                }),
              });
              const postData = await postRes.json().catch(() => ({}));
              if (postRes.ok && postData.stage) {
                savedStage = postData.stage;
              }
            } catch (e) {}
          }
        } catch (e) {
          console.warn("[handleSaveStage] Fetch error:", e);
        }

        if (!savedStage) {
          savedStage = {
            ...editingStage,
            ...stageForm,
            id: editingStage.id,
            journey_id: activeJourney.id,
            images: stageImages,
            media: stageImages,
            image_url: primaryImage,
            transformation_photo_id: transPhoto,
            show_in_transformation: stageForm.show_in_transformation !== undefined ? stageForm.show_in_transformation : true,
            updated_at: new Date().toISOString(),
          };
        }
        toast.success("Stage updated successfully");
      } else {
        // Create Stage
        try {
          const res = await fetch(`/api/admin/journeys/${activeJourney.id}/stages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...stageForm,
              journey_id: activeJourney.id,
              product_id: product.id || product.slug,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.stage) {
            savedStage = data.stage;
          } else {
            console.warn("[handleSaveStage] Server note:", data?.error);
          }
        } catch (e) {
          console.warn("[handleSaveStage] Network notice:", e);
        }

        // Resilient Fallback: Ensure stage model is always created
        if (!savedStage) {
          const nowStr = new Date().toISOString();
          savedStage = {
            id: `stg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            journey_id: activeJourney.id,
            label: stageForm.label.trim(),
            icon: stageForm.icon || stageForm.icon_value || "leaf",
            icon_type: stageForm.icon_type || "preset",
            icon_value: stageForm.icon_value || stageForm.icon || "leaf",
            stage_type_id: stageForm.stage_type_id || null,
            status: stageForm.status || "upcoming",
            stage_date: stageForm.stage_date || nowStr.split("T")[0],
            description: stageForm.description || "",
            image_url: primaryImage,
            images: stageImages,
            media: stageImages,
            transformation_photo_id: transPhoto,
            show_in_transformation: stageForm.show_in_transformation !== undefined ? stageForm.show_in_transformation : true,
            position: activeJourney.stages?.length || 0,
            sort_order: (activeJourney.stages?.length || 0) + 1,
            created_at: nowStr,
            updated_at: nowStr,
          };
        }
        toast.success("Stage added successfully");
      }

      // Compile updated journey state
      const currentStages = activeJourney.stages || [];
      let nextStages: HarvestStageModel[] = [];
      if (editingStage) {
        nextStages = currentStages.map((s) => (s.id === editingStage.id ? (savedStage || { ...s, ...stageForm }) : s));
      } else if (savedStage) {
        nextStages = [...currentStages.filter((s) => s.id !== savedStage!.id), savedStage];
      }
      nextStages = getSortedJourneyStages(nextStages).map((s, idx) => ({
        ...s,
        position: idx,
        sort_order: idx + 1,
      }));

      const updatedJourney: HarvestJourneyModel = {
        ...activeJourney,
        stages: nextStages,
        updated_at: new Date().toISOString(),
      };

      // 1. Immediately persist locally, update state, broadcast to other tabs & custom event
      broadcastAndPersistJourney(updatedJourney);

      // 2. Persist to server via both journey ID and product endpoints
      const targetId = encodeURIComponent(product.id || product.slug || "");
      try {
        await Promise.allSettled([
          fetch(`/api/admin/journeys/${activeJourney.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stages: nextStages,
              product_id: product.id || product.slug,
            }),
          }),
          fetch(`/api/admin/products/${targetId}/journey`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              journey: updatedJourney,
              stages: nextStages,
            }),
          }),
        ]);
      } catch (e) {}

      setStageModalOpen(false);
      qc.setQueryData(["admin-product-journey", product.id || product.slug], {
        success: true,
        is_preorder: true,
        journey: updatedJourney,
      });
      if (product.id) {
        qc.setQueryData(["admin-product-journey", product.id], {
          success: true,
          is_preorder: true,
          journey: updatedJourney,
        });
      }
      if (product.slug) {
        qc.setQueryData(["admin-product-journey", product.slug], {
          success: true,
          is_preorder: true,
          journey: updatedJourney,
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save stage");
    } finally {
      setSavingStage(false);
    }
  };

  // Handler: Delete Stage
  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Delete this stage from the harvest journey?")) return;

    try {
      const res = await fetch(`/api/admin/stages/${stageId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn("[handleDeleteStage] Server delete note:", data?.error);
      }

      const currentStages = (journey?.stages || []).filter((s: HarvestStageModel) => s.id !== stageId);
      const reorderedStages = getSortedJourneyStages(currentStages).map((s, idx) => ({
        ...s,
        position: idx,
        sort_order: idx + 1,
      }));
      const updatedJourney: HarvestJourneyModel = {
        ...(journey || ({} as any)),
        stages: reorderedStages,
        updated_at: new Date().toISOString(),
      };
      broadcastAndPersistJourney(updatedJourney);

      const targetId = encodeURIComponent(product.id || product.slug || "");
      try {
        await Promise.allSettled([
          fetch(`/api/admin/journeys/${journey?.id || ""}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stages: reorderedStages,
              product_id: product.id || product.slug,
            }),
          }),
          fetch(`/api/admin/products/${targetId}/journey`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              journey: updatedJourney,
              stages: reorderedStages,
            }),
          }),
        ]);
      } catch (e) {}

      toast.success("Stage deleted");
      qc.setQueryData(["admin-product-journey", product.id || product.slug], {
        success: true,
        is_preorder: true,
        journey: updatedJourney,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete stage");
    }
  };

  // Handler: Reorder Stages (Move Up / Move Down)
  const handleMoveStage = async (index: number, direction: "up" | "down") => {
    if (!journey || !journey.stages) return;
    const sorted = getSortedJourneyStages(journey.stages);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap
    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    const payload = sorted.map((s, idx) => ({
      id: s.id,
      position: idx,
      sort_order: idx + 1,
    }));

    const reorderedStages = sorted.map((s, idx) => ({
      ...s,
      position: idx,
      sort_order: idx + 1,
    }));
    const updatedJourney: HarvestJourneyModel = {
      ...journey,
      stages: reorderedStages,
      updated_at: new Date().toISOString(),
    };
    broadcastAndPersistJourney(updatedJourney);

    try {
      const res = await fetch(`/api/admin/journeys/${journey.id}/stages/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reorder stages");

      if (Array.isArray(data.stages) && data.stages.length > 0) {
        const syncedJourney: HarvestJourneyModel = {
          ...journey,
          stages: data.stages,
          updated_at: new Date().toISOString(),
        };
        broadcastAndPersistJourney(syncedJourney);
      }

      toast.success("Stage order updated");
      qc.invalidateQueries({ queryKey: ["admin-product-journey"], exact: false });
      qc.invalidateQueries({ queryKey: ["public-harvest-journey"], exact: false });
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Handler: Post Farm Update
  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) {
      toast.error("Please enter update text");
      return;
    }

    setPostingUpdate(true);
    try {
      const activeJourney = await ensureJourneyInitialized();
      const res = await fetch(`/api/admin/journeys/${activeJourney.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: updateText.trim(),
          author: updateAuthor.trim() || "Prajnaa Farm Desk",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post update");

      const newUpd: HarvestUpdateModel = data.update || {
        id: `upd_${Date.now()}`,
        journey_id: activeJourney.id,
        text: updateText.trim(),
        author: updateAuthor.trim() || "Prajnaa Farm Desk",
        created_at: new Date().toISOString(),
      };
      const updatedJourney: HarvestJourneyModel = {
        ...activeJourney,
        updates: [newUpd, ...(activeJourney.updates || []).filter((u) => u.id !== newUpd.id)],
        updated_at: new Date().toISOString(),
      };
      broadcastAndPersistJourney(updatedJourney);

      toast.success("Farm update published!");
      setUpdateText("");
      qc.invalidateQueries({ queryKey: ["admin-product-journey"], exact: false });
      qc.invalidateQueries({ queryKey: ["public-harvest-journey"], exact: false });
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPostingUpdate(false);
    }
  };

  // Handler: Delete Update
  const handleDeleteUpdate = async (updateId: string) => {
    if (!confirm("Delete this farm update?")) return;
    try {
      const res = await fetch(`/api/admin/updates/${updateId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete update");

      const updatedUpdates = (journey?.updates || []).filter((u: HarvestUpdateModel) => u.id !== updateId);
      const updatedJourney: HarvestJourneyModel = {
        ...(journey || ({} as any)),
        updates: updatedUpdates,
        updated_at: new Date().toISOString(),
      };
      broadcastAndPersistJourney(updatedJourney);

      toast.success("Update deleted");
      qc.invalidateQueries({ queryKey: ["admin-product-journey"], exact: false });
      qc.invalidateQueries({ queryKey: ["public-harvest-journey"], exact: false });
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // CASE 1: Scope Condition Gate - Product is NOT pre-order
  if (!isPreorder) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 sm:p-8 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800 shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-display text-base font-bold text-amber-950">
              Harvest Journey Locked
            </h4>
            <p className="text-xs text-amber-800/90 leading-relaxed max-w-xl">
              The <strong>Harvest Journey</strong> timeline is exclusively available for products
              marked as <strong>Pre-Order</strong>. Enable the &quot;Pre-Order Product&quot; toggle in the
              product settings above to configure live stages and customer updates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 space-x-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs font-semibold">Loading harvest journey data...</span>
      </div>
    );
  }

  // CASE 2: Pre-order product WITHOUT journey configured -> Clean Empty State
  if (!journey) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/15 p-8 text-center space-y-4 animate-in fade-in duration-200">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Sprout className="h-6 w-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="font-display text-lg font-bold text-foreground">
            No Harvest Journey set up yet
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Attach a dynamic timeline with harvest stages and field updates so pre-order customers
            can trace their batch from orchards to packaging.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleCreateJourney}
            disabled={savingBatch}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {savingBatch ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>Initialize Harvest Journey (0 Stages)</span>
          </button>
        </div>
      </div>
    );
  }

  // CASE 3: Active Harvest Journey Management
  return (
    <div className="space-y-6">
      {/* 1. Header: Batch ID & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800 shrink-0">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display text-base font-bold text-foreground">
                {product.name}
              </h4>
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Pre-Order Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {journey.stages?.length || 0} stage{(journey.stages?.length || 0) === 1 ? "" : "s"} ·{" "}
              {journey.updates?.length || 0} farm update{(journey.updates?.length || 0) === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Batch Number Input */}
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Batch Passport Code
            </span>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="e.g. BATCH-2026-01"
              className="h-9 w-44 rounded-lg border border-border bg-background px-3 text-xs font-mono font-semibold outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveBatchSettings}
            disabled={savingBatchSettings}
            className="mt-4 h-9 rounded-lg bg-primary text-primary-foreground px-3 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
          >
            {savingBatchSettings ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>

      {/* 2. Transformation Strip Settings: Final Pack Photo & Custom Caption */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h5 className="font-display text-sm font-bold text-foreground">
                Previous Season: Harvest to Pack: Final Pack Photo (&quot;Your Prajnaa pack&quot;)
              </h5>
              <p className="text-[11px] text-muted-foreground">
                Configure the concluding product tile shown at the end of &quot;Previous Season: Harvest to Pack&quot; public strip.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveBatchSettings}
            disabled={savingBatchSettings}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition shadow-2xs cursor-pointer self-start sm:self-auto"
          >
            {savingBatchSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span>Save Pack Settings</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Final Pack Photo Preview / Uploader */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Final Pack Photo
            </label>
            {finalPackPhoto ? (
              <div className="relative aspect-4/3 rounded-xl border border-border overflow-hidden bg-secondary/30 group">
                <img
                  src={finalPackPhoto}
                  alt={finalPackCaption || "Final pack photo"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <label className="rounded-lg bg-white/90 hover:bg-white text-foreground px-2.5 py-1 text-[11px] font-semibold cursor-pointer shadow-xs">
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingFinalPack}
                      className="hidden"
                      onChange={handleFinalPackUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveFinalPackPhoto}
                    className="rounded-lg bg-red-600/90 hover:bg-red-600 text-white px-2.5 py-1 text-[11px] font-semibold cursor-pointer shadow-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-4/3 rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-secondary/15 hover:bg-secondary/30 transition text-center cursor-pointer p-3">
                {uploadingFinalPack ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary mb-1" />
                ) : (
                  <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                )}
                <span className="text-xs font-bold text-foreground">
                  {uploadingFinalPack ? "Uploading..." : "Upload Final Pack Photo"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  If empty, the final tile is hidden
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingFinalPack}
                  className="hidden"
                  onChange={handleFinalPackUpload}
                />
              </label>
            )}
          </div>

          {/* Caption & Info */}
          <div className="md:col-span-8 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-foreground">
                  Final Pack Caption (Optional)
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {finalPackCaption.length}/80
                </span>
              </div>
              <input
                type="text"
                value={finalPackCaption}
                onChange={(e) => setFinalPackCaption(e.target.value)}
                placeholder="Your Prajnaa pack"
                maxLength={80}
                className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition shadow-2xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Default: &quot;Your Prajnaa pack&quot;. If no photo is uploaded, this concluding tile is hidden on the public page.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-secondary/30 border border-border/70 text-[11px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Info className="h-3.5 w-3.5 text-primary" />
                <span>Harvest to Pack Sequence Info</span>
              </div>
              <p>
                Each harvest stage below marked with <strong>&quot;Show in Previous Season: Harvest to Pack&quot;</strong> provides its starred photo as a progressive tile. Saving changes updates customer product pages instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Stages Manager */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-display text-sm font-bold text-foreground">
              Production &amp; Harvest Stages
            </h5>
            <p className="text-xs text-muted-foreground">
              Only real stages created by admin appear on customer product timeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openStageModal()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Stage</span>
          </button>
        </div>

        {/* Stages List */}
        <div className="space-y-2.5">
          {journey.stages && journey.stages.length > 0 ? (
            getSortedJourneyStages(journey.stages).map((stage: HarvestStageModel, idx: number, arr: HarvestStageModel[]) => {
              const isFirst = idx === 0;
              const isLast = idx === arr.length - 1;
              const isCurrent = stage.status === "current";
              const isDone = stage.status === "done";

              return (
                <div
                  key={stage.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                    isCurrent
                      ? "border-amber-300 bg-amber-50/50 shadow-2xs"
                      : "border-border bg-background hover:bg-secondary/20"
                  }`}
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Thumbnail */}
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary flex items-center justify-center">
                      {stage.image_url ? (
                        <img
                          src={stage.image_url}
                          alt={stage.label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <StageIconRenderer
                          iconType={stage.icon_type}
                          iconValue={stage.icon_value}
                          iconKey={stage.icon}
                          className="h-5 w-5 text-muted-foreground"
                        />
                      )}
                      {stage.images && stage.images.length > 1 && (
                        <div className="absolute bottom-0 right-0 bg-black/75 px-1 py-0.5 rounded-tl text-[9px] font-bold text-white flex items-center gap-0.5 leading-none">
                          <Camera className="h-2 w-2" />
                          <span>{stage.images.length}</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {idx + 1}. {stage.label}
                        </span>
                        {/* Status Badge */}
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                            <Clock className="h-3 w-3 text-amber-600 animate-pulse" />
                            Current Stage
                          </span>
                        ) : isDone ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Completed
                          </span>
                        ) : (
                          <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                            Upcoming
                          </span>
                        )}

                        {/* Transformation strip indicator badge */}
                        {stage.show_in_transformation !== false && (stage.transformation_photo_id || (stage.images && stage.images.length > 0)) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            <span>Transformation</span>
                          </span>
                        ) : stage.show_in_transformation === false ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                            <span>Hidden from Strip</span>
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {stage.stage_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {stage.stage_date}
                          </span>
                        )}
                        {stage.description && (
                          <span className="truncate max-w-xs">{stage.description}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveStage(idx, "up")}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveStage(idx, "down")}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      title="Move Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => openStageModal(stage)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                      title="Edit Stage"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteStage(stage.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Delete Stage"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/10 p-6 sm:p-8 text-center space-y-3">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sprout className="h-5 w-5" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="text-sm font-bold text-foreground">No stages added yet — add the first one</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Build an ordered set of production stages reflecting the real, current state of this batch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openStageModal()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-2xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Stage</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Farm Updates Feed */}
      <div className="space-y-4 pt-4 border-t border-border/80">
        <div>
          <h5 className="font-display text-sm font-bold text-foreground">
            Live Farm Updates Feed
          </h5>
          <p className="text-xs text-muted-foreground">
            Post timely field notes and dispatch notices seen directly by customers.
          </p>
        </div>

        {/* New Update Form */}
        <form
          onSubmit={handlePostUpdate}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Field Update Message *
              </label>
              <textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="e.g. Fresh solar drying batch completed today at Ladakh orchard. Ready for sorting."
                rows={2}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Author Tag
              </label>
              <input
                type="text"
                value={updateAuthor}
                onChange={(e) => setUpdateAuthor(e.target.value)}
                placeholder="e.g. Prajnaa Field Desk"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />

              <button
                type="submit"
                disabled={postingUpdate || !updateText.trim()}
                className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {postingUpdate ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                <span>Post Live Update</span>
              </button>
            </div>
          </div>
        </form>

        {/* Existing Updates List (Newest first) */}
        {journey.updates && journey.updates.length > 0 ? (
          <div className="space-y-2">
            {journey.updates.map((upd: HarvestUpdateModel) => (
              <div
                key={upd.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3 text-xs"
              >
                <div className="space-y-1">
                  <p className="text-foreground leading-relaxed">{upd.text}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{upd.author}</span>
                    <span>·</span>
                    <span>{new Date(upd.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteUpdate(upd.id)}
                  className="text-muted-foreground hover:text-red-600 p-1 rounded transition cursor-pointer"
                  title="Delete Update"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground bg-secondary/5">
            No farm updates posted yet. Use the form above to publish live field notes.
          </div>
        )}
      </div>

      {/* STAGE MODAL (Add / Edit) - Large Frame & Premium UX */}
      {stageModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-3xl border border-border bg-background shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card/70 backdrop-blur-xs shrink-0">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-foreground">
                    {editingStage ? "Edit Harvest Stage" : "Add Harvest Stage"}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Configure timeline stage label, date, custom icon, process notes, and photos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStageModalOpen(false)}
                className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveStage} className="flex-1 overflow-y-auto p-6 space-y-6 [scrollbar-width:thin]">
              {/* Row 1: Label, Status, and Date in a Spacious Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-2xl bg-secondary/15 border border-border/70">
                {/* Stage Label */}
                <div className="md:col-span-6 space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Stage Label / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={stageForm.label}
                    onChange={(e) => setStageForm({ ...stageForm, label: e.target.value })}
                    placeholder="e.g. Fermentation & Sun Drying"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition shadow-2xs"
                  />
                  <span className="text-[10.5px] text-muted-foreground block">
                    Pre-fills automatically when selecting a preset or custom type below.
                  </span>
                </div>

                {/* Status */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={stageForm.status}
                    onChange={(e) =>
                      setStageForm({ ...stageForm, status: e.target.value as DbStageStatus })
                    }
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition shadow-2xs"
                  >
                    <option value="upcoming">Upcoming (Not Started)</option>
                    <option value="current">Current (In Progress)</option>
                    <option value="done">Done (Completed)</option>
                  </select>
                  <span className="text-[10.5px] text-muted-foreground block">
                    &quot;Current&quot; auto-completes earlier stages.
                  </span>
                </div>

                {/* Stage Date */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Stage Date
                  </label>
                  <input
                    type="date"
                    value={stageForm.stage_date}
                    onChange={(e) => setStageForm({ ...stageForm, stage_date: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition shadow-2xs"
                  />
                  <span className="text-[10.5px] text-muted-foreground block">
                    Recorded or scheduled date
                  </span>
                </div>
              </div>

              {/* Row 2: Stage Icon & Type Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Stage Icon &amp; Type <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Choose from standard presets or select / create custom stage types
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-primary">
                    {stageTypes.length} Available Types
                  </span>
                </div>

                {/* Spacious Responsive Icon Grid (Wraps to 2-3 columns on mobile) */}
                <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-2.5">
                  {stageTypes.map((t) => {
                    const isSelected =
                      (stageForm.stage_type_id && stageForm.stage_type_id === t.id) ||
                      stageForm.icon_value === t.icon_value ||
                      stageForm.icon === t.icon_value;

                    return (
                      <div
                        key={t.id}
                        className={`group relative flex flex-col items-center justify-between min-h-[82px] p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/25 shadow-xs scale-[1.02]"
                            : "border-border/80 hover:border-primary/50 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => handleSelectStageType(t)}
                        title={t.name}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSelectStageType(t);
                          }
                        }}
                        aria-label={`Select stage type ${t.name}`}
                      >
                        {/* Custom Indicator Pill */}
                        {t.is_custom && (
                          <span className="absolute top-1.5 left-1.5 rounded-md bg-emerald-600/15 border border-emerald-600/25 px-1 py-[1px] text-[8px] font-bold text-emerald-800 dark:text-emerald-300 leading-none">
                            custom
                          </span>
                        )}

                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className={`absolute top-1.5 right-1.5 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xs ${t.is_custom ? "group-hover:opacity-0 transition-opacity" : ""}`}>
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                        )}

                        {/* Hover Actions for Custom Type: Edit & Delete */}
                        {t.is_custom && (
                          <div
                            className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenCustomPanel(t)}
                              className="h-5 w-5 rounded-md bg-background/95 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center shadow-xs border border-border cursor-pointer"
                              title="Edit Stage Type"
                              aria-label={`Edit stage type ${t.name}`}
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomStageType(t)}
                              className="h-5 w-5 rounded-md bg-background/95 hover:bg-red-50 text-muted-foreground hover:text-red-600 flex items-center justify-center shadow-xs border border-border cursor-pointer"
                              title="Delete Stage Type"
                              aria-label={`Delete stage type ${t.name}`}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}

                        {/* Icon Container */}
                        <div className="h-9 w-9 mt-1 rounded-xl bg-background/80 flex items-center justify-center shrink-0 border border-border/40 shadow-2xs">
                          <StageIconRenderer
                            iconType={t.icon_type}
                            iconValue={t.icon_value}
                            iconKey={t.icon_value}
                            className="h-5 w-5"
                          />
                        </div>

                        {/* Truncated Label with ellipsis and full name on hover */}
                        <span
                          className="text-[11px] font-semibold text-center leading-tight truncate px-1 w-full mt-1.5 block"
                          title={t.name}
                        >
                          {t.is_custom ? t.name : t.name.split("/")[0].trim()}
                        </span>
                      </div>
                    );
                  })}

                  {/* 9th "Custom" Tile */}
                  <button
                    type="button"
                    onClick={() => handleOpenCustomPanel()}
                    aria-label="Add custom stage type"
                    className={`flex flex-col items-center justify-center min-h-[82px] p-2.5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                      customPanelOpen
                        ? "border-primary bg-primary/15 text-primary ring-2 ring-primary/25 shadow-xs"
                        : "border-primary/50 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary"
                    }`}
                  >
                    <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-1">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-bold">Custom</span>
                  </button>
                </div>

                {/* Inline Custom Stage Type Panel */}
                {customPanelOpen && (
                  <div className="rounded-3xl border-2 border-primary/25 bg-secondary/15 p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex items-center justify-between border-b border-border/70 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/15 text-primary">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <h5 className="font-display text-sm font-bold text-foreground">
                            {editingCustomType ? `Edit Custom Type: ${editingCustomType.name}` : "Create Custom Stage Type"}
                          </h5>
                          <p className="text-[11px] text-muted-foreground">
                            Define custom stages like Cold Storage, Fermentation, Roasting with icons
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPanelOpen(false);
                          setEditingCustomType(null);
                          setCustomTypeError(null);
                        }}
                        className="rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition"
                        aria-label="Close custom stage type panel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {customTypeError && (
                      <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                        <span>{customTypeError}</span>
                      </div>
                    )}

                    {/* Top Row: Name Input & One-Off Toggle */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-7 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-foreground">
                            Custom Stage Name <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {customTypeName.length}/40
                          </span>
                        </div>
                        <input
                          type="text"
                          maxLength={40}
                          value={customTypeName}
                          onChange={(e) => {
                            setCustomTypeName(e.target.value);
                            if (customTypeError) setCustomTypeError(null);
                          }}
                          placeholder="e.g. Cold Storage, Fermentation, Roasting, Grading..."
                          className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition shadow-2xs"
                        />
                      </div>

                      <div className="md:col-span-5 pb-0.5">
                        {!editingCustomType ? (
                          <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/70 bg-background/80 hover:bg-background cursor-pointer select-none transition">
                            <input
                              type="checkbox"
                              checked={isOneOffOnly}
                              onChange={(e) => setIsOneOffOnly(e.target.checked)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-0.5"
                            />
                            <div className="text-[11px] leading-tight">
                              <span className="font-semibold text-foreground block">Use only for this stage</span>
                              <span className="text-muted-foreground text-[10px]">Do not save to reusable custom types list</span>
                            </div>
                          </label>
                        ) : (
                          <div className="text-[11px] text-muted-foreground p-2 bg-background/50 rounded-xl border border-border/50">
                            Updating existing stage type definition across future uses.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Icon Selection Card */}
                    <div className="rounded-2xl border border-border bg-background p-4 space-y-3.5 shadow-2xs">
                      {/* Segmented Control Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/60 pb-3">
                        <label className="block text-xs font-bold text-foreground">
                          Choose Icon Source <span className="text-red-500">*</span>
                        </label>
                        <div className="flex rounded-xl border border-border bg-secondary/30 p-1 text-xs font-semibold self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setCustomIconTab("library")}
                            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
                              customIconTab === "library"
                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Search className="h-3.5 w-3.5" />
                            <span>Icon Library (50+ Curated)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomIconTab("upload")}
                            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition cursor-pointer ${
                              customIconTab === "upload"
                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Upload Custom (SVG / PNG)</span>
                          </button>
                        </div>
                      </div>

                      {customIconTab === "library" ? (
                        <div className="space-y-3">
                          {/* Search Bar & Category Chips */}
                          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <input
                                type="text"
                                value={customIconSearch}
                                onChange={(e) => setCustomIconSearch(e.target.value)}
                                placeholder="Search 50+ icons (e.g. flame, coffee, cold, test, mill, wheat, apple)..."
                                className="h-9 w-full rounded-xl border border-border bg-secondary/15 pl-9 pr-8 text-xs outline-none focus:border-primary focus:bg-background transition"
                              />
                              {customIconSearch && (
                                <button
                                  type="button"
                                  onClick={() => setCustomIconSearch("")}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Category Filter Chips */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs [scrollbar-width:none]">
                              {["All", "Processing", "Agriculture", "Quality", "Storage", "Logistics", "General"].map(
                                (cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCustomCategoryFilter(cat)}
                                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                                      customCategoryFilter === cat
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          {/* Library Icons Grid */}
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-56 overflow-y-auto p-2.5 border border-border/60 rounded-xl bg-secondary/5 [scrollbar-width:thin]">
                            {filteredLibraryIcons.map((item) => {
                              const IconComp = item.icon;
                              const isSelected = customLibraryIcon.toLowerCase() === item.name.toLowerCase();
                              return (
                                <button
                                  key={item.name}
                                  type="button"
                                  onClick={() => setCustomLibraryIcon(item.name)}
                                  title={`${item.label} (${item.category})`}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer min-h-[64px] ${
                                    isSelected
                                      ? "border-primary bg-primary/15 text-primary font-bold ring-2 ring-primary/30 shadow-2xs scale-[1.02]"
                                      : "border-border/60 hover:border-primary/50 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  <IconComp className="h-5 w-5 mb-1" />
                                  <span className="text-[9.5px] leading-tight text-center truncate w-full px-0.5">
                                    {item.name}
                                  </span>
                                </button>
                              );
                            })}
                            {filteredLibraryIcons.length === 0 && (
                              <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                                No matching icons found for &quot;{customIconSearch}&quot;
                              </div>
                            )}
                          </div>

                          {/* Selected Preview Status */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <span>
                              Selected Icon:{" "}
                              <strong className="text-foreground font-semibold">
                                {customLibraryIcon}
                              </strong>
                            </span>
                            <span className="text-[11px]">
                              Showing {filteredLibraryIcons.length} icons
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Tab 2: Upload Custom Icon */
                        <div className="rounded-xl border border-border/80 bg-background p-4 space-y-3">
                          {customUploadData ? (
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl border border-border bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-2xs">
                                  <img
                                    src={customUploadData}
                                    alt="Uploaded icon"
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-foreground truncate max-w-[240px]">
                                    {customUploadName || "Custom Icon Uploaded"}
                                  </p>
                                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                                    <Check className="h-3 w-3 stroke-[3]" /> Ready to save
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-primary hover:underline cursor-pointer px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary transition">
                                  Change
                                  <input
                                    type="file"
                                    accept="image/svg+xml,image/png"
                                    className="hidden"
                                    onChange={handleCustomIconFileUpload}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomUploadData("");
                                    setCustomUploadName("");
                                  }}
                                  className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-secondary/10 hover:bg-secondary/20 transition cursor-pointer text-center">
                              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                                <Upload className="h-5 w-5" />
                              </div>
                              <p className="text-xs font-bold text-foreground">
                                Click or drag to upload custom stage icon
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                SVG or PNG format (recommended 48x48, max 500 KB)
                              </p>
                              <input
                                type="file"
                                accept="image/svg+xml,image/png"
                                className="hidden"
                                onChange={handleCustomIconFileUpload}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Sub-Panel Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPanelOpen(false);
                          setEditingCustomType(null);
                          setCustomTypeError(null);
                        }}
                        className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingCustomType || !customTypeName.trim()}
                        onClick={handleSaveCustomStageType}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer shadow-xs"
                      >
                        {savingCustomType ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span>
                          {isOneOffOnly
                            ? "Apply to Stage"
                            : editingCustomType
                            ? "Update Stage Type"
                            : "Save Stage Type"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  Description / Process Details
                </label>
                <textarea
                  rows={3}
                  value={stageForm.description}
                  onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                  placeholder="Explain how the harvest or processing is performed at this stage..."
                  className="w-full rounded-2xl border border-border bg-background p-3.5 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none shadow-2xs"
                />
              </div>

              {/* Row 4: Stage Photos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Stage Photos ({stageForm.images.length})
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Customer-visible harvest photos displayed when expanding this stage on the timeline
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition cursor-pointer">
                    {uploadingStageImg ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span>{uploadingStageImg ? "Uploading..." : "Add Photos"}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={uploadingStageImg}
                      className="hidden"
                      onChange={handleStageImagesUpload}
                    />
                  </label>
                </div>

                {/* Show in Transformation Strip Checkbox */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-secondary/20">
                  <input
                    type="checkbox"
                    id="show_in_transformation_toggle"
                    checked={stageForm.show_in_transformation}
                    onChange={(e) =>
                      setStageForm((prev) => ({
                        ...prev,
                        show_in_transformation: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-0.5 cursor-pointer"
                  />
                  <label
                    htmlFor="show_in_transformation_toggle"
                    className="text-xs font-semibold text-foreground cursor-pointer select-none"
                  >
                    Show this stage in &quot;Previous Season: Harvest to Pack&quot;
                    <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">
                      When enabled, the photo marked with the gold star below will be featured as this stage&apos;s step in the public &quot;Previous Season: Harvest to Pack&quot; sequence.
                    </span>
                  </label>
                </div>

                {stageForm.images && stageForm.images.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {stageForm.images.map((img, idx) => {
                      const isCover = idx === 0 || img === stageForm.image_url;
                      const isTransformation = stageForm.transformation_photo_id
                        ? stageForm.transformation_photo_id === img
                        : idx === 0;

                      return (
                        <div
                          key={idx}
                          className={`group relative aspect-square rounded-2xl border overflow-hidden bg-secondary/40 transition shadow-2xs ${
                            isTransformation
                              ? "border-amber-400 ring-2 ring-amber-400/40"
                              : isCover
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Stage photo ${idx + 1}`}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                          />

                          {/* Top Left Badges & Actions */}
                          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start z-10">
                            {/* Transformation Photo Star Badge / Button */}
                            {isTransformation ? (
                              <div
                                title="Active Transformation photo for this stage"
                                className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1"
                              >
                                <Star className="h-2.5 w-2.5 fill-white text-white" />
                                <span>Transformation</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetTransformationPhoto(img)}
                                title="Use as Transformation photo"
                                className="opacity-0 group-hover:opacity-100 transition bg-black/75 hover:bg-amber-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <Star className="h-2.5 w-2.5 text-amber-300" />
                                <span>Use in Transformation</span>
                              </button>
                            )}

                            {/* Cover Photo Badge / Button */}
                            {isCover && !isTransformation ? (
                              <div className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                                <Sparkles className="h-2.5 w-2.5" />
                                <span>Cover</span>
                              </div>
                            ) : !isCover ? (
                              <button
                                type="button"
                                onClick={() => handleSetCoverPhoto(idx)}
                                className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition bg-black/70 hover:bg-black text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow-xs cursor-pointer"
                              >
                                Set Cover
                              </button>
                            ) : null}
                          </div>

                          {/* Action Buttons Top Right: Replace & Delete */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                            {/* Replace Photo Button */}
                            <label
                              title="Replace photo"
                              className="h-6 w-6 rounded-full bg-black/70 hover:bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleReplacePhoto(idx, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>

                            {/* Delete Photo Button */}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="h-6 w-6 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                              title="Remove photo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Add Tile inside the grid */}
                    <label className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary bg-background hover:bg-secondary/30 transition cursor-pointer text-muted-foreground hover:text-foreground">
                      {uploadingStageImg ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                      <span className="text-[11px] mt-1 font-bold">+ Add More</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        disabled={uploadingStageImg}
                        className="hidden"
                        onChange={handleStageImagesUpload}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-secondary/10 hover:bg-secondary/30 transition text-center cursor-pointer">
                    {uploadingStageImg ? (
                      <Loader2 className="h-7 w-7 animate-spin text-primary mb-2" />
                    ) : (
                      <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-2">
                        <Camera className="h-5 w-5" />
                      </div>
                    )}
                    <p className="text-xs font-bold text-foreground">
                      {uploadingStageImg ? "Uploading and optimizing photos..." : "Click to upload stage photos"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Upload multiple harvest photos (JPG, PNG, WebP up to 8MB each)
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={uploadingStageImg}
                      className="hidden"
                      onChange={handleStageImagesUpload}
                    />
                  </label>
                )}
              </div>
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4 bg-card/70 backdrop-blur-xs shrink-0">
              <div className="text-xs text-muted-foreground">
                {stageForm.label ? (
                  <span>
                    Stage: <strong className="text-foreground">{stageForm.label}</strong>
                  </span>
                ) : (
                  <span>Provide a Stage Label and Icon</span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setStageModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingStage || !stageForm.label.trim()}
                  onClick={(e) => handleSaveStage(e as any)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-xs font-bold text-primary-foreground hover:opacity-95 disabled:opacity-50 transition cursor-pointer shadow-md"
                >
                  {savingStage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingStage ? (
                    "Save Changes"
                  ) : (
                    "Add Stage to Timeline"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CUSTOM STAGE TYPE CONFIRMATION MODAL */}
      {deleteConfirmOpen && deletingTypeData && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h4 className="font-display text-sm font-bold text-foreground">
                Delete Stage Type &quot;{deletingTypeData.name}&quot;?
              </h4>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Deleting this stage type will remove it from future stage creation. Any existing stages
              currently using this type will continue to display on timelines with a safe fallback icon.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                disabled={isDeletingType}
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeletingTypeData(null);
                }}
                className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingType}
                onClick={handleConfirmDeleteCustomType}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition cursor-pointer"
              >
                {isDeletingType ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Delete Stage Type</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
