"use client";

import React, { useState } from "react";
import { X, ShieldCheck, AlertCircle, Building2 } from "lucide-react";
import { leadsService, LeadRecord } from "@/lib/services/leadsService";
import { toast } from "sonner";

interface CreditApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadRecord;
  currentRole: string;
  currentUserName: string;
  currentUserId: string;
  onDecisionRecorded: () => void;
}

export const CreditApprovalModal: React.FC<CreditApprovalModalProps> = ({
  isOpen,
  onClose,
  lead,
  currentRole,
  currentUserName,
  currentUserId,
  onDecisionRecorded,
}) => {
  const isAuthorized = currentRole === "Store Admin" || currentRole === "Sales Manager";

  const [approvedLimit, setApprovedLimit] = useState<number>(
    lead.requestedCreditLimitPaise ? lead.requestedCreditLimitPaise / 100 : 50000
  );
  const [approvedPeriod, setApprovedPeriod] = useState<number>(
    lead.requestedCreditPeriodDays || 15
  );
  const [status, setStatus] = useState<"approved" | "rejected">("approved");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      toast.error("Unauthorized: Only Store Admin or Sales Manager can record credit decisions");
      return;
    }

    if (!lead.businessAccountId) {
      toast.error("Wholesale lead must be linked to a registered Business Account to approve credit");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await leadsService.recordCreditApproval(lead.businessAccountId, {
        leadId: lead.id,
        approvedCreditLimitPaise: approvedLimit * 100,
        approvedPeriodDays: approvedPeriod,
        status,
        decisionNotes,
        authorizedById: currentUserId,
        authorizedByName: currentUserName,
        authorizedRole: currentRole,
      });

      if (res.success) {
        toast.success(`Wholesale credit terms ${status.toUpperCase()} successfully!`);
        onDecisionRecorded();
        onClose();
      } else {
        toast.error(res.error || "Failed to record credit approval");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-neutral-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">
                Authorize Wholesale Credit
              </h3>
              <p className="text-[11px] text-neutral-500">Authorized approval decision for {lead.businessName || lead.contactName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {!isAuthorized && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Authorization Restricted:</strong> Your current role (<em>{currentRole}</em>) cannot approve credit. Only <strong>Store Admin</strong> or <strong>Sales Manager</strong> can grant credit limits.
              </span>
            </div>
          )}

          <div className="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-2xl border border-neutral-200/80 dark:border-slate-700 space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Business Account:</span>
              <strong className="text-neutral-900 dark:text-white flex items-center gap-1">
                <Building2 className="h-3 w-3 text-emerald-600" /> {lead.businessName || "Registered Account"}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Requested Terms:</span>
              <span className="font-mono font-semibold text-neutral-800 dark:text-slate-200">
                ₹{((lead.requestedCreditLimitPaise || 0) / 100).toLocaleString("en-IN")} ({lead.requestedCreditPeriodDays || 0} days)
              </span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Decision Status</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus("approved")}
                className={`p-3 rounded-2xl border text-center font-bold text-xs transition cursor-pointer ${
                  status === "approved"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500 shadow-2xs"
                    : "border-neutral-200 dark:border-slate-700 text-neutral-500"
                }`}
              >
                ✓ Approve Credit
              </button>
              <button
                type="button"
                onClick={() => setStatus("rejected")}
                className={`p-3 rounded-2xl border text-center font-bold text-xs transition cursor-pointer ${
                  status === "rejected"
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500 shadow-2xs"
                    : "border-neutral-200 dark:border-slate-700 text-neutral-500"
                }`}
              >
                ✗ Reject Credit Request
              </button>
            </div>
          </div>

          {status === "approved" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                  Approved Credit Limit (₹ INR) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={approvedLimit}
                  onChange={(e) => setApprovedLimit(Math.max(0, parseFloat(e.target.value) || 0))}
                  required
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                  Approved Credit Period (Days) *
                </label>
                <select
                  value={approvedPeriod}
                  onChange={(e) => setApprovedPeriod(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value={7}>7 Days Credit</option>
                  <option value={15}>15 Days Credit</option>
                  <option value={30}>30 Days Credit</option>
                  <option value={45}>45 Days Credit</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Decision / Underwriting Notes</label>
            <textarea
              rows={2}
              placeholder="Trade reference verified, shop physical inspection, commercial conditions..."
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 font-semibold text-xs hover:bg-neutral-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isAuthorized || isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-40"
            >
              {isSubmitting ? "Recording..." : "Record Credit Decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
