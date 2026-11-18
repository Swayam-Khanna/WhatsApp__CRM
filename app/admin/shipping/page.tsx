"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  Truck,
  Settings,
  Save,
  Loader2,
  Sliders,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Percent,
  PlusCircle,
  Activity,
  User,
} from "lucide-react";
import { INDIA_POST_SLABS, SPEED_POST_SLABS, DEFAULT_CONFIG } from "@/lib/shipping/seed-data";
import { formatWeight } from "@/lib/weight-utils";
import { inr } from "@/lib/format";
import { adminFetch } from "@/lib/api/admin-auth.client";

interface ShippingSlab {
  weight_upto_gm: number;
  local: number;
  within_state: number;
  zone_metro: number;
  other_states: number;
  packaging_cost?: number;
}

export default function AdminShippingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "config" | "india_post" | "speed_post" | "adjustments" | "calculator" | "change_log"
  >("config");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config settings
  const [config, setConfig] = useState<any>({
    ...DEFAULT_CONFIG,
    flat_surcharge_amount: 0,
  });

  // Shipping Tariff states
  const [indiaPostSlabs, setIndiaPostSlabs] = useState<ShippingSlab[]>([]);
  const [speedPostSlabs, setSpeedPostSlabs] = useState<ShippingSlab[]>([]);

  // Metadata timestamps
  const [metaIndiaPost, setMetaIndiaPost] = useState<any>(null);
  const [metaSpeedPost, setMetaSpeedPost] = useState<any>(null);

  // Staged changelogs comparison strings
  const [originalIndiaPost, setOriginalIndiaPost] = useState<string>("");
  const [originalSpeedPost, setOriginalSpeedPost] = useState<string>("");

  // Effective Dating Inputs
  const [effectiveFromIndia, setEffectiveFromIndia] = useState<string>("");
  const [effectiveFromSpeed, setEffectiveFromSpeed] = useState<string>("");

  // Rate change logs audit trail
  const [changeLogs, setChangeLogs] = useState<any[]>([]);

  // Calculator State
  const [calcWeight, setCalcWeight] = useState<number>(500);
  const [calcPincode, setCalcPincode] = useState<string>("248001");
  const [calcService, setCalcService] = useState<"india_post" | "speed_post">("india_post");
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState<any>(null);

  // Global Adjustments State
  const [adjustmentTarget, setAdjustmentTarget] = useState<"india_post" | "speed_post" | "packaging_india_post" | "packaging_speed_post">("india_post");
  const [adjustmentPercent, setAdjustmentPercent] = useState<number>(0);
  const [adjustmentPreview, setAdjustmentPreview] = useState<any[]>([]);

  // Modals / Slab Form States
  const [showAddSlab, setShowAddSlab] = useState(false);
  const [newSlabWeight, setNewSlabWeight] = useState<number>(0);
  const [newSlabLocal, setNewSlabLocal] = useState<number>(0);
  const [newSlabWithinState, setNewSlabWithinState] = useState<number>(0);
  const [newSlabZoneMetro, setNewSlabZoneMetro] = useState<number>(0);
  const [newSlabOtherStates, setNewSlabOtherStates] = useState<number>(0);
  const [newSlabPackagingCost, setNewSlabPackagingCost] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await adminFetch("/api/admin/shipping");
        if (res.ok) {
          const data = await res.json();
          if (data.config) setConfig((prev: any) => ({ ...prev, ...data.config }));
          if (data.indiaPost) {
            const loadedIndia = Array.isArray(data.indiaPost.rate_slabs)
              ? data.indiaPost.rate_slabs.map((s: any) => ({
                  ...s,
                  packaging_cost: typeof s.packaging_cost === "number" ? s.packaging_cost : 0,
                }))
              : INDIA_POST_SLABS.map((s) => ({ ...s, packaging_cost: 0 }));
            setIndiaPostSlabs(loadedIndia);
            setOriginalIndiaPost(JSON.stringify(loadedIndia));
            setMetaIndiaPost(data.indiaPost);
            if (data.indiaPost.effective_from) setEffectiveFromIndia(data.indiaPost.effective_from);
          }
          if (data.speedPost) {
            const loadedSpeed = Array.isArray(data.speedPost.rate_slabs)
              ? data.speedPost.rate_slabs.map((s: any) => ({
                  ...s,
                  packaging_cost: typeof s.packaging_cost === "number" ? s.packaging_cost : 0,
                }))
              : SPEED_POST_SLABS.map((s) => ({ ...s, packaging_cost: 0 }));
            setSpeedPostSlabs(loadedSpeed);
            setOriginalSpeedPost(JSON.stringify(loadedSpeed));
            setMetaSpeedPost(data.speedPost);
            if (data.speedPost.effective_from) setEffectiveFromSpeed(data.speedPost.effective_from);
          }
          if (Array.isArray(data.changeLogs)) {
            setChangeLogs(data.changeLogs);
          }
        }
      } catch (err) {
        console.error("Error loading shipping config:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  // Write log helper
  const logChange = async (target: string, description: string, prevVal: string, newVal: string) => {
    try {
      await adminFetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "log_change",
          target,
          description,
          previousValue: prevVal,
          newValue: newVal,
        }),
      });
    } catch (e) {
      console.warn("Failed to write to change log:", e);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_config", config }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to save settings");
      }
      await logChange(
        "app_config/checkout",
        `Updated shipping settings and flat surcharge: ₹${config.flat_surcharge_amount || 0}`,
        "N/A",
        JSON.stringify(config)
      );
      toast.success("Shipping configurations saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const validateShippingSlabs = (slabs: ShippingSlab[]): boolean => {
    for (let i = 0; i < slabs.length; i++) {
      const slab = slabs[i];
      if (slab.weight_upto_gm <= 0 || slab.local < 0 || slab.within_state < 0 || slab.zone_metro < 0 || slab.other_states < 0 || (slab.packaging_cost ?? 0) < 0) {
        toast.error("Tariff values and packaging costs must be positive integers.");
        return false;
      }
      if (i > 0 && slab.weight_upto_gm <= slabs[i - 1].weight_upto_gm) {
        toast.error(`Invalid slab sequence. Weight slab ${slab.weight_upto_gm}g is not strictly ascending.`);
        return false;
      }
    }
    return true;
  };

  const handleSaveSlabs = async (service: "india_post" | "speed_post") => {
    const slabs = service === "india_post" ? indiaPostSlabs : speedPostSlabs;
    if (!validateShippingSlabs(slabs)) return;

    setSaving(true);
    try {
      const effectiveDate = service === "india_post" ? effectiveFromIndia : effectiveFromSpeed;
      const res = await adminFetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_slabs",
          service,
          slabs,
          effective_from: effectiveDate,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to save tariff slabs");
      }
      const data = await res.json();

      const prevString = service === "india_post" ? originalIndiaPost : originalSpeedPost;
      await logChange(
        `shipping_rates/${service}`,
        `Updated ${service.replace("_", " ")} slabs and packaging costs. Effective: ${effectiveDate || "immediately"}`,
        prevString,
        JSON.stringify(slabs)
      );

      if (service === "india_post") {
        setOriginalIndiaPost(JSON.stringify(slabs));
        setMetaIndiaPost(data.payload);
      } else {
        setOriginalSpeedPost(JSON.stringify(slabs));
        setMetaSpeedPost(data.payload);
      }

      toast.success(`Updated ${service === "india_post" ? "Standard Shipping" : "Express Shipping"} tariff sheet!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save tariff slabs");
    } finally {
      setSaving(false);
    }
  };

  // Inline Cell Update Handler
  const handleSlabCellChange = (
    service: "india_post" | "speed_post",
    index: number,
    field: string,
    val: number
  ) => {
    const updater = service === "india_post" ? setIndiaPostSlabs : setSpeedPostSlabs;
    updater((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Add / Remove Slabs
  const handleAddShippingSlab = () => {
    if (newSlabWeight <= 0) {
      toast.error("Please enter a valid weight in grams.");
      return;
    }

    const newSlab: ShippingSlab = {
      weight_upto_gm: newSlabWeight,
      local: newSlabLocal,
      within_state: newSlabWithinState,
      zone_metro: newSlabZoneMetro,
      other_states: newSlabOtherStates,
      packaging_cost: newSlabPackagingCost,
    };

    const targetSlabs = activeTab === "india_post" ? indiaPostSlabs : speedPostSlabs;
    const updater = activeTab === "india_post" ? setIndiaPostSlabs : setSpeedPostSlabs;

    if (targetSlabs.some(s => s.weight_upto_gm === newSlabWeight)) {
      toast.error("Slab with this weight threshold already exists.");
      return;
    }

    updater((prev) => [...prev, newSlab].sort((a, b) => a.weight_upto_gm - b.weight_upto_gm));
    setShowAddSlab(false);
    toast.success("Slab row added to preview table. Click Save Tariffs to commit!");
  };

  const handleRemoveShippingSlab = (weight: number) => {
    if (!window.confirm(`Are you sure you want to remove the ${formatWeight(weight)} slab?`)) return;
    const updater = activeTab === "india_post" ? setIndiaPostSlabs : setSpeedPostSlabs;
    updater((prev) => prev.filter(s => s.weight_upto_gm !== weight));
    toast.success("Slab row removed. Click Save Tariffs to commit changes.");
  };

  // Global Adjustments calculations
  const handleCalculateAdjustmentPreview = () => {
    let sourceSlabs: any[] = [];
    const isPackaging = adjustmentTarget.startsWith("packaging_");
    
    if (adjustmentTarget === "india_post" || adjustmentTarget === "packaging_india_post") {
      sourceSlabs = indiaPostSlabs;
    } else {
      sourceSlabs = speedPostSlabs;
    }

    const multiplier = 1 + adjustmentPercent / 100;

    const preview = sourceSlabs.map((slab) => {
      if (isPackaging) {
        const oldCost = slab.packaging_cost || 0;
        return {
          weight_upto_gm: slab.weight_upto_gm,
          cost: Math.round(oldCost * multiplier),
          oldCost,
        };
      } else {
        return {
          weight_upto_gm: slab.weight_upto_gm,
          local: Math.round(slab.local * multiplier),
          within_state: Math.round(slab.within_state * multiplier),
          zone_metro: Math.round(slab.zone_metro * multiplier),
          other_states: Math.round(slab.other_states * multiplier),
          oldLocal: slab.local,
          oldWithinState: slab.within_state,
          oldZoneMetro: slab.zone_metro,
          oldOtherStates: slab.other_states,
        };
      }
    });

    setAdjustmentPreview(preview);
  };

  const handleApplyAdjustment = async () => {
    if (adjustmentPreview.length === 0) {
      toast.error("Please calculate a preview first.");
      return;
    }

    const isPackaging = adjustmentTarget.startsWith("packaging_");

    if (adjustmentTarget === "india_post") {
      const updated = adjustmentPreview.map(({ oldLocal, oldWithinState, oldZoneMetro, oldOtherStates, ...rest }) => rest);
      setIndiaPostSlabs(updated);
      toast.success("Staged adjustment to Standard Shipping tariffs. Click Save Tariffs to commit.");
    } else if (adjustmentTarget === "speed_post") {
      const updated = adjustmentPreview.map(({ oldLocal, oldWithinState, oldZoneMetro, oldOtherStates, ...rest }) => rest);
      setSpeedPostSlabs(updated);
      toast.success("Staged adjustment to Express Shipping tariffs. Click Save Tariffs to commit.");
    } else if (adjustmentTarget === "packaging_india_post") {
      setIndiaPostSlabs((prev) => prev.map(s => {
        const match = adjustmentPreview.find(p => p.weight_upto_gm === s.weight_upto_gm);
        return { ...s, packaging_cost: match ? match.cost : s.packaging_cost };
      }));
      toast.success("Staged adjustment to Standard Shipping Packaging. Click Save Tariffs to commit.");
    } else if (adjustmentTarget === "packaging_speed_post") {
      setSpeedPostSlabs((prev) => prev.map(s => {
        const match = adjustmentPreview.find(p => p.weight_upto_gm === s.weight_upto_gm);
        return { ...s, packaging_cost: match ? match.cost : s.packaging_cost };
      }));
      toast.success("Staged adjustment to Shipping Packaging. Click Save Tariffs to commit.");
    }

    setAdjustmentPreview([]);
    setAdjustmentPercent(0);
  };

  // Live Rate Test Calculator Call
  const handleRunTestCalculator = async () => {
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: [{ name: "Rate Test Product", qty: 1, weight_gm: calcWeight, price: 100 }],
          service: calcService,
          destinationPincode: calcPincode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate.");

      setCalcResult({
        zone: data.zone,
        roundedSlabGm: data.roundedSlabGm,
        baseShippingCost: data.shippingPostageCost || data.shippingCost,
        packagingCost: data.shippingPackagingCost || 0,
        flatSurcharge: config.flat_surcharge_amount || 0,
        grandTotal: data.shippingTotal || data.shippingCost,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed running calculator tool");
    } finally {
      setCalcLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Count slabs with ₹0 packaging costs
  const zeroPackIndiaCount = indiaPostSlabs.filter(s => !s.packaging_cost).length;
  const zeroPackSpeedCount = speedPostSlabs.filter(s => !s.packaging_cost).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Shipping & Packaging Center</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure live carrier tariffs, adjust packaging costs inline, and verify live storefront shipping rates.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: "config", label: "General Config" },
          { id: "india_post", label: "Shipping rates" },
          { id: "speed_post", label: "Express rates" },
          { id: "adjustments", label: "Global adjusts" },
          { id: "calculator", label: "Rate tester" },
          { id: "change_log", label: "Change Logs" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all shrink-0 ${
              activeTab === tab.id
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Warning banner if packaging costs are still ₹0 */}
      {(zeroPackIndiaCount > 0 || zeroPackSpeedCount > 0) && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-800 animate-fade-up">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">⚠️ Packaging costs are set to ₹0</p>
            <p className="mt-0.5 leading-relaxed">
              Some weight slabs have packaging costs set to ₹0. Please update these with your actual costs before going live.
            </p>
          </div>
        </div>
      )}

      {/* 1. CONFIG TAB */}
      {activeTab === "config" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={handleSaveConfig} className="lg:col-span-2 space-y-6 rounded-3xl border border-border bg-background p-6 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <Truck className="h-4 w-4 text-primary" /> Delivery Base Configuration
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Dispatch Origin Pincode *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={config.origin_pincode}
                    onChange={(e) => setConfig({ ...config, origin_pincode: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs font-mono outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Admin WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    value={config.admin_whatsapp_number}
                    onChange={(e) => setConfig({ ...config, admin_whatsapp_number: e.target.value })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs font-mono outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <Sliders className="h-4 w-4 text-primary" /> Gateway Fee Percentages
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Razorpay Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.razorpay_fee_percent}
                    onChange={(e) => setConfig({ ...config, razorpay_fee_percent: parseFloat(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Razorpay GST (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.razorpay_gst_percent}
                    onChange={(e) => setConfig({ ...config, razorpay_gst_percent: parseFloat(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Cashfree Fee (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.cashfree_fee_percent}
                    onChange={(e) => setConfig({ ...config, cashfree_fee_percent: parseFloat(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Cashfree GST (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.cashfree_gst_percent}
                    onChange={(e) => setConfig({ ...config, cashfree_gst_percent: parseFloat(e.target.value) })}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <PlusCircle className="h-4 w-4 text-primary" /> Festive Surcharge Adjustments
              </h3>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Flat Surcharge Amount (₹)
                </label>
                <input
                  type="number"
                  value={config.flat_surcharge_amount}
                  onChange={(e) => setConfig({ ...config, flat_surcharge_amount: parseInt(e.target.value) || 0 })}
                  className="h-10 w-full max-w-xs rounded-xl border border-border bg-background px-4 text-xs outline-none focus:border-primary font-mono"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Applied on top of calculated shipping cost at checkout time (combining postage + packaging cost).
                </p>
              </div>
            </div>

            <button
              disabled={saving}
              type="submit"
              className="rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration Settings
            </button>
          </form>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-background p-5 space-y-3.5 shadow-sm text-xs">
              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-primary" /> Active Carrier Meta
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Standard Shipping Slabs</span>
                  <span className="font-semibold">{indiaPostSlabs.length} Slabs</span>
                </div>
                <div className="flex justify-between border-b border-border pb-1.5">
                  <span className="text-muted-foreground">Express Shipping Slabs</span>
                  <span className="font-semibold">{speedPostSlabs.length} Slabs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flat Surcharge</span>
                  <span className="font-semibold text-primary">{inr(config.flat_surcharge_amount || 0)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 2. SHIPPING TARIFF TABLES (SHIPPING / EXPRESS SHIPPING) */}
      {(activeTab === "india_post" || activeTab === "speed_post") && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-secondary/30 p-4 rounded-2xl border border-border">
            <div>
              <span className="text-xs font-medium text-muted-foreground block">
                Editing: <strong className="text-foreground">{activeTab === "india_post" ? "Standard Shipping Parcel" : "Express Shipping Parcel"}</strong> weight slabs.
              </span>
              {activeTab === "india_post" && metaIndiaPost && metaIndiaPost.last_updated && (
                <span className="text-[10px] text-muted-foreground">
                  Last updated by {metaIndiaPost.updated_by} on {new Date(metaIndiaPost.last_updated).toLocaleDateString()} (w.e.f: {metaIndiaPost.effective_from || "immediately"})
                </span>
              )}
              {activeTab === "speed_post" && metaSpeedPost && metaSpeedPost.last_updated && (
                <span className="text-[10px] text-muted-foreground">
                  Last updated by {metaSpeedPost.updated_by} on {new Date(metaSpeedPost.last_updated).toLocaleDateString()} (w.e.f: {metaSpeedPost.effective_from || "immediately"})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-background border border-border rounded-xl px-3 py-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="date"
                  placeholder="Effective Date"
                  value={activeTab === "india_post" ? effectiveFromIndia : effectiveFromSpeed}
                  onChange={(e) => {
                    if (activeTab === "india_post") setEffectiveFromIndia(e.target.value);
                    else setEffectiveFromSpeed(e.target.value);
                  }}
                  className="bg-transparent border-none text-[11px] outline-none w-28 text-foreground"
                />
              </div>

              <button
                onClick={() => setShowAddSlab(true)}
                className="rounded-full border border-border bg-background px-4 py-2 text-[11px] font-semibold text-foreground hover:bg-secondary flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Weight Slab
              </button>

              <button
                disabled={saving}
                onClick={() => handleSaveSlabs(activeTab)}
                className="rounded-full bg-primary px-5 py-2 text-[11px] font-semibold text-primary-foreground hover:opacity-90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Tariffs
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-border bg-background shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase tracking-wider font-mono text-[9px]">
                <tr>
                  <th className="px-4 py-3">Weight Slab (g)</th>
                  <th className="px-4 py-3">Display Name</th>
                  <th className="px-4 py-3">Packaging Cost (₹)</th>
                  <th className="px-4 py-3">Local (₹)</th>
                  <th className="px-4 py-3">Within State (₹)</th>
                  <th className="px-4 py-3">Zone Metro (₹)</th>
                  <th className="px-4 py-3">Other States (₹)</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(activeTab === "india_post" ? indiaPostSlabs : speedPostSlabs).map((slab, idx) => (
                  <tr key={idx} className="hover:bg-secondary/10 font-mono">
                    <td className="px-4 py-2.5 font-bold text-foreground">
                      {slab.weight_upto_gm} g
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-sans">
                      {formatWeight(slab.weight_upto_gm)}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={slab.packaging_cost ?? 0}
                        onChange={(e) => handleSlabCellChange(activeTab, idx, "packaging_cost", parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-border bg-background px-2.5 py-1 text-xs outline-none focus:border-primary font-bold text-primary"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={slab.local}
                        onChange={(e) => handleSlabCellChange(activeTab, idx, "local", parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-border bg-background px-2.5 py-1 text-xs outline-none focus:border-primary"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={slab.within_state}
                        onChange={(e) => handleSlabCellChange(activeTab, idx, "within_state", parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-border bg-background px-2.5 py-1 text-xs outline-none focus:border-primary"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={slab.zone_metro}
                        onChange={(e) => handleSlabCellChange(activeTab, idx, "zone_metro", parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-border bg-background px-2.5 py-1 text-xs outline-none focus:border-primary"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        value={slab.other_states}
                        onChange={(e) => handleSlabCellChange(activeTab, idx, "other_states", parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-border bg-background px-2.5 py-1 text-xs outline-none focus:border-primary"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleRemoveShippingSlab(slab.weight_upto_gm)}
                        className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. GLOBAL ADJUSTMENTS TAB */}
      {activeTab === "adjustments" && (
        <div className="grid gap-6 lg:grid-cols-12 items-start animate-fade-up">
          <div className="lg:col-span-5 rounded-3xl border border-border bg-background p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
              <Percent className="h-4 w-4 text-primary" /> Percent Markup Tool
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Select Target Rate Table / Line
                </label>
                <select
                  value={adjustmentTarget}
                  onChange={(e: any) => {
                    setAdjustmentTarget(e.target.value);
                    setAdjustmentPreview([]);
                  }}
                  className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
                >
                  <option value="india_post">Standard Shipping Slabs (Postage Only)</option>
                  <option value="speed_post">Express Shipping Slabs (Postage Only)</option>
                  <option value="packaging_india_post">Standard Shipping Slabs (Packaging Only)</option>
                  <option value="packaging_speed_post">Express Shipping Slabs (Packaging Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Adjust Percentage (e.g. +10% or -5%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={adjustmentPercent}
                    onChange={(e) => setAdjustmentPercent(parseFloat(e.target.value) || 0)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary font-mono pr-8"
                  />
                  <span className="absolute right-4 top-2.5 text-muted-foreground font-bold">%</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Applied values will be rounded to the nearest whole rupee (₹1).
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCalculateAdjustmentPreview}
                  className="flex-grow rounded-full border border-border bg-background py-2 text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
                >
                  Calculate Preview
                </button>
                {adjustmentPreview.length > 0 && (
                  <button
                    onClick={handleApplyAdjustment}
                    className="flex-grow rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground hover:opacity-90 cursor-pointer"
                  >
                    Apply Adjustment
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Adjustment Value Previews</h3>
            {adjustmentPreview.length > 0 ? (
              <div className="overflow-x-auto rounded-3xl border border-border bg-background shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase tracking-wider font-mono text-[9px]">
                    {adjustmentTarget.startsWith("packaging_") ? (
                      <tr>
                        <th className="px-4 py-3">Weight Slab</th>
                        <th className="px-4 py-3">Old Packaging Cost (₹)</th>
                        <th className="px-4 py-3">New Packaging Cost (₹)</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3">Weight Slab</th>
                        <th className="px-4 py-3">Local</th>
                        <th className="px-4 py-3">Within State</th>
                        <th className="px-4 py-3">Metro</th>
                        <th className="px-4 py-3">Other States</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-border">
                    {adjustmentPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-secondary/15 font-mono">
                        <td className="px-4 py-2.5 font-semibold text-foreground">
                          {formatWeight(item.weight_upto_gm)}
                        </td>
                        {adjustmentTarget.startsWith("packaging_") ? (
                          <>
                            <td className="px-4 py-2.5 text-muted-foreground">₹{item.oldCost}</td>
                            <td className="px-4 py-2.5 text-primary font-bold">₹{item.cost}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5">
                              <span className="text-muted-foreground text-[10px] line-through mr-1">₹{item.oldLocal}</span>
                              <span className="text-foreground font-bold">₹{item.local}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-muted-foreground text-[10px] line-through mr-1">₹{item.oldWithinState}</span>
                              <span className="text-foreground font-bold">₹{item.within_state}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-muted-foreground text-[10px] line-through mr-1">₹{item.oldZoneMetro}</span>
                              <span className="text-foreground font-bold">₹{item.zone_metro}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-muted-foreground text-[10px] line-through mr-1">₹{item.oldOtherStates}</span>
                              <span className="text-foreground font-bold">₹{item.other_states}</span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
                Enter adjustment variables and click "Calculate Preview" to view updates.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. RATE TEST CALCULATOR TAB */}
      {activeTab === "calculator" && (
        <div className="grid gap-6 lg:grid-cols-12 items-start animate-fade-up">
          <div className="lg:col-span-5 rounded-3xl border border-border bg-background p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-2">
              <Sliders className="h-4 w-4 text-primary" /> Live Tariff Check
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Destination Pincode (6 digits)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={calcPincode}
                  onChange={(e) => setCalcPincode(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Product Weight (grams)
                </label>
                <input
                  type="number"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(parseInt(e.target.value) || 0)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Post Delivery Method
                </label>
                <select
                  value={calcService}
                  onChange={(e: any) => setCalcService(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
                >
                  <option value="india_post">Standard Shipping Parcel</option>
                  <option value="speed_post">Express Shipping Parcel</option>
                </select>
              </div>

              <button
                disabled={calcLoading}
                onClick={handleRunTestCalculator}
                className="w-full rounded-full bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {calcLoading ? "Calculating Quote..." : "Fetch Quote"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <h3 className="text-sm font-bold text-foreground mb-4">Calculated Quote Output</h3>
            {calcResult ? (
              <div className="rounded-3xl border border-border bg-background p-6 shadow-sm space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b border-border pb-2">
                    <span className="text-muted-foreground block mb-0.5">Matched Weight Slab:</span>
                    <span className="font-bold text-foreground font-mono">{formatWeight(calcResult.roundedSlabGm)} ({calcResult.roundedSlabGm}g)</span>
                  </div>
                  <div className="border-b border-border pb-2">
                    <span className="text-muted-foreground block mb-0.5">Resolved Area Zone:</span>
                    <span className="font-bold text-foreground uppercase tracking-wider">{calcResult.zone.replace("_", " ")}</span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-border pb-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Base Shipping Postage Cost:</span>
                    <span className="font-semibold text-foreground font-mono">{inr(calcResult.baseShippingCost)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Packaging Cost (Slab cost):</span>
                    <span className="font-semibold text-foreground font-mono">{inr(calcResult.packagingCost)}</span>
                  </div>
                  {calcResult.flatSurcharge > 0 && (
                    <div className="flex justify-between text-amber-700 font-medium">
                      <span>Festive Surcharge:</span>
                      <span className="font-mono">+{inr(calcResult.flatSurcharge)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-sm font-bold text-foreground">
                  <span>Combined Shipping Total (postage + packaging):</span>
                  <span className="text-lg text-primary font-mono">{inr(calcResult.grandTotal)}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground">
                Run check tool to view live quote audit calculation variables.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. CHANGE LOGS TAB */}
      {activeTab === "change_log" && (
        <div className="space-y-4 animate-fade-up">
          <h3 className="text-sm font-bold text-foreground">Rate Change Log Audit Trail</h3>
          <div className="rounded-3xl border border-border bg-background overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground border-b border-border uppercase tracking-wider font-mono text-[9px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Admin User</th>
                  <th className="px-4 py-3">Component Target</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {changeLogs.length > 0 ? (
                  changeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/10">
                      <td className="px-4 py-3 text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" /> {log.adminEmail}
                      </td>
                      <td className="px-4 py-3 text-primary font-mono font-semibold">
                        {log.table}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs md:max-w-md truncate">
                        {log.description}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      No administrative change logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD SHIPPING SLAB */}
      {showAddSlab && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-xl space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">Add New Weight Slab</h3>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                  Weight Limit Upto (Grams)
                </label>
                <input
                  type="number"
                  value={newSlabWeight}
                  onChange={(e) => setNewSlabWeight(parseInt(e.target.value) || 0)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary font-mono"
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                  Packaging Cost (₹)
                </label>
                <input
                  type="number"
                  value={newSlabPackagingCost}
                  onChange={(e) => setNewSlabPackagingCost(parseInt(e.target.value) || 0)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary font-mono"
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                    Local Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={newSlabLocal}
                    onChange={(e) => setNewSlabLocal(parseInt(e.target.value) || 0)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                    Within State (₹)
                  </label>
                  <input
                    type="number"
                    value={newSlabWithinState}
                    onChange={(e) => setNewSlabWithinState(parseInt(e.target.value) || 0)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                    Metro Zone (₹)
                  </label>
                  <input
                    type="number"
                    value={newSlabZoneMetro}
                    onChange={(e) => setNewSlabZoneMetro(parseInt(e.target.value) || 0)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">
                    Other States (₹)
                  </label>
                  <input
                    type="number"
                    value={newSlabOtherStates}
                    onChange={(e) => setNewSlabOtherStates(parseInt(e.target.value) || 0)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-semibold pt-2">
              <button
                onClick={() => setShowAddSlab(false)}
                className="rounded-full border border-border px-5 py-2 text-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddShippingSlab}
                className="rounded-full bg-primary px-5 py-2 text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                Add Row
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
