"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Ticket,
  Percent,
  IndianRupee,
  Truck,
  Flame,
  Gift,
  Tag,
  Copy,
  Check,
  Filter,
  Calendar,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  Edit3,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { CouponModal } from "@/components/admin/coupons/coupon-modal";
import {
  formatCouponDiscountLabel,
  formatCouponAppliesToLabel,
} from "@/lib/coupon/coupon-service";
import type { Coupon, CouponStatus } from "@/lib/coupon/types";
import Link from "next/link";

function AdminCouponsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirmCoupon, setDeleteConfirmCoupon] = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch coupons from API
  const { data: coupons = [], isLoading, refetch, isFetching } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load coupons");
      }
      return data.data || [];
    },
  });

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied "${code}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleDeleteDirect = (coupon: Coupon, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmCoupon(coupon);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmCoupon) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${deleteConfirmCoupon.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete coupon");
      }
      toast.success(`Coupon "${deleteConfirmCoupon.code}" deleted successfully.`);
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDeleteConfirmCoupon(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete coupon");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalSuccess = (savedCoupon: Coupon) => {
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  const handleModalDelete = (deletedId: string) => {
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  // Filter coupons client-side
  const filteredCoupons = coupons.filter((c) => {
    // Status Filter
    if (statusFilter !== "all" && c.status !== statusFilter) {
      return false;
    }

    // Type Filter
    if (typeFilter !== "all" && c.type !== typeFilter) {
      return false;
    }

    // Search query across name, code, tags
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const codeMatch = c.code.toLowerCase().includes(q);
      const nameMatch = c.name.toLowerCase().includes(q);
      const tagMatch = c.tags?.some((t) => t.toLowerCase().includes(q));
      if (!codeMatch && !nameMatch && !tagMatch) {
        return false;
      }
    }

    return true;
  });

  // Calculate Quick Stats
  const activeCount = coupons.filter((c) => c.status === "active").length;
  const totalUses = coupons.reduce((sum, c) => sum + (c.timesUsed || 0), 0);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "amount_off":
        return <IndianRupee className="h-3.5 w-3.5" />;
      case "percent_off":
        return <Percent className="h-3.5 w-3.5" />;
      case "free_shipping":
        return <Truck className="h-3.5 w-3.5" />;
      case "sale_price":
        return <Flame className="h-3.5 w-3.5" />;
      case "bogo":
        return <Gift className="h-3.5 w-3.5" />;
      default:
        return <Tag className="h-3.5 w-3.5" />;
    }
  };

  const getStatusBadge = (status?: CouponStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-bold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Active
          </span>
        );
      case "scheduled":
        return (
          <span className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Scheduled
          </span>
        );
      case "expired":
      default:
        return (
          <span className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
            Expired
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Discounts Section Breadcrumb / Subnav */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-xs">
        <Link
          href="/admin/discounts"
          className="font-subhead font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          Discounts
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="font-subhead font-bold uppercase tracking-wider text-primary">Coupons</span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/admin/discounts?tab=automatic"
            className="font-subhead rounded-full bg-secondary/70 hover:bg-secondary px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition"
          >
            Automatic Discounts (Wix sibling) →
          </Link>
        </div>
      </div>

      {/* Main Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Coupons
            <span className="font-mono text-sm font-semibold rounded-full bg-primary/10 text-primary px-3 py-0.5">
              {coupons.length}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage promotional checkout codes, flat rate deductions, percentage sales, free delivery, and BOGO offers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh coupons"
            className="h-10 w-10 rounded-full border border-border bg-background grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="font-subhead inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#154d3b] transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Coupon
          </button>
        </div>
      </div>

      {/* Quick Stat Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="font-subhead text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Total Coupons</p>
          <p className="font-display mt-1 text-2xl font-bold text-foreground">{coupons.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="font-subhead text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Active Now</p>
          <p className="font-display mt-1 text-2xl font-bold text-success">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="font-subhead text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Total Redemptions</p>
          <p className="font-display mt-1 text-2xl font-bold text-foreground">{totalUses.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="font-subhead text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Discount Engine</p>
          <p className="font-display mt-1 text-xs font-semibold text-primary">5 Offer Types Enabled</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupons by code, name, or #tag..."
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="font-subhead h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="font-subhead h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="amount_off">₹ Discount</option>
            <option value="percent_off">% Discount</option>
            <option value="free_shipping">Free Shipping</option>
            <option value="sale_price">Sale Price</option>
            <option value="bogo">Buy X Get Y Free</option>
          </select>

          {(search || statusFilter !== "all" || typeFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setTypeFilter("all");
              }}
              className="text-xs font-semibold text-primary hover:underline px-2 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40">
              <tr className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                <th className="px-5 py-3.5">Name</th>
                <th className="px-4 py-3.5">Discount</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5 text-center">Uses</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5">Tags</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-xs font-medium">Loading promotional coupons...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <div className="mx-auto max-w-sm space-y-3">
                      <div className="mx-auto h-12 w-12 rounded-full bg-secondary grid place-items-center text-muted-foreground">
                        <Ticket className="h-6 w-6" />
                      </div>
                      <p className="font-display text-base font-bold text-foreground">No coupons found</p>
                      <p className="text-xs text-muted-foreground">
                        {search || statusFilter !== "all" || typeFilter !== "all"
                          ? "No promotional coupons match your current search or filter criteria."
                          : "Get started by creating your first promotional coupon discount."}
                      </p>
                      <button
                        onClick={handleOpenCreate}
                        className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-[#0F3D2E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#154d3b] transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Create Coupon
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((c) => {
                  const discountLabel = formatCouponDiscountLabel(c);
                  const appliesToLabel = formatCouponAppliesToLabel(c);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenEdit(c)}
                      className="group cursor-pointer transition hover:bg-secondary/30"
                    >
                      {/* Name Column */}
                      <td className="px-5 py-4">
                        <div className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.endDate
                            ? `Valid until ${new Date(c.endDate).toLocaleDateString("en-IN")}`
                            : "No expiry date"}
                        </div>
                      </td>

                      {/* Discount Value + Applies to Subtext */}
                      <td className="px-4 py-4">
                        <div className="font-display font-bold text-foreground">{discountLabel}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {appliesToLabel}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground">
                          <span className="text-muted-foreground">{getTypeIcon(c.type)}</span>
                          <span className="capitalize">{c.type.replace("_", " ")}</span>
                        </span>
                      </td>

                      {/* Code with Copy Action */}
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background px-3 py-1 font-mono text-xs font-bold text-foreground group-hover:border-primary/50 transition">
                          <span>{c.code}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyCode(c.code, e)}
                            title="Copy code"
                            className="text-muted-foreground hover:text-foreground transition p-0.5 cursor-pointer"
                          >
                            {copiedCode === c.code ? (
                              <Check className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Uses / Limit */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {c.timesUsed.toLocaleString()}
                        </span>
                        {c.totalUseLimit && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {" "}/ {c.totalUseLimit.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">{getStatusBadge(c.status)}</td>

                      {/* Tags */}
                      <td className="px-5 py-4">
                        {c.tags && c.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {c.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                              >
                                #{t}
                              </span>
                            ))}
                            {c.tags.length > 2 && (
                              <span className="text-[10px] text-muted-foreground font-mono self-center">
                                +{c.tags.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Edit coupon"
                            className="h-8 px-2.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground transition inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDirect(c, e)}
                            title="Delete coupon"
                            className="h-8 w-8 rounded-lg border border-border bg-background hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive transition inline-flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Delete Confirmation Dialog */}
      {deleteConfirmCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-destructive/30 bg-background p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-foreground">
                  Delete Coupon Code
                </h3>
                <p className="text-xs text-muted-foreground">
                  Permanently remove promotional discount code.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-subhead">Coupon Code:</span>
                <span className="font-mono font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border">
                  {deleteConfirmCoupon.code}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-subhead">Coupon Name:</span>
                <span className="font-semibold text-foreground">{deleteConfirmCoupon.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-subhead">Status:</span>
                <span className="capitalize font-semibold text-foreground">{deleteConfirmCoupon.status || "Active"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-subhead">Past Redemptions:</span>
                <span className="font-mono font-semibold text-foreground">{deleteConfirmCoupon.timesUsed || 0} times</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong>{deleteConfirmCoupon.code}</strong>? Once deleted, customers will no longer be able to apply this code at checkout. Past completed orders will not be affected.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmCoupon(null)}
                className="rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-5 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Coupon Modal */}
      <CouponModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        onDeleteSuccess={handleModalDelete}
        couponToEdit={editingCoupon}
      />
    </div>
  );
}

export default AdminCouponsPage;
