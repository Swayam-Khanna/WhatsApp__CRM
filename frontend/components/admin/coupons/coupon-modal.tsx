"use client";

import { useState, useEffect } from "react";
import {
  X,
  IndianRupee,
  Percent,
  Truck,
  Flame,
  Gift,
  AlertCircle,
  Trash2,
  Loader2,
  Check,
  Tag,
  Calendar,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/lib/mock/categories";
import { allProducts } from "@/lib/mock/products";
import type { Coupon, CouponType, CouponApplyTo } from "@/lib/coupon/types";

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (coupon: Coupon) => void;
  onDeleteSuccess?: (deletedId: string) => void;
  couponToEdit?: Coupon | null;
}

interface FormState {
  code: string;
  name: string;
  type: CouponType;
  value: string;
  buyQty: string;
  getQty: string;
  applyTo: CouponApplyTo;
  categoryId: string;
  itemIds: string[];
  applyOncePerOrder: boolean;
  includeSubscriptions: boolean;
  startDate: string;
  endDate: string;
  noEndDate: boolean;
  hasTotalLimit: boolean;
  totalUseLimit: string;
  limitOnePerCustomer: boolean;
  tags: string[];
  tagInput: string;
}

const defaultFormState: FormState = {
  code: "",
  name: "",
  type: "amount_off",
  value: "",
  buyQty: "2",
  getQty: "1",
  applyTo: "entire_order",
  categoryId: "dry-fruits",
  itemIds: [],
  applyOncePerOrder: false,
  includeSubscriptions: true,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  noEndDate: true,
  hasTotalLimit: false,
  totalUseLimit: "100",
  limitOnePerCustomer: true,
  tags: [],
  tagInput: "",
};

