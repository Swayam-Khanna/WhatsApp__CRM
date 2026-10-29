"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  ShoppingBag,
  Plus,
  Upload,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  UserCheck,
  ChevronRight,
  RefreshCw,
  Sliders,
  Settings,
  CreditCard,
  ArrowRight,
  Kanban,
  Table as TableIcon,
  ListTodo,
  ExternalLink,
} from "lucide-react";
import {
  leadsService,
  LeadRecord,
  PipelineMetrics,
  WHOLESALE_STAGES,
  RETAIL_STAGES,
} from "@/lib/services/leadsService";
import { NewLeadModal } from "./NewLeadModal";
import { ImportLeadsModal } from "./ImportLeadsModal";
import { LeadDetailModal } from "./LeadDetailModal";
import { toast } from "sonner";

interface LeadsModuleProps {
  currentUser?: { id: string; name: string; role: string };
  userRole?: string;
  userName?: string;
  teamMembers?: Array<{ id: string; name: string; role: string }>;
  products?: Array<{ id: string; name: string; price: number }>;
  onOpenWhatsApp?: (phone: string, text?: string) => void;
  themeStyles?: any;
}

export const LeadsModule: React.FC<LeadsModuleProps> = ({
  currentUser: propCurrentUser,
  userRole,
  userName,
  teamMembers = [
    { id: "agent_nishant", name: "Nishant", role: "Store Admin" },
    { id: "agent_concierge", name: "Prajnaa Concierge", role: "Senior Concierge" },
    { id: "agent_sales1", name: "Rahul Sharma", role: "Sales Agent" },
  ],
  products = [
    { id: "organic-almonds", name: "Mamra Almonds (500g)", price: 1250 },
    { id: "turmeric-powder", name: "Stone-Ground Turmeric (250g)", price: 240 },
    { id: "walnuts", name: "Himalayan Mountain Walnuts (250g)", price: 604 },
    { id: "himalayan-dried-apricots", name: "Himalayan Dried Apricots (500g)", price: 999 },
    { id: "pink-himalayan-salt", name: "Pink Himalayan Salt (500g)", price: 180 },
    { id: "raw-honey", name: "Raw Himalayan Flora Honey (Bulk 5kg)", price: 3200 },
  ],
  onOpenWhatsApp,
  themeStyles,
}) => {
  const currentUser = propCurrentUser || {
    id: "agent_current",
    name: userName || "Nishant",
    role: userRole || "Store Admin",
  };

  // Navigation / View Tabs inside Leads & Sales
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "pipeline" | "table" | "followups" | "unassigned" | "quotes" | "settings"
  >("overview");

  // Filters
  const [businessFilter, setBusinessFilter] = useState<"all" | "b2b_wholesale" | "b2c_retail">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Accounting settings state
  const [accountingConfig, setAccountingConfig] = useState<any>(null);
  const [queuedJobs, setQueuedJobs] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [businessFilter, ownerFilter, sourceFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, metricsRes, accountingRes] = await Promise.all([
        leadsService.fetchLeads({
          businessModel: businessFilter,
          ownerId: ownerFilter,
          source: sourceFilter,
        }),
        leadsService.fetchMetrics(),
        leadsService.fetchAccountingConfig(),
      ]);

      setLeads(leadsRes.leads || []);
      setMetrics(metricsRes);
      if (accountingRes) {
        setAccountingConfig(accountingRes.config);
        setQueuedJobs(accountingRes.queuedJobs || []);
      }
    } catch {
      toast.error("Failed to load leads data");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered leads for table & pipeline view
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          l.reference.toLowerCase().includes(q) ||
          l.contactName.toLowerCase().includes(q) ||
          l.contactPhone.toLowerCase().includes(q) ||
          (l.businessName && l.businessName.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [leads, searchQuery]);

  // Wholesale and Retail separate lists
  const wholesaleLeads = useMemo(
    () => filteredLeads.filter((l) => l.businessModel === "b2b_wholesale"),
    [filteredLeads]
  );
  const retailLeads = useMemo(
    () => filteredLeads.filter((l) => l.businessModel === "b2c_retail"),
    [filteredLeads]
  );

  // Follow-ups list
  const allFollowUps = useMemo(() => {
    const list: Array<{ lead: LeadRecord; task: any }> = [];
    filteredLeads.forEach((l) => {
      l.tasks.forEach((t) => {
        list.push({ lead: l, task: t });
      });
    });
    list.sort((a, b) => new Date(a.task.dueAt).getTime() - new Date(b.task.dueAt).getTime());
    return list;
  }, [filteredLeads]);

  // Unassigned leads
  const unassignedLeads = useMemo(
    () => filteredLeads.filter((l) => !l.ownerId),
    [filteredLeads]
  );

  // Quotes directory
  const allQuotes = useMemo(() => {
    const list: Array<{ lead: LeadRecord; quote: any }> = [];
    filteredLeads.forEach((l) => {
      l.quotes.forEach((q) => {
        list.push({ lead: l, quote: q });
      });
    });
    return list;
  }, [filteredLeads]);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* 1. Module Placement & Workspace Header (Page 2 of PDF) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Leads & Sales Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Meta Status: Pending Review
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              Pipelines Active
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Unified B2B Wholesale acquisition & B2C Retail customer enquiry management
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700/50 text-neutral-700 dark:text-slate-200 font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-neutral-500" /> Import Leads
          </button>

          <button
            type="button"
            onClick={() => setIsNewLeadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> + New Lead
          </button>
        </div>
      </div>

      {/* 2. Workspace Filter Bar (Page 2 of PDF) */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Business Model Filter */}
          <div className="relative">
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value as any)}
              className="p-2 pr-7 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 font-semibold text-xs cursor-pointer appearance-none"
            >
              <option value="all">🏢 All Businesses (B2B & B2C)</option>
              <option value="b2b_wholesale">🏪 B2B Wholesale Only</option>
              <option value="b2c_retail">🛍️ B2C Retail Enquiries Only</option>
            </select>
            <ChevronRight className="h-3 w-3 text-neutral-400 absolute right-2.5 top-3 pointer-events-none rotate-90" />
          </div>

          {/* Owner Filter */}
          <div className="relative">
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="p-2 pr-7 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 font-semibold text-xs cursor-pointer appearance-none"
            >
              <option value="all">👤 All Owners</option>
              <option value="unassigned">⏳ Unassigned Queue</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
            <ChevronRight className="h-3 w-3 text-neutral-400 absolute right-2.5 top-3 pointer-events-none rotate-90" />
          </div>

          {/* Source Filter */}
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="p-2 pr-7 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 font-semibold text-xs cursor-pointer appearance-none capitalize"
            >
              <option value="all">🌐 All Sources</option>
              <option value="whatsapp">WhatsApp Inbound</option>
              <option value="website">Website Enquiry</option>
              <option value="phone">Direct Phone</option>
              <option value="referral">Merchant Referral</option>
              <option value="campaign">Marketing Campaign</option>
              <option value="import">Imported</option>
            </select>
            <ChevronRight className="h-3 w-3 text-neutral-400 absolute right-2.5 top-3 pointer-events-none rotate-90" />
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, contact, phone, shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 text-xs"
            />
          </div>
        </div>

        <button
          onClick={loadData}
          title="Refresh Data"
          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-800 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      </div>

      {/* 3. Sub-Navigation Tabs (Page 1 & 2 of PDF) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-neutral-200/80 dark:border-slate-800">
        {[
          { id: "overview", label: "Overview", icon: TrendingUp },
          { id: "pipeline", label: "Pipeline (Kanban)", icon: Kanban },
          { id: "table", label: "Table View", icon: TableIcon },
          { id: "followups", label: `My Follow-ups (${allFollowUps.filter((f) => f.task.status === "pending").length})`, icon: ListTodo },
          { id: "unassigned", label: `Unassigned (${unassignedLeads.length})`, icon: UserCheck },
          { id: "quotes", label: `Quotes (${allQuotes.length})`, icon: FileText },
          { id: "settings", label: "Settings & Zoho", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-neutral-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-neutral-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: OVERVIEW METRICS (Page 7 & 9 of PDF)                           */}
      {/* ========================================================================= */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* Section A: B2B Wholesale Pipeline Metrics */}
          {(businessFilter === "all" || businessFilter === "b2b_wholesale") && metrics && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-600" /> B2B Wholesale Pipeline Performance
                </span>
                <span className="text-[11px] text-neutral-500">
                  Target: Shopkeepers, Supermarkets, Ayurvedic Pharmacies
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">New Enquiries</span>
                  <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    {metrics.wholesale.newLeads}
                  </h4>
                  <span className="text-[10px] text-emerald-600 font-semibold">Triage queue</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Unassigned</span>
                  <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    {metrics.wholesale.unassigned}
                  </h4>
                  <span className="text-[10px] text-amber-600 font-semibold">Needs agent</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Follow-ups Due</span>
                  <h4 className="text-xl font-extrabold text-amber-700 dark:text-amber-400">
                    {metrics.wholesale.dueToday}
                  </h4>
                  <span className="text-[10px] text-neutral-400">Scheduled today</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Overdue Tasks</span>
                  <h4 className="text-xl font-extrabold text-rose-600">
                    {metrics.wholesale.overdue}
                  </h4>
                  <span className="text-[10px] text-rose-500 font-semibold">Requires attention</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Open Pipeline Value</span>
                  <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono">
                    ₹{(metrics.wholesale.openOpportunityValuePaise / 100).toLocaleString("en-IN")}
                  </h4>
                  <span className="text-[10px] text-neutral-400">Negotiation & quotes</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Won Commercial</span>
                  <h4 className="text-xl font-extrabold text-emerald-600 font-mono">
                    ₹{(metrics.wholesale.wonValuePaise / 100).toLocaleString("en-IN")}
                  </h4>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {metrics.wholesale.wonCount} accounts converted
                  </span>
                </div>
              </div>

              {/* Wholesale Accounting Financial Card (Separated from Pipeline Value per PDF Page 7) */}
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Approved Wholesale Credit Exposure
                  </span>
                  <p className="text-lg font-extrabold text-amber-900 dark:text-amber-200 font-mono mt-0.5">
                    ₹{(metrics.wholesale.approvedCreditExposurePaise / 100).toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-neutral-500">
                    Authorized by Store Admin under commercial policy
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Overdue Accounting Balances
                  </span>
                  <p className="text-lg font-extrabold text-rose-700 dark:text-rose-400 font-mono mt-0.5">
                    ₹{(metrics.wholesale.overdueAccountingBalancePaise / 100).toLocaleString("en-IN")}
                  </p>
                  <span className="text-[10px] text-neutral-500">
                    Ledger balance in {metrics.wholesale.accountingProvider.replace("_", " ")}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                    Accounting Synchronization Time
                  </span>
                  <p className="text-xs font-mono font-semibold text-neutral-800 dark:text-slate-200 mt-1">
                    {new Date(metrics.wholesale.lastSyncTimestamp).toLocaleString()}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    ✓ Accounting ledger decoupled from sales pipeline
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section B: B2C Retail Pipeline Metrics */}
          {(businessFilter === "all" || businessFilter === "b2c_retail") && metrics && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs uppercase tracking-wider text-sky-900 dark:text-sky-200 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-sky-600" /> B2C Retail Enquiries & Assisted Purchases
                </span>
                <span className="text-[11px] text-neutral-500">
                  Target: market.prajnaa.in Storefront Enquiries & Cart Recovery
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Product Enquiries</span>
                  <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    {metrics.retail.newLeads}
                  </h4>
                  <span className="text-[10px] text-sky-600 font-semibold">Incoming requests</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Unassigned</span>
                  <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    {metrics.retail.unassigned}
                  </h4>
                  <span className="text-[10px] text-amber-600 font-semibold">Concierge queue</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Follow-ups Today</span>
                  <h4 className="text-xl font-extrabold text-amber-700 dark:text-amber-400">
                    {metrics.retail.dueToday}
                  </h4>
                  <span className="text-[10px] text-neutral-400">Payment verification</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Overdue</span>
                  <h4 className="text-xl font-extrabold text-rose-600">
                    {metrics.retail.overdue}
                  </h4>
                  <span className="text-[10px] text-rose-500 font-semibold">Cart drop reminders</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Enquiry Value</span>
                  <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white font-mono">
                    ₹{(metrics.retail.openOpportunityValuePaise / 100).toLocaleString("en-IN")}
                  </h4>
                  <span className="text-[10px] text-neutral-400">Awaiting checkout</span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] font-semibold text-neutral-500 block">Won Orders</span>
                  <h4 className="text-xl font-extrabold text-emerald-600 font-mono">
                    ₹{(metrics.retail.wonValuePaise / 100).toLocaleString("en-IN")}
                  </h4>
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    {metrics.retail.wonCount} converted
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: KANBAN PIPELINE VIEW (Page 2 & 3 of PDF)                       */}
      {/* ========================================================================= */}
      {activeSubTab === "pipeline" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              Showing pipeline stages for: <strong>{businessFilter === "b2b_wholesale" ? "B2B Wholesale" : businessFilter === "b2c_retail" ? "B2C Retail" : "All Leads"}</strong>
            </span>
            <span className="text-[11px] text-neutral-400">Click a card to inspect lead details & commercial terms</span>
          </div>

          {/* Kanban Columns */}
          <div className="flex gap-3 overflow-x-auto pb-4">
            {(businessFilter === "b2c_retail" ? RETAIL_STAGES : WHOLESALE_STAGES).map((stg) => {
              const stageLeads = filteredLeads.filter((l) => l.stageKey === stg.stageKey);
              const columnValue = stageLeads.reduce((acc, l) => acc + (l.estimatedValuePaise || 0), 0);

              return (
                <div
                  key={stg.stageKey}
                  className="w-[280px] shrink-0 bg-neutral-50 dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 p-3 flex flex-col max-h-[70vh]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-neutral-900 dark:text-white">{stg.name}</span>
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-neutral-200 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold">
                        {stageLeads.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500">
                      ₹{(columnValue / 100).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="space-y-2.5 overflow-y-auto pt-3 flex-1 pr-1">
                    {stageLeads.length === 0 ? (
                      <div className="p-6 text-center text-neutral-400 text-[11px] border-2 border-dashed border-neutral-200 dark:border-slate-800 rounded-xl">
                        No leads in stage
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-neutral-200/80 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xs transition cursor-pointer space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-neutral-900 dark:text-white">
                              {lead.reference}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                lead.priority === "urgent"
                                  ? "bg-rose-100 text-rose-800"
                                  : lead.priority === "high"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {lead.priority}
                            </span>
                          </div>

                          <div>
                            <h5 className="font-bold text-neutral-900 dark:text-white text-xs truncate">
                              {lead.contactName}
                            </h5>
                            {lead.businessName ? (
                              <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 truncate font-medium">
                                <Building2 className="h-3 w-3 shrink-0" /> {lead.businessName}
                              </span>
                            ) : (
                              <span className="text-[11px] text-neutral-500 font-mono">
                                {lead.contactPhone}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-slate-700/60 text-[11px]">
                            <span className="font-mono font-extrabold text-neutral-900 dark:text-white">
                              ₹{((lead.estimatedValuePaise || 0) / 100).toLocaleString("en-IN")}
                            </span>
                            <span className="text-neutral-500 text-[10px]">
                              {lead.ownerName || "Unassigned"}
                            </span>
                          </div>

                          {lead.nextAction && (
                            <div className="text-[10px] text-neutral-600 dark:text-slate-300 truncate bg-neutral-50 dark:bg-slate-900 p-1.5 rounded-lg border border-neutral-100 dark:border-slate-800">
                              👉 {lead.nextAction}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: TABLE VIEW                                                     */}
      {/* ========================================================================= */}
      {activeSubTab === "table" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 dark:bg-slate-800/60 border-b border-neutral-200 dark:border-slate-700 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 pl-4">Lead Ref</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Contact / Shop</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Est. Value</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Next Action</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-neutral-400">
                      No leads match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLeadId(l.id)}
                      className="hover:bg-neutral-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer"
                    >
                      <td className="p-3 pl-4 font-mono font-bold text-neutral-900 dark:text-white">
                        {l.reference}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            l.businessModel === "b2b_wholesale"
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : "bg-sky-50 text-sky-900 border-sky-200"
                          }`}
                        >
                          {l.businessModel === "b2b_wholesale" ? "Wholesale" : "Retail"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-neutral-900 dark:text-white">{l.contactName}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {l.businessName || l.contactPhone}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {l.stageKey.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-600 dark:text-slate-300">
                        {l.ownerName || <span className="text-amber-600 font-semibold">Unassigned</span>}
                      </td>
                      <td className="p-3 font-mono font-bold text-neutral-900 dark:text-white">
                        ₹{((l.estimatedValuePaise || 0) / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 capitalize text-neutral-500">{l.source}</td>
                      <td className="p-3 text-neutral-600 dark:text-slate-300 max-w-[200px] truncate">
                        {l.nextAction || "—"}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadId(l.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: MY FOLLOW-UPS                                                 */}
      {/* ========================================================================= */}
      {activeSubTab === "followups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-700 dark:text-slate-300">
              Pending Follow-ups & Reminders ({allFollowUps.filter((f) => f.task.status === "pending").length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allFollowUps.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-neutral-400 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200">
                No scheduled follow-ups pending.
              </div>
            ) : (
              allFollowUps.map(({ lead, task }) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-500 transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {lead.reference} · {lead.contactName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <h5 className="font-bold text-sm text-neutral-900 dark:text-white">{task.title}</h5>
                  {task.description && <p className="text-xs text-neutral-500">{task.description}</p>}

                  <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Due: {new Date(task.dueAt).toLocaleString()}
                    </span>
                    <span className="text-neutral-500">{task.assignedToName || lead.ownerName || "Unassigned"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: UNASSIGNED LEADS QUEUE                                         */}
      {/* ========================================================================= */}
      {activeSubTab === "unassigned" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <span>
              <strong>Unassigned Opportunity Queue:</strong> These inbound enquiries arrived via WhatsApp or webforms and have not yet received an assigned concierge or sales agent.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedLeads.length === 0 ? (
              <div className="col-span-3 p-8 text-center text-neutral-400 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200">
                All leads are currently assigned!
              </div>
            ) : (
              unassignedLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-500 transition cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs">{lead.reference}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {lead.businessModel === "b2b_wholesale" ? "Wholesale" : "Retail"}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-neutral-900 dark:text-white">{lead.contactName}</h5>
                    <span className="font-mono text-xs text-neutral-500">{lead.contactPhone}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-slate-800 text-xs">
                    <span className="font-bold font-mono">
                      ₹{((lead.estimatedValuePaise || 0) / 100).toLocaleString("en-IN")}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        leadsService.assignLead(lead.id, currentUser.id, currentUser.name);
                        toast.success(`Assigned to ${currentUser.name}`);
                        loadData();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 cursor-pointer"
                    >
                      Claim Lead
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 6: QUOTES DIRECTORY                                              */}
      {/* ========================================================================= */}
      {activeSubTab === "quotes" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 dark:bg-slate-800/60 border-b border-neutral-200 dark:border-slate-700 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 pl-4">Quote #</th>
                <th className="p-3">Lead Ref</th>
                <th className="p-3">Customer / Shop</th>
                <th className="p-3">Total Value</th>
                <th className="p-3">Terms</th>
                <th className="p-3">Valid Until</th>
                <th className="p-3">Status</th>
                <th className="p-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
              {allQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-400">
                    No quotations created yet.
                  </td>
                </tr>
              ) : (
                allQuotes.map(({ lead, quote }) => (
                  <tr
                    key={quote.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="hover:bg-neutral-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <td className="p-3 pl-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      #{quote.quoteNumber} (v{quote.version})
                    </td>
                    <td className="p-3 font-mono font-semibold">{lead.reference}</td>
                    <td className="p-3">
                      <span className="font-bold text-neutral-900 dark:text-white block">{lead.contactName}</span>
                      <span className="text-[11px] text-neutral-500">{lead.businessName || "Retail"}</span>
                    </td>
                    <td className="p-3 font-mono font-extrabold text-neutral-900 dark:text-white">
                      ₹{(quote.totalPaise / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-neutral-600 dark:text-slate-300">{quote.paymentTerms}</td>
                    <td className="p-3 font-mono text-neutral-500">
                      {new Date(quote.validUntil).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800">
                        {quote.status}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeadId(lead.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 7: SETTINGS & ZOHO ACCOUNTING INTEGRATION (Section 11 & Page 6)  */}
      {/* ========================================================================= */}
      {activeSubTab === "settings" && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm">Wholesale Accounting Provider (Zoho Integration Boundary)</h3>
                  <p className="text-[11px] text-neutral-500">
                    CRM owns selling; Zoho owns accounting & invoice ledger
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                  accountingConfig?.isConfigured
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-300"
                }`}
              >
                {accountingConfig?.isConfigured ? "● Active Credentials" : "● Staging / Integration Boundary Ready"}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Selected Accounting Provider
                  </label>
                  <select
                    value={accountingConfig?.provider || "zoho_books"}
                    onChange={(e) => {
                      fetch("/api/crm/accounting", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "update_config", provider: e.target.value }),
                      }).then(() => {
                        toast.success("Provider updated");
                        loadData();
                      });
                    }}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="zoho_books">Zoho Books (Accounting & Invoicing)</option>
                    <option value="zoho_invoice">Zoho Invoice (Dedicated Invoicing)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Organization Identifier
                  </label>
                  <input
                    type="text"
                    disabled
                    value={accountingConfig?.organizationId || "prajnaa-org-8921"}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-200 dark:border-slate-700 space-y-1">
                <span className="font-bold text-neutral-800 dark:text-slate-200">Integration Architecture Status:</span>
                <p className="text-[11px] text-neutral-600 dark:text-slate-300 leading-relaxed">
                  {accountingConfig?.statusMessage}
                </p>
              </div>

              {/* Retry Job Queue for Accounting */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
                <span className="font-bold text-xs">Queued Accounting Synchronization Jobs</span>
                {queuedJobs.length === 0 ? (
                  <p className="text-neutral-400 text-[11px]">No pending synchronization jobs.</p>
                ) : (
                  <div className="space-y-2">
                    {queuedJobs.map((j) => (
                      <div
                        key={j.id}
                        className="p-3 bg-neutral-50 dark:bg-slate-800 rounded-xl border border-neutral-200 dark:border-slate-700 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <strong className="block font-mono">{j.jobType} · Entity: {j.entityId}</strong>
                          <span className="text-neutral-500">
                            Attempts: {j.attempts}/{j.maxAttempts} · Status: {j.status}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await leadsService.retryAccountingJob(j.id);
                            toast.success(`Job ${j.id} retried`);
                            loadData();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-slate-700 hover:bg-neutral-300 font-bold text-[10px] cursor-pointer"
                        >
                          Retry Job
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                   */}
      {/* ========================================================================= */}
      {isNewLeadModalOpen && (
        <NewLeadModal
          isOpen={isNewLeadModalOpen}
          onClose={() => setIsNewLeadModalOpen(false)}
          onLeadCreated={() => loadData()}
          products={products}
          teamMembers={teamMembers}
        />
      )}

      {isImportModalOpen && (
        <ImportLeadsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={() => loadData()}
        />
      )}

      {selectedLeadId && (
        <LeadDetailModal
          isOpen={Boolean(selectedLeadId)}
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={() => loadData()}
          onOpenWhatsApp={onOpenWhatsApp}
          currentUser={currentUser}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
};

export default LeadsModule;
