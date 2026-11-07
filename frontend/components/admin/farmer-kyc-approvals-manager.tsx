"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  X,
  Loader2,
  FileText,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Search,
  ChevronRight,
  User,
  Building,
  MapPin,
  Calendar,
  CreditCard,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  FileCheck2,
  FileQuestion,
  FileX,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type KycStatusTab = "pending" | "approved" | "rejected" | "draft" | "suspended";

interface FarmerKycApprovalsManagerProps {
  initialStatus?: KycStatusTab;
  onFarmerSelect?: (farmerId: string | null) => void;
}

export function FarmerKycApprovalsManager({
  initialStatus = "pending",
  onFarmerSelect,
}: FarmerKycApprovalsManagerProps) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<KycStatusTab>(initialStatus);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isApproveSuccessAnim, setIsApproveSuccessAnim] = useState(false);

  // Fetch count by status
  const { data: counts = {} } = useQuery<Record<string, number>>({
    queryKey: ["admin-farmer-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("farmer_profiles").select("status");
      if (error) throw error;
      const map: Record<string, number> = {
        pending: 0,
        approved: 0,
        rejected: 0,
        draft: 0,
        suspended: 0,
      };
      (data ?? []).forEach((r: any) => {
        const s = r.status || "draft";
        map[s] = (map[s] ?? 0) + 1;
      });
      return map;
    },
  });

  // Fetch farmers for current tab
  const { data: farmers = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["admin-farmers", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Client-side instant search
  const filteredFarmers = useMemo(() => {
    if (!searchQuery.trim()) return farmers;
    const q = searchQuery.toLowerCase().trim();
    return farmers.filter((f: any) => {
      const idMatch = f.id?.toLowerCase().includes(q);
      const nameMatch = f.full_name?.toLowerCase().includes(q);
      const farmMatch = f.farm_name?.toLowerCase().includes(q);
      const phoneMatch = f.phone?.toLowerCase().includes(q);
      const emailMatch = f.email?.toLowerCase().includes(q);
      const villageMatch = f.village?.toLowerCase().includes(q);
      const stateMatch = f.state?.toLowerCase().includes(q);
      return idMatch || nameMatch || farmMatch || phoneMatch || emailMatch || villageMatch || stateMatch;
    });
  }, [farmers, searchQuery]);

  // Selected farmer object
  const selectedFarmer = useMemo(() => {
    return farmers.find((f: any) => f.id === selectedId) || null;
  }, [farmers, selectedId]);

  const handleTabChange = (nextTab: KycStatusTab) => {
    setTab(nextTab);
    setSelectedId(null);
    if (onFarmerSelect) onFarmerSelect(null);
  };

  const handleSelectFarmer = (id: string) => {
    setSelectedId(id);
    if (onFarmerSelect) onFarmerSelect(id);
  };

  const handleFarmerUpdated = () => {
    qc.invalidateQueries({ queryKey: ["admin-farmers"] });
    qc.invalidateQueries({ queryKey: ["admin-farmer-counts"] });
    qc.invalidateQueries({ queryKey: ["admin-all-farmers-showcase"] });
    setSelectedId(null);
  };

  const TAB_CONFIG: {
    key: KycStatusTab;
    label: string;
    activeStyle: string;
    badgeActive: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      key: "pending",
      label: "Pending Review",
      activeStyle: "bg-amber-700 text-white border-amber-800 shadow-md ring-2 ring-amber-400/30",
      badgeActive: "bg-white/20 text-white",
      icon: Clock,
    },
    {
      key: "approved",
      label: "Approved & Active",
      activeStyle: "bg-[#1b3c29] text-white border-[#132a1d] shadow-md ring-2 ring-emerald-400/30",
      badgeActive: "bg-white/20 text-white",
      icon: ShieldCheck,
    },
    {
      key: "rejected",
      label: "Rejected",
      activeStyle: "bg-rose-700 text-white border-rose-800 shadow-md ring-2 ring-rose-400/30",
      badgeActive: "bg-white/20 text-white",
      icon: ShieldAlert,
    },
    {
      key: "draft",
      label: "Draft",
      activeStyle: "bg-slate-700 text-white border-slate-800 shadow-md ring-2 ring-slate-400/30",
      badgeActive: "bg-white/20 text-white",
      icon: User,
    },
    {
      key: "suspended",
      label: "Suspended",
      activeStyle: "bg-orange-800 text-white border-orange-900 shadow-md ring-2 ring-orange-400/30",
      badgeActive: "bg-white/20 text-white",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Status Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex flex-wrap gap-2">
          {TAB_CONFIG.map(({ key, label, activeStyle, badgeActive, icon: TabIcon }) => {
            const isActive = tab === key;
            const count = counts[key] ?? 0;
            return (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`font-subhead inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer border ${
                  isActive
                    ? activeStyle
                    : "border-border/80 bg-background text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                }`}
              >
                <TabIcon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                <span>{label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                    isActive ? badgeActive : "bg-secondary text-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="font-subhead inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 bg-background hover:bg-secondary transition"
          title="Refresh List"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* 2. Split View Layout */}
      <div className="grid gap-6 lg:grid-cols-12 min-h-[640px]">
        {/* Left Panel: Search & Scrollable Application List */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-border/80 bg-background/50 backdrop-blur-xs space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, farm, phone, ID..."
                className="font-subhead w-full rounded-2xl border border-border bg-background pl-10 pr-9 py-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>
                Showing <strong>{filteredFarmers.length}</strong> {tab} application
                {filteredFarmers.length === 1 ? "" : "s"}
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-primary hover:underline text-[11px] cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 overflow-y-auto max-h-[600px] divide-y divide-border/60">
            {isLoading ? (
              <div className="grid place-items-center py-24 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                <p className="font-subhead text-xs">Loading {tab} applications...</p>
              </div>
            ) : filteredFarmers.length === 0 ? (
              <div className="grid place-items-center py-20 px-6 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary/80 text-muted-foreground mb-3">
                  <FileQuestion className="h-6 w-6" />
                </div>
                <h4 className="font-display text-sm font-semibold text-foreground">
                  {searchQuery
                    ? `No matching ${tab} applications`
                    : `No ${tab} applications right now`}
                </h4>
                <p className="font-subhead text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  {searchQuery
                    ? `Try refining your search terms for "${searchQuery}".`
                    : `When farmers submit their onboarding profile in the "${tab}" state, they will show up here.`}
                </p>
              </div>
            ) : (
              filteredFarmers.map((f: any) => {
                const isSelected = selectedId === f.id;
                const initials = (f.full_name || "Farmer")
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const appliedDate = f.created_at
                  ? new Date(f.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Recently";

                return (
                  <button
                    key={f.id}
                    onClick={() => handleSelectFarmer(f.id)}
                    className={`w-full p-4.5 text-left transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                      isSelected
                        ? "bg-[#1b3c29]/10 border-l-4 border-l-[#1b3c29] shadow-xs"
                        : "hover:bg-secondary/40 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar / Initials */}
                      <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-xs font-bold transition-transform group-hover:scale-105 ${
                          isSelected
                            ? "bg-[#1b3c29] text-white shadow-xs"
                            : "bg-secondary text-foreground border border-border"
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-sm font-bold text-foreground truncate">
                            {f.full_name}
                          </p>
                        </div>
                        <p className="font-subhead text-xs text-muted-foreground truncate">
                          {f.farm_name || "Unnamed Farm"}
                        </p>
                        <p className="font-subhead text-[11px] text-muted-foreground/80 truncate">
                          {f.village ? `${f.village}, ` : ""}
                          {f.state || "Location Pending"} · Applied {appliedDate}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isSelected
                          ? "text-[#1b3c29] translate-x-1"
                          : "text-muted-foreground group-hover:translate-x-1 group-hover:text-foreground"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Application Detail Panel */}
        <div className="lg:col-span-7 flex flex-col">
          {selectedFarmer ? (
            <FarmerApplicationDetail
              farmer={selectedFarmer}
              onChange={handleFarmerUpdated}
            />
          ) : (
            <div className="grid h-full min-h-[480px] place-items-center rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
              <div className="space-y-3 max-w-sm">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-[#1b3c29]/10 text-[#1b3c29]">
                  <FileText className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Select a farmer to review their application
                </h3>
                <p className="font-subhead text-xs text-muted-foreground leading-relaxed">
                  Click on any farmer application from the list on the left to inspect their Farm details, KYC records, uploaded identity proofs, and perform verification actions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Farmer Application Detail Component
   ========================================================================= */

interface FarmerApplicationDetailProps {
  farmer: any;
  onChange: () => void;
}

function FarmerApplicationDetail({ farmer, onChange }: FarmerApplicationDetailProps) {
  const qc = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; label: string; type: string } | null>(null);
  const [isApprovedAnim, setIsApprovedAnim] = useState(false);

  // Fetch documents for this farmer
  const { data: docs = [], isLoading: docsLoading } = useQuery({
    queryKey: ["admin-farmer-docs", farmer.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_documents")
        .select("*")
        .eq("farmer_id", farmer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Approve Farmer
  const handleApprove = async () => {
    setIsSubmitting("approve");
    try {
      // 1. Try atomic RPC approval
      const { error: rpcError } = await supabase.rpc("approve_farmer_atomic", {
        p_farmer_id: farmer.id,
      });

      if (rpcError) {
        // Fallback direct table update
        const now = new Date().toISOString();
        const { error: profileErr } = await supabase
          .from("farmer_profiles")
          .update({
            status: "approved",
            approved_at: now,
            rejection_reason: null,
            updated_at: now,
          })
          .eq("id", farmer.id);
        if (profileErr) throw profileErr;

        // Mark docs verified
        await supabase
          .from("farmer_documents")
          .update({
            status: "verified",
            verified_at: now,
            updated_at: now,
          })
          .eq("farmer_id", farmer.id);
      }

      setIsApprovedAnim(true);
      toast.success(`Farmer ${farmer.full_name} approved and verified successfully!`);

      setTimeout(() => {
        setIsApprovedAnim(false);
        onChange();
      }, 900);
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve farmer");
    } finally {
      setIsSubmitting(null);
    }
  };

  // Reject Farmer
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error("Please enter a specific rejection reason for the farmer.");
      return;
    }

    setIsSubmitting("reject");
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("farmer_profiles")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason.trim(),
          updated_at: now,
        })
        .eq("id", farmer.id);

      if (error) throw error;

      toast.success(`Application rejected with note provided.`);
      setIsRejecting(false);
      setRejectionReason("");
      onChange();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject application");
    } finally {
      setIsSubmitting(null);
    }
  };

  const statusConfig: Record<
    string,
    { label: string; bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    pending: {
      label: "Pending Review",
      bg: "bg-amber-500/15",
      border: "border-amber-500/30",
      text: "text-amber-700 dark:text-amber-400",
      icon: Clock,
    },
    approved: {
      label: "Approved & Verified",
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: ShieldCheck,
    },
    rejected: {
      label: "Application Rejected",
      bg: "bg-rose-500/15",
      border: "border-rose-500/30",
      text: "text-rose-700 dark:text-rose-400",
      icon: ShieldAlert,
    },
    draft: {
      label: "Draft Onboarding",
      bg: "bg-slate-500/15",
      border: "border-slate-500/30",
      text: "text-slate-700 dark:text-slate-400",
      icon: User,
    },
    suspended: {
      label: "Suspended Account",
      bg: "bg-orange-500/15",
      border: "border-orange-500/30",
      text: "text-orange-700 dark:text-orange-400",
      icon: AlertTriangle,
    },
  };

  const currentStatus = statusConfig[farmer.status] || statusConfig.draft;
  const StatusIcon = currentStatus.icon;

  const appliedDateFormatted = farmer.created_at
    ? new Date(farmer.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const approvedDateFormatted = farmer.approved_at
    ? new Date(farmer.approved_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  // Map known document slots
  const findDoc = (type: string) => docs.find((d: any) => d.doc_type === type);
  const aadhaarFrontDoc = findDoc("aadhaar_front") || findDoc("aadhaar");
  const aadhaarBackDoc = findDoc("aadhaar_back");
  const panDoc = findDoc("pan_card") || findDoc("pan");
  const passbookDoc = findDoc("bank_passbook") || findDoc("cheque") || findDoc("bank_proof");

  return (
    <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden flex flex-col divide-y divide-border/80">
      {/* 1. Header Banner */}
      <div className="p-6 bg-background/50 backdrop-blur-xs flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#1b3c29] text-white font-display text-lg font-bold shadow-xs">
            {(farmer.full_name || "F")
              .split(" ")
              .map((n: string) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-bold text-foreground">
                {farmer.full_name}
              </h3>
              <span
                className={`font-subhead inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.text}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {currentStatus.label}
              </span>
            </div>
            <p className="font-subhead text-xs text-muted-foreground mt-0.5">
              {farmer.farm_name || "Unnamed Farm"} · ID:{" "}
              <code className="text-[11px] bg-secondary px-1.5 py-0.5 rounded font-mono">
                {farmer.id?.slice(0, 8)}
              </code>
            </p>
          </div>
        </div>

        {farmer.slug && farmer.status === "approved" && (
          <a
            href={`/farmer/${farmer.slug}`}
            target="_blank"
            rel="noreferrer"
            className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition shadow-2xs"
          >
            Public Storefront <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        )}
      </div>

      {/* 2. Status Callouts */}
      {farmer.status === "rejected" && (
        <div className="p-5 bg-rose-500/10 border-l-4 border-l-rose-600 flex items-start gap-3.5 text-rose-900 dark:text-rose-200 text-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="font-bold text-sm">Rejection Reason Provided to Farmer</p>
            <p className="leading-relaxed bg-background/60 p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 text-foreground font-mono">
              "{farmer.rejection_reason || "Application did not meet our verification criteria."}"
            </p>
            <p className="text-muted-foreground text-[11px]">
              The farmer has been notified and can update their onboarding details to resubmit for review.
            </p>
          </div>
        </div>
      )}

      {farmer.status === "approved" && (
        <div className="p-5 bg-emerald-500/10 border-l-4 border-l-emerald-600 flex items-start gap-3.5 text-emerald-900 dark:text-emerald-200 text-xs">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm">
              Verified & Active Store
              {approvedDateFormatted && ` · Approved on ${approvedDateFormatted}`}
            </p>
            <p className="opacity-90 leading-relaxed">
              This farmer has completed all Prajnaa verification checks. Product catalog creation, inventory management, customer order fulfillment, and automated payouts are fully unlocked.
            </p>
          </div>
        </div>
      )}

      {/* 3. Farm Details Block */}
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <Building className="h-4 w-4 text-[#1b3c29]" />
          <h4>Farm & Agricultural Details</h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs bg-background/40 p-4 rounded-2xl border border-border/70">
          <DetailItem label="Location">
            {farmer.village ? `${farmer.village}, ` : ""}
            {farmer.district ? `${farmer.district}, ` : ""}
            {farmer.state || "—"}
          </DetailItem>
          <DetailItem label="Pincode">{farmer.pincode || "—"}</DetailItem>
          <DetailItem label="Farm Size">
            {farmer.farm_size_acres ? `${farmer.farm_size_acres} Acres` : "—"}
          </DetailItem>
          <DetailItem label="Farming Experience">
            {farmer.years_farming ? `${farmer.years_farming} Years` : "—"}
          </DetailItem>
          <DetailItem label="Farming Method">
            <span className="font-medium capitalize">{farmer.farming_method || "Organic / Traditional"}</span>
          </DetailItem>
          <DetailItem label="Application Date">{appliedDateFormatted}</DetailItem>
          <div className="sm:col-span-2 lg:col-span-3">
            <DetailItem label="Primary Crops">
              {farmer.crops && farmer.crops.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {farmer.crops.map((c: string, i: number) => (
                    <span
                      key={i}
                      className="font-subhead rounded-full bg-[#1b3c29]/10 text-[#1b3c29] border border-[#1b3c29]/20 px-2.5 py-0.5 text-[11px] font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </DetailItem>
          </div>
        </div>

        {farmer.story && (
          <div className="bg-background/40 p-4 rounded-2xl border border-border/70 text-xs space-y-1">
            <p className="font-subhead text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Farm Story & Mission
            </p>
            {farmer.headline && (
              <p className="font-display font-bold text-foreground text-sm">
                "{farmer.headline}"
              </p>
            )}
            <p className="text-muted-foreground leading-relaxed italic">{farmer.story}</p>
          </div>
        )}
      </div>

      {/* 4. Identity & KYC Block */}
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <CreditCard className="h-4 w-4 text-[#1b3c29]" />
          <h4>Identity, KYC & Settlement Bank Account</h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs bg-background/40 p-4 rounded-2xl border border-border/70">
          <DetailItem label="Aadhaar Number">
            {farmer.aadhaar_number
              ? farmer.aadhaar_number
              : farmer.aadhaar_last4
              ? `XXXX-XXXX-${farmer.aadhaar_last4}`
              : "—"}
          </DetailItem>
          <DetailItem label="PAN Card Number">
            <span className="font-mono uppercase font-bold text-foreground">
              {farmer.pan_number || "—"}
            </span>
          </DetailItem>
          <DetailItem label="Bank Account">
            {farmer.bank_account_number
              ? `•••• ${farmer.bank_account_number.slice(-4)}`
              : "—"}
          </DetailItem>
          <DetailItem label="Bank Name & IFSC">
            {farmer.bank_name || "Bank"} ·{" "}
            <span className="font-mono font-bold text-foreground">{farmer.bank_ifsc || "—"}</span>
          </DetailItem>
          <DetailItem label="Account Holder Name">{farmer.bank_account_name || "—"}</DetailItem>
          <DetailItem label="UPI ID / VPA">{farmer.upi_id || "—"}</DetailItem>
          <DetailItem label="Phone Number">{farmer.phone || "—"}</DetailItem>
          <DetailItem label="Email Address">{farmer.email || "—"}</DetailItem>
        </div>
      </div>

      {/* 5. Uploaded Documents Grid */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <FileCheck2 className="h-4 w-4 text-[#1b3c29]" />
            <h4>Uploaded Document Proofs ({docs.length})</h4>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Click thumbnail to view full resolution
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DocumentThumbnailCard
            title="Aadhaar Front"
            doc={aadhaarFrontDoc}
            onPreview={() =>
              aadhaarFrontDoc?.file_url &&
              setPreviewDoc({
                url: aadhaarFrontDoc.file_url,
                label: "Aadhaar Card (Front)",
                type: "aadhaar_front",
              })
            }
          />
          <DocumentThumbnailCard
            title="Aadhaar Back"
            doc={aadhaarBackDoc}
            onPreview={() =>
              aadhaarBackDoc?.file_url &&
              setPreviewDoc({
                url: aadhaarBackDoc.file_url,
                label: "Aadhaar Card (Back)",
                type: "aadhaar_back",
              })
            }
          />
          <DocumentThumbnailCard
            title="PAN Card"
            doc={panDoc}
            onPreview={() =>
              panDoc?.file_url &&
              setPreviewDoc({
                url: panDoc.file_url,
                label: "PAN Card",
                type: "pan_card",
              })
            }
          />
          <DocumentThumbnailCard
            title="Bank Passbook / Cheque"
            doc={passbookDoc}
            onPreview={() =>
              passbookDoc?.file_url &&
              setPreviewDoc({
                url: passbookDoc.file_url,
                label: "Bank Account Proof",
                type: "bank_passbook",
              })
            }
          />
        </div>
      </div>

      {/* 6. Approve / Reject Action Footer */}
      <div className="p-6 bg-background/80 backdrop-blur-xs space-y-4">
        {/* If pending, prominent action buttons */}
        {farmer.status === "pending" && !isRejecting && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-display text-sm font-bold text-foreground">
                Review Application
              </p>
              <p className="font-subhead text-xs text-muted-foreground">
                Verify details and decide on platform onboarding approval.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                disabled={isSubmitting !== null}
                className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-5 py-2.5 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition disabled:opacity-50 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Reject Application
              </button>

              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting !== null}
                className={`font-subhead inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 ${
                  isApprovedAnim
                    ? "bg-emerald-600 scale-105"
                    : "bg-[#1b3c29] hover:bg-[#153020]"
                }`}
              >
                {isSubmitting === "approve" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isApprovedAnim ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isApprovedAnim ? "Approved!" : "Approve & Verify Farmer"}
              </button>
            </div>
          </div>
        )}

        {/* Rejection Form Drawer */}
        {isRejecting && (
          <form
            onSubmit={handleRejectSubmit}
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3 animate-fade-up"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                <AlertTriangle className="h-4 w-4" />
                <span>Specify Rejection Reason (Required)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRejecting(false);
                  setRejectionReason("");
                }}
                className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Bank passbook photo is blurry; PAN card name does not match Aadhaar..."
              rows={3}
              required
              className="font-subhead w-full rounded-xl border border-destructive/30 bg-background p-3 text-xs outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/10"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsRejecting(false);
                  setRejectionReason("");
                }}
                className="font-subhead rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-secondary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting === "reject" || !rejectionReason.trim()}
                className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-destructive px-5 py-2 text-xs font-bold text-white hover:bg-destructive/90 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting === "reject" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </form>
        )}

        {/* Non-Pending Actions (e.g. Suspend or Re-approve) */}
        {farmer.status !== "pending" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-subhead text-xs text-muted-foreground">
              Current status: <strong className="capitalize text-foreground">{farmer.status}</strong>
            </p>
            <div className="flex items-center gap-2">
              {farmer.status !== "approved" && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting !== null}
                  className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-[#1b3c29] px-4 py-2 text-xs font-bold text-white hover:bg-[#153020] transition disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Re-approve Application
                </button>
              )}
              {farmer.status === "approved" && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Are you sure you want to suspend this farmer's selling privileges?")) return;
                    await supabase
                      .from("farmer_profiles")
                      .update({ status: "suspended", updated_at: new Date().toISOString() })
                      .eq("id", farmer.id);
                    toast.success("Farmer account suspended.");
                    onChange();
                  }}
                  className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300 px-4 py-2 text-xs font-semibold hover:bg-orange-100 transition cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Suspend Farmer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 7. Full Document Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-3xl border border-border bg-background shadow-2xl animate-scale-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-background">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-[#1b3c29]" />
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">
                    {previewDoc.label}
                  </h3>
                  <p className="font-subhead text-[11px] text-muted-foreground">
                    Farmer: {farmer.full_name} ({farmer.farm_name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex items-center justify-center bg-secondary/30 p-6 min-h-[300px] max-h-[70vh] overflow-auto">
              {previewDoc.url.startsWith("data:application/pdf") ? (
                <iframe
                  src={previewDoc.url}
                  title="PDF Preview"
                  className="h-[60vh] w-full rounded-2xl border border-border bg-white"
                />
              ) : previewDoc.url.startsWith("data:image") ||
                previewDoc.url.startsWith("http") ||
                previewDoc.url.startsWith("/") ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.label}
                  className="max-h-[60vh] max-w-full rounded-2xl border border-border object-contain shadow-md"
                />
              ) : (
                <div className="text-center py-12 space-y-2">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="font-subhead text-xs text-muted-foreground">
                    Preview unavailable for this format.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border px-6 py-3.5 bg-background">
              <span className="font-subhead text-[11px] text-muted-foreground">
                Document Type: <code className="font-mono text-foreground">{previewDoc.type}</code>
              </span>
              <div className="flex items-center gap-2">
                {previewDoc.url.startsWith("http") && (
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-secondary transition"
                  >
                    Open Original <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="font-subhead rounded-full bg-[#1b3c29] text-white px-5 py-1.5 text-xs font-bold hover:bg-[#153020] transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Helper Components
   ========================================================================= */

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="font-subhead text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </p>
      <div className="font-subhead text-xs text-foreground font-medium">{children}</div>
    </div>
  );
}

function DocumentThumbnailCard({
  title,
  doc,
  onPreview,
}: {
  title: string;
  doc?: any;
  onPreview: () => void;
}) {
  const hasFile = !!doc?.file_url;
  const isVerified = doc?.status === "verified";
  const isRejected = doc?.status === "rejected";

  return (
    <div
      onClick={hasFile ? onPreview : undefined}
      className={`relative group rounded-2xl border p-3.5 transition-all text-xs flex flex-col justify-between min-h-[140px] ${
        hasFile
          ? "border-border bg-background hover:border-[#1b3c29] hover:shadow-xs cursor-pointer"
          : "border-dashed border-border/70 bg-secondary/20 cursor-default"
      }`}
    >
      {/* Top Tag & Title */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-display text-xs font-bold text-foreground">{title}</span>
          <span
            className={`font-subhead rounded-full px-2 py-0.5 text-[9px] font-bold ${
              isVerified
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : isRejected
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                : hasFile
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {isVerified
              ? "Verified"
              : isRejected
              ? "Rejected"
              : hasFile
              ? "Uploaded"
              : "Missing"}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground font-subhead">
          {hasFile ? "Click to inspect" : "Not uploaded yet"}
        </p>
      </div>

      {/* Preview Graphic */}
      <div className="mt-2 h-14 rounded-xl border border-border/60 bg-secondary/40 grid place-items-center overflow-hidden relative">
        {hasFile && doc.file_url.startsWith("data:image") ? (
          <img
            src={doc.file_url}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : hasFile ? (
          <FileText className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
        ) : (
          <FileQuestion className="h-6 w-6 text-muted-foreground/50" />
        )}

        {hasFile && (
          <div className="absolute inset-0 bg-[#1b3c29]/20 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
            <Maximize2 className="h-4 w-4 text-white drop-shadow-md" />
          </div>
        )}
      </div>
    </div>
  );
}
