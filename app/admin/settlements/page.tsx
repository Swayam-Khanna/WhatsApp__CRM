"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Play,
  Building2,
  FileSpreadsheet,
  Calendar,
  X,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Ban,
  CheckCircle,
  Clock,
  History,
  FileText,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/dashboard/shell";
import { inr } from "@/lib/format";
import { useSettlementSocket } from "@/lib/admin/use-settlement-socket";
import { supabase } from "@/integrations/supabase/client";
import Link from "next/link";

export default function AdminSettlementsPage() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOption, setSortOption] = useState<string>("created_at_desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Slide-over drawer state for full detail view
  const [drawerId, setDrawerId] = useState<string | null>(null);
  
  // Modals state
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [markPaidModal, setMarkPaidModal] = useState<{ open: boolean; id: string } | null>(null);
  const [markPaidUtr, setMarkPaidUtr] = useState("");
  const [markPaidNote, setMarkPaidNote] = useState("");

  const [holdModal, setHoldModal] = useState<{ open: boolean; id: string } | null>(null);
  const [holdReason, setHoldReason] = useState("");

  // Cycle form state
  const [cycleForm, setCycleForm] = useState({
    cycle_start_day: 7,
    cycle_end_day: 10,
    tds_rate: 0.01,
    tds_annual_threshold: 500000,
  });

  // Fetch active cycle settings
  const {
    data: activeCycle,
    isError: isCycleError,
    error: cycleError,
    refetch: refetchCycle,
  } = useQuery({
    queryKey: ["active-settlement-cycle"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settlement-cycles");
      if (!res.ok) {
        let errMsg = `Failed to fetch active settlement cycle (Status ${res.status})`;
        try {
          const json = await res.json();
          if (json?.error) {
            errMsg = `${json.error} (Status ${res.status})`;
          }
        } catch {
          // If response body is not JSON, use default status message
        }
        throw new Error(errMsg);
      }
      const json = await res.json();
      return json.data;
    },
  });

  useEffect(() => {
    if (activeCycle) {
      setCycleForm({
        cycle_start_day: activeCycle.cycle_start_day || 7,
        cycle_end_day: activeCycle.cycle_end_day || 10,
        tds_rate: activeCycle.tds_rate || 0.01,
        tds_annual_threshold: activeCycle.tds_annual_threshold || 500000,
      });
    }
  }, [activeCycle]);

  // Fetch list of settlements via API route with direct Supabase client fallback
  const { data: settlementsResponse, isLoading, refetch } = useQuery({
    queryKey: ["admin-settlements-list", statusFilter, searchQuery, sortOption],
    queryFn: async () => {
      try {
        const url = `/api/admin/settlements?status=${statusFilter}&search=${encodeURIComponent(
          searchQuery
        )}&sort=${sortOption}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            return json;
          }
        }
      } catch (err) {
        console.warn("[Client Settlements API Fetch Note]:", err);
      }

      // Direct Supabase fallback
      let query = supabase
        .from("settlements")
        .select(
          `*, farmer:farmer_profiles(id, full_name, farm_name, kyc_status, gst_number, gst_verified, region), bank_account:bank_accounts(*)`
        )
        .order("created_at", { ascending: sortOption === "created_at_asc" });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback to farmer_payouts table if settlements table is empty or missing
        const { data: altData } = await supabase
          .from("farmer_payouts")
          .select("*, farmer:farmer_profiles(id, full_name, farm_name)")
          .order("created_at", { ascending: false });

        return {
          data: altData || [],
          stats: {
            totalPending: (altData || []).filter((r: any) => r.status === "pending").reduce((s: number, r: any) => s + Number(r.net_amount || 0), 0),
            totalPaid: (altData || []).filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.net_amount || 0), 0),
            farmersAwaiting: new Set((altData || []).filter((r: any) => r.status !== "paid").map((r: any) => r.farmer_id)).size,
          },
        };
      }

      const rows = data || [];
      const totalPending = rows.filter((r: any) => r.status === "pending" || r.status === "processing").reduce((s: number, r: any) => s + Number(r.net_payout || r.net_amount || 0), 0);
      const totalPaid = rows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + Number(r.net_payout || r.net_amount || 0), 0);
      const farmersAwaiting = new Set(rows.filter((r: any) => r.status !== "paid").map((r: any) => r.farmer_id)).size;

      return {
        data: rows,
        stats: { totalPending, totalPaid, farmersAwaiting },
      };
    },
  });

  const rows = settlementsResponse?.data || [];
  const stats = settlementsResponse?.stats || { totalPending: 0, totalPaid: 0, farmersAwaiting: 0 };

  // Fetch detail for selected drawer settlement
  const { data: drawerData, isLoading: loadingDrawer, refetch: refetchDrawer } = useQuery({
    enabled: !!drawerId,
    queryKey: ["settlement-detail", drawerId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/settlements/${drawerId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load settlement details");
      return json.data;
    },
  });

  // Real-time WebSocket patcher & defensive 30s polling fallback
  const handleLiveUpdate = useCallback(
    (payload: any) => {
      if (!payload || typeof payload.settlementId !== "string" || typeof payload.status !== "string") {
        console.warn("[WebSocket] Received malformed settlement update payload:", payload);
        return;
      }

      toast.info(`Settlement #${payload.settlementId.substring(0, 8)} status updated to ${payload.status.toUpperCase()}`);
      qc.invalidateQueries({ queryKey: ["admin-settlements-list"] });
      if (drawerId === payload.settlementId) {
        refetchDrawer();
      }
    },
    [drawerId, qc, refetchDrawer]
  );

  const { isConnected } = useSettlementSocket(handleLiveUpdate);

  // 30s Defensive Polling Fallback if socket inactive or background check
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Actions handlers
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/settlements/generate", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      toast.success(json.message);
      qc.invalidateQueries({ queryKey: ["admin-settlements-list"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to run settlement generation");
    } finally {
      setGenerating(false);
    }
  };

  const handleProcessPending = async () => {
    setProcessingAll(true);
    try {
      const res = await fetch("/api/admin/settlements/process-pending", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Process failed");
      toast.success(json.message);
      qc.invalidateQueries({ queryKey: ["admin-settlements-list"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessingAll(false);
    }
  };

  const handleBulkProcess = async () => {
    if (selectedIds.length === 0) return;
    setProcessingAll(true);
    try {
      const res = await fetch("/api/admin/settlements/bulk-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bulk process failed");
      toast.success(json.message);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["admin-settlements-list"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessingAll(false);
    }
  };

  const handleRetry = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/settlements/${id}/retry`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Retry failed");
      toast.success(json.message);
      qc.invalidateQueries({ queryKey: ["admin-settlements-list"] });
      if (drawerId === id) refetchDrawer();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkPaidSubmit = async () => {
    if (!markPaidModal) return;
    try {
      const res = await fetch(`/api/admin/settlements/${markPaidModal.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utrReference: markPaidUtr, note: markPaidNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to mark paid");
      toast.success(json.message);
      setMarkPaidModal(null);
      setMarkPaidUtr("");
      setMarkPaidNote("");
      qc.invalidateQueries({ queryKey: ["admin-settlements-list"] });
      if (drawerId === markPaidModal.id) refetchDrawer();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleHoldSubmit = async () => {
    if (!holdModal) return;
    try {
      const res = await fetch(`/api/admin/settlements/${holdModal.id}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: holdReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to hold settlement");
      toast.success(json.message);
      setHoldModal(null);
      setHoldReason("");
      qc.invalidateQueries({ queryKey: ["admin-settlements-list"] });
      if (drawerId === holdModal.id) refetchDrawer();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/settlement-cycles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cycleForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update cycle");
      toast.success("Settlement cycle updated!");
      setCycleModalOpen(false);
      qc.invalidateQueries({ queryKey: ["active-settlement-cycle"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleExportCSV = () => {
    window.open(`/api/admin/settlements/export?status=${statusFilter}`, "_blank");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r: any) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-3xl font-semibold text-[#0F3D2E]">Farmer Settlements</h2>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isConnected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {isConnected ? "Live WebSocket" : "Polling Active"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Automated monthly payout engine & verification pipeline (7th–10th monthly cycle).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-primary" /> Export CSV
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="font-subhead inline-flex items-center gap-2 rounded-full border border-primary text-primary px-4 py-2 text-xs font-bold hover:bg-primary/10 transition cursor-pointer disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Run Settlement Generation
          </button>

          <button
            onClick={handleProcessPending}
            disabled={processingAll}
            className="font-subhead inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/95 transition cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {processingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Process All Pending
          </button>
        </div>
      </div>

      {/* Cycle Banner */}
      {isCycleError ? (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-950/80 text-rose-50 border border-rose-800 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-300">Settlement Cycle Error</p>
              <p className="text-sm font-medium">
                {(cycleError as Error)?.message || "Failed to load settlement cycle configuration."}
              </p>
            </div>
          </div>
          <button
            onClick={() => refetchCycle()}
            className="font-subhead inline-flex items-center gap-1.5 text-xs font-bold bg-rose-800 hover:bg-rose-700 px-3.5 py-1.5 rounded-full transition cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-950 text-emerald-50 border border-emerald-800 shadow-sm">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Active Settlement Cycle Window</p>
              <p className="text-sm font-medium">
                {activeCycle?.cycle_start_day || 7}th – {activeCycle?.cycle_end_day || 10}th of every month ({activeCycle?.cutoff_rule || "monthly_7th_10th"})
              </p>
            </div>
          </div>
          <button
            onClick={() => setCycleModalOpen(true)}
            className="text-xs font-bold bg-emerald-800 hover:bg-emerald-700 px-3 py-1.5 rounded-full transition cursor-pointer"
          >
            Configure Cycle Window
          </button>
        </div>
      )}

      {/* Summary Cards with Trend Sparkline */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Pending Payouts" value={inr(stats.totalPending)} delta="Unsettled net payouts" />
        <StatCard label="Farmers Awaiting" value={String(stats.farmersAwaiting)} delta="Producers in cycle" />
        <StatCard label="Lifetime Paid" value={inr(stats.totalPaid)} delta="Cleared transfers" />
        <div className="rounded-2xl border border-border bg-background p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">6-Month Trend Sparkline</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-end gap-1.5 h-10">
            {[35, 45, 30, 60, 75, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-emerald-600/80 hover:bg-emerald-600 rounded-t transition"
                style={{ height: `${h}%` }}
                title={`Month ${i + 1}: ₹${h * 1000}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs, Search & Sort */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {["all", "pending", "processing", "paid", "failed", "blocked"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`font-subhead rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search farmer, UTR, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-border pl-8 pr-4 py-1.5 text-xs bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="rounded-full border border-border px-3 py-1.5 text-xs bg-background focus:outline-hidden"
            >
              <option value="created_at_desc">Newest First</option>
              <option value="created_at_asc">Oldest First</option>
              <option value="net_amount_desc">Highest Payout</option>
              <option value="net_amount_asc">Lowest Payout</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-xl animate-in fade-in">
            <span className="text-xs font-bold text-primary">
              {selectedIds.length} settlement(s) selected
            </span>
            <button
              onClick={handleBulkProcess}
              disabled={processingAll}
              className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/95 transition cursor-pointer"
            >
              {processingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Process Selected
            </button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            No settlement records found matching current query.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 border-b border-border">
              <tr className="font-subhead text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="py-3 pl-4 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === rows.length && rows.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="py-3 text-left">Farmer</th>
                <th className="py-3 text-left">Period</th>
                <th className="py-3 text-right">Gross Sales</th>
                <th className="py-3 text-right">Comm & TDS</th>
                <th className="py-3 text-right">Net Payout</th>
                <th className="py-3 text-center">Status</th>
                <th className="py-3 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r: any) => {
                const isBusy = busyId === r.id;
                const netAmt = Number(r.net_payout || r.net_amount || 0);
                const grossAmt = Number(r.gross_sales || r.gross_amount || 0);
                const commAmt = Number(r.commission_amount || r.fee_amount || 0);
                const tdsAmt = Number(r.tds_amount || 0);

                return (
                  <tr key={r.id} className="hover:bg-secondary/20 transition cursor-pointer" onClick={() => setDrawerId(r.id)}>
                    <td className="py-4 pl-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelectRow(r.id)}
                        className="rounded border-border"
                      />
                    </td>

                    <td className="py-4">
                      <div>
                        <p className="font-subhead font-bold text-foreground hover:underline">
                          {r.farmer?.full_name || r.farmer?.farm_name || "Partner Farmer"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
                          <Building2 className="h-3 w-3" /> {r.bank_account?.bank_name || "Bank Account"}
                          {r.bank_account?.verified ? (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1 rounded">Verified</span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1 rounded">Unverified</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 font-mono text-xs text-muted-foreground">
                      {r.period_start} → {r.period_end}
                    </td>

                    <td className="py-4 text-right font-mono font-medium">{inr(grossAmt)}</td>
                    <td className="py-4 text-right font-mono text-xs text-muted-foreground">
                      -{inr(commAmt + tdsAmt)}
                    </td>
                    <td className="py-4 text-right font-mono font-bold text-primary">{inr(netAmt)}</td>

                    <td className="py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col items-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            r.status === "paid"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : r.status === "processing"
                              ? "bg-blue-100 text-blue-900 border border-blue-300"
                              : r.status === "blocked"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : r.status === "failed"
                              ? "bg-rose-100 text-rose-900 border border-rose-300"
                              : "bg-slate-100 text-slate-800 border border-slate-300"
                          }`}
                        >
                          {r.status === "paid" && <CheckCircle2 className="h-3 w-3 text-emerald-700" />}
                          {r.status === "processing" && <Loader2 className="h-3 w-3 animate-spin text-blue-700" />}
                          {r.status === "blocked" && <ShieldAlert className="h-3 w-3 text-amber-700" />}
                          {r.status === "failed" && <AlertTriangle className="h-3 w-3 text-rose-700" />}
                          {r.status}
                        </span>

                        {r.failure_reason && (
                          <span className="text-[10px] text-rose-600 truncate max-w-[120px] mt-1" title={r.failure_reason}>
                            {r.failure_reason}
                          </span>
                        )}

                        {r.block_reason && (
                          <Link
                            href={r.block_reason.includes("KYC") ? "/farmers" : "/farmer-portal/profile"}
                            className="text-[9px] font-bold text-amber-800 hover:underline mt-1"
                          >
                            Fix Requirement →
                          </Link>
                        )}
                      </div>
                    </td>

                    <td className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDrawerId(r.id)}
                          className="font-subhead rounded-full border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-secondary transition cursor-pointer"
                        >
                          Details
                        </button>

                        {r.status === "pending" && (
                          <>
                            <button
                              onClick={() => setMarkPaidModal({ open: true, id: r.id })}
                              className="font-subhead rounded-full border border-emerald-600 text-emerald-700 px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-50 transition cursor-pointer"
                            >
                              Mark Paid
                            </button>
                            <button
                              onClick={() => setHoldModal({ open: true, id: r.id })}
                              className="font-subhead rounded-full border border-amber-600 text-amber-700 px-2 py-1 text-[11px] font-bold hover:bg-amber-50 transition cursor-pointer"
                            >
                              Hold
                            </button>
                          </>
                        )}

                        {(r.status === "failed" || r.status === "blocked") && (
                          <button
                            onClick={() => handleRetry(r.id)}
                            disabled={isBusy}
                            className="font-subhead inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700 transition cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over Detail Drawer */}
      {drawerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-background border-l border-border h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">Settlement #{drawerId.substring(0, 8)}</h3>
                <p className="text-xs text-muted-foreground font-mono">ID: {drawerId}</p>
              </div>
              <button
                onClick={() => setDrawerId(null)}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDrawer ? (
              <div className="py-20 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              </div>
            ) : drawerData ? (
              <>
                {/* Status & Download Action */}
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-bold">Status</span>
                    <p className="text-sm font-bold uppercase text-primary mt-0.5">{drawerData.status}</p>
                  </div>
                  <button
                    onClick={() => window.open(`/api/admin/settlements/${drawerId}/statement`, "_blank")}
                    className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-bold hover:bg-primary/95 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF Statement
                  </button>
                </div>

                {/* Financial Calculation Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground">
                    Payout Financial Breakdown
                  </h4>
                  <div className="p-4 rounded-2xl border border-border space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Sales ({drawerData.order_count || drawerData.line_items?.length} Orders)</span>
                      <span className="font-bold">{inr(drawerData.gross_sales || drawerData.gross_amount)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>Commission Amount ({((drawerData.commission_rate || 0.10) * 100).toFixed(0)}%)</span>
                      <span>-{inr(drawerData.commission_amount || drawerData.fee_amount)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>TDS Amount ({((drawerData.tds_rate || 0) * 100).toFixed(1)}%)</span>
                      <span>-{inr(drawerData.tds_amount)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Adjustments / Reimbursements</span>
                      <span>+{inr(drawerData.adjustments_amount)}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between text-sm font-bold text-primary">
                      <span>Net Disbursed Payout</span>
                      <span>{inr(drawerData.net_payout || drawerData.net_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Included Line Items Table */}
                <div className="space-y-3">
                  <h4 className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground">
                    Settlement Line Items ({drawerData.line_items?.length || 0})
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-border bg-background">
                    <table className="w-full text-xs font-mono">
                      <thead className="bg-secondary/30">
                        <tr className="text-left text-[10px] uppercase text-muted-foreground">
                          <th className="p-2.5">Order ID</th>
                          <th className="p-2.5 text-right">Gross</th>
                          <th className="p-2.5 text-right">Comm</th>
                          <th className="p-2.5 text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {drawerData.line_items?.map((li: any) => (
                          <tr key={li.id}>
                            <td className="p-2.5 font-bold">{li.order_id}</td>
                            <td className="p-2.5 text-right">{inr(li.order_amount)}</td>
                            <td className="p-2.5 text-right text-rose-700">-{inr(li.commission_amount)}</td>
                            <td className="p-2.5 text-right font-bold text-primary">{inr(li.net_amount || li.order_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Timeline */}
                <div className="space-y-3">
                  <h4 className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground">
                    Audit Timeline Events
                  </h4>
                  <div className="space-y-3 relative pl-4 border-l-2 border-primary/20">
                    {drawerData.events?.map((ev: any) => (
                      <div key={ev.id} className="relative text-xs">
                        <div className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
                        <p className="font-bold uppercase text-primary text-[10px]">{ev.event_type}</p>
                        <p className="text-muted-foreground mt-0.5">{ev.note}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">
                          {new Date(ev.created_at).toLocaleString()} • {ev.actor_id || "System Engine"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Cycle Configuration Modal */}
      {cycleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-background rounded-3xl border border-border p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-foreground">Configure Active Settlement Cycle</h3>
            <form onSubmit={handleUpdateCycle} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Cycle Start Day of Month</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={cycleForm.cycle_start_day}
                  onChange={(e) => setCycleForm({ ...cycleForm, cycle_start_day: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-border p-2 bg-background font-mono"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Cycle End Day of Month</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={cycleForm.cycle_end_day}
                  onChange={(e) => setCycleForm({ ...cycleForm, cycle_end_day: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-border p-2 bg-background font-mono"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-semibold mb-1">TDS Annual Threshold (INR)</label>
                <input
                  type="number"
                  value={cycleForm.tds_annual_threshold}
                  onChange={(e) => setCycleForm({ ...cycleForm, tds_annual_threshold: parseFloat(e.target.value) })}
                  className="w-full rounded-xl border border-border p-2 bg-background font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setCycleModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-border text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold cursor-pointer">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Mark Paid Modal */}
      {markPaidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-background rounded-3xl border border-border p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-foreground">Manual Mark Paid Override</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Bank UTR Reference Number *</label>
                <input
                  type="text"
                  placeholder="e.g. UTR982347102938"
                  value={markPaidUtr}
                  onChange={(e) => setMarkPaidUtr(e.target.value)}
                  className="w-full rounded-xl border border-border p-2 bg-background font-mono"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Admin Audit Note *</label>
                <textarea
                  placeholder="Reason for manual payout override..."
                  value={markPaidNote}
                  onChange={(e) => setMarkPaidNote(e.target.value)}
                  className="w-full rounded-xl border border-border p-2 bg-background font-sans h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setMarkPaidModal(null)} className="px-4 py-2 rounded-full border border-border text-xs font-semibold cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaidSubmit}
                  disabled={!markPaidUtr || !markPaidNote}
                  className="px-5 py-2 rounded-full bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Confirm Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Hold/Block Modal */}
      {holdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-background rounded-3xl border border-border p-6 space-y-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-amber-700">Block Settlement Payout</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Block / Hold Reason *</label>
                <textarea
                  placeholder="Enter explicit block reason..."
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  className="w-full rounded-xl border border-border p-2 bg-background font-sans h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setHoldModal(null)} className="px-4 py-2 rounded-full border border-border text-xs font-semibold cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={handleHoldSubmit}
                  disabled={!holdReason}
                  className="px-5 py-2 rounded-full bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Confirm Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
