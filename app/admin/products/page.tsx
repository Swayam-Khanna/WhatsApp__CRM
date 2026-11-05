"use client";

import { createFileRoute } from "@/lib/tanstack-compat";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  Camera,
  X,
  Sprout,
  Package,
  AlertTriangle,
  Ban,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";
import { compressImage, optimizeBase64Image } from "@/lib/image-compress";
import { fileToBase64 } from "@/lib/file-to-base64";
import { uploadToCloudinary } from "@/lib/cloudinary-client";
import { Switch } from "@/components/ui/switch";
import {
  getStoredCustomProducts,
  saveStoredCustomProduct,
  deleteStoredCustomProduct,
  subscribeToProductUpdates,
  resolveSafeProductImage,
} from "@/lib/services/productSyncService";
import { inventoryService, getAvailability } from "@/lib/services/inventoryService";
import { formatStock, toGrams, fromGrams } from "@/lib/weight-utils";

import {
  ProductBadgesSection,
  type ProductBadge,
  compileProductBadges,
  parseExistingProductBadges,
  getTodayString,
} from "@/components/products/product-badges-section";
import { AdminHarvestJourneyManager } from "@/components/admin/admin-harvest-journey-manager";
import { useSearchParams } from "next/navigation";

interface FormState {
  name: string;
  farmerId: string;
  category: string;
  description: string;
  hsnCode: string;
  gstApplicable: boolean;
  gstRate: number;
  isPreorder: boolean;
  openingStockKg: string;
  openingStockG: string;
  openingStock: string;
  lowStockThresholdKg: string;
  lowStockThreshold: string;
  stock?: string;
  restockCapacity?: string;
  badges: ProductBadge[];
  variants: Array<{
    weight: string;
    price: string;
    packagedPhoto?: string;
    rawPhoto?: string;
    openingStock?: string;
    lowStockThreshold?: string;
  }>;
}

const empty: FormState = {
  name: "",
  farmerId: "",
  category: "dry-fruits",
  description: "",
  hsnCode: "",
  gstApplicable: true,
  gstRate: 5,
  isPreorder: false,
  openingStockKg: "0",
  openingStockG: "0",
  openingStock: "0",
  lowStockThresholdKg: "1",
  lowStockThreshold: "1000",
  stock: "0",
  restockCapacity: "0",
  badges: [],
  variants: [{ weight: "250g", price: "", openingStock: "0", lowStockThreshold: "1000" }],
};

const WEIGHT_SIZES = ["100g", "250g", "500g", "1kg", "2kg", "5kg"];

// Slugify helper
const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");