export function CouponModal({
  isOpen,
  onClose,
  onSuccess,
  onDeleteSuccess,
  couponToEdit,
}: CouponModalProps) {
  const isEditing = !!couponToEdit;
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Uniqueness check state
  const [checkingCode, setCheckingCode] = useState(false);
  const [codeDuplicateError, setCodeDuplicateError] = useState<string | null>(null);

  // Fetch available products for "Specific items" selector
  const { data: dbProducts = allProducts } = useQuery({
    queryKey: ["admin-products-for-coupons"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("farmer_products")
          .select("id, name, slug, price, category, unit, images")
          .order("name", { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) return data;
        return allProducts;
      } catch (e) {
        return allProducts;
      }
    },
    initialData: allProducts,
    enabled: isOpen,
  });

  // Initialize form on open/edit
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setShowDeleteConfirm(false);
      setCodeDuplicateError(null);

      if (couponToEdit) {
        setForm({
          code: couponToEdit.code || "",
          name: couponToEdit.name || "",
          type: couponToEdit.type || "amount_off",
          value: couponToEdit.value !== null && couponToEdit.value !== undefined ? String(couponToEdit.value) : "",
          buyQty: couponToEdit.buyQty ? String(couponToEdit.buyQty) : "2",
          getQty: couponToEdit.getQty ? String(couponToEdit.getQty) : "1",
          applyTo: couponToEdit.applyTo || "entire_order",
          categoryId: couponToEdit.categoryId || "dry-fruits",
          itemIds: couponToEdit.itemIds || [],
          applyOncePerOrder: !!couponToEdit.applyOncePerOrder,
          includeSubscriptions: couponToEdit.includeSubscriptions !== false,
          startDate: couponToEdit.startDate
            ? new Date(couponToEdit.startDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          endDate: couponToEdit.endDate
            ? new Date(couponToEdit.endDate).toISOString().split("T")[0]
            : "",
          noEndDate: !couponToEdit.endDate,
          hasTotalLimit: couponToEdit.totalUseLimit !== null && couponToEdit.totalUseLimit !== undefined,
          totalUseLimit:
            couponToEdit.totalUseLimit !== null && couponToEdit.totalUseLimit !== undefined
              ? String(couponToEdit.totalUseLimit)
              : "100",
          limitOnePerCustomer: couponToEdit.perCustomerLimit === 1,
          tags: couponToEdit.tags || [],
          tagInput: "",
        });
      } else {
        setForm(defaultFormState);
      }
    }
  }, [isOpen, couponToEdit]);

  // Debounced code uniqueness check
  useEffect(() => {
    if (!form.code || form.code.trim().length === 0) {
      setCodeDuplicateError(null);
      return;
    }

    if (isEditing && form.code.trim().toUpperCase() === couponToEdit?.code.toUpperCase()) {
      setCodeDuplicateError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingCode(true);
      try {
        const res = await fetch(`/api/admin/coupons?code=${encodeURIComponent(form.code.trim().toUpperCase())}`);
        const data = await res.json();
        if (data.exists && data.coupon?.id !== couponToEdit?.id) {
          setCodeDuplicateError(`Coupon code "${form.code.toUpperCase()}" is already in use.`);
        } else {
          setCodeDuplicateError(null);
        }
      } catch (e) {
        setCodeDuplicateError(null);
      } finally {
        setCheckingCode(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.code, isEditing, couponToEdit]);

  if (!isOpen) return null;

  // Handle Type switching
  const handleTypeChange = (newType: CouponType) => {
    setForm((prev) => ({
      ...prev,
      type: newType,
      // Clear values not relevant to new type
      value: newType === "free_shipping" || newType === "bogo" ? "" : prev.value,
      buyQty: newType === "bogo" ? prev.buyQty || "2" : "2",
      getQty: newType === "bogo" ? prev.getQty || "1" : "1",
    }));

    // Clear type specific error
    setErrors((prev) => {
      const next = { ...prev };
      delete next.value;
      delete next.bogo;
      return next;
    });
  };

  // Tag helpers
  const addTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && "key" in e && e.key !== "Enter" && e.key !== ",") return;
    if (e) e.preventDefault();

    const clean = form.tagInput.trim().toLowerCase().replace(/,/g, "");
    if (clean && !form.tags.includes(clean)) {
      setForm((prev) => ({
        ...prev,
        tags: [...prev.tags, clean],
        tagInput: "",
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  // Client-side Validation
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.code || form.code.trim().length === 0) {
      errs.code = "Coupon code is required";
    } else if (codeDuplicateError) {
      errs.code = codeDuplicateError;
    }

    if (!form.name || form.name.trim().length === 0) {
      errs.name = "Coupon display name is required";
    }

    if (form.type === "amount_off" || form.type === "percent_off" || form.type === "sale_price") {
      if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0) {
        errs.value = "Please enter a valid positive discount value";
      } else if (form.type === "percent_off" && Number(form.value) > 100) {
        errs.value = "Percentage discount cannot exceed 100%";
      }
    }

    if (form.type === "bogo") {
      if (!form.buyQty || Number(form.buyQty) < 1) {
        errs.buyQty = "Buy quantity must be at least 1";
      }
      if (!form.getQty || Number(form.getQty) < 1) {
        errs.getQty = "Get quantity must be at least 1";
      }
    }

    if (form.applyTo === "specific_items" && form.itemIds.length === 0) {
      errs.itemIds = "Please select at least one product";
    }

    if (!form.startDate) {
      errs.startDate = "Start date is required";
    }

    if (!form.noEndDate && form.endDate) {
      if (new Date(form.endDate).getTime() < new Date(form.startDate).getTime()) {
        errs.endDate = "End date cannot be earlier than start date";
      }
    }

    if (form.hasTotalLimit && (!form.totalUseLimit || Number(form.totalUseLimit) < 1)) {
      errs.totalUseLimit = "Please enter a valid total usage limit";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please resolve the errors highlighted in the form.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        type: form.type,
        value:
          form.type === "amount_off" || form.type === "percent_off" || form.type === "sale_price"
            ? Number(form.value)
            : null,
        buyQty: form.type === "bogo" ? Number(form.buyQty) : null,
        getQty: form.type === "bogo" ? Number(form.getQty) : null,
        applyTo: form.applyTo,
        categoryId: form.applyTo === "specific_category" ? form.categoryId : null,
        itemIds: form.applyTo === "specific_items" ? form.itemIds : null,
        applyOncePerOrder: form.applyOncePerOrder,
        includeSubscriptions: form.includeSubscriptions,
        startDate: new Date(form.startDate).toISOString(),
        endDate: !form.noEndDate && form.endDate ? new Date(form.endDate).toISOString() : null,
        totalUseLimit: form.hasTotalLimit && form.totalUseLimit ? Number(form.totalUseLimit) : null,
        perCustomerLimit: form.limitOnePerCustomer ? 1 : null,
        tags: form.tags,
      };

      const url = isEditing ? `/api/admin/coupons/${couponToEdit.id}` : "/api/admin/coupons";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${isEditing ? "update" : "create"} coupon.`);
      }

      toast.success(
        isEditing
          ? `Coupon "${data.data.code}" updated successfully!`
          : `Coupon "${data.data.code}" created successfully!`
      );
      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!couponToEdit) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${couponToEdit.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete coupon.");
      }

      toast.success(`Coupon "${couponToEdit.code}" deleted successfully.`);
      if (onDeleteSuccess) onDeleteSuccess(couponToEdit.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete coupon.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const TYPE_CARDS: Array<{
    type: CouponType;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      type: "amount_off",
      label: "₹ Discount",
      description: "Flat rupee deduction",
      icon: <IndianRupee className="h-4 w-4" />,
    },
    {
      type: "percent_off",
      label: "% Discount",
      description: "Percentage savings",
      icon: <Percent className="h-4 w-4" />,
    },
    {
      type: "free_shipping",
      label: "Free shipping",
      description: "Waive delivery fee",
      icon: <Truck className="h-4 w-4" />,
    },
    {
      type: "sale_price",
      label: "Sale price",
      description: "Fixed item price",
      icon: <Flame className="h-4 w-4" />,
    },
    {
      type: "bogo",
      label: "Buy X get Y free",
      description: "Volume gift bundle",
      icon: <Gift className="h-4 w-4" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {isEditing ? `Edit Coupon: ${couponToEdit?.code}` : "New Coupon"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? "Update promotional discount rules and validity."
                  : "Configure a promotional discount code for customer checkout."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(88vh-8rem)] overflow-y-auto">
          {/* 1. 5 Type-Selector Cards */}
          <div>
            <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2">
              Discount Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {TYPE_CARDS.map((card) => {
                const isSelected = form.type === card.type;
                return (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => handleTypeChange(card.type)}
                    className={`flex flex-col items-center justify-center text-center p-3 rounded-2xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full grid place-items-center mb-1.5 ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      }`}
                    >
                      {card.icon}
                    </div>
                    <span className="font-semibold text-xs leading-tight">{card.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Coupon Code & Internal Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1.5">
                Coupon Code *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => {
                    const uppercased = e.target.value.toUpperCase().replace(/\s+/g, "");
                    setForm({ ...form, code: uppercased });
                  }}
                  placeholder="e.g. HARVEST25"
                  className={`h-11 w-full rounded-xl border bg-background px-3.5 font-mono text-sm font-bold tracking-wider outline-none transition focus:border-primary uppercase ${
                    errors.code || codeDuplicateError ? "border-destructive text-destructive" : "border-border text-foreground"
                  }`}
                />
                {checkingCode && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {errors.code && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.code}</p>}
              {!errors.code && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Customers enter this code at checkout. Stored uppercase.
                </p>
              )}
            </div>

            <div>
              <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1.5">
                Coupon Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. ₹250 off Harvest festival"
                className={`h-11 w-full rounded-xl border bg-background px-3.5 text-sm outline-none transition focus:border-primary ${
                  errors.name ? "border-destructive" : "border-border text-foreground"
                }`}
              />
              {errors.name && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.name}</p>}
              {!errors.name && (
                <p className="mt-1 text-[10px] text-muted-foreground">Internal name displayed on admin reports.</p>
              )}
            </div>
          </div>

          {/* 3. Type-Specific Value Inputs */}
          <div className="rounded-2xl border border-border/80 bg-secondary/20 p-4 space-y-4">
            {form.type === "amount_off" && (
              <div>
                <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1.5">
                  Discount Amount (₹) *
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="250"
                    className={`h-11 w-full rounded-xl border bg-background pl-8 pr-3.5 font-display text-base font-semibold outline-none focus:border-primary ${
                      errors.value ? "border-destructive" : "border-border"
                    }`}
                  />
                </div>
                {errors.value && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.value}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">Flat rupee amount deducted from eligible items.</p>
              </div>
            )}

            {form.type === "percent_off" && (
              <div>
                <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1.5">
                  Discount Percentage (%) *
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max="100"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="15"
                    className={`h-11 w-full rounded-xl border bg-background pl-3.5 pr-8 font-display text-base font-semibold outline-none focus:border-primary ${
                      errors.value ? "border-destructive" : "border-border"
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    %
                  </span>
                </div>
                {errors.value && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.value}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">Percentage off eligible item subtotal (1–100%).</p>
              </div>
            )}

            {form.type === "sale_price" && (
              <div>
                <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1.5">
                  Promotional Sale Price (₹) *
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="499"
                    className={`h-11 w-full rounded-xl border bg-background pl-8 pr-3.5 font-display text-base font-semibold outline-none focus:border-primary ${
                      errors.value ? "border-destructive" : "border-border"
                    }`}
                  />
                </div>
                {errors.value && <p className="mt-1 text-[11px] text-destructive font-medium">{errors.value}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Overrides eligible item prices to this fixed amount (only applied when cheaper than current item price).
                </p>
              </div>
            )}

            {form.type === "free_shipping" && (
              <div className="flex items-center gap-3 py-1 text-xs text-foreground">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 grid place-items-center shrink-0">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Zero Shipping Delivery</p>
                  <p className="text-muted-foreground text-[11px]">
                    Completely zeros out the postage & packaging shipping fee on the order.
                  </p>
                </div>
              </div>
            )}

            {form.type === "bogo" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground">Buy X Get Y Free Configuration</p>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div>
                    <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1">
                      Buy Quantity (X) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.buyQty}
                      onChange={(e) => setForm({ ...form, buyQty: e.target.value })}
                      placeholder="2"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 font-display text-base font-semibold outline-none focus:border-primary"
                    />
                    {errors.buyQty && <p className="mt-1 text-[11px] text-destructive">{errors.buyQty}</p>}
                  </div>
                  <div>
                    <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1">
                      Get Free Quantity (Y) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.getQty}
                      onChange={(e) => setForm({ ...form, getQty: e.target.value })}
                      placeholder="1"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3.5 font-display text-base font-semibold outline-none focus:border-primary"
                    />
                    {errors.getQty && <p className="mt-1 text-[11px] text-destructive">{errors.getQty}</p>}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  In checkout, items are sorted price-descending and grouped into chunks of (X + Y). The cheapest Y item(s) in each full chunk are free.
                </p>
              </div>
            )}
          </div>

          {/* 4. "Apply To" Category / Item Picker */}
          <div className="space-y-3">
            <div>
              <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1.5">
                Apply Discount To *
              </label>
              <select
                value={form.applyTo}
                onChange={(e) => setForm({ ...form, applyTo: e.target.value as CouponApplyTo })}
                className="font-subhead h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary cursor-pointer"
              >
                <option value="entire_order">Entire order (All harvest products)</option>
                <option value="specific_category">Specific category</option>
                <option value="specific_items">Specific products</option>
              </select>
            </div>

            {/* Category Picker */}
            {form.applyTo === "specific_category" && (
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 animate-in fade-in duration-200 space-y-2">
                <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                  Select Harvest Category *
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="font-subhead h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary"
                >
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name} — {cat.description}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Product Items Picker */}
            {form.applyTo === "specific_items" && (
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 animate-in fade-in duration-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Select Eligible Products ({form.itemIds.length} selected) *
                  </label>
                  {form.itemIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, itemIds: [] })}
                      className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-border bg-background p-2">
                  {dbProducts.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">Loading products...</p>
                  ) : (
                    dbProducts.map((prod: any) => {
                      const isChecked = form.itemIds.includes(prod.slug);
                      return (
                        <label
                          key={prod.id || prod.slug}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                            isChecked ? "bg-primary/10 font-semibold text-primary" : "hover:bg-secondary text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setForm({ ...form, itemIds: [...form.itemIds, prod.slug] });
                                } else {
                                  setForm({
                                    ...form,
                                    itemIds: form.itemIds.filter((id) => id !== prod.slug),
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="truncate">{prod.name}</span>
                            <span className="text-[10px] text-muted-foreground">({prod.category})</span>
                          </div>
                          <span className="font-mono text-xs font-semibold ml-2">₹{prod.price}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                {errors.itemIds && <p className="text-[11px] text-destructive">{errors.itemIds}</p>}
              </div>
            )}

            {/* Radio Choice: Apply Once vs Every Eligible Item */}
            {(form.type === "amount_off" || form.type === "percent_off" || form.type === "sale_price") &&
              (form.applyTo === "specific_category" || form.applyTo === "specific_items") && (
                <div className="rounded-2xl border border-border/80 bg-background p-4 space-y-2">
                  <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2">
                    Item Application Rule
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="applyOnceRule"
                        checked={form.applyOncePerOrder}
                        onChange={() => setForm({ ...form, applyOncePerOrder: true })}
                        className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="font-semibold text-foreground">Apply once per order</span>
                        <p className="text-[11px] text-muted-foreground">
                          Discount applies strictly to the single lowest-priced eligible line item in the customer's cart.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="applyOnceRule"
                        checked={!form.applyOncePerOrder}
                        onChange={() => setForm({ ...form, applyOncePerOrder: false })}
                        className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="font-semibold text-foreground">Apply to every eligible item</span>
                        <p className="text-[11px] text-muted-foreground">
                          Discount calculates against all matching items in the customer's cart.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
          </div>

          {/* 5. Subscriptions toggle */}
          <div className="flex items-start gap-3 rounded-2xl border border-border/80 p-3.5 bg-secondary/10">
            <input
              type="checkbox"
              id="includeSubscriptions"
              checked={form.includeSubscriptions}
              onChange={(e) => setForm({ ...form, includeSubscriptions: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="includeSubscriptions" className="text-xs select-none cursor-pointer">
              <span className="font-semibold text-foreground">Include subscriptions</span>
              <p className="text-[11px] text-muted-foreground">
                Allow customers to apply this coupon to recurring harvest box subscription orders.
              </p>
            </label>
          </div>

          {/* 6. Validity Date Range */}
          <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
            <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Valid Between
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-muted-foreground font-semibold mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className={`h-11 w-full rounded-xl border bg-background px-3.5 text-xs outline-none focus:border-primary ${
                    errors.startDate ? "border-destructive" : "border-border text-foreground"
                  }`}
                />
                {errors.startDate && <p className="mt-1 text-[11px] text-destructive">{errors.startDate}</p>}
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground font-semibold mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  disabled={form.noEndDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className={`h-11 w-full rounded-xl border bg-background px-3.5 text-xs outline-none focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed ${
                    errors.endDate ? "border-destructive" : "border-border text-foreground"
                  }`}
                />
                {errors.endDate && <p className="mt-1 text-[11px] text-destructive">{errors.endDate}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="noEndDate"
                checked={form.noEndDate}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm({
                    ...form,
                    noEndDate: checked,
                    endDate: checked ? "" : form.endDate,
                  });
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="noEndDate" className="text-xs font-semibold text-foreground select-none cursor-pointer">
                Don't set an end date (Never expires)
              </label>
            </div>
          </div>

          {/* 7. Limit Uses Section */}
          <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
            <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Usage Limits
            </p>

            {/* Total Cap */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasTotalLimit"
                  checked={form.hasTotalLimit}
                  onChange={(e) => setForm({ ...form, hasTotalLimit: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="hasTotalLimit" className="text-xs font-semibold text-foreground select-none cursor-pointer">
                  Limit total number of times this coupon can be used
                </label>
              </div>

              {form.hasTotalLimit && (
                <div className="pl-6 pt-1 max-w-xs">
                  <input
                    type="number"
                    min="1"
                    value={form.totalUseLimit}
                    onChange={(e) => setForm({ ...form, totalUseLimit: e.target.value })}
                    placeholder="e.g. 500"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  />
                  {errors.totalUseLimit && <p className="mt-1 text-[11px] text-destructive">{errors.totalUseLimit}</p>}
                </div>
              )}

              {/* Warning when total limit is set below timesUsed */}
              {isEditing &&
                couponToEdit &&
                form.hasTotalLimit &&
                Number(form.totalUseLimit) < (couponToEdit.timesUsed || 0) && (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-900 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      ⚠️ This coupon has already been used <strong>{couponToEdit.timesUsed}</strong> times. Setting the limit below this count will immediately mark it exhausted.
                    </span>
                  </div>
                )}
            </div>

            {/* Per customer limit */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="limitOnePerCustomer"
                checked={form.limitOnePerCustomer}
                onChange={(e) => setForm({ ...form, limitOnePerCustomer: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="limitOnePerCustomer" className="text-xs font-semibold text-foreground select-none cursor-pointer">
                Limit to 1 use per customer
              </label>
            </div>
          </div>

          {/* 8. Tags Section */}
          <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
            <label className="block font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Tags (Press Enter to add)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.tagInput}
                onChange={(e) => setForm({ ...form, tagInput: e.target.value })}
                onKeyDown={addTag}
                placeholder="e.g. festive, first-order, flash-sale"
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3.5 text-xs outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-xl border border-border bg-secondary/60 px-4 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
              >
                + Add
              </button>
            </div>

            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-3 py-1 font-mono text-[11px] font-semibold text-foreground"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Delete Confirmation Alert if triggered */}
          {showDeleteConfirm && isEditing && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Confirm coupon deletion
              </div>
              <p className="text-xs text-destructive/90">
                Are you sure you want to delete <strong>{couponToEdit?.code}</strong>? Past customer orders and redemption history will remain intact.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 cursor-pointer disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Yes, Delete Permanently"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              {isEditing && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Coupon
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || checkingCode}
                className="inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0b2b20] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditing ? "Save Changes" : "Create Coupon"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
