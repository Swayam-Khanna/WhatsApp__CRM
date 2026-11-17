"use client";

import React, { useState } from "react";
import { X, FileText, Plus, Trash2, CheckCircle2, Edit3, Tag } from "lucide-react";
import { leadsService, LeadRecord, Quote } from "@/lib/services/leadsService";
import { SearchableProductSelect } from "@/components/common/SearchableProductSelect";
import { toast } from "sonner";

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadRecord;
  onQuoteCreated: () => void;
  products?: Array<{ id: string; name: string; price: number; weight?: string }>;
  existingQuote?: Quote | null;
}

export const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({
  isOpen,
  onClose,
  lead,
  onQuoteCreated,
  products = [
    { id: "organic-almonds", name: "Mamra Almonds (500g)", price: 1250 },
    { id: "turmeric-powder", name: "Stone-Ground Turmeric (250g)", price: 240 },
    { id: "walnuts", name: "Himalayan Mountain Walnuts (250g)", price: 604 },
    { id: "himalayan-dried-apricots", name: "Himalayan Dried Apricots (500g)", price: 999 },
    { id: "pink-himalayan-salt", name: "Pink Himalayan Salt (500g)", price: 180 },
    { id: "raw-honey", name: "Raw Himalayan Flora Honey (Bulk 5kg)", price: 3200 },
  ],
  existingQuote = null,
}) => {
  const isEditing = Boolean(existingQuote);

  const [items, setItems] = useState<
    Array<{
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      unitPricePaise: number;
      discountPercent: number;
    }>
  >(() => {
    if (existingQuote && Array.isArray(existingQuote.items) && existingQuote.items.length > 0) {
      return existingQuote.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unit: it.unit || "kg",
        unitPricePaise: it.unitPricePaise,
        discountPercent: it.discountPercent || 0,
      }));
    }
    if (lead.items && lead.items.length > 0) {
      return lead.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unit: it.unit || "kg",
        unitPricePaise: it.indicativeUnitPricePaise,
        discountPercent: 0,
      }));
    }
    return [
      {
        productId: products[0]?.id || "organic-almonds",
        productName: products[0]?.name || "Mamra Almonds",
        quantity: 5,
        unit: "kg",
        unitPricePaise: (products[0]?.price || 1250) * 100,
        discountPercent: 0,
      },
    ];
  });

  const [paymentTerms, setPaymentTerms] = useState(
    existingQuote?.paymentTerms ||
      (lead.businessModel === "b2b_wholesale"
        ? "15 Days Credit (Approved Terms)"
        : "Prepaid UPI / Bank Transfer")
  );
  const [deliveryTerms, setDeliveryTerms] = useState(
    existingQuote?.deliveryTerms ||
      "Direct Door Delivery via Shipping (2-3 business days)"
  );
  const [validDays, setValidDays] = useState(14);
  const [discountPaise, setDiscountPaise] = useState<number>(existingQuote?.discountPaise || 0);
  const [notes, setNotes] = useState(existingQuote?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const addItem = () => {
    const p = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: p.id,
        productName: p.name,
        quantity: 1,
        unit: "kg",
        unitPricePaise: p.price * 100,
        discountPercent: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      if (field === "productId") {
        const found = products.find((p) => p.id === val);
        if (found) {
          copy[idx].productId = found.id;
          copy[idx].productName = found.name;
          copy[idx].unitPricePaise = found.price * 100;
        }
      } else {
        (copy[idx] as any)[field] = val;
      }
      return copy;
    });
  };

  const subtotalPaise = items.reduce((acc, it) => {
    const discounted = it.unitPricePaise * (1 - (it.discountPercent || 0) / 100);
    return acc + Math.round(discounted * it.quantity);
  }, 0);

  const totalPaise = Math.max(0, subtotalPaise - discountPaise);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Please add at least one product item");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && existingQuote) {
        const res = await leadsService.updateQuote(lead.id, existingQuote.id, {
          items,
          paymentTerms,
          deliveryTerms,
          validDays,
          discountPaise,
          notes,
          updatedBy: lead.ownerName || "Sales Agent",
        });

        if (res.success && res.quote) {
          toast.success(
            `Quotation #${res.quote.quoteNumber} (v${res.quote.version}) updated successfully!`
          );
          onQuoteCreated();
          onClose();
        } else {
          toast.error(res.error || "Failed to update quote");
        }
      } else {
        const res = await leadsService.createQuote(lead.id, {
          items,
          paymentTerms,
          deliveryTerms,
          validDays,
          discountPaise,
          notes,
          createdBy: lead.ownerName || "Sales Agent",
        });

        if (res.success && res.quote) {
          toast.success(`Quotation #${res.quote.quoteNumber} (v${res.quote.version}) created!`);
          onQuoteCreated();
          onClose();
        } else {
          toast.error(res.error || "Failed to create quote");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-neutral-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
              {isEditing ? <Edit3 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">
                {isEditing
                  ? `Modify Commercial Quotation #${existingQuote?.quoteNumber || ""} (v${existingQuote?.version || 1})`
                  : "Generate Commercial Quotation"}
              </h3>
              <p className="text-[11px] text-neutral-500">
                Lead: {lead.reference} · {lead.contactName} ({lead.businessName || "Retail"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1 text-xs">
          {/* Itemized Products */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-neutral-800 dark:text-slate-200 uppercase text-[10px] tracking-wider block">
                Itemized Produce & Margin ({items.length} items)
              </label>
              <button
                type="button"
                onClick={addItem}
                className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Product
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-2xl border border-neutral-200/80 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-neutral-400 font-mono">
                      Line Item #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Searchable Product Select */}
                  <SearchableProductSelect
                    products={products}
                    selectedProductId={it.productId}
                    onSelectProduct={(p) => {
                      updateItem(idx, "productId", p.id);
                      updateItem(idx, "productName", p.name);
                      updateItem(idx, "unitPricePaise", p.price * 100);
                    }}
                    placeholder="Search product..."
                  />

                  {/* Pricing and Quantity controls */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center pt-1">
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                        Quantity
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-16 p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center font-bold"
                        />
                        <select
                          value={it.unit || "kg"}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                          className="flex-1 p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                        >
                          <option value="kg">kg</option>
                          <option value="units">units</option>
                          <option value="jars">jars</option>
                          <option value="cases">cases</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                        Base Price
                      </label>
                      <div className="p-2 rounded-xl bg-neutral-100 dark:bg-slate-700/50 font-mono text-center text-neutral-700 dark:text-slate-300 font-bold">
                        ₹{(it.unitPricePaise / 100).toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                        Discount %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="80"
                        value={it.discountPercent || 0}
                        onChange={(e) =>
                          updateItem(idx, "discountPercent", parseFloat(e.target.value) || 0)
                        }
                        className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                        Line Total
                      </label>
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-mono text-center font-bold">
                        ₹
                        {(
                          Math.round(
                            (it.unitPricePaise * (1 - (it.discountPercent || 0) / 100) * it.quantity) /
                              100
                          ) || 0
                        ).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
            <span className="font-bold text-neutral-800 dark:text-slate-200">
              Total Quotation Commercial Value
            </span>
            <div className="text-right">
              <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                ₹{(totalPaise / 100).toLocaleString("en-IN")}
              </span>
              {discountPaise > 0 && (
                <span className="block text-[10px] text-emerald-600">
                  (Includes ₹{(discountPaise / 100).toLocaleString("en-IN")} commercial discount)
                </span>
              )}
            </div>
          </div>

          {/* Commercial Terms & Validation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                Additional Commercial Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={discountPaise ? discountPaise / 100 : ""}
                onChange={(e) => setDiscountPaise(e.target.value ? parseFloat(e.target.value) * 100 : 0)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                Delivery / Logistics Terms
              </label>
              <input
                type="text"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                Quote Validity Period (Days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={validDays}
                onChange={(e) => setValidDays(parseInt(e.target.value) || 14)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
              Internal & Dispatch Notes
            </label>
            <textarea
              rows={2}
              placeholder="Commercial notes, batch reserve dates, or packing instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-600 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isEditing ? "Save Quote Changes" : "Generate Commercial Offer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuoteModal;