function AdminProducts() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const stockParam = searchParams?.get("stock");

  const qc = useQueryClient();
  const [q, setQ] = useState(stockParam === "low" ? "stock:low" : "");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<
    "all" | "preorder" | "low_stock" | "out_of_stock"
  >("all");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const maxStep = form.isPreorder ? 5 : 4;
  const isLastStep = step >= maxStep;
  const isPublishDisabled = submitting || (!editing && !isLastStep);

  const handleNextStep = () => {
    if (step === 1) {
      if (!form.name || form.name.trim().length < 2) {
        toast.error("Please enter a valid product name (at least 2 characters)");
        return;
      }
    }
    if (step === 2) {
      if (!form.farmerId) {
        toast.error("Please select a farmer owner");
        return;
      }
      if (form.gstApplicable && (!form.hsnCode || form.hsnCode.trim().length === 0)) {
        toast.error("HSN Code is required when GST is applicable");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, maxStep));
  };
  const [uploadingImage, setUploadingImage] = useState<{
    weight: string;
    type: "packaged" | "raw";
  } | null>(null);
  const [selectedProductForJourney, setSelectedProductForJourney] = useState<any | null>(null);



  // Badge individual UI states
  const [labTestedState, setLabTestedState] = useState<{
    enabled: boolean;
    label: string;
    reportUrl: string;
    reportName?: string;
    verifiedOn: string;
  }>({
    enabled: false,
    label: "100% Lab Tested",
    reportUrl: "",
    reportName: "",
    verifiedOn: getTodayString(),
  });

  const [trustBadgeState, setTrustBadgeState] = useState<string>("None");

  const [promoBadgesState, setPromoBadgesState] = useState<{
    selectedPresets: string[];
    discountBadge: string;
    customBadge: string;
    expiresOn: string;
  }>({
    selectedPresets: [],
    discountBadge: "",
    customBadge: "",
    expiresOn: "",
  });

  // Query live inventory records as the Single Source of Truth
  const { data: inventoryRecords = [] } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: () => inventoryService.getAllInventory(),
    refetchInterval: 15000,
  });

  const inventoryMap = useMemo(() => {
    const map = new Map<string, any>();
    inventoryRecords.forEach((rec) => {
      map.set(rec.product_id, rec);
      if (rec.product_slug) map.set(rec.product_slug, rec);
    });
    return map;
  }, [inventoryRecords]);



  const startEdit = (product: any) => {
    setEditing(product);
    const existingBadges: ProductBadge[] = Array.isArray(product.badges) ? product.badges : [];
    const inv = inventoryMap.get(product.id) || inventoryMap.get(product.slug);

    // Parse badges using shared helper
    const { labTested, trustBadge, promoBadges } = parseExistingProductBadges(product.badges);
    setLabTestedState(labTested);
    setTrustBadgeState(trustBadge);
    setPromoBadgesState(promoBadges);

    const currentQty = inv ? inv.quantity : Number(product.stock ?? 0);
    const currentThreshold = inv ? inv.low_stock_threshold : 10;
    const currentPreorder = Boolean(inv ? inv.preorder_enabled : (product.is_preorder || product.preOrder?.enabled));

    setForm({
      name: product.name || "",
      farmerId: product.farmer_id || farmers[0]?.id || "",
      category: product.category || "dry-fruits",
      description: product.description || "",
      hsnCode: product.hsn_code || "",
      gstApplicable: product.gst_applicable ?? true,
      gstRate: product.gst_rate ?? 5,
      isPreorder: currentPreorder,
      openingStockKg: String(Math.floor(currentQty / 1000)),
      openingStockG: String(currentQty % 1000),
      lowStockThresholdKg: String(Math.round(currentThreshold / 1000) || 1),
      openingStock: String(currentQty),
      lowStockThreshold: String(currentThreshold),
      stock: String(currentQty),
      restockCapacity: String(
        product.restock_capacity || Math.max(100, currentQty)
      ),
      badges: existingBadges,
      variants: [
        {
          weight: product.unit || "250g",
          price: product.price ? String(product.price) : "",
          packagedPhoto: product.images?.[0] || undefined,
          rawPhoto: product.images?.[1] || undefined,
          openingStock: String(currentQty),
          lowStockThreshold: String(currentThreshold),
        },
      ],
    });
    setStep(1);
    setShowForm(true);
  };

  // Assemble badges array from state for payload
  const getCompiledBadges = async (): Promise<ProductBadge[]> => {
    return compileProductBadges(labTestedState, trustBadgeState, promoBadgesState);
  };

  // Fetch products from database
  const { data: dbProducts = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("farmer_products")
          .select("*, farmer:farmer_profiles(id, full_name, farm_name, slug)")
          .order("created_at", { ascending: false });
        if (error) return [];
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  // Local synced custom products for cross-tab and immediate persistence
  const [localProducts, setLocalProducts] = useState<any[]>([]);

  useEffect(() => {
    setLocalProducts(getStoredCustomProducts());
    const unsub = subscribeToProductUpdates(() => {
      setLocalProducts(getStoredCustomProducts());
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
    });
    return unsub;
  }, [qc]);

  // Combine local and database products, with newest/local taking precedence
  const products = useMemo(() => {
    const combined = [...localProducts, ...dbProducts];
    const seen = new Set<string>();
    return combined.filter((p) => {
      const key = p.id || p.slug;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localProducts, dbProducts]);

  // Fetch farmers list for assignment
  const { data: farmers = [] } = useQuery({
    queryKey: ["admin-farmers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select("id, full_name, farm_name, user_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch orders to compute quantity sold per product
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders-for-products"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("orders").select("id, status, items");
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  // Map of quantity sold per product
  const soldMap = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o: any) => {
      if (o.status === "cancelled") return;
      (o.items || []).forEach((item: any) => {
        const id = item.product_id || item.id;
        const slug = item.slug;
        const qty = Number(item.qty || item.quantity || 1);
        if (id) map.set(id, (map.get(id) || 0) + qty);
        if (slug) map.set(slug, (map.get(slug) || 0) + qty);
      });
    });
    return map;
  }, [orders]);

  // Inventory & catalog statistics for summary strip
  const stats = useMemo(() => {
    const total = products.length;
    let preOrders = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach((p: any) => {
      const inv = inventoryMap.get(p.id) || inventoryMap.get(p.slug);
      const avail = getAvailability(
        inv || {
          quantity: Number(p.stock ?? 0),
          low_stock_threshold: 10,
          preorder_enabled: Boolean(p.is_preorder || p.preOrder?.enabled),
        }
      );
      if (avail.status === "preorder") preOrders++;
      else if (avail.status === "low_stock") lowStock++;
      else if (avail.status === "out_of_stock") outOfStock++;
    });

    return { total, preOrders, lowStock, outOfStock };
  }, [products, inventoryMap]);

  // Derive stock, capacity, progress, and badge metadata via Single Source of Truth
  const getProductStockInfo = (p: any) => {
    const inv = inventoryMap.get(p.id) || inventoryMap.get(p.slug);
    const stockGrams =
      inv?.stock_grams !== undefined
        ? inv.stock_grams
        : p.stock_grams !== undefined
        ? p.stock_grams
        : Math.max(0, Math.round(Number(p.stock ?? 0) * 1000));
    const soldGrams =
      inv?.sold_count !== undefined
        ? inv.sold_count
        : (soldMap.get(p.id) || soldMap.get(p.slug) || (p.sold_count ?? 0)) * 1000;
    const thresholdGrams =
      inv?.low_stock_threshold_grams !== undefined
        ? inv.low_stock_threshold_grams
        : (p.low_stock_threshold_grams ?? 1000);
    const allowsPreorder = Boolean(inv ? inv.preorder_enabled : (p.is_preorder || p.preOrder?.enabled));
    const avail = getAvailability({
      stock_grams: stockGrams,
      low_stock_threshold_grams: thresholdGrams,
      preorder_enabled: allowsPreorder,
    });

    const isZeroStock = stockGrams === 0 && !allowsPreorder;

    return {
      statusLabel: avail.label,
      statusTone: avail.status,
      badgeClass: avail.badgeClass,
      dotClass: avail.dotClass,
      stockText: formatStock(stockGrams),
      soldText: soldGrams > 0 ? `${formatStock(soldGrams)} sold` : "0 sold",
      percent: stockGrams > 0 ? 100 : 0,
      isZeroStock,
      allowsPreorder,
      availableStock: formatStock(stockGrams),
      stockGrams,
      pledgedCount: inv?.pledged_count || 0,
      inventoryId: inv?.id,
    };
  };



  // Image Upload helper (uploads to Neon Storage, fallback to compressed dataUrl)
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    weight: string,
    type: "packaged" | "raw"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploadingImage({ weight, type });
    try {
      let finalUrl = "";
      try {
        finalUrl = await uploadToCloudinary(file, "prajnaa/products");
      } catch (uploadErr) {
        console.warn("Neon upload note, fallback to compressed image:", uploadErr);
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
        if (prev.variants.length === 1) {
          toast.error("At least one variant must be selected");
          return prev;
        }
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

  const setStatus = async (id: string, status: "published" | "draft" | "archived") => {
    const existing = products.find((p: any) => p.id === id);
    if (existing) {
      saveStoredCustomProduct({ ...existing, status });
    }
    try {
      await supabase.from("farmer_products").update({ status }).eq("id", id);
    } catch {}
    toast.success(`Product marked as ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["public-all-products"] });
    qc.invalidateQueries({ queryKey: ["farmer-products"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  // Visibility toggle for Shop Harvest storefront
  const toggleVisibility = async (product: any) => {
    const allowsPreorder = Boolean(product.is_preorder || product.preOrder?.enabled);
    const isOutOfStock = Number(product.stock ?? 0) === 0 && !allowsPreorder;
    if (isOutOfStock && product.status !== "published") {
      toast.error("Cannot make out-of-stock product visible without pre-orders enabled. Please replenish stock or enable pre-orders.");
      return;
    }

    const newStatus = product.status === "published" ? "draft" : "published";
    saveStoredCustomProduct({ ...product, status: newStatus });
    try {
      await supabase
        .from("farmer_products")
        .update({ status: newStatus })
        .eq("id", product.id);
    } catch {}

    toast.success(
      newStatus === "published"
        ? `"${product.name}" is now visible in Shop Harvest`
        : `"${product.name}" is now hidden from Shop Harvest`
    );
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["public-all-products"] });
    qc.invalidateQueries({ queryKey: ["farmer-products"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Permanently delete this listing?")) return;
    deleteStoredCustomProduct(id);
    try {
      await supabase.from("farmer_products").delete().eq("id", id);
    } catch {}
    toast.success("Listing deleted");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["public-all-products"] });
    qc.invalidateQueries({ queryKey: ["farmer-products"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };



  // Submit Handler
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && !isLastStep) {
      handleNextStep();
      return;
    }
    if (!form.name || form.name.length < 2) {
      toast.error("Valid product name is required");
      return;
    }
    if (!form.farmerId) {
      toast.error("Please select a farmer profile");
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

    setSubmitting(true);
    try {
      const selectedFarmer = farmers.find((f: any) => f.id === form.farmerId);
      const primaryVariant = form.variants[0];
      const rawImages = primaryVariant
        ? ([primaryVariant.packagedPhoto, primaryVariant.rawPhoto].filter(Boolean) as string[])
        : [];

      const fallbackImages = await Promise.all(rawImages.map((img) => optimizeBase64Image(img)));
      const safeImages =
        fallbackImages.length > 0
          ? fallbackImages
          : [resolveSafeProductImage(null, form.category)];

      const compiledBadges = await getCompiledBadges();
      const currentUserId = user?.id || selectedFarmer?.user_id || "admin";

      if (editing) {
        const primaryVariant = form.variants[0];
        const newStock = Math.max(
          0,
          Number(
            primaryVariant?.openingStock !== undefined && primaryVariant.openingStock !== ""
              ? primaryVariant.openingStock
              : form.stock !== undefined && form.stock !== ""
              ? form.stock
              : editing.stock ?? 0
          )
        );
        const newStockGrams = newStock * 1000;

        const updatePayload: any = {
          id: editing.id,
          farmer_id: form.farmerId,
          user_id: currentUserId,
          name: form.name.trim(),
          slug: editing.slug || slugify(form.name) + "-" + Math.random().toString(36).slice(2, 6),
          category: form.category,
          description: form.description || null,
          price: Number(primaryVariant?.price || 0),
          stock: newStock,
          stock_grams: newStockGrams,
          unit: primaryVariant?.weight || "250g",
          images: safeImages,
          hsn_code: form.hsnCode.trim() || null,
          gst_applicable: form.gstApplicable,
          gst_rate: form.gstApplicable ? Number(form.gstRate) : 0,
          is_preorder: form.isPreorder,
          badges: compiledBadges,
          status: editing.status || "published",
          farmer: selectedFarmer
            ? {
                id: selectedFarmer.id,
                full_name: selectedFarmer.full_name,
                farm_name: selectedFarmer.farm_name,
                slug: selectedFarmer.slug,
              }
            : undefined,
          farmer_profiles: selectedFarmer
            ? {
                slug: selectedFarmer.slug,
                full_name: selectedFarmer.full_name,
                village: selectedFarmer.village || "",
                state: selectedFarmer.state || "",
              }
            : undefined,
        };

        // Immediately update local store and broadcast
        saveStoredCustomProduct(updatePayload);

        try {
          await supabase
            .from("farmer_products")
            .update(updatePayload)
            .eq("id", editing.id);
        } catch (dbErr) {
          console.warn("[AdminProducts] Supabase/Firestore update warning (saved locally):", dbErr);
        }

        // Synchronize stock with authoritative inventoryService
        try {
          await inventoryService.manualCorrection({
            productId: editing.id,
            variantId: primaryVariant?.weight || "default",
            newQuantity: newStock,
            reason: "Admin product edit",
            userEmail: user?.email || "admin",
          });
        } catch (err) {
          console.warn("[AdminProducts] Error syncing inventory stock:", err);
        }

        // Synchronize pre-order policy with inventory
        if (form.isPreorder !== undefined) {
          try {
            await inventoryService.togglePreorder(
              editing.id,
              primaryVariant?.weight || "default",
              form.isPreorder,
              user?.email || "admin"
            );
          } catch {}
        }

        qc.invalidateQueries({ queryKey: ["admin-products"] });
        qc.invalidateQueries({ queryKey: ["admin-inventory"] });
        qc.invalidateQueries({ queryKey: ["public-all-products"] });
        qc.invalidateQueries({ queryKey: ["public-live-inventory"] });

        toast.success("Product metadata & stock updated successfully!");
      } else {
        const newId = "prod_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        const newSlug = slugify(form.name) + "-" + Math.random().toString(36).slice(2, 6);
        const openingGrams = toGrams(form.openingStockKg, form.openingStockG);
        const thresholdGrams = Math.max(1000, parseInt(form.lowStockThresholdKg || "1", 10) * 1000);
        const parsedOpeningStock = Math.floor(openingGrams / 1000);

        const primaryPrice = Number(primaryVariant?.price || 0);
        const primaryGrams = Math.max(1, parseInt(primaryVariant?.weight || "500", 10) || 500);
        const pricePerKg = primaryGrams > 0 ? (primaryPrice / primaryGrams) * 1000 : primaryPrice;

        const payload: any = {
          id: newId,
          farmer_id: form.farmerId,
          user_id: currentUserId,
          name: form.name.trim(),
          slug: newSlug,
          category: form.category,
          description: form.description || null,
          price: primaryPrice,
          price_per_kg: pricePerKg,
          stock: parsedOpeningStock,
          stock_grams: openingGrams,
          low_stock_threshold_grams: thresholdGrams,
          unit: primaryVariant?.weight || "250g",
          images: safeImages,
          status: "published",
          hsn_code: form.hsnCode.trim() || null,
          gst_applicable: form.gstApplicable,
          gst_rate: form.gstApplicable ? Number(form.gstRate) : 0,
          is_preorder: form.isPreorder,
          badges: compiledBadges,
          farmer: selectedFarmer
            ? {
                id: selectedFarmer.id,
                full_name: selectedFarmer.full_name,
                farm_name: selectedFarmer.farm_name,
                slug: selectedFarmer.slug,
              }
            : undefined,
          farmer_profiles: selectedFarmer
            ? {
                slug: selectedFarmer.slug,
                full_name: selectedFarmer.full_name,
                village: selectedFarmer.village || "",
                state: selectedFarmer.state || "",
              }
            : undefined,
          created_at: new Date().toISOString(),
        };

        // 1. Immediately persist product
        saveStoredCustomProduct(payload);

        try {
          await supabase.from("farmer_products").insert(payload);
        } catch (dbErr) {
          console.warn("[AdminProducts] Supabase/Firestore insert warning (saved locally):", dbErr);
        }

        // 2. Synchronize inventory records per variant in ONE coordinated flow
        try {
          for (const v of form.variants) {
            const vOpening =
              v.openingStock !== undefined && v.openingStock !== ""
                ? Math.max(0, Number(v.openingStock))
                : parsedOpeningStock;
            const vThresh =
              v.lowStockThreshold !== undefined && v.lowStockThreshold !== ""
                ? Math.max(0, Number(v.lowStockThreshold))
                : thresholdGrams;

            await inventoryService.createProductInventory({
              productId: newId,
              variantId: v.weight,
              variantName: v.weight,
              openingStock: vOpening,
              lowStockThreshold: vThresh,
              preorderEnabled: Boolean(form.isPreorder),
              userEmail: user?.email || "admin",
              productMeta: {
                name: payload.name,
                slug: payload.slug,
                image: safeImages[0],
                category: payload.category,
                farmerId: payload.farmer_id,
                farmerName: selectedFarmer?.full_name,
                price: Number(v.price || primaryVariant?.price || 0),
              },
            });
          }
        } catch (invErr) {
          console.warn("[AdminProducts] Error creating inventory records:", invErr);
        }

        toast.success("Product created with inventory and published!");
      }

      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
      qc.invalidateQueries({ queryKey: ["farmer-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });

      setShowForm(false);
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
      setStep(1);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
      qc.invalidateQueries({ queryKey: ["farmer-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter((p: any) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;

    const allowsPreorder = Boolean(p.is_preorder || p.preOrder?.enabled);
    const stock = Number(p.stock ?? 0);

    // Stat card filter
    if (stockFilter === "preorder" && !allowsPreorder) return false;
    if (stockFilter === "low_stock" && (stock === 0 || stock > 10)) return false;
    if (stockFilter === "out_of_stock" && (stock > 0 || allowsPreorder)) return false;

    if (!q.trim()) return true;
    if (q === "stock:low" || q === "low-stock") return stock <= 10 && stock > 0;
    if (q === "stock:out" || q === "out-of-stock") return stock === 0 && !allowsPreorder;

    const s = q.toLowerCase();
    const sku = (
      p.sku || `PRJ-${(p.slug || p.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6)}`
    ).toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.category.toLowerCase().includes(s) ||
      (p.farmer?.full_name && p.farmer.full_name.toLowerCase().includes(s)) ||
      (p.farmer?.farm_name && p.farmer.farm_name.toLowerCase().includes(s)) ||
      sku.includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header aligned on top-right */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="font-display text-3xl font-semibold">Products</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} listings across all farmers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                setStep(1);
                setEditing(null);
                setForm({
                  ...empty,
                  farmerId: farmers[0]?.id || "",
                });
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
              className="font-subhead inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" /> Add Product
            </button>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="font-subhead h-10 rounded-full border border-border bg-background px-4 text-xs outline-none focus:border-primary shadow-2xs"
          >
            <option value="all">All status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <label className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, SKU, farmer..."
              className="font-subhead h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary shadow-2xs"
            />
          </label>
        </div>
      </div>

      {/* SUMMARY STRIP: Total Listings, Pre-Orders, Low Stock, Out of Stock */}
      {!showForm && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
          {/* Total Listings */}
          <div
            onClick={() => setStockFilter("all")}
            className={`rounded-2xl border p-4.5 transition-all cursor-pointer select-none ${
              stockFilter === "all"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                : "border-border bg-background hover:border-primary/40 hover:shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Total Listings
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-secondary text-foreground">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {stats.total}
              </span>
              <span className="text-xs text-muted-foreground">all items</span>
            </div>
          </div>

          {/* Pre-Orders */}
          <div
            onClick={() => setStockFilter((prev) => (prev === "preorder" ? "all" : "preorder"))}
            className={`rounded-2xl border p-4.5 transition-all cursor-pointer select-none ${
              stockFilter === "preorder"
                ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs"
                : "border-border bg-background hover:border-amber-500/40 hover:shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
                Pre-Orders
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                <Sprout className="h-4 w-4 text-amber-700 dark:text-amber-300" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-2xl md:text-3xl font-bold text-amber-900 dark:text-amber-300">
                {stats.preOrders}
              </span>
              <span className="text-xs text-muted-foreground">harvest batches</span>
            </div>
          </div>

          {/* Low Stock */}
          <div
            onClick={() => setStockFilter((prev) => (prev === "low_stock" ? "all" : "low_stock"))}
            className={`rounded-2xl border p-4.5 transition-all cursor-pointer select-none ${
              stockFilter === "low_stock"
                ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-xs"
                : "border-border bg-background hover:border-amber-500/40 hover:shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
                Low Stock
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-2xl md:text-3xl font-bold text-amber-700 dark:text-amber-300">
                {stats.lowStock}
              </span>
              <span className="text-xs text-muted-foreground">≤ 1 kg</span>
            </div>
          </div>

          {/* Out of Stock */}
          <div
            onClick={() =>
              setStockFilter((prev) => (prev === "out_of_stock" ? "all" : "out_of_stock"))
            }
            className={`rounded-2xl border p-4.5 transition-all cursor-pointer select-none ${
              stockFilter === "out_of_stock"
                ? "border-rose-500 bg-rose-500/5 ring-2 ring-rose-500/20 shadow-xs"
                : "border-border bg-background hover:border-rose-500/40 hover:shadow-2xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-subhead text-[11px] font-bold uppercase tracking-[0.14em] text-rose-700 dark:text-rose-400">
                Out of Stock
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <Ban className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-2xl md:text-3xl font-bold text-rose-700 dark:text-rose-300">
                {stats.outOfStock}
              </span>
              <span className="text-xs text-muted-foreground">depleted</span>
            </div>
          </div>
        </div>
      )}

      {showForm ? (
        // Multi-Step Form UI matching the Farmer Portal structure
        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-background p-6 space-y-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-display text-xl font-bold text-foreground">
              {editing ? "Edit Product Listing" : "New Product Listing"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setForm(empty);
                setStep(1);
              }}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8 overflow-hidden px-2 md:px-6">
            {[
              { num: 1, label: "TITLE & PRE-ORDER" },
              { num: 2, label: "CATEGORY" },
              { num: 3, label: "DESCRIPTION" },
              { num: 4, label: "VARIANTS & PHOTOS" },
              ...(form.isPreorder ? [{ num: 5, label: "HARVEST JOURNEY" }] : []),
            ].map((s, idx, arr) => (
              <div
                key={s.num}
                onClick={() => setStep(s.num)}
                className="flex items-center flex-1 last:flex-none cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold shrink-0 ${
                      step === s.num
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1"
                        : step > s.num
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {s.num}
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider hidden sm:block ${
                      step === s.num
                        ? "text-primary"
                        : step > s.num
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="h-px bg-border flex-1 mx-3 hidden md:block"></div>
                )}
              </div>
            ))}
          </div>

          {/* Form Step Body */}
          <div className="min-h-[220px]">
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h4 className="font-display text-base font-semibold">
                    Step 1: Product Title &amp; Pre-Order Setting
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter the product name and declare if it is a pre-order harvest.
                  </p>
                </div>
                <F
                  label="Product Name / Title *"
                  v={form.name}
                  on={(v) => setForm({ ...form, name: v })}
                  placeholder="e.g. Premium Himalayan Honey"
                />

                {/* Scope Condition: is_preorder policy toggle */}
                <div className="flex items-center justify-between rounded-2xl border border-emerald-300/80 bg-emerald-50/60 p-4 shadow-2xs">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-emerald-950">
                        Pre-order when sold out
                      </span>
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[9px] font-bold text-emerald-800 uppercase">
                        Policy Toggle
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900/80 leading-relaxed">
                      If enabled, when shelf stock reaches 0 (or for upcoming seasonal harvests), customers can pre-order and reserve stock instead of seeing &ldquo;Sold Out&rdquo;. When disabled, the product automatically becomes Out of stock once stock reaches 0.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="isPreorderToggle"
                    checked={form.isPreorder}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        isPreorder: e.target.checked,
                      }));
                    }}
                    className="h-5 w-5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Stock Inventory Configuration: Read-only on edit, Opening stock on create */}
                {editing ? (
                  <div className="rounded-2xl border border-border/80 bg-secondary/30 p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                        Inventory &amp; Stock Status
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          getProductStockInfo(editing).badgeClass
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${getProductStockInfo(editing).dotClass}`} />
                        {getProductStockInfo(editing).statusLabel}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="font-display text-2xl font-bold text-foreground">
                          {getProductStockInfo(editing).availableStock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1.5">currently in stock</span>
                      </div>
                      <Link
                        href={`/admin/inventory?search=${encodeURIComponent(form.name || editing.name)}`}
                        className="font-subhead inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Manage stock in Inventory &rarr;
                      </Link>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Stock is measured in kg/g and controlled exclusively from the <strong>Inventory</strong> section as the single source of truth.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/80 bg-secondary/20 p-4 shadow-2xs space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                          Opening Stock (Optional &bull; Pre-filled with 0 kg)
                        </label>
                        <span className="font-mono text-xs font-bold text-[#0F3D2E] dark:text-emerald-400">
                          {formatStock(toGrams(form.openingStockKg, form.openingStockG))}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            kg (Kilograms)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.openingStockKg ?? "0"}
                            onChange={(e) => {
                              const val = e.target.value.replace(/^0+(?=\d)/, "");
                              setForm({ ...form, openingStockKg: val === "" ? "0" : val });
                            }}
                            className="font-mono h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-bold outline-none focus:border-primary"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                            g (Grams, 0-999)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="999"
                            step="1"
                            value={form.openingStockG ?? "0"}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value, 10);
                              setForm({
                                ...form,
                                openingStockG: isNaN(raw) || raw < 0 ? "0" : String(Math.min(999, raw)),
                              });
                            }}
                            className="font-mono h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-bold outline-none focus:border-primary"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Every new product starts at 0 kg until stock is added. Opening stock is optional and pre-filled with 0 kg.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Low Stock Alert At
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={form.lowStockThresholdKg ?? "1"}
                          onChange={(e) => setForm({ ...form, lowStockThresholdKg: e.target.value })}
                          className="font-mono h-10 w-24 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:border-primary"
                          placeholder="1"
                        />
                        <span className="text-xs font-semibold text-muted-foreground">kg (1000 g)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        When stock drops to or below this threshold, product alerts as &ldquo;Low stock&rdquo;.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h4 className="font-display text-base font-semibold">
                    Step 2: Category & Tax Details
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assign the owner farmer profile, category, and tax settings.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Farmer Owner *
                    </span>
                    <select
                      value={form.farmerId}
                      onChange={(e) => setForm({ ...form, farmerId: e.target.value })}
                      className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary"
                    >
                      <option value="" disabled>
                        Select Farmer Owner
                      </option>
                      {farmers.map((f: any) => (
                        <option key={f.id} value={f.id}>
                          {f.full_name} ({f.farm_name})
                        </option>
                      ))}
                    </select>
                  </label>

                  <Sel
                    label="Category *"
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <F
                    label="HSN Code *"
                    v={form.hsnCode}
                    on={(v) => setForm({ ...form, hsnCode: v })}
                    placeholder="e.g. 0808 or 1211"
                  />

                  <div className="flex flex-col justify-end pb-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="adminGstApplicable"
                        checked={form.gstApplicable}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm({
                            ...form,
                            gstApplicable: checked,
                            gstRate: checked ? 5 : 0,
                          });
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor="adminGstApplicable"
                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none cursor-pointer"
                      >
                        GST Applicable
                      </label>
                    </div>
                  </div>
                </div>

                {/* Product Badges Section */}
                <div className="pt-4 border-t border-border/60 space-y-4">
                  <div>
                    <h5 className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-bold">
                      PRODUCT BADGES
                    </h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add trust and promotional badges shown on the product card.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Badge Controls using shared component */}
                    <div className="lg:col-span-7">
                      <ProductBadgesSection
                        labTestedState={labTestedState}
                        setLabTestedState={setLabTestedState}
                        trustBadgeState={trustBadgeState}
                        setTrustBadgeState={setTrustBadgeState}
                        promoBadgesState={promoBadgesState}
                        setPromoBadgesState={setPromoBadgesState}
                        showHeading={false}
                      />
                    </div>

                    {/* Live Preview Card */}
                    <div className="lg:col-span-5 flex flex-col items-center">
                      <div className="sticky top-4 w-full max-w-[280px] bg-white border border-border rounded-2xl p-3 shadow-md space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span>Storefront Live Preview</span>
                          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold">
                            Preview
                          </span>
                        </div>

                        {/* Mock Image Box with Ribbon Badges Overlaid */}
                        <div className="relative aspect-square w-full rounded-xl bg-secondary/20 overflow-hidden border border-border flex items-center justify-center">
                          {form.variants[0]?.packagedPhoto || form.variants[0]?.rawPhoto ? (
                            <img
                              src={form.variants[0]?.packagedPhoto || form.variants[0]?.rawPhoto}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-4">
                              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-1 opacity-50" />
                              <span className="text-[11px] text-muted-foreground">
                                Product Thumbnail
                              </span>
                            </div>
                          )}

                          {/* Ribbon Overlays */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start max-w-[85%]">
                            {labTestedState.enabled && (
                              <span className="bg-[#1b3c29] text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider flex items-center gap-1">
                                🧪 {labTestedState.label}
                              </span>
                            )}
                            {trustBadgeState !== "None" && (
                              <span className="bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider flex items-center gap-1">
                                🛡️ {trustBadgeState}
                              </span>
                            )}
                            {promoBadgesState.selectedPresets.map((p) => (
                              <span
                                key={p}
                                className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider"
                              >
                                {p}
                              </span>
                            ))}
                            {promoBadgesState.discountBadge && (
                              <span className="bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider">
                                {promoBadgesState.discountBadge}
                              </span>
                            )}
                            {promoBadgesState.customBadge && (
                              <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wider">
                                {promoBadgesState.customBadge}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="font-display font-bold text-sm text-foreground truncate">
                            {form.name || "Sample Organic Product"}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium mt-0.5">
                            {inr(Number(form.variants[0]?.price) || 299)} /{" "}
                            {form.variants[0]?.weight || "250g"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h4 className="font-display text-base font-semibold">Step 3: Description</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Describe your organic product listings.
                  </p>
                </div>
                <label className="block">
                  <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Description
                  </span>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe product nutritional values or organic processes..."
                    className="font-subhead mt-1.5 w-full rounded-xl border border-border bg-background p-3.5 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h4 className="font-display text-base font-semibold">
                    Step 4: Variants & Photos
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select weight sizes and specify their prices and photos.
                  </p>
                </div>

                <div>
                  <div className="flex flex-wrap gap-2 p-4 bg-[#fbfbf9] border border-[#f0e6d2] rounded-2xl">
                    {WEIGHT_SIZES.map((weight) => {
                      const isSelected = form.variants.some((v) => v.weight === weight);
                      return (
                        <button
                          key={weight}
                          type="button"
                          onClick={() => toggleVariant(weight)}
                          className={`font-subhead px-5 py-2 rounded-full text-sm font-semibold transition-colors border ${
                            isSelected
                              ? "bg-[#1b3c29] text-white border-[#1b3c29]"
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
                    <div
                      key={v.weight}
                      className="border border-[#f0e6d2] rounded-2xl p-5 bg-white shadow-sm space-y-4"
                    >
                      <h5 className="font-display text-sm font-bold text-[#1b3c29] bg-[#1b3c29]/10 inline-block px-2.5 py-0.5 rounded">
                        {v.weight} Variant
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <F
                          label="PRICE (INR) *"
                          v={v.price}
                          on={(val) => updateVariantPrice(v.weight, val)}
                          type="number"
                          placeholder="e.g. 150"
                        />
                        {!editing && (
                          <F
                            label="OPENING STOCK"
                            v={v.openingStock ?? form.openingStock}
                            on={(val) =>
                              setForm((prev) => ({
                                ...prev,
                                variants: prev.variants.map((vi) =>
                                  vi.weight === v.weight ? { ...vi, openingStock: val } : vi
                                ),
                              }))
                            }
                            type="number"
                            placeholder="0"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        {/* Packaged Photo */}
                        <div>
                          <span className="font-subhead text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 block">
                            PACKAGED PHOTO *
                          </span>
                          {v.packagedPhoto ? (
                            <div className="relative h-24 w-full rounded-xl overflow-hidden border border-border group">
                              <img
                                src={v.packagedPhoto}
                                className="object-cover h-full w-full"
                                alt="Packaged"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      variants: prev.variants.map((vi) =>
                                        vi.weight === v.weight
                                          ? { ...vi, packagedPhoto: undefined }
                                          : vi
                                      ),
                                    }))
                                  }
                                  className="rounded-full bg-destructive p-1.5 text-white hover:bg-destructive/90 transition-transform hover:scale-105"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex h-24 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 hover:bg-secondary/20 cursor-pointer transition">
                              <Camera className="h-5 w-5 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, v.weight, "packaged")}
                              />
                            </label>
                          )}
                        </div>

                        {/* Raw Photo */}
                        <div>
                          <span className="font-subhead text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 block">
                            RAW PHOTO (OPTIONAL)
                          </span>
                          {v.rawPhoto ? (
                            <div className="relative h-24 w-full rounded-xl overflow-hidden border border-border group">
                              <img
                                src={v.rawPhoto}
                                className="object-cover h-full w-full"
                                alt="Raw"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      variants: prev.variants.map((vi) =>
                                        vi.weight === v.weight
                                          ? { ...vi, rawPhoto: undefined }
                                          : vi
                                      ),
                                    }))
                                  }
                                  className="rounded-full bg-destructive p-1.5 text-white hover:bg-destructive/90 transition-transform hover:scale-105"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex h-24 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 hover:bg-secondary/20 cursor-pointer transition">
                              <Camera className="h-5 w-5 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, v.weight, "raw")}
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

            {step === 5 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h4 className="font-display text-base font-semibold">
                    Step 5: Harvest Journey &amp; Live Timeline
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Attach dynamic, ordered production stages and field updates for pre-order
                    customers.
                  </p>
                </div>

                {editing ? (
                  <AdminHarvestJourneyManager
                    product={{
                      id: editing.id,
                      name: form.name,
                      is_preorder: form.isPreorder,
                      slug: editing.slug,
                    }}
                  />
                ) : form.isPreorder ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/10 p-8 text-center space-y-3">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
                      <Sprout className="h-6 w-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h5 className="font-display text-base font-bold">
                        Save product to configure Harvest Journey
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        Click &quot;Publish Listing&quot; below to create this pre-order product.
                        You will then be able to add live harvest stages and field updates.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-center space-y-2">
                    <p className="text-xs text-amber-900 font-semibold">
                      Enable pre-order for this product to add a harvest journey.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ ...form, isPreorder: true });
                        toast.success("Marked product as pre-order");
                      }}
                      className="text-xs text-primary font-bold underline cursor-pointer"
                    >
                      Enable Pre-Order Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Step Actions Navigation */}
          <div className="flex justify-between border-t border-border pt-4">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => setStep((s) => s - 1)}
              className="font-subhead h-10 rounded-full border border-border bg-background px-5 text-xs font-semibold hover:bg-secondary transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <div className="flex items-center gap-2">
              {step < maxStep && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="font-subhead h-10 rounded-full bg-secondary text-foreground px-6 text-xs font-semibold hover:bg-secondary/80 transition cursor-pointer"
                >
                  Next
                </button>
              )}
              <button
                type="submit"
                disabled={isPublishDisabled}
                title={
                  !editing && !isLastStep
                    ? `Please proceed to the final step (Step ${maxStep}) to publish this listing`
                    : undefined
                }
                className="font-subhead h-10 rounded-full bg-primary px-6 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                {editing ? "Save Changes" : "Publish Listing"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* UPGRADED PRODUCT TABLE */
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xs">
          {isLoading ? (
            <div className="grid place-items-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3 px-4">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="font-display text-base font-semibold text-foreground">
                  No products found
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {q || statusFilter !== "all" || stockFilter !== "all"
                    ? "No listings match your current filters. Click reset to view all catalog items."
                    : "You haven't created any products yet. Add your first organic product listing to get started."}
                </p>
              </div>
              {(q || statusFilter !== "all" || stockFilter !== "all") && (
                <button
                  onClick={() => {
                    setQ("");
                    setStatusFilter("all");
                    setStockFilter("all");
                  }}
                  className="font-subhead text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Reset all filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse min-w-[980px]">
                <thead className="bg-secondary/40 border-b border-border">
                  <tr className="font-subhead text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="px-5 py-3.5 font-bold">Product</th>
                    <th className="px-4 py-3.5 font-bold">Farmer</th>
                    <th className="px-4 py-3.5 font-bold">Category</th>
                    <th className="px-4 py-3.5 font-bold">Price</th>
                    <th className="px-4 py-3.5 font-bold">Stock &amp; Sold</th>
                    <th className="px-4 py-3.5 font-bold">Shop Visibility</th>
                    <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p: any) => {
                    const stockInfo = getProductStockInfo(p);
                    const formattedSku =
                      p.sku ||
                      `PRJ-${(p.slug || p.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-secondary/15 transition-colors group"
                      >
                        {/* PRODUCT INFO CELL */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {p.images?.[0] ? (
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                className="h-12 w-12 rounded-xl object-cover border border-border/80 bg-secondary/30 shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-secondary/60 border border-border/80 flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-muted-foreground/60" />
                              </div>
                            )}
                            <div className="min-w-0 max-w-[220px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p
                                  onClick={() => startEdit(p)}
                                  className="font-semibold text-foreground text-sm hover:text-primary transition-colors cursor-pointer truncate"
                                  title={p.name}
                                >
                                  {p.name}
                                </p>
                                {stockInfo.allowsPreorder && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-300 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                    <Sprout className="h-2.5 w-2.5 text-amber-700 dark:text-amber-300" />
                                    {Number(p.stock ?? 0) <= 0 ? "PRE-ORDER ACTIVE" : "PRE-ORDER READY"}
                                  </span>
                                )}
                              </div>
                              <p className="font-mono text-[11px] text-muted-foreground/80 mt-0.5 tracking-tight">
                                SKU: {formattedSku}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* FARMER CELL */}
                        <td className="px-4 py-3.5">
                          <div className="min-w-[120px]">
                            <p className="font-medium text-foreground text-xs truncate">
                              {p.farmer?.full_name ?? "Prajnaa Direct"}
                            </p>
                            {p.farmer?.farm_name && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {p.farmer.farm_name}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* CATEGORY CELL */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-secondary/70 border border-border/60 px-2.5 py-0.5 text-xs font-medium text-foreground/85 capitalize">
                            {p.category.replace(/-/g, " ")}
                          </span>
                        </td>

                        {/* PRICE CELL */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-display font-bold text-sm text-foreground">
                            {inr(Number(p.price))}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-medium">
                            / {p.unit || "250g"}
                          </div>
                        </td>

                        {/* DERIVED AVAILABILITY STATUS & INVENTORY LINK */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1.5 min-w-[170px] max-w-[220px]">
                            <div className="flex items-center justify-between gap-2">
                              {/* Derived Status Badge linking directly to Inventory */}
                              <Link
                                href={`/admin/inventory?search=${encodeURIComponent(p.name)}`}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide transition-all hover:scale-[1.02] hover:opacity-90 shadow-2xs group/inv ${stockInfo.badgeClass}`}
                                title="Click to manage stock in Inventory"
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${stockInfo.dotClass}`} />
                                {stockInfo.statusLabel}
                                <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover/inv:opacity-100" />
                              </Link>
                              <span className="font-subhead text-[11px] font-semibold text-muted-foreground">
                                {stockInfo.soldText}
                              </span>
                            </div>

                            {/* Inventory Quantity Text & Direct Link */}
                            <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground font-mono font-medium">
                              <span>
                                {stockInfo.availableStock} in stock
                                {stockInfo.pledgedCount > 0 ? ` (${stockInfo.pledgedCount} pledged)` : ""}
                              </span>
                              <Link
                                href={`/admin/inventory?search=${encodeURIComponent(p.name)}`}
                                className="text-[10px] text-primary hover:underline font-subhead font-semibold inline-flex items-center gap-0.5"
                              >
                                Manage &rarr;
                              </Link>
                            </div>

                            {stockInfo.allowsPreorder && (
                              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1">
                                <Sprout className="h-2.5 w-2.5 text-amber-700 dark:text-amber-300" />
                                {stockInfo.stockGrams > 0 ? "Pre-order on OOS" : "Pre-order Active"}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* VISIBILITY TOGGLE (STOREFRONT) */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col items-start gap-1 min-w-[130px]">
                            <div className="flex items-center gap-2.5">
                              <Switch
                                checked={p.status === "published"}
                                disabled={stockInfo.isZeroStock}
                                onCheckedChange={() => toggleVisibility(p)}
                                className="cursor-pointer data-[state=checked]:bg-[#1b3c29]"
                                aria-label={`Toggle storefront visibility for ${p.name}`}
                              />
                              <span
                                className={`text-xs font-semibold select-none ${
                                  p.status === "published"
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : stockInfo.isZeroStock
                                      ? "text-muted-foreground/60"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {p.status === "published" ? "Live in Store" : "Hidden"}
                              </span>
                            </div>
                            {stockInfo.isZeroStock ? (
                              <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                                Hidden — out of stock
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                {p.status === "published" ? "Visible to buyers" : "Catalog only"}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {stockInfo.allowsPreorder && (
                              <button
                                onClick={() => setSelectedProductForJourney(p)}
                                className="font-subhead rounded-full border border-emerald-600/30 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                title="Manage Live Harvest Journey Stages"
                              >
                                <Sprout className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                                Journey
                              </button>
                            )}
                            {stockInfo.isZeroStock && (
                              <Link
                                href="/admin/inventory"
                                className="font-subhead rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                title="Restock in Inventory"
                              >
                                <RefreshCw className="h-3 w-3 text-amber-700" />
                                Restock
                              </Link>
                            )}
                            <button
                              onClick={() => startEdit(p)}
                              className="font-subhead rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary cursor-pointer transition shadow-2xs"
                            >
                              Edit
                            </button>
                            {p.status !== "archived" ? (
                              <button
                                onClick={() => setStatus(p.id, "archived")}
                                className="font-subhead rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-secondary cursor-pointer transition shadow-2xs"
                                title="Archive product"
                              >
                                Archive
                              </button>
                            ) : (
                              <button
                                onClick={() => setStatus(p.id, "draft")}
                                className="font-subhead rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-secondary cursor-pointer transition shadow-2xs"
                                title="Unarchive to draft"
                              >
                                Unarchive
                              </button>
                            )}
                            <button
                              onClick={() => remove(p.id)}
                              className="font-subhead rounded-full border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 text-destructive px-2 py-1 text-[11px] font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer transition shadow-2xs"
                              title="Permanently delete"
                            >
                              <Trash2 className="h-3 w-3" />
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
      )}

      {/* HARVEST JOURNEY MODAL */}
      {selectedProductForJourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-5xl rounded-3xl border border-border bg-background p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Sprout className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Harvest Journey Manager
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedProductForJourney.name} ({selectedProductForJourney.slug})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForJourney(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <AdminHarvestJourneyManager
              product={{
                id: selectedProductForJourney.id,
                name: selectedProductForJourney.name,
                is_preorder: selectedProductForJourney.is_preorder,
                slug: selectedProductForJourney.slug,
              }}
              onClose={() => setSelectedProductForJourney(null)}
            />
          </div>
        </div>
      )}

    </div>
  );
}

// Input Helpers
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
  [key: string]: any;
}) {
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

export default AdminProducts;
