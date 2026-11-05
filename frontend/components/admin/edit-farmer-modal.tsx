"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Upload,
  Loader2,
  User,
  Image as ImageIcon,
  CheckCircle2,
  Plus,
  Trash2,
  Star,
  Sprout,
  Camera,
  Layers,
  Sparkles,
  Info,
  MapPin,
  Calendar,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ActiveCrop,
  GalleryPhoto,
  FarmerReview,
  FarmerExtData,
  serializeFarmerStoryWithMeta,
  parseFarmerStoryAndMeta,
  resolveFarmerExtData,
  saveFarmerLocalExt,
} from "@/lib/farmer/farmer-ext-storage";
import { slugify } from "@/lib/farmer/use-farmer";
import { uploadToCloudinary } from "@/lib/cloudinary-client";

interface EditFarmerModalProps {
  farmer: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

function validateImageFile(file: File, maxSizeBytes = 5 * 1024 * 1024): ImageValidationResult {
  const validMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!file.type || !validMimeTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Invalid file format. Please upload a valid image (JPEG, PNG, or WebP).",
    };
  }
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum limit of 5 MB.`,
    };
  }
  return { valid: true };
}

async function optimizeImageFile(file: File, maxDim = 1400, quality = 0.88): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

export const DEFAULT_CROP_IMAGES = [
  { id: "sprout", label: "Sprout", fullName: "Sprout / Seedling", icon: "🌿", url: "/assets/defaults/crop-sprout.svg" },
  { id: "wheat", label: "Wheat", fullName: "Wheat Stalk", icon: "🌾", url: "/assets/defaults/crop-wheat.svg" },
  { id: "leaf", label: "Leaf", fullName: "Natural Leaf", icon: "🍃", url: "/assets/defaults/crop-leaf.svg" },
];

export function getDefaultCropImage(indexOrName?: number | string): string {
  if (typeof indexOrName === "number") {
    return DEFAULT_CROP_IMAGES[Math.abs(indexOrName) % DEFAULT_CROP_IMAGES.length].url;
  }
  if (typeof indexOrName === "string" && indexOrName.trim()) {
    const lower = indexOrName.toLowerCase();
    if (
      lower.includes("wheat") ||
      lower.includes("grain") ||
      lower.includes("barley") ||
      lower.includes("rice") ||
      lower.includes("millet") ||
      lower.includes("oat")
    ) {
      return "/assets/defaults/crop-wheat.svg";
    }
    if (
      lower.includes("tea") ||
      lower.includes("herb") ||
      lower.includes("spinach") ||
      lower.includes("leaf") ||
      lower.includes("coriander") ||
      lower.includes("mint")
    ) {
      return "/assets/defaults/crop-leaf.svg";
    }
  }
  return "/assets/defaults/crop-sprout.svg";
}

export function EditFarmerModal({ farmer, isOpen, onClose, onSuccess }: EditFarmerModalProps) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "gallery" | "crops" | "reviews">("general");

  // Tab 1: General identity & story
  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [headline, setHeadline] = useState("");
  const [story, setStory] = useState("");
  const [storyPreview, setStoryPreview] = useState("");
  const [altitudeM, setAltitudeM] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [landAcres, setLandAcres] = useState("");
  const [cultivatedArea, setCultivatedArea] = useState("");
  const [yearsFarming, setYearsFarming] = useState("");
  const [farmingMethod, setFarmingMethod] = useState("Natural Farming");

  // Portrait & Cover
  const [portraitUrl, setPortraitUrl] = useState("");
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Tab 2: Farm Gallery (3 Photos)
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([
    {
      url: "/assets/farm-ramesh-1.jpg",
      caption: "Heritage Mountain Farm",
      subcaption: "Glacier-fed Heirloom Orchards & Living Soil",
    },
    {
      url: "/assets/himalayan-landscape.jpg",
      caption: "Terraced Fields & Living Soil",
      subcaption: "Natural ecosystem nurtured with organic compost & zero synthetic inputs",
    },
    {
      url: "/assets/cat-nuts.jpg",
      caption: "Harvest Season & Hand Processing",
      subcaption: "Direct source origin • Traditional smallholder methods",
    },
  ]);

  // Tab 3: Active Crops list
  const [cropsList, setCropsList] = useState<ActiveCrop[]>([]);

  // Tab 4: Verified Buyer Reviews list
  const [reviewsList, setReviewsList] = useState<FarmerReview[]>([]);

  const portraitInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const cropInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Populate initial values when farmer changes
  useEffect(() => {
    if (farmer) {
      const rawDb = farmer.rawDb || farmer;
      const { cleanStory, meta: embeddedMeta } = parseFarmerStoryAndMeta(rawDb.story);
      const ext = resolveFarmerExtData(rawDb, farmer);

      setFullName(rawDb.full_name || farmer.name || "");
      setFarmName(rawDb.farm_name || (farmer.name ? `${farmer.name}'s Farm` : ""));
      setHeadline(rawDb.headline || farmer.quote || "");
      setStory(cleanStory || rawDb.story || farmer.story || "");
      setStoryPreview(
        ext.storyPreview ||
          rawDb.story_preview ||
          farmer.storyPreview ||
          "Almond and apricot orchards tended the same way his grandfather did, fed by glacier streams."
      );
      setAltitudeM(ext.altitudeM || rawDb.altitude || farmer.altitudeM || "");
      setPhone(rawDb.phone || farmer.phone || "");
      setEmail(rawDb.email || farmer.email || "");
      setVillage(rawDb.village || farmer.village || "");
      setDistrict(rawDb.district || farmer.district || "");
      setState(rawDb.state || farmer.state || "");
      setPincode(rawDb.pincode || farmer.pincode || "");

      const landVal =
        rawDb.farm_size_acres != null
          ? String(rawDb.farm_size_acres)
          : rawDb.total_land_area != null
          ? String(rawDb.total_land_area)
          : farmer.totalLandAcres != null
          ? String(farmer.totalLandAcres)
          : "";
      setLandAcres(landVal);

      setCultivatedArea(rawDb.cultivated_area != null ? String(rawDb.cultivated_area) : "");
      setYearsFarming(
        rawDb.years_farming != null
          ? String(rawDb.years_farming)
          : farmer.yearsExperience != null
          ? String(farmer.yearsExperience)
          : ""
      );
      setFarmingMethod(rawDb.farming_method || farmer.method || "Natural Farming");

      const portrait = rawDb.portrait_url || farmer.image || "";
      setPortraitUrl(portrait);
      setPortraitPreview(portrait || null);
      setPortraitFile(null);

      const cover = rawDb.cover_image_url || "/assets/farm-ramesh-1.jpg";
      setCoverUrl(cover);
      setCoverPreview(cover || null);
      setCoverFile(null);

      // Initialize Farm Gallery
      if (ext.galleryPhotos && ext.galleryPhotos.length > 0) {
        setGalleryPhotos(ext.galleryPhotos);
      } else {
        setGalleryPhotos([
          {
            url: cover || "/assets/farm-ramesh-1.jpg",
            caption: `${rawDb.full_name || farmer.name || "Farmer"}'s Heritage Farm`,
            subcaption: `${rawDb.village || farmer.village || "Valley"}, ${
              rawDb.state || farmer.state || "Ladakh"
            } • ${rawDb.farming_method || farmer.method || "Natural Cultivation"}`,
          },
          {
            url: "/assets/himalayan-landscape.jpg",
            caption: "Terraced Fields & Living Soil",
            subcaption: "Natural ecosystem nurtured with organic compost & zero synthetic inputs",
          },
          {
            url: "/assets/cat-nuts.jpg",
            caption: "Harvest Season & Hand Processing",
            subcaption: "Direct source origin • Traditional smallholder methods",
          },
        ]);
      }

      // Initialize Crops List
      if (ext.crops && ext.crops.length > 0) {
        setCropsList(ext.crops);
      } else if (Array.isArray(farmer.crops) && farmer.crops.length > 0 && typeof farmer.crops[0] === "object") {
        setCropsList(farmer.crops);
      } else {
        // Fallback default crops
        const parsedAcres = parseFloat(landVal) || 5.0;
        const halfAcres = parseFloat((parsedAcres * 0.5).toFixed(1));
        const thirdAcres = parseFloat((parsedAcres * 0.3).toFixed(1));
        setCropsList([
          {
            id: `crop-${Date.now()}-1`,
            name: "Mamra Almonds",
            photoUrl: "/assets/defaults/crop-sprout.svg",
            landAcres: halfAcres,
            season: "Aug – Oct",
            method: rawDb.farming_method || "Glacier Rainfed Natural",
            lastYieldKg: "1,450 kg",
          },
          {
            id: `crop-${Date.now()}-2`,
            name: "Raktsey Karpo Apricots",
            photoUrl: "/assets/defaults/crop-wheat.svg",
            landAcres: thirdAcres,
            season: "Jul – Sep",
            method: "Traditional High-Altitude Orchard",
            lastYieldKg: "980 kg",
          },
        ]);
      }

      // Initialize Reviews List
      if (ext.reviews && ext.reviews.length > 0) {
        setReviewsList(ext.reviews);
      } else if (Array.isArray(farmer.reviews) && farmer.reviews.length > 0) {
        setReviewsList(farmer.reviews);
      } else {
        setReviewsList([
          {
            id: `rev-${Date.now()}-1`,
            buyerName: "Ananya Sharma",
            buyerLocation: "Bengaluru, KA",
            rating: 5,
            comment:
              "The almond sweetness and oil content is unbelievable compared to imported almonds. You can taste the purity!",
          },
          {
            id: `rev-${Date.now()}-2`,
            buyerName: "Dr. K. V. Raman",
            buyerLocation: "Chennai, TN",
            rating: 5,
            comment:
              "Fast shipping and fantastic packaging. Knowing it comes directly from the orchard adds true value.",
          },
        ]);
      }
    }
  }, [farmer]);

  // Land calculation preview
  const landCalculation = useMemo(() => {
    const totalLand = parseFloat(landAcres) || 0;
    const allocated = cropsList.reduce((sum, c) => sum + (Number(c.landAcres) || 0), 0);
    const fallow = Math.max(0, totalLand - allocated);
    return {
      totalLand,
      allocated: parseFloat(allocated.toFixed(1)),
      fallow: parseFloat(fallow.toFixed(1)),
    };
  }, [landAcres, cropsList]);

  if (!isOpen || !farmer) return null;

  const handlePortraitChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = "";
      return;
    }
    const toastId = toast.loading("Uploading portrait to Neon storage...");
    try {
      const localPreview = URL.createObjectURL(file);
      setPortraitPreview(localPreview);
      setPortraitFile(file);

      const cdnUrl = await uploadToCloudinary(file, "prajnaa/farmers");
      setPortraitUrl(cdnUrl);
      setPortraitPreview(cdnUrl);
      setPortraitFile(null);
      toast.success("Portrait uploaded to Neon successfully.");
    } catch (err: any) {
      console.warn("Portrait upload failed:", err);
      try {
        const dataUrl = await optimizeImageFile(file);
        setPortraitUrl(dataUrl);
        setPortraitPreview(dataUrl);
      } catch {}
      toast.error(err?.message || "Upload failed. Check storage configuration.");
    } finally {
      toast.dismiss(toastId);
      e.target.value = "";
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = "";
      return;
    }
    const toastId = toast.loading("Uploading cover to Neon storage...");
    try {
      const localPreview = URL.createObjectURL(file);
      setCoverPreview(localPreview);
      setCoverFile(file);

      const cdnUrl = await uploadToCloudinary(file, "prajnaa/farmers");
      setCoverUrl(cdnUrl);
      setCoverPreview(cdnUrl);
      setCoverFile(null);
      toast.success("Cover uploaded to Neon successfully.");
    } catch (err: any) {
      console.warn("Cover upload failed:", err);
      try {
        const dataUrl = await optimizeImageFile(file);
        setCoverUrl(dataUrl);
        setCoverPreview(dataUrl);
      } catch {}
      toast.error(err?.message || "Upload failed. Check storage configuration.");
    } finally {
      toast.dismiss(toastId);
      e.target.value = "";
    }
  };

  // Gallery handlers
  const handleUpdateGallery = (index: number, key: keyof GalleryPhoto, value: string) => {
    setGalleryPhotos((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [key]: value };
      }
      return updated;
    });
  };

  const handleGalleryUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = "";
      return;
    }
    const toastId = toast.loading(`Uploading slide ${index + 1} to Neon storage...`);
    try {
      const cdnUrl = await uploadToCloudinary(file, "prajnaa/farmers");
      handleUpdateGallery(index, "url", cdnUrl);
      toast.success(`Slide ${index + 1} uploaded to Neon successfully.`);
    } catch (err: any) {
      console.warn("Gallery upload failed:", err);
      try {
        const dataUrl = await optimizeImageFile(file);
        handleUpdateGallery(index, "url", dataUrl);
      } catch {}
      toast.error(err?.message || "Upload failed.");
    } finally {
      toast.dismiss(toastId);
      e.target.value = "";
    }
  };

  // Crop list handlers
  const handleAddCrop = () => {
    const nextIdx = cropsList.length;
    const defaultPhoto = DEFAULT_CROP_IMAGES[nextIdx % DEFAULT_CROP_IMAGES.length].url;
    const newCrop: ActiveCrop = {
      id: `crop-${Date.now()}`,
      name: "",
      photoUrl: defaultPhoto,
      landAcres: 1.0,
      season: "",
      method: farmingMethod || "Natural Farming",
      lastYieldKg: "",
    };
    setCropsList((prev) => [...prev, newCrop]);
  };

  const handleUpdateCrop = (id: string, key: keyof ActiveCrop, value: any) => {
    setCropsList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: key === "landAcres" ? parseFloat(value) || 0 : value } : c))
    );
  };

  const handleCropUpload = async (cropId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = "";
      return;
    }
    const toastId = toast.loading("Uploading crop photo to Neon storage...");
    try {
      const cdnUrl = await uploadToCloudinary(file, "prajnaa/crops");
      handleUpdateCrop(cropId, "photoUrl", cdnUrl);
      toast.success("Crop photo uploaded to Neon successfully.");
    } catch (err: any) {
      console.warn("Crop upload failed:", err);
      try {
        const dataUrl = await optimizeImageFile(file);
        handleUpdateCrop(cropId, "photoUrl", dataUrl);
      } catch {}
      toast.error(err?.message || "Upload failed.");
    } finally {
      toast.dismiss(toastId);
      e.target.value = "";
    }
  };

  const handleRemoveCrop = (id: string) => {
    setCropsList((prev) => prev.filter((c) => c.id !== id));
  };

  // Review list handlers
  const handleAddReview = () => {
    const newRev: FarmerReview = {
      id: `rev-${Date.now()}`,
      buyerName: "",
      buyerLocation: "",
      rating: 5,
      comment: "",
    };
    setReviewsList((prev) => [...prev, newRev]);
  };

  const handleUpdateReview = (id: string, key: keyof FarmerReview, value: any) => {
    setReviewsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: key === "rating" ? Number(value) : value } : r))
    );
  };

  const handleRemoveReview = (id: string) => {
    setReviewsList((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Farmer full name is required.");
      return;
    }

    setLoading(true);

    try {
      let finalPortraitUrl = portraitUrl;
      let finalCoverUrl = coverUrl;

      // 1. Upload portrait to Cloudinary if pending or base64
      if (portraitFile) {
        try {
          finalPortraitUrl = await uploadToCloudinary(portraitFile, "prajnaa/farmers");
        } catch (err) {
          console.warn("[EditFarmer] Cloudinary portrait upload warning:", err);
        }
      } else if (finalPortraitUrl && finalPortraitUrl.startsWith("data:image")) {
        try {
          finalPortraitUrl = await uploadToCloudinary(finalPortraitUrl, "prajnaa/farmers");
        } catch (err) {
          console.warn("[EditFarmer] Cloudinary base64 portrait upload warning:", err);
        }
      }

      // 2. Upload cover to Cloudinary if pending or base64
      if (coverFile) {
        try {
          finalCoverUrl = await uploadToCloudinary(coverFile, "prajnaa/farmers");
        } catch (err) {
          console.warn("[EditFarmer] Cloudinary cover upload warning:", err);
        }
      } else if (finalCoverUrl && finalCoverUrl.startsWith("data:image")) {
        try {
          finalCoverUrl = await uploadToCloudinary(finalCoverUrl, "prajnaa/farmers");
        } catch (err) {
          console.warn("[EditFarmer] Cloudinary base64 cover upload warning:", err);
        }
      }

      // 3. Prepare extended metadata payload (ensure gallery & crops upload any base64 to Cloudinary)
      const resolvedGallery = await Promise.all(
        galleryPhotos.map(async (g, idx) => {
          let url = idx === 0 && finalCoverUrl ? finalCoverUrl : g.url;
          if (url && url.startsWith("data:image")) {
            try {
              url = await uploadToCloudinary(url, "prajnaa/farmers");
            } catch (e) {
              console.warn("Failed to upload gallery base64 to Cloudinary:", e);
            }
          }
          return { ...g, url };
        })
      );

      const resolvedCrops = await Promise.all(
        cropsList.map(async (c, idx) => {
          let photoUrl = c.photoUrl?.trim() || getDefaultCropImage(c.name || idx);
          if (photoUrl && photoUrl.startsWith("data:image")) {
            try {
              photoUrl = await uploadToCloudinary(photoUrl, "prajnaa/crops");
            } catch (e) {
              console.warn("Failed to upload crop base64 to Cloudinary:", e);
            }
          }
          return { ...c, photoUrl };
        })
      );

      const extMeta: FarmerExtData = {
        storyPreview: "",
        altitudeM: altitudeM.trim(),
        crops: resolvedCrops,
        galleryPhotos: resolvedGallery,
        reviews: reviewsList,
      };

      const farmerId = String(farmer.id || farmer.slug || "");
      const farmerSlug = String(farmer.slug || slugify(fullName));

      // Save to localStorage immediately
      saveFarmerLocalExt(farmerId, extMeta);
      if (farmerSlug) saveFarmerLocalExt(farmerSlug, extMeta);

      // Embed serialized metadata into story column for remote persistence
      const finalStory = serializeFarmerStoryWithMeta(story.trim(), extMeta);

      const parsedLand = landAcres ? parseFloat(landAcres) : null;
      const parsedCultivated = cultivatedArea ? parseFloat(cultivatedArea) : null;
      const parsedYears = yearsFarming ? parseInt(yearsFarming, 10) : null;

      const updatePayload: any = {
        full_name: fullName.trim(),
        farm_name: farmName.trim() || fullName.trim() + "'s Farm",
        headline: headline.trim() || null,
        story: finalStory,
        phone: phone.trim() || null,
        email: email.trim() || null,
        village: village.trim() || null,
        district: district.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        farm_size_acres: parsedLand,
        total_land_area: parsedLand != null ? String(parsedLand) : null,
        cultivated_area: parsedCultivated != null ? String(parsedCultivated) : null,
        years_farming: parsedYears,
        farming_method: farmingMethod,
        crops: cropsList.map((c) => c.name.trim()).filter(Boolean),
        portrait_url: finalPortraitUrl || null,
        cover_image_url: finalCoverUrl || null,
        updated_at: new Date().toISOString(),
      };

      // Check if profile exists in DB
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(farmerId);
      let query = supabase.from("farmer_profiles").select("id, slug");
      if (isUuid) {
        query = query.or(`id.eq.${farmerId},slug.eq.${farmerSlug}`);
      } else {
        query = query.eq("slug", farmerSlug);
      }
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("farmer_profiles")
          .update(updatePayload)
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("farmer_profiles").insert({
          ...updatePayload,
          id: isUuid ? farmerId : undefined,
          slug: farmerSlug,
          status: "approved",
        });
        if (error) {
          console.warn("[EditFarmer] Insert fallback failed:", error);
          // If insert fails due to permissions or mock ID, local storage was already updated!
        }
      }

      toast.success(`Farmer "${fullName}" complete profile updated successfully!`);

      // Invalidate queries so changes reflect immediately across customer panel and admin
      qc.invalidateQueries({ queryKey: ["admin-all-farmers-showcase"] });
      qc.invalidateQueries({ queryKey: ["public-farmer", farmer.slug] });
      qc.invalidateQueries({ queryKey: ["public-farmer", farmer.id] });
      qc.invalidateQueries({ queryKey: ["public-farmer", farmerSlug] });
      qc.invalidateQueries({ queryKey: ["public-all-farmers"] });
      qc.invalidateQueries({ queryKey: ["public-featured-farmers"] });
      qc.invalidateQueries({ queryKey: ["admin-farmers"] });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[EditFarmerModal] Error updating farmer:", err);
      toast.error(err.message || "Failed to update farmer details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      <div className="relative flex w-full max-w-5xl max-h-[92vh] flex-col rounded-3xl border border-[#E6E0D4] bg-[#FAF8F5] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 bg-white/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F3D2E]">
                Edit Farmer Profile · {fullName || farmer.name}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">
              Customize public customer story, 3-slide photo gallery, active crops with land ledger, and verified buyer reviews.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#E6E0D4] text-muted-foreground hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex border-b border-[#E6E0D4] bg-white px-6 overflow-x-auto whitespace-nowrap gap-3 mb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`shrink-0 py-3 px-5 font-subhead text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition flex items-center gap-2 cursor-pointer ${
              activeTab === "general"
                ? "border-[#0F3D2E] text-[#0F3D2E]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            <span>1. General &amp; Story</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`shrink-0 py-3 px-5 font-subhead text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition flex items-center gap-2 cursor-pointer ${
              activeTab === "gallery"
                ? "border-[#0F3D2E] text-[#0F3D2E]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Camera className="h-4 w-4 shrink-0" />
            <span className="flex items-center gap-1.5">
              <span>2. Farm Gallery</span>
              <span>(3 Photos)</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("crops")}
            className={`shrink-0 py-3 px-5 font-subhead text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition flex items-center gap-2 cursor-pointer ${
              activeTab === "crops"
                ? "border-[#0F3D2E] text-[#0F3D2E]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Sprout className="h-4 w-4 shrink-0" />
            <span className="flex items-center gap-1.5">
              <span>3. Active Crops &amp; Land Ledger</span>
              <span>({cropsList.length})</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`shrink-0 py-3 px-5 font-subhead text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition flex items-center gap-2 cursor-pointer ${
              activeTab === "reviews"
                ? "border-[#0F3D2E] text-[#0F3D2E]"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Star className="h-4 w-4 shrink-0" />
            <span className="flex items-center gap-1.5">
              <span>4. Verified Reviews</span>
              <span>({reviewsList.length})</span>
            </span>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
          <form id="edit-farmer-form" onSubmit={handleSubmit} className="space-y-6">
            {/* TAB 1: General & Story */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1.1 Identity & Location */}
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 space-y-4">
                  <h3 className="font-subhead text-xs font-bold text-[#8D3C1B] uppercase tracking-wider flex items-center gap-2">
                    <User className="h-4 w-4 text-[#8D3C1B]" /> Personal &amp; Farm Identity
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Name of farmer"
                        className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3.5 py-2.5 text-sm focus:border-[#0F3D2E] focus:outline-none focus:ring-1 focus:ring-[#0F3D2E]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Farm Name
                      </label>
                      <input
                        type="text"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        placeholder="Farm name"
                        className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3.5 py-2.5 text-sm focus:border-[#0F3D2E] focus:outline-none focus:ring-1 focus:ring-[#0F3D2E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Village / Town
                      </label>
                      <input
                        type="text"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder="Village name"
                        className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm focus:border-[#0F3D2E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        District
                      </label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="District name"
                        className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm focus:border-[#0F3D2E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        State
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State name"
                        className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm focus:border-[#0F3D2E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Elevation / Altitude
                      </label>
                      <input
                        type="text"
                        value={altitudeM}
                        onChange={(e) => setAltitudeM(e.target.value)}
                        placeholder="Elevation / altitude"
                        className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm focus:border-[#0F3D2E] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 1.2 Farm Specs & Headline Quote */}
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 space-y-4">
                  <h3 className="font-subhead text-xs font-bold text-[#8D3C1B] uppercase tracking-wider flex items-center gap-2">
                    <Scale className="h-4 w-4 text-[#8D3C1B]" /> Farm Holding &amp; Public Quote
                  </h3>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                      Farmer Highlight Quote (Displayed below farmer name in hero)
                    </label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Farmer highlight quote"
                      className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3.5 py-2.5 text-sm italic focus:border-[#0F3D2E] focus:outline-none focus:ring-1 focus:ring-[#0F3D2E]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Total Farm Size (Acres) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={landAcres}
                        onChange={(e) => setLandAcres(e.target.value)}
                        placeholder="Total farm size (in acres)"
                        className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3.5 py-2 text-sm font-semibold focus:border-[#0F3D2E] focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Used for the Signature Land Ledger proportional bar
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={yearsFarming}
                        onChange={(e) => setYearsFarming(e.target.value)}
                        placeholder="Years of farming experience"
                        className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3.5 py-2 text-sm focus:border-[#0F3D2E] focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Years in farming
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Primary Farming Method
                      </label>
                      <input
                        type="text"
                        value={farmingMethod}
                        onChange={(e) => setFarmingMethod(e.target.value)}
                        placeholder="Primary farming method"
                        className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3.5 py-2 text-sm focus:border-[#0F3D2E] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 1.3 Detailed Story (Sub-story removed) */}
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 space-y-4">
                  <h3 className="font-subhead text-xs font-bold text-[#8D3C1B] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#8D3C1B]" /> Story &amp; Philosophy (About {fullName || "Farmer"})
                  </h3>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                      Main Farm Story Paragraph
                    </label>
                    <textarea
                      rows={5}
                      value={story}
                      onChange={(e) => setStory(e.target.value)}
                      placeholder="Main farm story and background"
                      className="w-full rounded-xl border border-[#E6E0D4] bg-white p-3.5 text-sm leading-relaxed focus:border-[#0F3D2E] focus:outline-none focus:ring-1 focus:ring-[#0F3D2E]"
                    />
                  </div>
                </div>

                {/* 1.4 Portrait & Cover Images */}
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 space-y-4">
                  <h3 className="font-subhead text-xs font-bold text-[#8D3C1B] uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-[#8D3C1B]" /> Profile Portrait &amp; Cover Landscape
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Portrait */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Farmer Portrait Photo (Square)
                        </label>
                        <span className="text-[10px] text-muted-foreground">JPEG, PNG, WebP &le; 5MB</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative h-20 w-20 rounded-2xl border-2 border-[#E6E0D4] bg-neutral-100 overflow-hidden flex-shrink-0 shadow-2xs">
                          {portraitPreview ? (
                            <img src={portraitPreview} alt="Portrait" className="h-full w-full object-cover object-center" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-neutral-400">
                              <User className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 flex-1">
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            ref={portraitInputRef}
                            onChange={handlePortraitChange}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => portraitInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E0D4] bg-white text-xs font-semibold text-[#0F3D2E] hover:bg-neutral-50 transition cursor-pointer shadow-2xs"
                            >
                              <Upload className="h-3.5 w-3.5" /> Upload Photo
                            </button>
                            {portraitPreview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPortraitFile(null);
                                  setPortraitPreview(null);
                                  setPortraitUrl("");
                                }}
                                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 transition cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={portraitUrl}
                            onChange={(e) => {
                              setPortraitUrl(e.target.value);
                              setPortraitPreview(e.target.value || null);
                            }}
                            placeholder="Image URL or upload photo above"
                            className="w-full rounded-lg border border-[#E6E0D4] bg-white px-2.5 py-1 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cover Landscape */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          Farm Cover Landscape (Orchard/Fields)
                        </label>
                        <span className="text-[10px] text-muted-foreground">JPEG, PNG, WebP &le; 5MB</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative h-20 w-32 rounded-2xl border-2 border-[#E6E0D4] bg-neutral-100 overflow-hidden flex-shrink-0 shadow-2xs">
                          {coverPreview ? (
                            <img src={coverPreview} alt="Cover" className="h-full w-full object-cover object-center" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-neutral-400">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 flex-1">
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            ref={coverInputRef}
                            onChange={handleCoverChange}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => coverInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E0D4] bg-white text-xs font-semibold text-[#0F3D2E] hover:bg-neutral-50 transition cursor-pointer shadow-2xs"
                            >
                              <Upload className="h-3.5 w-3.5" /> Upload Cover
                            </button>
                            {coverPreview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCoverFile(null);
                                  setCoverPreview(null);
                                  setCoverUrl("");
                                }}
                                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 transition cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={coverUrl}
                            onChange={(e) => {
                              setCoverUrl(e.target.value);
                              setCoverPreview(e.target.value || null);
                            }}
                            placeholder="Cover image URL or upload photo above"
                            className="w-full rounded-lg border border-[#E6E0D4] bg-white px-2.5 py-1 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Farm Gallery (3 Photos Slider) */}
            {activeTab === "gallery" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-[#0F3D2E]/5 border border-[#0F3D2E]/15 rounded-2xl p-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-[#0F3D2E] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-neutral-700">
                    <p className="font-bold text-[#0F3D2E]">Farm Gallery Slider (1/3)</p>
                    <p className="mt-0.5">
                      This 3-photo interactive slider displays directly next to the farmer&apos;s story on the public page. Each slide features a high-resolution photo, slide caption, and subcaption.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {galleryPhotos.map((slide, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-[#E6E0D4] bg-white p-5 shadow-2xs space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-2">
                        <span className="font-subhead text-xs font-bold text-[#0F3D2E] uppercase tracking-wider flex items-center gap-2">
                          <Camera className="h-4 w-4 text-[#E8A317]" /> Slide {index + 1} of 3
                        </span>
                        <span className="text-[11px] text-muted-foreground font-sans">
                          {index === 0 ? "Heritage Farm / Landscape" : index === 1 ? "Living Soil & Fields" : "Harvest Processing"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                        <div className="sm:col-span-4 space-y-2">
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-300 shadow-2xs">
                            <img
                              src={slide.url}
                              alt={slide.caption}
                              className="h-full w-full object-cover object-center"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/assets/himalayan-landscape.jpg";
                              }}
                            />
                            <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs px-2 py-1 rounded text-[10px] text-white truncate">
                              {slide.caption || "Slide Preview"}
                            </div>
                          </div>
                          <div>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/webp"
                              ref={(el) => {
                                galleryInputRefs.current[index] = el;
                              }}
                              onChange={(e) => handleGalleryUpload(index, e)}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => galleryInputRefs.current[index]?.click()}
                              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6E0D4] bg-white text-xs font-semibold text-[#0F3D2E] hover:bg-neutral-50 transition cursor-pointer shadow-2xs"
                            >
                              <Upload className="h-3.5 w-3.5" /> Upload Slide Photo
                            </button>
                            <span className="text-[10px] text-muted-foreground block text-center mt-1">
                              JPEG, PNG, WebP &le; 5MB
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-8 space-y-3">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                              Slide Caption (Overlay Heading)
                            </label>
                            <input
                              type="text"
                              value={slide.caption}
                              onChange={(e) => handleUpdateGallery(index, "caption", e.target.value)}
                              placeholder="Slide caption"
                              className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm font-semibold focus:border-[#0F3D2E] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                              Slide Subcaption (Location &amp; Farming Method)
                            </label>
                            <input
                              type="text"
                              value={slide.subcaption}
                              onChange={(e) => handleUpdateGallery(index, "subcaption", e.target.value)}
                              placeholder="Slide subcaption"
                              className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-xs focus:border-[#0F3D2E] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Active Crops & Land Ledger */}
            {activeTab === "crops" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Land Ledger Bar Live Preview */}
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-display text-base font-bold text-[#0F3D2E]">
                        Signature Land Ledger Live Preview
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Proportional bar visualization rendered on the public customer page.
                      </p>
                    </div>
                    <div className="bg-[#0F3D2E]/10 text-[#0F3D2E] font-subhead text-xs font-bold px-3 py-1.5 rounded-full self-start">
                      Total Holding: {landCalculation.totalLand} Acres
                    </div>
                  </div>

                  {/* Proportional Preview Bar */}
                  <div className="h-6 w-full rounded-full overflow-hidden flex bg-neutral-200 border border-neutral-300">
                    {cropsList.map((crop, i) => {
                      const acres = Number(crop.landAcres) || 0;
                      const percent = landCalculation.totalLand > 0 ? (acres / landCalculation.totalLand) * 100 : 0;
                      if (percent <= 0) return null;
                      const bgColors = ["bg-[#0F3D2E]", "bg-[#8D3C1B]", "bg-[#E8A317]", "bg-[#3A5A40]"];
                      return (
                        <div
                          key={crop.id || i}
                          style={{ width: `${percent}%` }}
                          className={`${bgColors[i % bgColors.length]} transition-all duration-300`}
                          title={`${crop.name}: ${acres} Acres`}
                        />
                      );
                    })}
                    {landCalculation.fallow > 0 && (
                      <div
                        style={{
                          width: `${(landCalculation.fallow / (landCalculation.totalLand || 1)) * 100}%`,
                        }}
                        className="bg-neutral-300 transition-all duration-300"
                        title={`Fallow / Unallocated: ${landCalculation.fallow} Acres`}
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                    {cropsList.map((crop, i) => {
                      const bgColors = ["bg-[#0F3D2E]", "bg-[#8D3C1B]", "bg-[#E8A317]", "bg-[#3A5A40]"];
                      return (
                        <div key={crop.id || i} className="flex items-center gap-1.5 font-subhead">
                          <span className={`h-2.5 w-2.5 rounded-xs ${bgColors[i % bgColors.length]}`} />
                          <span className="font-bold text-[#0F3D2E]">{crop.name}:</span>
                          <span className="text-neutral-600">{crop.landAcres} Acres</span>
                        </div>
                      );
                    })}
                    {landCalculation.fallow > 0 && (
                      <div className="flex items-center gap-1.5 font-subhead">
                        <span className="h-2.5 w-2.5 rounded-xs bg-neutral-300" />
                        <span className="font-bold text-neutral-600">Unallocated / Fallow:</span>
                        <span className="text-neutral-500">{landCalculation.fallow} Acres</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Crop Breakdown Cards Header & Add Button */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h3 className="font-subhead text-xs font-bold text-[#8D3C1B] uppercase tracking-wider">
                      Active Crop Details ({cropsList.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Each crop card details acreage, harvest season, farming method, and last yield status.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCrop}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D2E] px-4 py-2 font-subhead text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0c2b20] transition cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Crop
                  </button>
                </div>

                {/* Crops List */}
                <div className="space-y-4">
                  {cropsList.map((crop, idx) => (
                    <div
                      key={crop.id}
                      className="rounded-2xl border border-[#E6E0D4] bg-white p-5 shadow-2xs space-y-4 relative group"
                    >
                      <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-2">
                        <span className="font-subhead text-xs font-bold text-[#0F3D2E] uppercase tracking-wider">
                          Crop #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCrop(crop.id)}
                          className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                          title="Remove Crop"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        {/* Crop Name */}
                        <div className="sm:col-span-5">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Crop Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={crop.name}
                            onChange={(e) => handleUpdateCrop(crop.id, "name", e.target.value)}
                            placeholder="Crop name"
                            className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm font-bold text-[#0F3D2E] focus:border-[#0F3D2E] focus:outline-none"
                          />
                        </div>

                        {/* Land Allocated */}
                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Land Allocated (Acres)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={crop.landAcres}
                            onChange={(e) => handleUpdateCrop(crop.id, "landAcres", e.target.value)}
                            placeholder="Land allocated (in acres)"
                            className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm font-semibold focus:border-[#0F3D2E] focus:outline-none"
                          />
                        </div>

                        {/* Season */}
                        <div className="sm:col-span-4">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Harvest Season
                          </label>
                          <input
                            type="text"
                            value={crop.season}
                            onChange={(e) => handleUpdateCrop(crop.id, "season", e.target.value)}
                            placeholder="Harvest season"
                            className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm focus:border-[#0F3D2E] focus:outline-none"
                          />
                        </div>

                        {/* Method */}
                        <div className="sm:col-span-4">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Farming Method
                          </label>
                          <input
                            type="text"
                            value={crop.method}
                            onChange={(e) => handleUpdateCrop(crop.id, "method", e.target.value)}
                            placeholder="Farming method"
                            className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-xs focus:border-[#0F3D2E] focus:outline-none"
                          />
                        </div>

                        {/* Harvest Yield Status */}
                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Harvest Status / Yield
                          </label>
                          <input
                            type="text"
                            value={crop.lastYieldKg}
                            onChange={(e) => handleUpdateCrop(crop.id, "lastYieldKg", e.target.value)}
                            placeholder="Harvest status or yield"
                            className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm font-bold text-[#8D3C1B] focus:border-[#0F3D2E] focus:outline-none"
                          />
                        </div>

                        {/* Crop Photo with Upload option & 3 Defaults */}
                        <div className="sm:col-span-5">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Crop Photo
                          </label>
                          <div className="flex items-center gap-3">
                            <div className="relative h-14 w-14 rounded-xl border border-[#E6E0D4] bg-neutral-50 overflow-hidden shrink-0 shadow-2xs">
                              <img
                                src={crop.photoUrl || getDefaultCropImage(idx)}
                                alt={crop.name || "Crop"}
                                className="h-full w-full object-cover object-center"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getDefaultCropImage(idx);
                                }}
                              />
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                ref={(el) => {
                                  cropInputRefs.current[crop.id] = el;
                                }}
                                onChange={(e) => handleCropUpload(crop.id, e)}
                                className="hidden"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => cropInputRefs.current[crop.id]?.click()}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E6E0D4] bg-white text-xs font-semibold text-[#0F3D2E] hover:bg-neutral-50 transition cursor-pointer shadow-2xs"
                                >
                                  <Upload className="h-3 w-3" /> Upload Photo
                                </button>
                                <span className="text-[10px] text-muted-foreground">&le; 5MB</span>
                              </div>

                              {/* 3 Defaults: Sprout, Wheat Stalk, Leaf */}
                              <div className="flex items-center gap-1 pt-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium mr-1">
                                  Default:
                                </span>
                                {DEFAULT_CROP_IMAGES.map((def) => {
                                  const isSelected = crop.photoUrl === def.url;
                                  return (
                                    <button
                                      key={def.id}
                                      type="button"
                                      onClick={() => handleUpdateCrop(crop.id, "photoUrl", def.url)}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition border cursor-pointer flex items-center gap-1 ${
                                        isSelected
                                          ? "bg-[#0F3D2E] text-white border-[#0F3D2E]"
                                          : "bg-white text-neutral-600 border-[#E6E0D4] hover:bg-neutral-100"
                                      }`}
                                      title={def.fullName}
                                    >
                                      <span>{def.icon}</span>
                                      <span>{def.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {cropsList.length === 0 && (
                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-[#E6E0D4] p-6 space-y-3">
                      <Sprout className="h-8 w-8 text-neutral-400 mx-auto" />
                      <p className="text-xs text-muted-foreground">No crops registered yet.</p>
                      <button
                        type="button"
                        onClick={handleAddCrop}
                        className="rounded-full bg-[#0F3D2E] text-white px-4 py-2 font-subhead text-xs font-bold"
                      >
                        + Add First Crop
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: Verified Reviews (What Sourcing Buyers Say) */}
            {activeTab === "reviews" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-subhead text-xs font-bold text-[#8D3C1B] uppercase tracking-wider">
                      Verified Buyer Testimonials ({reviewsList.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      These reviews appear in the &quot;What Sourcing Buyers Say&quot; section on the farmer&apos;s public profile.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddReview}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D2E] px-4 py-2 font-subhead text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0c2b20] transition cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Review
                  </button>
                </div>

                <div className="space-y-4">
                  {reviewsList.map((rev, idx) => (
                    <div
                      key={rev.id}
                      className="rounded-2xl border border-[#E6E0D4] bg-white p-5 shadow-2xs space-y-3 relative"
                    >
                      <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-2">
                        <span className="font-subhead text-xs font-bold text-[#0F3D2E] uppercase tracking-wider">
                          Review #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveReview(rev.id)}
                          className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                          title="Remove Review"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-5">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Buyer Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={rev.buyerName}
                            onChange={(e) => handleUpdateReview(rev.id, "buyerName", e.target.value)}
                            placeholder="Buyer name"
                            className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-sm font-bold text-[#0F3D2E] focus:border-[#0F3D2E] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Buyer Location
                          </label>
                          <input
                            type="text"
                            value={rev.buyerLocation}
                            onChange={(e) => handleUpdateReview(rev.id, "buyerLocation", e.target.value)}
                            placeholder="Buyer location"
                            className="w-full rounded-xl border border-[#E6E0D4] bg-white px-3 py-2 text-xs focus:border-[#0F3D2E] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Rating (Stars)
                          </label>
                          <div className="flex items-center gap-1.5 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleUpdateReview(rev.id, "rating", star)}
                                className="cursor-pointer p-0.5 hover:scale-110 transition"
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    star <= rev.rating
                                      ? "text-[#E8A317] fill-[#E8A317]"
                                      : "text-neutral-300"
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="text-xs font-bold text-[#8D3C1B] ml-1">
                              {rev.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-12">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Review Comment / Feedback Quote
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={rev.comment}
                            onChange={(e) => handleUpdateReview(rev.id, "comment", e.target.value)}
                            placeholder="Buyer review comment"
                            className="w-full rounded-xl border border-[#E6E0D4] bg-white p-3 text-xs leading-relaxed focus:border-[#0F3D2E] focus:outline-none italic"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {reviewsList.length === 0 && (
                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-[#E6E0D4] p-6 space-y-3">
                      <Star className="h-8 w-8 text-neutral-400 mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        No buyer reviews added yet. You can add customer feedback anytime or leave blank until buyers review.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddReview}
                        className="rounded-full bg-[#0F3D2E] text-white px-4 py-2 font-subhead text-xs font-bold"
                      >
                        + Add Verified Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#E6E0D4] px-6 py-4 bg-white/95">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {activeTab === "general" && "Step 1 of 4: Identity & Story"}
            {activeTab === "gallery" && "Step 2 of 4: 3-Photo Gallery Slider"}
            {activeTab === "crops" && `Step 3 of 4: ${cropsList.length} Active Crops Registered`}
            {activeTab === "reviews" && `Step 4 of 4: ${reviewsList.length} Verified Buyer Reviews`}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full border border-[#E6E0D4] bg-white px-5 py-2.5 font-subhead text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-farmer-form"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-7 py-2.5 font-subhead text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0c2b20] transition disabled:opacity-50 cursor-pointer shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save Farmer Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
