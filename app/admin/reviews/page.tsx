"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Star,
  CheckCircle,
  XCircle,
  MessageSquare,
  ShieldCheck,
  Search,
  Flag,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertCircle,
  CheckSquare,
  Square,
  CornerDownRight,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export type ReviewStatus = "all" | "pending" | "approved" | "rejected" | "flagged";

interface AdminReview {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_location: string;
  product_slug: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string;
  images: string[];
  status: "pending" | "approved" | "rejected" | "flagged";
  verified: boolean;
  admin_reply_text: string | null;
  admin_reply_at: string | null;
  admin_reply_by: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminReviews() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<ReviewStatus>("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Row selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reply state
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch counts per status for tab badges
  const { data: countsRes, refetch: refetchCounts } = useQuery({
    queryKey: ["admin-reviews-counts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews/counts");
      if (!res.ok) throw new Error("Failed to fetch counts");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const counts = countsRes?.counts || { all: 0, pending: 0, approved: 0, rejected: 0, flagged: 0 };

  // Fetch reviews list
  const {
    data: reviewsRes,
    isLoading,
    isError,
    error,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ["admin-reviews", activeTab, debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: activeTab,
        search: debouncedSearch,
        page: String(page),
        limit: String(limit),
      });

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to fetch reviews");
      }
      return res.json();
    },
  });

  const reviews: AdminReview[] = reviewsRes?.data || [];
  const pagination = reviewsRes?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  // Clear selections when filter or page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, debouncedSearch, page]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    qc.invalidateQueries({ queryKey: ["admin-reviews-counts"] });
  };

  // Toggle single row selection
  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Toggle select all on current page
  const toggleSelectAll = () => {
    if (reviews.length === 0) return;
    const allSelected = reviews.every((r) => selectedIds.has(r.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      reviews.forEach((r) => next.add(r.id));
      setSelectedIds(next);
    }
  };

  // Update status for a single review
  const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected" | "flagged" | "pending") => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, admin_id: user?.id || user?.email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update review status");
      }

      toast.success(
        newStatus === "approved"
          ? "Review approved and published!"
          : newStatus === "rejected"
          ? "Review rejected & hidden from storefront"
          : newStatus === "flagged"
          ? "Review flagged for moderation review"
          : "Review set back to pending"
      );
      invalidateAll();
    } catch (err: any) {
      toast.error(err.message || "Could not update review status");
    }
  };

  // Handle posting/updating reply
  const handlePostReply = async (id: string) => {
    const trimmed = replyText.trim();
    if (!trimmed) {
      toast.error("Reply text cannot be empty.");
      return;
    }
    if (trimmed.length > 1000) {
      toast.error(`Reply exceeds maximum 1000 characters limit (${trimmed.length}/1000).`);
      return;
    }

    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/admin/reviews/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply_text: trimmed,
          admin_id: user?.email || user?.id || "Admin",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to post official reply");
      }

      toast.success("Official reply saved!");
      setReplyingId(null);
      setReplyText("");
      invalidateAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit official reply");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Execute bulk action
  const handleBulkAction = async (action: "approve" | "reject" | "flag" | "delete") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (action === "delete") {
      const confirmed = window.confirm(
        `Are you sure you want to permanently delete ${ids.length} selected review(s)? This action cannot be undone.`
      );
      if (!confirmed) return;
    }

    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/admin/reviews/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          action,
          admin_id: user?.email || user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Bulk action failed");
      }

      toast.success(data.message || `Bulk ${action} executed successfully`);
      setSelectedIds(new Set());
      invalidateAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute bulk action");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const tabs: { key: ReviewStatus; label: string; badge: number; colorClass: string }[] = [
    { key: "all", label: "All Reviews", badge: counts.all, colorClass: "bg-muted text-muted-foreground" },
    { key: "pending", label: "Pending", badge: counts.pending, colorClass: "bg-amber-100 text-amber-900 border border-amber-300" },
    { key: "approved", label: "Approved", badge: counts.approved, colorClass: "bg-emerald-100 text-emerald-900 border border-emerald-300" },
    { key: "rejected", label: "Rejected", badge: counts.rejected, colorClass: "bg-rose-100 text-rose-900 border border-rose-300" },
    { key: "flagged", label: "Flagged", badge: counts.flagged, colorClass: "bg-purple-100 text-purple-900 border border-purple-300" },
  ];

  const allOnPageSelected = reviews.length > 0 && reviews.every((r) => selectedIds.has(r.id));
  const someOnPageSelected = reviews.some((r) => selectedIds.has(r.id));

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="font-display text-3xl font-semibold text-[#0F3D2E]">Customer Reviews Moderation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve, flag, respond to, or reject product reviews submitted by buyers.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer, product, review..."
            className="font-subhead h-10 w-full rounded-full border border-border bg-background pl-10 pr-4 text-xs outline-none focus:border-primary transition"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                setPage(1);
              }}
              className={`font-subhead inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-background text-foreground/80 hover:bg-secondary"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? "bg-background text-foreground" : t.colorClass
                }`}
              >
                {t.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-20 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 backdrop-blur shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-xs font-semibold text-primary">
            <CheckSquare className="h-4 w-4" />
            <span>{selectedIds.size} review(s) selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkAction("approve")}
              disabled={bulkActionLoading}
              className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Approve selected
            </button>
            <button
              onClick={() => handleBulkAction("reject")}
              disabled={bulkActionLoading}
              className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" /> Reject selected
            </button>
            <button
              onClick={() => handleBulkAction("flag")}
              disabled={bulkActionLoading}
              className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition disabled:opacity-50"
            >
              <Flag className="h-3.5 w-3.5" /> Flag selected
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              disabled={bulkActionLoading}
              className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-background px-3.5 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete selected
            </button>
          </div>
        </div>
      )}

      {/* Main Review List Container */}
      <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
        {/* Table / List Header */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-3 text-xs font-bold text-muted-foreground">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground cursor-pointer"
              title="Select all on this page"
            >
              {allOnPageSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : someOnPageSelected ? (
                <Square className="h-4 w-4 text-primary opacity-60" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-subhead font-semibold">Select Page</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground">
            Showing {reviews.length} of {pagination.total} reviews
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-xs text-muted-foreground font-subhead">Loading customer reviews...</p>
          </div>
        ) : isError ? (
          /* Error State */
          <div className="grid place-items-center py-20 px-4 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="mt-3 text-sm font-semibold text-foreground">Failed to load reviews</p>
            <p className="mt-1 text-xs text-muted-foreground">{(error as any)?.message || "An unexpected error occurred."}</p>
            <button
              onClick={() => refetchReviews()}
              className="font-subhead mt-4 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              Try again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          /* Empty State */
          <div className="grid place-items-center py-20 px-4 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-base font-semibold text-foreground">No customer reviews found</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {debouncedSearch
                ? `No reviews match your search "${debouncedSearch}". Try a different keyword.`
                : activeTab !== "all"
                ? `There are currently no reviews with "${activeTab}" status.`
                : "No customer reviews have been submitted yet."}
            </p>
            {debouncedSearch && (
              <button
                onClick={() => setSearchInput("")}
                className="font-subhead mt-4 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-foreground"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          /* Reviews List Rows */
          <div className="divide-y divide-border">
            {reviews.map((rev) => {
              const isSelected = selectedIds.has(rev.id);
              const isReplying = replyingId === rev.id;

              // Left border styling based on review status
              let borderStatusClass = "border-l-4 border-l-amber-500 bg-amber-500/5";
              let badgeElement = (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                  <AlertCircle className="h-3 w-3" /> Pending Review
                </span>
              );

              if (rev.status === "approved" || rev.verified) {
                borderStatusClass = "border-l-4 border-l-emerald-500 bg-emerald-500/5";
                badgeElement = (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                    <ShieldCheck className="h-3 w-3" /> Approved & Published
                  </span>
                );
              } else if (rev.status === "rejected") {
                borderStatusClass = "border-l-4 border-l-rose-500 bg-rose-500/5";
                badgeElement = (
                  <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-300">
                    <XCircle className="h-3 w-3" /> Rejected
                  </span>
                );
              } else if (rev.status === "flagged") {
                borderStatusClass = "border-l-4 border-l-purple-500 bg-purple-500/5";
                badgeElement = (
                  <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-purple-300">
                    <Flag className="h-3 w-3" /> Flagged
                  </span>
                );
              }

              return (
                <div
                  key={rev.id}
                  className={`p-5 transition hover:bg-secondary/20 space-y-4 ${borderStatusClass} ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Row Header Info */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelectRow(rev.id)}
                        className="mt-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>

                      {/* Customer & Product details */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-subhead font-bold text-sm text-foreground">
                            {rev.customer_name}
                          </span>
                          <span className="text-xs text-muted-foreground">({rev.customer_location})</span>
                          {badgeElement}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-subhead">
                          <span className="inline-flex items-center gap-1 font-mono font-medium text-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
                            <Package className="h-3 w-3 text-primary" />
                            {rev.product_slug}
                          </span>
                          {rev.order_id && (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              Order #{rev.order_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 self-start sm:self-auto shrink-0">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < rev.rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-neutral-300 fill-neutral-200"
                          }`}
                        />
                      ))}
                      <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-300 ml-1">
                        {rev.rating}.0
                      </span>
                    </div>
                  </div>

                  {/* Review Title & Content Body */}
                  <div className="pl-7 space-y-1.5">
                    {rev.title && (
                      <h4 className="font-serif font-bold text-base text-foreground">{rev.title}</h4>
                    )}
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-line">
                      {rev.body}
                    </p>

                    {/* Image Attachments */}
                    {Array.isArray(rev.images) && rev.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {rev.images.map((imgUrl, idx) => (
                          <a
                            key={idx}
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden border border-border hover:opacity-90 transition"
                          >
                            <img
                              src={imgUrl}
                              alt={`Attachment ${idx + 1}`}
                              className="h-16 w-16 object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Existing Admin Reply preview if present */}
                  {rev.admin_reply_text && !isReplying && (
                    <div className="ml-7 p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                        <span className="flex items-center gap-1.5">
                          <CornerDownRight className="h-3.5 w-3.5" />
                          Official Response ({rev.admin_reply_by || "Admin"})
                        </span>
                        {rev.admin_reply_at && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {new Date(rev.admin_reply_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/80 pl-5 font-sans italic">
                        "{rev.admin_reply_text}"
                      </p>
                    </div>
                  )}

                  {/* Action Buttons & Timestamps Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pl-7 border-t border-border/40">
                    <div className="text-[11px] text-muted-foreground font-mono space-x-2">
                      <span>Submitted: {new Date(rev.created_at).toLocaleString()}</span>
                      {rev.moderated_at && (
                        <span>• Moderated: {new Date(rev.moderated_at).toLocaleString()}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Reply Button */}
                      <button
                        onClick={() => {
                          if (isReplying) {
                            setReplyingId(null);
                            setReplyText("");
                          } else {
                            setReplyingId(rev.id);
                            setReplyText(rev.admin_reply_text || "");
                          }
                        }}
                        className="font-subhead inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary transition cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        {rev.admin_reply_text ? "Edit Reply" : "Reply"}
                      </button>

                      {/* Approve Button */}
                      {rev.status !== "approved" && (
                        <button
                          onClick={() => handleUpdateStatus(rev.id, "approved")}
                          className="font-subhead inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Approve & Publish
                        </button>
                      )}

                      {/* Reject Button */}
                      {rev.status !== "rejected" && (
                        <button
                          onClick={() => handleUpdateStatus(rev.id, "rejected")}
                          className="font-subhead inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 px-3 py-1.5 text-xs font-semibold hover:bg-rose-100 transition cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      )}

                      {/* Flag Button */}
                      {rev.status !== "flagged" && (
                        <button
                          onClick={() => handleUpdateStatus(rev.id, "flagged")}
                          className="font-subhead inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 px-3 py-1.5 text-xs font-semibold hover:bg-purple-100 transition cursor-pointer"
                        >
                          <Flag className="h-3.5 w-3.5" /> Flag
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Reply Form Box */}
                  {isReplying && (
                    <div className="ml-7 mt-3 p-4 bg-secondary/40 rounded-2xl border border-primary/30 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-foreground">
                          Public Official Response
                        </label>
                        <span
                          className={`font-mono text-[11px] ${
                            replyText.length > 1000 ? "text-destructive font-bold" : "text-muted-foreground"
                          }`}
                        >
                          {replyText.length} / 1000 chars
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write official response to customer (visible publicly under review)..."
                        className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary resize-none font-sans"
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setReplyingId(null);
                            setReplyText("");
                          }}
                          className="font-subhead px-4 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:bg-background transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handlePostReply(rev.id)}
                          disabled={isSubmittingReply || replyText.length > 1000}
                          className="font-subhead inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition disabled:opacity-50"
                        >
                          {isSubmittingReply ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Post Official Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && !isError && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-secondary/20 px-5 py-3 text-xs">
            <div className="text-muted-foreground font-subhead">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total reviews)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="font-subhead inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-secondary disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="font-subhead inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-secondary disabled:opacity-40 cursor-pointer"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
