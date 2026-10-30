"use client";

import React, { useState } from "react";
import {
  X,
  Building2,
  User,
  ShoppingBag,
  MessageSquare,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Send,
  Plus,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  CreditCard,
  Phone,
} from "lucide-react";
import {
  leadsService,
  LeadRecord,
  WHOLESALE_STAGES,
  RETAIL_STAGES,
} from "@/lib/services/leadsService";
import { CreateQuoteModal } from "./CreateQuoteModal";
import { CreditApprovalModal } from "./CreditApprovalModal";
import { toast } from "sonner";

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  onUpdate: () => void;
  onOpenWhatsApp?: (phone: string, text?: string) => void;
  onViewOrder?: (orderNumberOrId: string, lead?: LeadRecord) => void;
  currentUser?: { id: string; name: string; role: string };
  teamMembers?: Array<{ id: string; name: string; role: string }>;
  products?: Array<{ id: string; name: string; price: number }>;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  leadId,
  onUpdate,
  onOpenWhatsApp,
  onViewOrder,
  currentUser = { id: "agent_nishant", name: "Nishant", role: "Store Admin" },
  teamMembers = [],
  products,
}) => {
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sub-modal states
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  // Quick action input states
  const [activeTab, setActiveTab] = useState<"activity" | "tasks" | "quotes">("activity");
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [isSchedulingTask, setIsSchedulingTask] = useState(false);

  // Stage transition / Lost modal
  const [showLostPrompt, setShowLostPrompt] = useState(false);
  const [lostReason, setLostReason] = useState("");

  React.useEffect(() => {
    if (isOpen && leadId) {
      loadLead(leadId);
    } else {
      setLead(null);
    }
  }, [isOpen, leadId]);

  const loadLead = async (id: string) => {
    setIsLoading(true);
    const l = await leadsService.fetchLead(id);
    setLead(l);
    setIsLoading(false);
  };

  if (!isOpen || !leadId) return null;

  const stages = lead?.businessModel === "b2b_wholesale" ? WHOLESALE_STAGES : RETAIL_STAGES;
  const currentStageIndex = stages.findIndex((s) => s.stageKey === lead?.stageKey);

  const handleStageChange = async (targetKey: string) => {
    if (!lead) return;
    try {
      const res = await leadsService.transitionStage(lead.id, targetKey, {
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
      });
      if (res.success && res.lead) {
        setLead(res.lead);
        toast.success(`Stage transitioned to ${targetKey}`);
        onUpdate();
      } else {
        toast.error(res.error || "Stage transition failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to change stage");
    }
  };

  const handleMarkLost = async () => {
    if (!lead || !lostReason.trim()) {
      toast.error("Please enter a reason for marking this lead lost");
      return;
    }
    try {
      const res = await leadsService.transitionStage(lead.id, "lost", {
        actorId: currentUser.id,
        actorName: currentUser.name,
        lostReason: lostReason.trim(),
      });
      if (res.success && res.lead) {
        setLead(res.lead);
        setShowLostPrompt(false);
        setLostReason("");
        toast.success("Lead marked as Lost and pending tasks cancelled");
        onUpdate();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newNoteText.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await leadsService.addActivity(lead.id, newNoteText.trim(), undefined, currentUser.name);
      if (res.success) {
        setNewNoteText("");
        await loadLead(lead.id);
        toast.success("Note added to timeline");
        onUpdate();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newTaskTitle.trim() || !newTaskDue) {
      toast.error("Please enter follow-up title and due date");
      return;
    }
    setIsSchedulingTask(true);
    try {
      const res = await leadsService.scheduleTask(lead.id, {
        title: newTaskTitle.trim(),
        dueAt: newTaskDue,
        taskType: "whatsapp",
      });
      if (res.success) {
        setNewTaskTitle("");
        setNewTaskDue("");
        await loadLead(lead.id);
        toast.success("Follow-up task scheduled");
        onUpdate();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSchedulingTask(false);
    }
  };

  const handleConvertToOrder = async () => {
    if (!lead) return;
    const isCredit = lead.businessModel === "b2b_wholesale" && lead.requestedCreditLimitPaise && lead.requestedCreditLimitPaise > 0;
    try {
      const res = await leadsService.convertToOrder(lead.id, {
        convertedById: currentUser.id,
        convertedByName: currentUser.name,
        paymentStatus: isCredit ? "credit_terms" : "paid",
      });
      if (res.success) {
        toast.success(`Successfully converted to Order #${res.order?.orderNumber}!`);
        await loadLead(lead.id);
        onUpdate();
        if (onViewOrder && res.order?.orderNumber) {
          onViewOrder(res.order.orderNumber, { ...lead, linkedOrderId: res.order.orderNumber });
          onClose();
        }
      } else {
        toast.error(res.error || "Order conversion failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-neutral-50/80 dark:bg-slate-900/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono font-bold text-sm bg-neutral-100 dark:bg-slate-800 text-neutral-800 dark:text-slate-200 px-2.5 py-1 rounded-xl border border-neutral-200 dark:border-slate-700">
              {lead?.reference || "Loading..."}
            </span>

            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                lead?.businessModel === "b2b_wholesale"
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                  : "bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700"
              }`}
            >
              {lead?.businessModel === "b2b_wholesale" ? <Building2 className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
              {lead?.businessModel === "b2b_wholesale" ? "B2B Wholesale" : "B2C Retail"}
            </span>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              Stage: {stages.find((s) => s.stageKey === lead?.stageKey)?.name || lead?.stageKey}
            </span>

            <span className="text-[11px] text-neutral-500 font-medium">
              Owner: <strong>{lead?.ownerName || "Unassigned"}</strong>
            </span>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                lead?.priority === "urgent"
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : lead?.priority === "high"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-neutral-100 text-neutral-700"
              }`}
            >
              {lead?.priority}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stage Progress Tracker */}
        {lead && (
          <div className="px-6 py-2.5 border-b border-neutral-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            {stages
              .filter((s) => !["lost", "disqualified"].includes(s.stageKey))
              .map((s, idx) => {
                const isPassed = currentStageIndex >= idx;
                const isCurrent = s.stageKey === lead.stageKey;
                return (
                  <button
                    key={s.stageKey}
                    onClick={() => handleStageChange(s.stageKey)}
                    className={`px-3 py-1 rounded-xl font-semibold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                      isCurrent
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : isPassed
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
                        : "bg-neutral-100 dark:bg-slate-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {isPassed && !isCurrent && "✓ "}
                    {s.name}
                  </button>
                );
              })}
          </div>
        )}

        {/* 3-Column Body Layout */}
        {lead ? (
          <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto flex-1 text-xs divide-y md:divide-y-0 md:divide-x divide-neutral-200/80 dark:divide-slate-800">
            {/* Column 1: CONTACT (3 cols) */}
            <div className="md:col-span-3.5 p-5 space-y-4 bg-neutral-50/40 dark:bg-slate-900/40">
              <span className="font-bold text-neutral-500 uppercase tracking-wider text-[10px] block">
                1. Customer & Profile
              </span>

              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-neutral-200/80 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-base">
                    {lead.contactName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{lead.contactName}</h4>
                    <span className="font-mono text-neutral-500 text-[11px] block">{lead.contactPhone}</span>
                  </div>
                </div>

                {lead.contactEmail && (
                  <div className="text-[11px] text-neutral-500 truncate">
                    ✉️ {lead.contactEmail}
                  </div>
                )}

                {lead.businessName && (
                  <div className="pt-2 border-t border-neutral-100 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-semibold text-neutral-500 block">Registered Business / Shop</span>
                    <strong className="text-neutral-900 dark:text-white flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" /> {lead.businessName}
                    </strong>
                    {lead.deliveryPostalCode && (
                      <span className="text-[11px] text-neutral-500 font-mono block">
                        PIN: {lead.deliveryPostalCode}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Wholesale Accounting Financial Summary */}
              {lead.businessModel === "b2b_wholesale" && (
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-2.5">
                  <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-amber-700" /> Accounting & Credit Summary
                  </span>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Accounting Ref:</span>
                      <strong className="font-mono text-neutral-800 dark:text-slate-200">
                        {lead.accountingSyncStatus === "synced" ? "ZOHO-CUST-8921" : "Pending Sync"}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Credit Limit:</span>
                      <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                        ₹{((lead.requestedCreditLimitPaise || 0) / 100).toLocaleString("en-IN")}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Outstanding Balance:</span>
                      <strong className="font-mono text-rose-700 dark:text-rose-400">
                        ₹18,500
                      </strong>
                    </div>

                    <div className="pt-1 border-t border-amber-200/60 dark:border-amber-900/30 text-[10px] text-neutral-500">
                      Sync: {lead.accountingLastSyncedAt ? new Date(lead.accountingLastSyncedAt).toLocaleDateString() : "Active"} (Provider: Zoho Books)
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Communication CTA */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenWhatsApp) {
                      onOpenWhatsApp(lead.contactPhone, `Namaste ${lead.contactName} ji! Reference: ${lead.reference}`);
                    } else {
                      window.open(
                        `https://wa.me/${lead.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Namaste ${lead.contactName} ji! Prajnaa Market reference: ${lead.reference}`
                        )}`,
                        "_blank"
                      );
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" /> Open WhatsApp Chat
                </button>
              </div>
            </div>

            {/* Column 2: ACTIVITY & CONVERSATION (5 cols) */}
            <div className="md:col-span-5 p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                      activeTab === "activity"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Activity Timeline ({lead.activities.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                      activeTab === "tasks"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Follow-ups ({lead.tasks.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("quotes")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                      activeTab === "quotes"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Quotes ({lead.quotes.length})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[380px]">
                {activeTab === "activity" && (
                  <div className="space-y-2.5">
                    {lead.activities.length === 0 ? (
                      <p className="text-neutral-400 text-center py-6">No activity recorded yet.</p>
                    ) : (
                      lead.activities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-neutral-200/80 dark:border-slate-700 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <strong className="text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {act.summary}
                            </strong>
                            <span className="text-neutral-400 font-mono text-[10px]">
                              {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {act.details && (
                            <p className="text-[11px] text-neutral-600 dark:text-slate-300 mt-0.5">{act.details}</p>
                          )}
                          <span className="text-[10px] text-neutral-400 block pt-0.5">By {act.actorName}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "tasks" && (
                  <div className="space-y-2.5">
                    {lead.tasks.length === 0 ? (
                      <p className="text-neutral-400 text-center py-6">No follow-ups scheduled.</p>
                    ) : (
                      lead.tasks.map((tsk) => {
                        const isCompleted = tsk.status === "completed";
                        const isOverdue = !isCompleted && new Date(tsk.dueAt).getTime() < Date.now();
                        return (
                          <div
                            key={tsk.id}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${
                              isCompleted
                                ? "bg-neutral-50/70 dark:bg-slate-800/40 border-neutral-200/50 dark:border-slate-800 opacity-75"
                                : isOverdue
                                ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
                                : "bg-white dark:bg-slate-800 border-neutral-200/80 dark:border-slate-700"
                            }`}
                          >
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h5
                                  className={`font-bold text-xs truncate ${
                                    isCompleted
                                      ? "line-through text-neutral-400 dark:text-slate-500"
                                      : "text-neutral-900 dark:text-white"
                                  }`}
                                >
                                  {tsk.title}
                                </h5>
                                {isOverdue && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                    OVERDUE
                                  </span>
                                )}
                              </div>
                              {tsk.description && <p className="text-[11px] text-neutral-500 truncate">{tsk.description}</p>}
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Due: {new Date(tsk.dueAt).toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextStatus = isCompleted ? "pending" : "completed";
                                  const res = await leadsService.updateTask(lead.id, tsk.id, {
                                    status: nextStatus,
                                    actorName: currentUser.name,
                                  });
                                  if (res.success) {
                                    toast.success(isCompleted ? "Task reopened" : "Task marked as completed");
                                    await loadLead(lead.id);
                                    onUpdate();
                                  } else {
                                    toast.error(res.error || "Failed to update task");
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                                  isCompleted
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800"
                                    : "bg-white dark:bg-slate-700 border-neutral-300 text-neutral-700 hover:border-emerald-500 hover:text-emerald-700"
                                }`}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                {isCompleted ? "Done" : "Mark Done"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {activeTab === "quotes" && (
                  <div className="space-y-2.5">
                    {lead.quotes.length === 0 ? (
                      <p className="text-neutral-400 text-center py-6">No quotations generated yet.</p>
                    ) : (
                      lead.quotes.map((q) => (
                        <div
                          key={q.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-neutral-200/80 dark:border-slate-700 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                              #{q.quoteNumber} (v{q.version})
                            </span>
                            <strong className="font-mono font-extrabold text-neutral-900 dark:text-white">
                              ₹{(q.totalPaise / 100).toLocaleString("en-IN")}
                            </strong>
                          </div>
                          <p className="text-[11px] text-neutral-500">Terms: {q.paymentTerms}</p>
                          <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-100 dark:border-slate-700">
                            <span>Valid until {new Date(q.validUntil).toLocaleDateString()}</span>
                            <span className="capitalize font-semibold text-emerald-600">{q.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Add note or customer feedback..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
                <button
                  type="submit"
                  disabled={isAddingNote || !newNoteText.trim()}
                  className="px-3 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-xs transition cursor-pointer disabled:opacity-40"
                >
                  Post
                </button>
              </form>
            </div>

            {/* Column 3: SALES DETAILS (3.5 cols) */}
            <div className="md:col-span-3.5 p-5 space-y-4 bg-neutral-50/40 dark:bg-slate-900/40">
              <span className="font-bold text-neutral-500 uppercase tracking-wider text-[10px] block">
                3. Commercial Details
              </span>

              {/* Product Interests */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-neutral-200/80 dark:border-slate-700 space-y-2">
                <span className="text-[10px] font-semibold text-neutral-500 block">Product Interest</span>
                {lead.items.length === 0 ? (
                  <p className="text-neutral-400 text-xs">No products itemized yet.</p>
                ) : (
                  lead.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-xs py-1 border-b border-neutral-100 dark:border-slate-700/60 last:border-0">
                      <div>
                        <span className="font-semibold text-neutral-900 dark:text-white block">{it.productName}</span>
                        <span className="text-[10px] text-neutral-500">{it.quantity} {it.unit}</span>
                      </div>
                      <span className="font-mono font-bold text-neutral-800 dark:text-slate-200">
                        ₹{(it.indicativeTotalPaise / 100).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))
                )}

                <div className="pt-2 flex items-center justify-between font-bold text-xs">
                  <span>Estimated Opportunity Value:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                    ₹{((lead.estimatedValuePaise || 0) / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Next Action & Schedule */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-neutral-200/80 dark:border-slate-700 space-y-2 text-xs">
                <span className="text-[10px] font-semibold text-neutral-500 block">Next Action</span>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {lead.nextAction || "None specified"}
                </p>
                {lead.nextFollowUpAt && (
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono block">
                    ⏰ {new Date(lead.nextFollowUpAt).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Order Linking Status */}
              {lead.linkedOrderId && (
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5 font-mono">
                      <ShoppingBag className="h-4 w-4 text-emerald-600" /> Order #{lead.linkedOrderId}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                      Confirmed
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Policy: {lead.conversionRuleApplied || "Standard Fulfillment"}
                  </p>

                  <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-800/60 flex items-center gap-2">
                    {onViewOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          onViewOrder(lead.linkedOrderId!, lead);
                          onClose();
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View Order Details
                      </button>
                    )}
                    {onOpenWhatsApp && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenWhatsApp(
                            lead.contactPhone,
                            `Namaste ${lead.contactName}! 🙏 Your Prajnaa order #${lead.linkedOrderId} is confirmed and being prepared for dispatch.`
                          );
                        }}
                        className="py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                        title="Notify via WhatsApp"
                      >
                        <Phone className="h-3.5 w-3.5" /> WA
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-neutral-400">Loading lead information...</div>
        )}

        {/* Bottom Operational Action Bar */}
        {lead && (
          <div className="px-6 py-3 border-t border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuoteModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 text-neutral-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-600" /> Create Quote
              </button>

              {lead.businessModel === "b2b_wholesale" && (
                <button
                  type="button"
                  onClick={() => setIsCreditModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 text-neutral-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Credit Approval
                </button>
              )}

              {!lead.linkedOrderId && lead.stageKey !== "lost" && (
                <button
                  type="button"
                  onClick={handleConvertToOrder}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> Convert to Confirmed Order
                </button>
              )}

              {lead.stageKey !== "lost" && (
                <button
                  type="button"
                  onClick={() => setShowLostPrompt(true)}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold text-xs transition cursor-pointer"
                >
                  Mark Lost
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 font-semibold text-xs hover:bg-neutral-100 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* Mark Lost Sub-prompt */}
        {showLostPrompt && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200 dark:border-slate-700 max-w-sm w-full space-y-3">
              <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Mark Opportunity as Lost</h4>
              <p className="text-[11px] text-neutral-500">
                Please enter the reason for closing this enquiry. All pending sales tasks will be cancelled automatically.
              </p>
              <textarea
                rows={2}
                placeholder="e.g. Purchased from local market, budget constraint, unresponsive..."
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowLostPrompt(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkLost}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs"
                >
                  Confirm Lost
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-modals */}
        {lead && isQuoteModalOpen && (
          <CreateQuoteModal
            isOpen={isQuoteModalOpen}
            onClose={() => setIsQuoteModalOpen(false)}
            lead={lead}
            products={products}
            onQuoteCreated={() => loadLead(lead.id)}
          />
        )}

        {lead && isCreditModalOpen && (
          <CreditApprovalModal
            isOpen={isCreditModalOpen}
            onClose={() => setIsCreditModalOpen(false)}
            lead={lead}
            currentRole={currentUser.role}
            currentUserName={currentUser.name}
            currentUserId={currentUser.id}
            onDecisionRecorded={() => loadLead(lead.id)}
          />
        )}
      </div>
    </div>
  );
};
