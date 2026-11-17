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
  MessageSquare,
  Phone,
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
  onViewOrder?: (orderNumberOrId: string, lead?: LeadRecord) => void;
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
  onViewOrder,
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

  // Follow-ups sub-filters
  const [followupFilter, setFollowupFilter] = useState<"all" | "pending" | "overdue" | "completed">("pending");
  const [followupSearch, setFollowupSearch] = useState("");

  // Data states
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pipeline switcher & Drag-and-drop state
  const [pipelineMode, setPipelineMode] = useState<"wholesale" | "retail">("wholesale");
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Modals
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Accounting settings state
  const [accountingConfig, setAccountingConfig] = useState<any>(null);
  const [queuedJobs, setQueuedJobs] = useState<any[]>([]);

  useEffect(() => {
    if (businessFilter === "b2c_retail") {
      setPipelineMode("retail");
    } else if (businessFilter === "b2b_wholesale") {
      setPipelineMode("wholesale");
    }
  }, [businessFilter]);

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

      const fetched = leadsRes.leads || [];
      if (typeof window !== "undefined") {
        try {
          const cachedRaw = localStorage.getItem("crm_cached_leads");
          if (cachedRaw) {
            const cached: LeadRecord[] = JSON.parse(cachedRaw);
            const fetchedIds = new Set(fetched.map((l: any) => l.id));
            const pendingCache = cached.filter((c: any) => !fetchedIds.has(c.id));
            const merged = [...pendingCache, ...fetched];
            setLeads(merged);
            localStorage.setItem("crm_cached_leads", JSON.stringify(merged));
          } else {
            setLeads(fetched);
            localStorage.setItem("crm_cached_leads", JSON.stringify(fetched));
          }
        } catch {
          setLeads(fetched);
        }
      } else {
        setLeads(fetched);
      }

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

  // Drag and drop stage move handler
  const handleMoveStage = async (leadId: string, targetStageKey: string) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead || targetLead.stageKey === targetStageKey) return;
    const stages = targetLead.businessModel === "b2c_retail" ? RETAIL_STAGES : WHOLESALE_STAGES;
    const nextStageName = stages.find((s) => s.stageKey === targetStageKey)?.name || targetStageKey;

    // Optimistically update
    const updated = leads.map((l) => (l.id === leadId ? { ...l, stageKey: targetStageKey } : l));
    setLeads(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("crm_cached_leads", JSON.stringify(updated));
      } catch {}
    }

    try {
      const res = await leadsService.transitionStage(leadId, targetStageKey, {
        actorName: currentUser.name,
        notes: `Stage shifted to "${nextStageName}" via drag-and-drop`,
      });
      if (res.success) {
        toast.success(`${targetLead.reference} moved to "${nextStageName}"`);
        loadData();
      } else {
        toast.error(res.error || "Failed to update stage");
        loadData();
      }
    } catch (e: any) {
      toast.error(e.message || "Stage update failed");
      loadData();
    }
  };

  // Quick Advance lead stage to next stage in pipeline
  const handleAdvanceStage = async (lead: LeadRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const stages = lead.businessModel === "b2c_retail" ? RETAIL_STAGES : WHOLESALE_STAGES;
    const currentIndex = stages.findIndex((s) => s.stageKey === lead.stageKey);
    if (currentIndex === -1 || currentIndex >= stages.length - 2) {
      toast.info("Lead is at or near final pipeline stage. Open details to convert or close.");
      return;
    }
    const nextStage = stages[currentIndex + 1];
    const res = await leadsService.transitionStage(lead.id, nextStage.stageKey, {
      actorName: currentUser.name,
      notes: `Quick advanced from Kanban to ${nextStage.name}`,
    });
    if (res.success) {
      toast.success(`${lead.reference} advanced to "${nextStage.name}"`);
      loadData();
    } else {
      toast.error(res.error || "Stage update failed");
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

  // Follow-ups list (incorporates explicit lead.tasks and upcoming connects)
  const allFollowUps = useMemo(() => {
    const list: Array<{ lead: LeadRecord; task: any }> = [];
    const seenTaskKeys = new Set<string>();

    filteredLeads.forEach((l) => {
      let hasExplicitActiveTask = false;
      if (Array.isArray(l.tasks) && l.tasks.length > 0) {
        l.tasks.forEach((t) => {
          const key = `${l.id}_${t.id}`;
          if (!seenTaskKeys.has(key)) {
            seenTaskKeys.add(key);
            list.push({ lead: l, task: t });
            if (t.status !== "completed" && t.status !== "cancelled") {
              hasExplicitActiveTask = true;
            }
          }
        });
      }
      // If lead has an upcoming connect date with no explicit active task matching, add single connect task!
      if (!hasExplicitActiveTask && l.nextFollowUpAt) {
        const key = `${l.id}_connect`;
        if (!seenTaskKeys.has(key)) {
          seenTaskKeys.add(key);
          list.push({
            lead: l,
            task: {
              id: `tsk_connect_${l.id}`,
              leadId: l.id,
              title: l.nextAction || `Upcoming Connect with ${l.contactName}`,
              description: l.notes || `Scheduled upcoming customer connect`,
              dueAt: l.nextFollowUpAt,
              status: "pending",
              priority: l.priority || "normal",
              createdAt: l.createdAt,
            },
          });
        }
      }
    });
    list.sort((a, b) => new Date(a.task.dueAt).getTime() - new Date(b.task.dueAt).getTime());
    return list;
  }, [filteredLeads]);

  // Filtered Follow-ups based on status and search query
  const displayedFollowUps = useMemo(() => {
    const now = Date.now();
    return allFollowUps.filter(({ lead, task }) => {
      const isCompleted = task.status === "completed";
      const isCancelled = task.status === "cancelled";
      const isOverdue = !isCompleted && !isCancelled && new Date(task.dueAt).getTime() < now;

      // 1. Status Filter
      if (followupFilter === "pending") {
        if (isCompleted || isCancelled || isOverdue) return false;
      } else if (followupFilter === "completed") {
        if (!isCompleted) return false;
      } else if (followupFilter === "overdue") {
        if (!isOverdue) return false;
      }

      // 2. Search Filter
      if (followupSearch.trim()) {
        const q = followupSearch.toLowerCase();
        const matchesContact = lead.contactName?.toLowerCase().includes(q);
        const matchesBusiness = lead.businessName?.toLowerCase().includes(q);
        const matchesRef = lead.reference?.toLowerCase().includes(q);
        const matchesTitle = task.title?.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        if (!matchesContact && !matchesBusiness && !matchesRef && !matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [allFollowUps, followupFilter, followupSearch]);

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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
              Leads & Sales Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Meta Status: Pending Review
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 whitespace-nowrap shrink-0">
              Pipelines Active
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Unified B2B Wholesale acquisition & B2C Retail customer enquiry management
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700/50 text-neutral-700 dark:text-slate-200 font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5 text-neutral-500" /> Import Leads
          </button>

          <button
            type="button"
            onClick={() => setIsNewLeadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> + New Lead
          </button>
        </div>
      </div>

      {/* 2. Workspace Filter Bar (Page 2 of PDF) */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 w-full min-w-0">
          {/* Business Model Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value as any)}
              className="w-full sm:w-auto p-2 pr-7 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 font-semibold text-xs cursor-pointer appearance-none"
            >
              <option value="all">🏢 All Businesses (B2B & B2C)</option>
              <option value="b2b_wholesale">🏪 B2B Wholesale Only</option>
              <option value="b2c_retail">🛍️ B2C Retail Enquiries Only</option>
            </select>
            <ChevronRight className="h-3 w-3 text-neutral-400 absolute right-2.5 top-3 pointer-events-none rotate-90" />
          </div>

          {/* Owner Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full sm:w-auto p-2 pr-7 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 font-semibold text-xs cursor-pointer appearance-none"
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
          <div className="relative w-full sm:w-auto">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full sm:w-auto p-2 pr-7 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 font-semibold text-xs cursor-pointer appearance-none capitalize"
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
          <div className="relative flex-1 w-full sm:w-auto min-w-[160px]">
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
          className="self-end sm:self-auto p-2 rounded-xl text-neutral-500 hover:text-neutral-800 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      </div>

      {/* 3. Sub-Navigation Tabs (Page 1 & 2 of PDF) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-neutral-200/80 dark:border-slate-800 no-scrollbar">
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

          {/* Section C: Live Feed of Recent Inquiries & Leads (Always visible immediately upon creation) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 p-5 space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> Recent Inquiries & Active Pipeline Leads
                </h4>
                <p className="text-[11px] text-neutral-500">Live view of newly captured customer inquiries, commercial terms, and upcoming connects</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewLeadModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> + New Enquiry / Lead
              </button>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs border border-dashed border-neutral-200 dark:border-slate-800 rounded-xl">
                No active inquiries found. Click <strong>+ New Enquiry / Lead</strong> above to create a lead.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/80 dark:bg-slate-800/60 border-b border-neutral-200 dark:border-slate-700 text-neutral-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Reference</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Customer / Contact</th>
                      <th className="p-2.5">Current Stage</th>
                      <th className="p-2.5">Est. Value</th>
                      <th className="p-2.5">Upcoming Connect</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                    {filteredLeads.slice(0, 10).map((lead) => {
                      const stages = lead.businessModel === "b2c_retail" ? RETAIL_STAGES : WHOLESALE_STAGES;
                      const stageObj = stages.find((s) => s.stageKey === lead.stageKey);
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="hover:bg-neutral-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition"
                        >
                          <td className="p-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {lead.reference}
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300">
                              {lead.businessModel === "b2b_wholesale" ? "B2B Wholesale" : "B2C Retail"}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <strong className="block text-neutral-900 dark:text-white">{lead.contactName}</strong>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {lead.businessName ? `${lead.businessName} · ` : ""}
                              {lead.contactPhone}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-[11px] font-semibold text-neutral-700 dark:text-slate-300 bg-neutral-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {stageObj?.name || lead.stageKey}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-neutral-900 dark:text-white">
                            ₹{((lead.estimatedValuePaise || 0) / 100).toLocaleString("en-IN")}
                          </td>
                          <td className="p-2.5">
                            {lead.nextFollowUpAt ? (
                              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(lead.nextFollowUpAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const greeting = `Namaste ${lead.contactName}! Reference: ${lead.reference}.`;
                                  if (onOpenWhatsApp) onOpenWhatsApp(lead.contactPhone, greeting);
                                  else window.open(`https://wa.me/${lead.contactPhone.replace(/[^0-9]/g, "")}`, "_blank");
                                }}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer transition"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAdvanceStage(lead, e)}
                                className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                              >
                                <span>Advance</span>
                                <ArrowRight className="h-3 w-3" />
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
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: KANBAN PIPELINE VIEW (Drag & Drop + Pipeline Switcher)          */}
      {/* ========================================================================= */}
      {activeSubTab === "pipeline" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Pipeline Mode Switcher */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-slate-800 p-1 rounded-2xl border border-neutral-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPipelineMode("wholesale")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  pipelineMode === "wholesale"
                    ? "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-xs"
                    : "text-neutral-600 dark:text-slate-400 hover:text-neutral-900"
                }`}
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>B2B Wholesale Pipeline</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {wholesaleLeads.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineMode("retail")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  pipelineMode === "retail"
                    ? "bg-white dark:bg-slate-900 text-sky-800 dark:text-sky-300 shadow-xs"
                    : "text-neutral-600 dark:text-slate-400 hover:text-neutral-900"
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5 text-sky-600" />
                <span>B2C Retail Enquiries</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                  {retailLeads.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Drag cards between columns to change stage
              </span>
            </div>
          </div>

          {/* Kanban Columns with Drag-and-Drop */}
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {(pipelineMode === "retail" ? RETAIL_STAGES : WHOLESALE_STAGES).map((stg) => {
              const stageLeads = filteredLeads.filter((l) => {
                if (pipelineMode === "retail") {
                  return (l.businessModel === "b2c_retail" || businessFilter === "b2c_retail") && l.stageKey === stg.stageKey;
                }
                return (l.businessModel === "b2b_wholesale" || businessFilter === "b2b_wholesale") && l.stageKey === stg.stageKey;
              });
              const columnValue = stageLeads.reduce((acc, l) => acc + (l.estimatedValuePaise || 0), 0);
              const isOver = dragOverStage === stg.stageKey;

              return (
                <div
                  key={stg.stageKey}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragOverStage(stg.stageKey);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    if (dragOverStage === stg.stageKey) setDragOverStage(null);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverStage(null);
                    const leadId = e.dataTransfer.getData("text/plain");
                    if (leadId) {
                      await handleMoveStage(leadId, stg.stageKey);
                    }
                  }}
                  className={`w-[290px] shrink-0 bg-neutral-50 dark:bg-slate-900 rounded-2xl border p-3 flex flex-col max-h-[72vh] transition-all duration-150 ${
                    isOver
                      ? "border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20 scale-[1.01]"
                      : "border-neutral-200/80 dark:border-slate-800"
                  }`}
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
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverStage(null);
                      const leadId = e.dataTransfer.getData("text/plain");
                      if (leadId) {
                        await handleMoveStage(leadId, stg.stageKey);
                      }
                    }}
                    className="space-y-2.5 overflow-y-auto pt-3 flex-1 pr-1"
                  >
                    {stageLeads.length === 0 ? (
                      <div className="p-6 text-center text-neutral-400 text-[11px] border-2 border-dashed border-neutral-200 dark:border-slate-800 rounded-xl">
                        Drop leads here
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", lead.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-neutral-200/80 dark:border-slate-700 hover:border-emerald-500 hover:shadow-xs transition cursor-grab active:cursor-grabbing space-y-2 shadow-2xs select-none"
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

                          {/* Commercial / Value */}
                          <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-slate-700/60 text-[11px]">
                            <span className="font-mono font-extrabold text-neutral-900 dark:text-white">
                              ₹{((lead.estimatedValuePaise || 0) / 100).toLocaleString("en-IN")}
                            </span>
                            <span className="text-neutral-500 text-[10px]">
                              {lead.ownerName || "Unassigned"}
                            </span>
                          </div>

                          {/* Upcoming Connect Reminder Badge */}
                          {lead.nextFollowUpAt && (
                            <div className="flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/40 font-medium">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>Connect: {new Date(lead.nextFollowUpAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                            </div>
                          )}

                          {lead.nextAction && (
                            <div className="text-[10px] text-neutral-600 dark:text-slate-300 truncate bg-neutral-50 dark:bg-slate-900 p-1.5 rounded-lg border border-neutral-100 dark:border-slate-800">
                              👉 {lead.nextAction}
                            </div>
                          )}

                          {/* Quick Card Actions */}
                          <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-slate-700/60 gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                const greeting = `Namaste ${lead.contactName} ji! Reference: ${lead.reference} (${lead.businessModel === "b2b_wholesale" ? "Wholesale Enquiry" : "Product Enquiry"}). Prajnaa Market team here!`;
                                if (onOpenWhatsApp) {
                                  onOpenWhatsApp(lead.contactPhone, greeting);
                                } else {
                                  window.open(`https://wa.me/${lead.contactPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(greeting)}`, "_blank");
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[10px] flex items-center gap-1 transition cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>Chat</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleAdvanceStage(lead, e)}
                              className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-neutral-700 dark:text-slate-200 font-semibold text-[10px] flex items-center gap-1 transition cursor-pointer"
                              title="Advance to Next Stage"
                            >
                              <span>Advance</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const greeting = `Namaste ${l.contactName} ji! Reference: ${l.reference}. Prajnaa Market team here!`;
                              if (onOpenWhatsApp) {
                                onOpenWhatsApp(l.contactPhone, greeting);
                              } else {
                                window.open(`https://wa.me/${l.contactPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(greeting)}`, "_blank");
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Chat</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeadId(l.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                          >
                            Open
                          </button>
                        </div>
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
          {/* Sub-tab Toolbar: Filters & Quick Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-slate-800/50 rounded-2xl border border-neutral-200/80 dark:border-slate-800">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0 no-scrollbar">
              {[
                {
                  id: "pending",
                  label: "Pending",
                  count: allFollowUps.filter((f) => f.task.status !== "completed" && f.task.status !== "cancelled" && !(new Date(f.task.dueAt).getTime() < Date.now())).length,
                  badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
                },
                {
                  id: "overdue",
                  label: "Overdue",
                  count: allFollowUps.filter(
                    (f) => f.task.status !== "completed" && f.task.status !== "cancelled" && new Date(f.task.dueAt).getTime() < Date.now()
                  ).length,
                  badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
                },
                {
                  id: "completed",
                  label: "Completed",
                  count: allFollowUps.filter((f) => f.task.status === "completed").length,
                  badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
                },
                {
                  id: "all",
                  label: "All Tasks",
                  count: allFollowUps.length,
                  badgeClass: "bg-neutral-200 text-neutral-800 dark:bg-slate-700 dark:text-slate-200",
                },
              ].map((pill) => {
                const isActive = followupFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setFollowupFilter(pill.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer text-xs ${
                      isActive
                        ? "bg-white dark:bg-slate-900 text-neutral-900 dark:text-white shadow-xs border border-neutral-300 dark:border-slate-700"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${pill.badgeClass}`}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search in Tasks */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={followupSearch}
                onChange={(e) => setFollowupSearch(e.target.value)}
                placeholder="Filter tasks, contact..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Follow-up Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedFollowUps.length === 0 ? (
              <div className="col-span-2 p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 space-y-2">
                <div className="text-3xl">📋</div>
                <h4 className="font-bold text-neutral-700 dark:text-slate-300 text-sm">No follow-ups found</h4>
                <p className="text-xs text-neutral-400">
                  {followupFilter === "overdue"
                    ? "Great job! There are no overdue follow-ups at this time."
                    : followupSearch
                    ? "No follow-up tasks match your search filter."
                    : "No scheduled follow-up tasks in this category."}
                </p>
              </div>
            ) : (
              displayedFollowUps.map(({ lead, task }) => {
                const isCompleted = task.status === "completed";
                const isOverdue = !isCompleted && new Date(task.dueAt).getTime() < Date.now();
                const dueDate = new Date(task.dueAt);
                const isToday = !isCompleted && dueDate.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`p-5 rounded-3xl border transition shadow-2xs hover:shadow-md cursor-pointer space-y-3.5 ${
                      isCompleted
                        ? "bg-white/80 dark:bg-slate-900/60 border-neutral-200/60 dark:border-slate-800/80 opacity-80"
                        : isOverdue
                        ? "bg-rose-50/20 dark:bg-rose-950/10 border-rose-300 dark:border-rose-900/50 hover:border-rose-500"
                        : "bg-white dark:bg-slate-900 border-neutral-200/80 dark:border-slate-800 hover:border-emerald-500"
                    }`}
                  >
                    {/* Top Row: Lead Reference + Status Pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 truncate">
                          {lead.reference}
                        </span>
                        <span className="text-neutral-300 dark:text-slate-700">·</span>
                        <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                          {lead.contactName}
                        </span>
                        {lead.businessName && (
                          <span className="text-[10px] text-neutral-400 truncate hidden sm:inline">
                            ({lead.businessName})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 animate-pulse">
                            ● OVERDUE
                          </span>
                        )}
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200">
                            ● TODAY
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                    </div>

                    {/* Task Title & Description */}
                    <div>
                      <h5
                        className={`font-bold text-sm ${
                          isCompleted
                            ? "line-through text-neutral-400 dark:text-slate-500"
                            : "text-neutral-900 dark:text-white"
                        }`}
                      >
                        {task.title}
                      </h5>
                      {task.description && (
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>

                    {/* Linked Order Banner if present */}
                    {lead.linkedOrderId && (
                      <div className="p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" /> Linked Order #{lead.linkedOrderId}
                        </span>
                        {onViewOrder && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewOrder(lead.linkedOrderId!, lead);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                          >
                            <ExternalLink className="h-3 w-3" /> View Order
                          </button>
                        )}
                      </div>
                    )}

                    {/* Due Date & Owner */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span
                        className={`font-mono flex items-center gap-1 ${
                          isOverdue
                            ? "text-rose-700 dark:text-rose-400 font-bold"
                            : isToday
                            ? "text-amber-700 dark:text-amber-400 font-bold"
                            : "text-neutral-500"
                        }`}
                      >
                        <Clock className="h-3 w-3" /> Due: {dueDate.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-neutral-500">{task.assignedToName || lead.ownerName || "Unassigned"}</span>
                    </div>

                    {/* Direct Action Buttons */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const nextStatus = isCompleted ? "pending" : "completed";
                            const res = await leadsService.updateTask(lead.id, task.id, {
                              status: nextStatus,
                              actorName: currentUser.name,
                            });
                            if (res.success) {
                              toast.success(isCompleted ? "Task reopened" : "Follow-up marked completed!");
                              loadData();
                            } else {
                              toast.error(res.error || "Failed to update task");
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            isCompleted
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800"
                              : "bg-white dark:bg-slate-800 border-neutral-300 dark:border-slate-700 text-neutral-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-700"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {isCompleted ? "Completed" : "Mark Done"}
                        </button>

                        {onOpenWhatsApp && lead.contactPhone && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenWhatsApp(
                                lead.contactPhone,
                                `Namaste ${lead.contactName}! 🙏 Touching base regarding our follow-up: "${task.title}". Please let us know how we can assist you today.`
                              );
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Phone className="h-3.5 w-3.5" /> WhatsApp
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="px-2.5 py-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        Lead Details <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
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
                      <div className="space-y-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          quote.status === "converted"
                            ? "bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200"
                            : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        }`}>
                          {quote.status}
                        </span>
                        {(lead.linkedOrderId || quote.convertedOrderId) && (
                          <div className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            #{lead.linkedOrderId || quote.convertedOrderId}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(lead.linkedOrderId || quote.convertedOrderId) && onViewOrder && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewOrder(lead.linkedOrderId || quote.convertedOrderId, lead);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            title="View Converted Order Details"
                          >
                            <ShoppingBag className="h-3 w-3" />
                            <span>Order</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const quoteMsg = `Namaste ${lead.contactName} ji! 🌿 Yahan aapka Prajnaa Wholesale Quotation #${quote.quoteNumber} (v${quote.version}) hai: Total Value ₹${(quote.totalPaise / 100).toLocaleString("en-IN")}. Payment Terms: ${quote.paymentTerms}. Valid until ${new Date(quote.validUntil).toLocaleDateString()}. Thank you! Team Prajnaa Market.`;
                            if (onOpenWhatsApp) {
                              onOpenWhatsApp(lead.contactPhone, quoteMsg);
                            } else {
                              window.open(`https://wa.me/${lead.contactPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(quoteMsg)}`, "_blank");
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="Share Quotation to WhatsApp"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadId(lead.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-[11px] cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
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
          onLeadCreated={(newLead?: any) => {
            if (newLead) {
              setLeads((prev) => {
                const updated = [newLead, ...prev.filter((l) => l.id !== newLead.id)];
                if (typeof window !== "undefined") {
                  try {
                    localStorage.setItem("crm_cached_leads", JSON.stringify(updated));
                  } catch {}
                }
                return updated;
              });
              if (newLead.businessModel === "b2c_retail") {
                setPipelineMode("retail");
              } else {
                setPipelineMode("wholesale");
              }
            }
            loadData();
          }}
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
          initialLead={leads.find((l) => l.id === selectedLeadId) || null}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={() => loadData()}
          onOpenWhatsApp={onOpenWhatsApp}
          onViewOrder={onViewOrder}
          currentUser={currentUser}
          teamMembers={teamMembers}
          products={products}
        />
      )}
    </div>
  );
};

export default LeadsModule;
