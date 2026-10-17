"use client";

import { createFileRoute, Link } from "@/lib/tanstack-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, Upload, Lock, AlertCircle, Sparkles, CheckCircle2, ShieldCheck, Tag, Eye } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useFarmerProfile, slugify } from "@/lib/farmer/use-farmer";
import { useVerificationStatus } from "@/lib/farmer/use-verification-status";
import { LockedSectionBanner } from "@/components/farmer/locked-section-banner";
import { compressImage, optimizeBase64Image } from "@/lib/image-compress";
import { fileToBase64 } from "@/lib/file-to-base64";
import { inr } from "@/lib/format";
import {
  ProductBadgesSection,
  type ProductBadge,
  type LabTestedState,
  type PromoBadgesState,
  compileProductBadges,
  parseExistingProductBadges,
  getTodayString,
} from "@/components/products/product-badges-section";
import { ProductPreviewPublish } from "@/components/products/product-preview-publish";

type Variant = {
  weight: string;
  price: string;
  packagedPhoto?: string;
  rawPhoto?: string;
};

type FormState = {
  name: string;
  category: string;
  description: string;
  hsnCode: string;
  gstApplicable: boolean;
  gstRate: number;
  variants: Variant[];
};

const empty: FormState = {
  name: "",
  category: "dry-fruits",
  description: "",
  hsnCode: "",
  gstApplicable: true,
  gstRate: 5,
  variants: [],
};

const WEIGHT_SIZES = ["100g", "250g", "500g", "1kg", "2kg", "5kg"];

