"use client";

import React, { useMemo } from "react";
import { ProductCard } from "@/components/store/product-card";
import { ProductBadge } from "./product-badges-section";
import { inr } from "@/lib/format";
import { CheckCircle2, ShieldCheck, Tag, Sparkles, AlertCircle, FileText, Image as ImageIcon } from "lucide-react";

interface Variant {
  weight: string;
  price: string;
  packagedPhoto?: string;
  rawPhoto?: string;
}

interface ProductPreviewPublishProps {
  form: {
    name: string;
    category: string;
    description: string;
    hsnCode: string;
    gstApplicable: boolean;
    gstRate: number;
    variants: Variant[];
  };
  badges: ProductBadge[];
  farmer?: {
    full_name?: string | null;
    farm_name?: string | null;
    village?: string | null;
    state?: string | null;
    slug?: string | null;
  } | null;
  isEditing?: boolean;
}

export function ProductPreviewPublish({
  form,
  badges,
  farmer,
  isEditing = false,
}: ProductPreviewPublishProps) {
  const primaryVariant = form.variants[0] || { weight: "250g", price: "0" };
  const primaryImage =
    primaryVariant.packagedPhoto ||
    primaryVariant.rawPhoto ||
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80";

  const rawImages = [primaryVariant.packagedPhoto, primaryVariant.rawPhoto].filter(Boolean) as string[];

  // Convert form data into a Product object conforming to ProductCard requirements
  const isPreorder = Boolean((form as any).isPreorder);
  const previewProduct = useMemo(() => {
    return {
      id: "preview-product-id",
      name: form.name.trim() || "Sample Organic Produce",
      slug: "preview-product-slug",
      category: form.category || "dry-fruits",
      description: form.description || "Farm-fresh natural produce cultivated sustainably.",
      price: Number(primaryVariant.price) || 299,
      mrp: (Number(primaryVariant.price) || 299) * 1.15,
      weight: primaryVariant.weight || "250g",
      stock: isPreorder ? 0 : 100,
      is_preorder: isPreorder,
      preOrder: {
        enabled: isPreorder,
        status: "OPEN",
      },
      rating: 5.0,
      reviews: 1,
      image: primaryImage,
      images: rawImages.length > 0 ? rawImages : [primaryImage],
      badges: badges,
      farmerSlug: farmer?.slug || "farmer",
      farmerLocation: farmer?.village
        ? `${farmer.village}${farmer.state ? `, ${farmer.state}` : ""}`
        : farmer?.farm_name || "Direct from Farm",
      origin: farmer?.village || "Organic Farm",
      harvestDate: new Date().toISOString(),
      nutritionalHighlights: ["100% Natural", "Pesticide Free"],
    };
  }, [form, primaryVariant, primaryImage, rawImages, badges, farmer, isPreorder]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="border-b border-border/60 pb-3">
        <h4 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Step 6: Storefront Live Preview & Summary
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review your listing details and see how customers will view and interact with your product card on the live marketplace.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Summary Review Cards (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card 1: Basic Info & Tax Details */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> 1. Title & Classification
              </span>
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full capitalize">
                {form.category.replace("-", " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Product Title</span>
                <span className="font-semibold text-foreground">{form.name || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">HSN Code</span>
                <span className="font-mono font-medium text-foreground">{form.hsnCode || "Exempt / None"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">GST Rate</span>
                <span className="font-medium text-foreground">
                  {form.gstApplicable ? `${form.gstRate}% GST` : "0% (GST Exempt)"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Producer / Farm</span>
                <span className="font-medium text-foreground">
                  {farmer?.farm_name || farmer?.full_name || "Verified Farmer"}
                </span>
              </div>
            </div>

            {form.description && (
              <div className="pt-2 border-t border-border/40 text-xs">
                <span className="text-muted-foreground block text-[11px] mb-0.5">Description Excerpt</span>
                <p className="text-muted-foreground/90 line-clamp-2 italic">{form.description}</p>
              </div>
            )}
          </div>

          {/* Card 2: Variants & Pricing Matrix */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-[#8D5B28]" /> 2. Weight Variants & Pricing
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {form.variants.length} variant{form.variants.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-2">
              {form.variants.map((v, idx) => (
                <div
                  key={v.weight}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/40 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg overflow-hidden border border-border bg-background grid place-items-center shrink-0">
                      {v.packagedPhoto ? (
                        <img src={v.packagedPhoto} alt={v.weight} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-foreground block">{v.weight} Pack</span>
                      <span className="text-[10px] text-muted-foreground">
                        {v.packagedPhoto ? "Packaged photo attached" : "No photo attached"}
                        {v.rawPhoto ? " · Raw photo attached" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-sm text-foreground block">
                      {inr(Number(v.price) || 0)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">per pack</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Active Badges & Accreditations */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#2E7D32]" /> 3. Active Storefront Badges
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                {badges.length} active
              </span>
            </div>

            {badges.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">
                No badges selected. (You can go back to Step 5 to enable Lab Tested or promotional ribbons.)
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {badges.map((b, i) => {
                  const isLab = b.type === "lab_tested";
                  const isTrust = b.type === "trust";
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-2xs ${
                        isLab
                          ? "bg-[#1b3c29] text-white border border-[#1b3c29]"
                          : isTrust
                          ? "bg-amber-600 text-white border border-amber-600"
                          : "bg-emerald-700 text-white border border-emerald-700"
                      }`}
                    >
                      {isLab && "🧪"}
                      {isTrust && "🛡️"}
                      {!isLab && !isTrust && "🏷️"}
                      {b.label}
                      {b.reportUrl && " · 📄 COA Attached"}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Live Customer Storefront Card Preview (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-4 w-full max-w-[320px] space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="font-subhead text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Live Storefront View
              </span>
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                Customer View
              </span>
            </div>

            {/* Exact Storefront Product Card */}
            <div className="rounded-3xl border border-border/80 bg-white p-3.5 shadow-md transition hover:shadow-lg">
              <ProductCard product={previewProduct as any} />
            </div>

            <p className="text-[11px] text-muted-foreground text-center px-2 leading-tight">
              This is the exact interactive card customers will see in the catalog and search results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
