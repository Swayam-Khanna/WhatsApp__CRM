"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Package,
  IndianRupee,
  ShoppingBag,
  User,
  MapPin,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { calculateOrderTotals } from "@/lib/orders/order-pricing";
import { adminFetch } from "@/lib/api/admin-auth.client";

interface AddOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (newOrder: any) => void;
}

export function AddOrderModal({ isOpen, onClose, onOrderCreated }: AddOrderModalProps) {
  const [submitting, setSubmitting] = useState(false);

  // Customer State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Address State
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");

  // Line Items
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      slug: string;
      name: string;
      unitPrice: number;
      qty: number;
      maxStock: number;
      unit: string;
      image: string | null;
    }>
  >([]);

  // Selected product picker state
  const [productPickerSlug, setProductPickerSlug] = useState("");

  // Charges
  const [shippingCost, setShippingCost] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "whatsapp">("cod");
  const [orderNote, setOrderNote] = useState("");

  // Fetch real catalog products when modal opens
  useEffect(() => {
    if (!isOpen) return;

    async function loadCatalog() {
      setLoadingProducts(true);
      try {
        const { data, error } = await supabase
          .from("farmer_products")
          .select("id, name, slug, price, stock, unit, images, status")
          .eq("status", "published")
          .order("name", { ascending: true });

        if (!error && data) {
          setAvailableProducts(data);
        }
      } catch (e) {
        console.warn("Error loading catalog for manual order:", e);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadCatalog();
  }, [isOpen]);

  if (!isOpen) return null;

  // Add line item from catalog
  const handleAddProduct = () => {
    if (!productPickerSlug) return;
    const prod = availableProducts.find((p) => p.slug === productPickerSlug);
    if (!prod) return;

    if (Number(prod.stock ?? 0) <= 0) {
      toast.error(`"${prod.name}" is out of stock.`);
      return;
    }

    // Check if already in items
    const existingIndex = selectedItems.findIndex((it) => it.slug === prod.slug);
    if (existingIndex > -1) {
      const current = selectedItems[existingIndex];
      if (current.qty + 1 > current.maxStock) {
        toast.error(`Only ${current.maxStock} ${current.unit || "kg"} of "${prod.name}" available in stock.`);
        return;
      }
      const updated = [...selectedItems];
      updated[existingIndex].qty += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          slug: prod.slug,
          name: prod.name,
          unitPrice: Number(prod.price ?? 0),
          qty: 1,
          maxStock: Number(prod.stock ?? 1),
          unit: prod.unit || "kg",
          image: Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : null,
        },
      ]);
    }

    setProductPickerSlug("");
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    const item = selectedItems[index];
    if (newQty < 1) return;
    if (newQty > item.maxStock) {
      toast.error(`Maximum stock available for "${item.name}" is ${item.maxStock}`);
      return;
    }
    const updated = [...selectedItems];
    updated[index].qty = newQty;
    setSelectedItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, idx) => idx !== index));
  };

  // Compute live totals preview
  const liveTotals = calculateOrderTotals({
    items: selectedItems.map((i) => ({
      productId: i.slug,
      name: i.name,
      slug: i.slug,
      unitPrice: i.unitPrice,
      qty: i.qty,
    })),
    shippingCost: parseFloat(shippingCost) || 0,
    discountAmount: parseFloat(discountAmount) || 0,
    paymentMethod,
  });

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return; // Double-click protection

    if (!customerName.trim()) {
      return toast.error("Please enter the customer's name");
    }
    if (!customerPhone.trim()) {
      return toast.error("Please enter the customer's phone number");
    }
    if (!addressLine1.trim() || !city.trim() || !state.trim()) {
      return toast.error("Please fill in complete address (line 1, city, state)");
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      return toast.error("Please enter a valid 6-digit PIN code");
    }
    if (selectedItems.length === 0) {
      return toast.error("Please add at least one product from the catalog");
    }

    setSubmitting(true);
    try {
      const fullAddress = `${addressLine1}${landmark ? `, Near ${landmark}` : ""}, ${city}, ${state} - ${pincode}`;

      const res = await adminFetch("/api/admin/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || null,
          customerPhone: customerPhone.trim(),
          shippingAddress: fullAddress,
          shippingPincode: pincode.trim(),
          items: selectedItems,
          shippingCost: parseFloat(shippingCost) || 0,
          discountAmount: parseFloat(discountAmount) || 0,
          paymentMethod,
          orderNote: orderNote.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      toast.success(data.message || `Order created successfully!`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("prajnaa_order_placed", { detail: data.order }));
        window.dispatchEvent(new Event("storage"));
      }
      onOrderCreated(data.order);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl my-8 p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Create Manual Order
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add a phone, offline, or WhatsApp order directly with real catalog items.
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Customer Details */}
          <div className="space-y-3">
            <h3 className="font-subhead text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" /> Customer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Phone Number <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Shipping Address */}
          <div className="space-y-3">
            <h3 className="font-subhead text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Delivery Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Address Line 1 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="House/Flat No., Building name, Street"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Metro Station"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  City <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  State <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Karnataka"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  PIN Code (6 digits) <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 560001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Live Catalog Products */}
          <div className="space-y-3">
            <h3 className="font-subhead text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Catalog Products (Real Inventory)
            </h3>

            {/* Product Selector */}
            <div className="flex items-center gap-2">
              <select
                disabled={loadingProducts}
                value={productPickerSlug}
                onChange={(e) => setProductPickerSlug(e.target.value)}
                className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary cursor-pointer disabled:opacity-50"
              >
                <option value="">
                  {loadingProducts ? "Loading live catalog..." : "Select a product to add..."}
                </option>
                {availableProducts.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} — {inr(Number(p.price))} (Stock: {p.stock} {p.unit || ""})
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!productPickerSlug}
                onClick={handleAddProduct}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition disabled:opacity-40 cursor-pointer shrink-0"
              >
                Add Item
              </button>
            </div>

            {/* Selected items table */}
            {selectedItems.length > 0 ? (
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs bg-card">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-9 w-9 rounded-lg object-cover border border-border shrink-0"
                        />
                      )}
                      <div className="truncate">
                        <div className="font-semibold text-foreground truncate">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {inr(item.unitPrice)} / {item.unit} (Max: {item.maxStock})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Qty controls */}
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.qty - 1)}
                          className="px-2 py-1 bg-secondary hover:bg-secondary/80 text-foreground font-bold"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-center font-bold text-xs">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, item.qty + 1)}
                          className="px-2 py-1 bg-secondary hover:bg-secondary/80 text-foreground font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="font-display font-bold text-xs w-20 text-right">
                        {inr(item.unitPrice * item.qty)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-destructive hover:opacity-80 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                No items added yet. Select products above to build the order.
              </div>
            )}
          </div>

          {/* Section 4: Payment Method (COD or WhatsApp ONLY) & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Payment Method (Strictly COD or WhatsApp)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                      paymentMethod === "cod"
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="text-primary"
                    />
                    <span>Cash on Delivery</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition ${
                      paymentMethod === "whatsapp"
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="whatsapp"
                      checked={paymentMethod === "whatsapp"}
                      onChange={() => setPaymentMethod("whatsapp")}
                      className="text-primary"
                    />
                    <span>WhatsApp Manual</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Shipping Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Customer / Internal Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional delivery instructions or phone order notes..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Financial Summary Preview */}
            <div className="bg-secondary/30 border border-border rounded-xl p-4 flex flex-col justify-between text-xs space-y-2">
              <h4 className="font-display font-semibold text-xs text-foreground uppercase tracking-wider border-b border-border/60 pb-2">
                Server-Calculated Breakdown
              </h4>

              <div className="space-y-1.5 flex-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{inr(liveTotals.subtotal)}</span>
                </div>
                {liveTotals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discount:</span>
                    <span>-{inr(liveTotals.discountAmount)}</span>
                  </div>
                )}
                {liveTotals.totalGst > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (Taxes):</span>
                    <span>+{inr(liveTotals.totalGst)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping:</span>
                  <span>{liveTotals.shippingCost === 0 ? "Free" : inr(liveTotals.shippingCost)}</span>
                </div>
              </div>

              <div className="border-t border-border pt-2 flex justify-between font-display text-base font-bold text-foreground">
                <span>Grand Total:</span>
                <span>{inr(liveTotals.total)}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl border border-border text-muted-foreground hover:bg-secondary font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedItems.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-95 active:scale-[0.98] transition cursor-pointer disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Order...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Create Order & Lock Stock
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