function ProductsPage() {
  const { data: farmer } = useFarmerProfile();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState<{ weight: string; type: "packaged" | "raw" } | null>(null);
  const [step, setStep] = useState(1);

  // Badge States
  const [labTestedState, setLabTestedState] = useState<LabTestedState>({
    enabled: false,
    label: "100% Lab Tested",
    reportUrl: "",
    reportName: "",
    verifiedOn: getTodayString(),
  });

  const [trustBadgeState, setTrustBadgeState] = useState<string>("None");

  const [promoBadgesState, setPromoBadgesState] = useState<PromoBadgesState>({
    selectedPresets: [],
    discountBadge: "",
    customBadge: "",
    expiresOn: "",
  });

  // Synchronous badge preview for Step 6
  const livePreviewBadges = useMemo(() => {
    const list: ProductBadge[] = [];
    if (labTestedState.enabled) {
      list.push({
        type: "lab_tested",
        label: labTestedState.label,
        reportUrl: labTestedState.reportUrl,
        verifiedOn: labTestedState.verifiedOn || getTodayString(),
      });
    }
    if (trustBadgeState && trustBadgeState !== "None") {
      list.push({
        type: "trust",
        label: trustBadgeState,
      });
    }
    promoBadgesState.selectedPresets.forEach((p) => {
      list.push({
        type: "promo",
        label: p,
        expiresOn: promoBadgesState.expiresOn || null,
      });
    });
    if (promoBadgesState.discountBadge.trim()) {
      list.push({
        type: "promo",
        label: promoBadgesState.discountBadge.trim(),
        expiresOn: promoBadgesState.expiresOn || null,
      });
    }
    if (promoBadgesState.customBadge.trim()) {
      list.push({
        type: "promo",
        label: promoBadgesState.customBadge.trim(),
        expiresOn: promoBadgesState.expiresOn || null,
      });
    }
    return list;
  }, [labTestedState, trustBadgeState, promoBadgesState]);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    weight: string,
    type: "packaged" | "raw"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !farmer) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploadingImage({ weight, type });
    try {
      let finalUrl = "";
      try {
        const { uploadToNeon } = await import("@/lib/cloudinary-client");
        finalUrl = await uploadToNeon(file, "prajnaa/products");
      } catch (uploadErr) {
        console.warn("Neon upload fallback to compressed image:", uploadErr);
        const compressedFile = await compressImage(file, 400, 0.4);
        finalUrl = await fileToBase64(compressedFile);
      }

      setForm((prev) => {
        const variants = [...prev.variants];
        const vIdx = variants.findIndex((v) => v.weight === weight);
        if (vIdx >= 0) {
          if (type === "packaged") variants[vIdx].packagedPhoto = finalUrl;
          else variants[vIdx].rawPhoto = finalUrl;
        }
        return { ...prev, variants };
      });
      toast.success("Image uploaded to Neon successfully");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploadingImage(null);
    }

  };

  const toggleVariant = (weight: string) => {
    setForm((prev) => {
      const exists = prev.variants.some((v) => v.weight === weight);
      if (exists) {
        return { ...prev, variants: prev.variants.filter((v) => v.weight !== weight) };
      } else {
        return { ...prev, variants: [...prev.variants, { weight, price: "" }] };
      }
    });
  };

  const updateVariantPrice = (weight: string, price: string) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.weight === weight ? { ...v, price } : v)),
    }));
  };

  const { data: products = [], isLoading } = useQuery({
    enabled: !!farmer?.id,
    queryKey: ["farmer-products", farmer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_products")
        .select("*")
        .eq("farmer_id", farmer!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upsertMut = useMutation({
    mutationFn: async (input: FormState & { id?: string }) => {
      if (!farmer) throw new Error("No farmer profile");

      const primaryVariant = input.variants[0];
      const rawImages = primaryVariant
        ? ([primaryVariant.packagedPhoto, primaryVariant.rawPhoto].filter(Boolean) as string[])
        : [];
      const fallbackImages = await Promise.all(rawImages.map((img) => optimizeBase64Image(img)));

      // Validate inputs
      const hsnClean = (input.hsnCode || "").trim();
      const gstApp = !!input.gstApplicable;
      const gstR = gstApp ? Number(input.gstRate) : 0;

      if (typeof input.hsnCode !== "string") {
        throw new Error("HSN Code must be a string");
      }
      if (gstApp) {
        if (!hsnClean) {
          throw new Error("HSN Code is required when GST is applicable");
        }
        if (isNaN(gstR) || gstR < 0) {
          throw new Error("GST Rate must be a valid positive number when GST is applicable");
        }
      }

      // Compile active badges with zero approval gate
      const compiledBadges = await compileProductBadges(
        labTestedState,
        trustBadgeState,
        promoBadgesState
      );

      // Check completeness before allowing published products
      const isFarmComplete = !!(
        farmer.farm_name &&
        farmer.village &&
        farmer.state &&
        farmer.pincode &&
        farmer.farm_size_acres &&
        farmer.years_farming &&
        (farmer.crops?.length || 0) > 0
      );
      const isBankComplete = !!(
        farmer.bank_account_name &&
        farmer.bank_name &&
        farmer.bank_account_number &&
        farmer.bank_ifsc
      );
      const isKycComplete = !!(farmer.aadhaar_last4 && farmer.pan_number);
      const canPublish =
        farmer.status === "approved" && isFarmComplete && isBankComplete && isKycComplete;

      const payload = {
        ...(input.id ? { id: input.id } : {}),
        farmer_id: farmer.id,
        user_id: farmer.user_id,
        name: input.name.trim(),
        slug: slugify(input.name) + "-" + Math.random().toString(36).slice(2, 6),
        category: input.category,
        description: input.description || null,
        price: Number(primaryVariant?.price || 0),
        stock: 100,
        unit: primaryVariant?.weight || "kg",
        images: fallbackImages,
        badges: compiledBadges,
        status: canPublish ? "published" : "draft",
        hsn_code: hsnClean || null,
        gst_applicable: gstApp,
        gst_rate: gstR,
        updated_at: new Date().toISOString(),
      };

      if (input.id) {
        // Do not overwrite slug on update
        const { slug, ...updatePayload } = payload;
        const { error } = await supabase
          .from("farmer_products")
          .update(updatePayload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("farmer_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated successfully" : "Product listed & published live!");
      qc.invalidateQueries({ queryKey: ["farmer-products"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["farmer-listings-summary"] });
      setShowForm(false);
      setEditing(null);
      setForm(empty);
      setStep(1);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("farmer_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["farmer-products"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["farmer-listings-summary"] });
    },
  });

  const { isLocked, isVerified } = useVerificationStatus();
  const canSell = isVerified;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error("Product management is locked until Prajnaa Onboarding is verified.");
      return;
    }
    if (!form.name || form.name.length < 2) {
      toast.error("Valid product name is required");
      return;
    }
    if (form.gstApplicable) {
      if (!form.hsnCode || form.hsnCode.trim().length === 0) {
        toast.error("HSN Code is required");
        return;
      }
      if (form.gstRate < 0 || isNaN(Number(form.gstRate))) {
        toast.error("Valid positive GST rate is required");
        return;
      }
    }
    if (form.variants.length === 0) {
      toast.error("Please add at least one variant");
      return;
    }
    for (const v of form.variants) {
      if (!v.price || isNaN(Number(v.price))) {
        toast.error(`Valid price is required for ${v.weight} variant`);
        return;
      }
      if (!v.packagedPhoto) {
        toast.error(`Packaged Photo is required for ${v.weight} variant`);
        return;
      }
    }
    setErrors({});
    upsertMut.mutate({ ...form, id: editing ?? undefined });
  };

  const startEdit = (p: any) => {
    if (isLocked) {
      toast.error("Editing products is locked until verified.");
      return;
    }
    setEditing(p.id);
    const pImages = p.images ?? [];
    setStep(1);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description ?? "",
      hsnCode: p.hsn_code ?? "",
      gstApplicable: p.gst_applicable !== undefined ? p.gst_applicable : true,
      gstRate: p.gst_rate !== undefined ? p.gst_rate : 5,
      variants: [
        {
          weight: p.unit || "250g",
          price: String(p.price),
          packagedPhoto: pImages[0] || undefined,
          rawPhoto: pImages[1] || undefined,
        },
      ],
    });

    // Parse and load badges
    const { labTested, trustBadge, promoBadges } = parseExistingProductBadges(p.badges);
    setLabTestedState(labTested);
    setTrustBadgeState(trustBadge);
    setPromoBadgesState(promoBadges);

    setShowForm(true);
  };

  // Step validation before proceeding
  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!form.name.trim() || form.name.trim().length < 2) {
        toast.error("Please enter a valid product title (min 2 characters)");
        return;
      }
    }
    if (step === 2) {
      if (form.gstApplicable && (!form.hsnCode || form.hsnCode.trim().length === 0)) {
        toast.error("HSN Code is required when GST is applicable");
        return;
      }
    }
    if (step === 4) {
      if (form.variants.length === 0) {
        toast.error("Please select at least one weight variant");
        return;
      }
      for (const v of form.variants) {
        if (!v.price || isNaN(Number(v.price)) || Number(v.price) <= 0) {
          toast.error(`Please enter a valid positive price for ${v.weight}`);
          return;
        }
        if (!v.packagedPhoto) {
          toast.error(`Packaged photo is required for ${v.weight}`);
          return;
        }
      }
    }
    setStep((s) => Math.min(s + 1, 6));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Product Listings
          </h2>
          <p className="font-subhead text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your crop & produce catalog with trust accreditations and real-time storefront synchronization.
          </p>
        </div>

        <button
          onClick={() => {
            if (isLocked) {
              toast.error("Please complete Prajnaa Onboarding to unlock product listing.");
              return;
            }
            setShowForm(true);
            setStep(1);
            setEditing(null);
            setForm(empty);
            setLabTestedState({
              enabled: false,
              label: "100% Lab Tested",
              reportUrl: "",
              reportName: "",
              verifiedOn: getTodayString(),
            });
            setTrustBadgeState("None");
            setPromoBadgesState({
              selectedPresets: [],
              discountBadge: "",
              customBadge: "",
              expiresOn: "",
            });
          }}
          disabled={isLocked}
          className={`font-subhead inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold shadow-xs transition-all ${
            canSell
              ? "bg-[#0F3D2E] text-white hover:bg-[#16503e] active:scale-[0.98] cursor-pointer"
              : "bg-secondary text-muted-foreground border border-border cursor-not-allowed opacity-60"
          }`}
        >
          {canSell ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          <span>{canSell ? "Add New Listing" : "Add New Listing (Locked)"}</span>
        </button>
      </div>

      {isLocked && (
        <LockedSectionBanner
          sectionName="Products & Listings"
          description="Product creation, modification, and live catalog publishing are locked until your Prajnaa Onboarding is verified."
        />
      )}

      {/* 6-Step Wizard Form */}
      {showForm && (
        <form onSubmit={submit} className="rounded-3xl border border-border/80 bg-white p-6 md:p-8 shadow-sm space-y-6">
          {/* Progress Indicator (6 Steps) */}
          <div className="border-b border-border/60 pb-6 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[620px] px-2">
              {[
                { num: 1, label: "TITLE" },
                { num: 2, label: "CATEGORY" },
                { num: 3, label: "DESCRIPTION" },
                { num: 4, label: "VARIANTS & PHOTOS" },
                { num: 5, label: "BADGES & TRUST" },
                { num: 6, label: "PREVIEW & PUBLISH" },
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (step > s.num) setStep(s.num);
                    }}
                    className={`flex items-center gap-2 text-left ${step > s.num ? "cursor-pointer" : ""}`}
                  >
                    <div
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold shrink-0 transition-all ${
                        step === s.num
                          ? "bg-[#0F3D2E] text-white ring-4 ring-[#0F3D2E]/15"
                          : step > s.num
                          ? "bg-emerald-600 text-white"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                    </div>
                    <span
                      className={`font-subhead text-[10px] uppercase font-bold tracking-wider hidden md:block transition-colors ${
                        step === s.num
                          ? "text-foreground font-extrabold"
                          : step > s.num
                          ? "text-emerald-700"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                  {idx < 5 && <div className={`h-0.5 flex-1 mx-3 rounded-full ${step > s.num ? "bg-emerald-600" : "bg-border/70"}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-[260px] pt-1">
            {/* STEP 1: TITLE */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Step 1: Product Title
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter the public name of your farm produce. Use a clear, descriptive title.
                  </p>
                </div>
                <F
                  label="Product Name / Title *"
                  v={form.name}
                  on={(v) => setForm({ ...form, name: v })}
                  err={errors.name}
                  placeholder="e.g. Pure Mountain Raw Honey or Sun-Dried California Almonds"
                />
              </div>
            )}

            {/* STEP 2: CATEGORY & TAX */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Step 2: Category & Tax Classification
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select produce category and configure GST / HSN billing properties.
                  </p>
                </div>

                <Sel
                  label="Product Category *"
                  v={form.category}
                  on={(v) => {
                    const isExempt = v === "fresh-fruits" || v === "plants" || v === "salts";
                    setForm({
                      ...form,
                      category: v,
                      gstApplicable: !isExempt,
                      gstRate: isExempt ? 0 : 5,
                    });
                  }}
                  opts={[
                    { value: "dry-fruits", label: "Dry Fruits" },
                    { value: "nuts", label: "Nuts" },
                    { value: "seeds", label: "Seeds" },
                    { value: "spices", label: "Spices" },
                    { value: "herbs", label: "Herbs" },
                    { value: "plants", label: "Plants" },
                    { value: "pickles", label: "Pickles" },
                    { value: "salts", label: "Salts" },
                    { value: "masalas", label: "Masalas" },
                    { value: "fresh-fruits", label: "Fresh Fruits" },
                    { value: "honey", label: "Honey" },
                  ]}
                />

                <F
                  label="HSN Code *"
                  v={form.hsnCode}
                  on={(v) => setForm({ ...form, hsnCode: v })}
                  placeholder="e.g. 0808 (Apples), 0409 (Natural Honey), or 1211 (Medicinal Herbs)"
                />

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="gstApplicable"
                    checked={form.gstApplicable}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm({
                        ...form,
                        gstApplicable: checked,
                        gstRate: checked ? 5 : 0,
                      });
                    }}
                    className="h-4 w-4 rounded border-border text-[#0F3D2E] focus:ring-[#0F3D2E]"
                  />
                  <label
                    htmlFor="gstApplicable"
                    className="text-xs font-semibold text-foreground uppercase tracking-wider select-none cursor-pointer"
                  >
                    GST Applicable on this item
                  </label>
                </div>

                {form.gstApplicable && (
                  <F
                    label="GST Rate (%) *"
                    v={String(form.gstRate)}
                    type="number"
                    on={(v) => setForm({ ...form, gstRate: Number(v) || 0 })}
                    placeholder="e.g. 5"
                  />
                )}
              </div>
            )}

            {/* STEP 3: DESCRIPTION */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Step 3: Produce Description & Story
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Share cultivating methods, terroir, harvesting details, and nutritional value with customers.
                  </p>
                </div>
                <label className="block">
                  <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Description & Highlights
                  </span>
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe how this crop was cultivated, harvested, and packaged without synthetic pesticides..."
                    className="font-subhead mt-1.5 w-full rounded-2xl border border-border bg-background p-3.5 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>
            )}

            {/* STEP 4: VARIANTS & PHOTOS */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Step 4: Weight Variants & Product Photos
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select package sizes and upload high-resolution packaged and raw crop photos.
                  </p>
                </div>

                <div>
                  <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground block mb-2 font-bold">
                    SELECT WEIGHT PACKAGES
                  </span>
                  <div className="flex flex-wrap gap-2.5 p-4 bg-[#fbfbf9] border border-border/80 rounded-2xl">
                    {WEIGHT_SIZES.map((weight) => {
                      const isSelected = form.variants.some((v) => v.weight === weight);
                      return (
                        <button
                          key={weight}
                          type="button"
                          onClick={() => toggleVariant(weight)}
                          className={`font-subhead px-5 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-[#0F3D2E] text-white border-[#0F3D2E] shadow-2xs"
                              : "bg-white text-muted-foreground border-border hover:border-primary"
                          }`}
                        >
                          {weight}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {form.variants.map((v) => (
                    <div key={v.weight} className="border border-border/80 rounded-3xl p-5 bg-white shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-[#0F3D2E] bg-[#0F3D2E]/10 px-3 py-1 rounded-full">
                          {v.weight} Pack
                        </span>
                        <span className="text-[11px] text-muted-foreground">Variant</span>
                      </div>

                      <F
                        label="PRICE (INR) *"
                        v={v.price}
                        on={(val) => updateVariantPrice(v.weight, val)}
                        type="number"
                        placeholder="e.g. 250"
                      />

                      <div className="grid grid-cols-2 gap-4 pt-1">
                        {/* Packaged Photo */}
                        <div>
                          <span className="font-subhead text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 block">
                            PACKAGED PHOTO *
                          </span>
                          {v.packagedPhoto ? (
                            <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-border group">
                              <img src={v.packagedPhoto} className="object-cover h-full w-full" alt="Packaged" />
                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      variants: prev.variants.map((vi) =>
                                        vi.weight === v.weight ? { ...vi, packagedPhoto: undefined } : vi
                                      ),
                                    }))
                                  }
                                  className="rounded-full bg-destructive p-2 text-destructive-foreground hover:bg-destructive/90 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center h-28 w-full rounded-2xl border-2 border-dashed border-border hover:border-[#0F3D2E] cursor-pointer transition-colors bg-[#fbfbf9]">
                              {uploadingImage?.weight === v.weight && uploadingImage?.type === "packaged" ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                                  <span className="text-[10px] font-semibold text-muted-foreground">Upload Packaged</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, v.weight, "packaged")}
                                className="hidden"
                                disabled={uploadingImage !== null}
                              />
                            </label>
                          )}
                        </div>

                        {/* Raw Photo */}
                        <div>
                          <span className="font-subhead text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 block">
                            RAW / HARVEST PHOTO
                          </span>
                          {v.rawPhoto ? (
                            <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-border group">
                              <img src={v.rawPhoto} className="object-cover h-full w-full" alt="Raw" />
                              <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      variants: prev.variants.map((vi) =>
                                        vi.weight === v.weight ? { ...vi, rawPhoto: undefined } : vi
                                      ),
                                    }))
                                  }
                                  className="rounded-full bg-destructive p-2 text-destructive-foreground hover:bg-destructive/90 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center h-28 w-full rounded-2xl border-2 border-dashed border-border hover:border-[#0F3D2E] cursor-pointer transition-colors bg-[#fbfbf9]">
                              {uploadingImage?.weight === v.weight && uploadingImage?.type === "raw" ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                                  <span className="text-[10px] font-semibold text-muted-foreground">Upload Raw (Opt)</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, v.weight, "raw")}
                                className="hidden"
                                disabled={uploadingImage !== null}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: BADGES & TRUST (Feature Parity with Admin) */}
            {step === 5 && (
              <ProductBadgesSection
                labTestedState={labTestedState}
                setLabTestedState={setLabTestedState}
                trustBadgeState={trustBadgeState}
                setTrustBadgeState={setTrustBadgeState}
                promoBadgesState={promoBadgesState}
                setPromoBadgesState={setPromoBadgesState}
              />
            )}

            {/* STEP 6: PREVIEW & PUBLISH */}
            {step === 6 && (
              <ProductPreviewPublish
                form={form}
                badges={livePreviewBadges}
                farmer={farmer}
                isEditing={!!editing}
              />
            )}
          </div>

          {/* Navigation Controls */}
          <div className="mt-8 flex justify-between items-center border-t border-border/80 pt-6">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setStep(1);
              }}
              className="font-subhead rounded-full border border-border px-5 py-2.5 text-xs font-semibold hover:bg-secondary transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="font-subhead rounded-full border border-border px-5 py-2.5 text-xs font-semibold hover:bg-secondary transition cursor-pointer"
                >
                  ← Back
                </button>
              )}

              {step < 6 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="font-subhead inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#16503e] active:scale-[0.98] transition cursor-pointer"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={upsertMut.isPending}
                  className="font-subhead inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-7 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#16503e] active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
                >
                  {upsertMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
                  {editing ? "Save Changes" : "Publish Listing Live"}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Refined Products List Table */}
      <div className="rounded-3xl border border-border/80 bg-white overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#0F3D2E]" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="font-display text-base font-semibold text-foreground">
              No product listings yet
            </p>
            <p className="text-xs text-muted-foreground">
              Click "Add New Listing" above to publish your first farm produce to the Prajnaa marketplace.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border/70 bg-[#fbfbf9] font-subhead text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-6 py-4">Product</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Active Badges</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Stock</th>
                  <th className="px-4 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {products.map((p: any) => {
                  const pImages = p.images ?? [];
                  const pThumb = pImages[0] || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80";
                  const productBadges: ProductBadge[] = Array.isArray(p.badges) ? p.badges : [];

                  return (
                    <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                      {/* Product Thumbnail & Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="h-11 w-11 rounded-xl overflow-hidden bg-secondary/50 border border-border shrink-0">
                            <img src={pThumb} alt={p.name} className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <span className="font-display font-semibold text-foreground block text-sm">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Unit: {p.unit || "kg"} {p.hsn_code ? `· HSN ${p.hsn_code}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-4 text-xs font-medium text-muted-foreground capitalize">
                        {p.category ? p.category.replace("-", " ") : "—"}
                      </td>

                      {/* Badges Column */}
                      <td className="px-4 py-4">
                        {productBadges.length === 0 ? (
                          <span className="text-muted-foreground/60 text-xs">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {productBadges.map((b, i) => {
                              const isLab = b.type === "lab_tested";
                              const isTrust = b.type === "trust";
                              return (
                                <span
                                  key={i}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight shadow-2xs ${
                                    isLab
                                      ? "bg-[#1b3c29] text-white"
                                      : isTrust
                                      ? "bg-amber-600 text-white"
                                      : "bg-emerald-700 text-white"
                                  }`}
                                >
                                  {isLab && "🧪"}
                                  {isTrust && "🛡️"}
                                  {b.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            p.status === "published"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                              : "bg-amber-50 text-amber-800 border border-amber-200/60"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${p.status === "published" ? "bg-emerald-600" : "bg-amber-600"}`} />
                          {p.status || "draft"}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-4 text-right font-medium text-xs text-foreground">
                        {p.stock} {p.unit || "unit"}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-4 text-right">
                        <span className="font-display font-bold text-sm text-foreground">
                          {inr(Number(p.price))}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => startEdit(p)}
                            className="rounded-xl p-2 text-muted-foreground hover:bg-[#0F3D2E]/10 hover:text-[#0F3D2E] transition-colors cursor-pointer"
                            title="Edit Listing"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${p.name}"?`)) delMut.mutate(p.id);
                            }}
                            className="rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            title="Delete Listing"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function F({
  label,
  v,
  on,
  err,
  ...rest
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  err?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <input
        {...rest}
        value={v}
        onChange={(e) => on(e.target.value)}
        className={`font-subhead mt-1.5 h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none focus:border-primary ${
          err ? "border-destructive" : "border-border"
        }`}
      />
      {err && <span className="mt-1 block text-xs text-destructive">{err}</span>}
    </label>
  );
}

function Sel({
  label,
  v,
  on,
  opts,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  opts: (string | { value: string; label: string })[];
}) {
  return (
    <label className="block">
      <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <select
        value={v}
        onChange={(e) => on(e.target.value)}
        className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary capitalize"
      >
        {opts.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lbl = typeof o === "string" ? o : o.label;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default ProductsPage;
