"use client";

import { createFileRoute, Link, notFound, useParams } from "@/lib/tanstack-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Package,
  Truck,
  Calendar,
  ShieldCheck,
  Loader2,
  X,
  AlertTriangle,
  Edit,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Reveal } from "@/components/reveal";
import { inr } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const TRACKING_STEPS = [
  { status: "pending", label: "Ordered", desc: "Awaiting approval" },
  { status: "confirmed", label: "Confirmed", desc: "Delivery route assigned" },
  { status: "packed", label: "Packed", desc: "Ready for shipping" },
  { status: "shipped", label: "Shipped", desc: "In transit via courier" },
  { status: "delivered", label: "Delivered", desc: "Handed over" },
] as const;

function OrderDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloadingInvoice(true);
    try {
      const url = `/api/orders/${order.id}/invoice`;
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error("Failed to download invoice: " + err.message);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Address Form States
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress1, setEditAddress1] = useState("");
  const [editAddress2, setEditAddress2] = useState("");
  const [editLandmark, setEditLandmark] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPincode, setEditPincode] = useState("");

  // Trigger toast on payment return and clean up URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("cf_id") || params.get("payment_status") === "paid") {
        toast.success("Payment completed successfully! Order confirmed.");
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
      }
    }
  }, []);

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customer-order-detail", id],
    queryFn: async () => {
      // Check for Cashfree / payment redirect params
      let isPaymentCallback = false;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("cf_id") || params.get("order_id") || params.get("payment_status") === "paid") {
          isPaymentCallback = true;
        }
      }

      // Check localStorage for mock test orders
      if (typeof window !== "undefined" && (String(id).startsWith("order_mock_") || String(id).startsWith("cf_") || String(id).startsWith("order_"))) {
        const localMock = localStorage.getItem(`mock_order_${id}`);
        if (localMock) {
          try {
            const parsed = JSON.parse(localMock);
            if (isPaymentCallback || parsed.payment_method === "cashfree" || parsed.payment_method === "razorpay") {
              parsed.status = "confirmed";
              parsed.payment_status = "paid";
              localStorage.setItem(`mock_order_${id}`, JSON.stringify(parsed));
            }
            return parsed;
          } catch (e) {}
        }
      }

      const res = await fetch(`/api/orders/${encodeURIComponent(String(id))}`);
      if (!res.ok) {
        throw new Error("Order not found");
      }
      const json = await res.json();
      const ord = json.order || json.data;
      if (!ord) throw new Error("Order not found");
      if (isPaymentCallback) {
        ord.status = "confirmed";
        ord.payment_status = "paid";
      }
      return ord;
    },
  });

  // Load address data on open
  const openAddressModal = () => {
    if (!order) return;
    // Extract fields from address string if possible or fill defaults
    // Address format: line1, line2, Landmark: landmark, city, state, pincode
    const parts = order.shipping_address ? order.shipping_address.split(", ") : [];

    setEditName(order.shipping_name || order.customer_name || "");
    setEditPhone(order.shipping_phone || order.customer_phone || "");
    setEditAddress1(parts[0] || "");
    setEditAddress2(parts[1] || "");

    const landmarkPart = parts.find((p: string) => p.startsWith("Landmark:"));
    setEditLandmark(landmarkPart ? landmarkPart.replace("Landmark: ", "") : "");

    // Fallbacks
    setEditCity(order.shipping_address?.includes("Bengaluru") ? "Bengaluru" : parts[2] || "");
    setEditState(order.shipping_address?.includes("Karnataka") ? "Karnataka" : parts[3] || "");
    setEditPincode(order.shipping_address?.match(/\d{6}/)?.[0] || "");

    setShowAddressModal(true);
  };

  // Mutate Address Details
  const addressMut = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const now = new Date().toISOString();
      const newAddress = [
        editAddress1,
        editAddress2,
        editLandmark ? `Landmark: ${editLandmark}` : "",
        editCity,
        editState,
        editPincode,
      ]
        .filter(Boolean)
        .join(", ");

      const newHistoryLog = {
        status: order.status,
        title: "Shipping Address Updated",
        description: `Customer updated shipping address to: ${newAddress}`,
        timestamp: now,
      };

      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_name: editName,
          shipping_address: newAddress,
          shipping_phone: editPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update address");
    },
    onSuccess: () => {
      toast.success("Shipping address updated successfully!");
      setShowAddressModal(false);
      qc.invalidateQueries({ queryKey: ["customer-order-detail", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update address");
    },
  });

  // Mutate Order Cancellation (With Inventory Stock Recovery)
  const cancelMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by Customer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel order");
    },
    onSuccess: () => {
      toast.success("Order cancelled successfully. Refund initiated.");
      setShowCancelModal(false);
      qc.invalidateQueries({ queryKey: ["customer-order-detail", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to cancel order");
    },
  });

  // Mutate Order Return
  const returnMut = useMutation({
    mutationFn: async (reasonText: string) => {
      if (!order) return;
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonText || "No reason provided" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate return");
    },
    onSuccess: () => {
      toast.success("Return initiated successfully. Refund processed.");
      setShowReturnModal(false);
      setReturnReason("");
      qc.invalidateQueries({ queryKey: ["customer-order-detail", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to initiate return");
    },
  });

  // Items Editing State
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const openItemsModal = () => {
    if (!order) return;
    setEditingItems(JSON.parse(JSON.stringify(order.items || [])));
    setShowItemsModal(true);
  };

  const handleEditQty = (slug: string, delta: number) => {
    setEditingItems((prev) =>
      prev.map((it) => {
        if (it.slug === slug) {
          const newQty = Math.max(1, it.qty + delta);
          return { ...it, qty: newQty };
        }
        return it;
      }),
    );
  };

  const handleRemoveItem = (slug: string) => {
    setEditingItems((prev) => prev.filter((it) => it.slug !== slug));
  };

  // Mutate Order Items (Quantity edits & Stock recalculation)
  const itemsMut = useMutation({
    mutationFn: async () => {
      if (!order) return;
      if (editingItems.length === 0) {
        throw new Error("Cannot have an empty order. Please cancel the order instead.");
      }

      const now = new Date().toISOString();

      // Calculate new totals
      const newSubtotal = editingItems.reduce(
        (acc, it) => acc + Number(it.price) * Number(it.qty),
        0,
      );
      const newShippingFee = newSubtotal > 999 ? 0 : 49;
      const newTotal = newSubtotal + newShippingFee;
      const difference = order.total - newTotal;

      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editingItems,
          subtotal: newSubtotal,
          shipping_fee: newShippingFee,
          total: newTotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update items");

      return { difference };
    },
    onSuccess: (data) => {
      const diff = data?.difference || 0;
      if (diff > 0) {
        toast.success(`Order items updated. Refund of ${inr(diff)} initiated!`);
      } else if (diff < 0) {
        toast.success(`Order items updated. Balance of ${inr(Math.abs(diff))} updated.`);
      } else {
        toast.success("Order items updated successfully!");
      }
      setShowItemsModal(false);
      qc.invalidateQueries({ queryKey: ["customer-order-detail", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to edit order items");
    },
  });

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="container-prj py-32 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-subhead">Loading shipment details...</p>
        </div>
      </MarketingLayout>
    );
  }

  if (error || !order) {
    throw notFound();
  }

  const orderId = order.order_id || order.id?.slice(0, 8).toUpperCase();
  const date = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const getStepIndex = (status: string) => {
    switch (status) {
      case "pending_payment":
      case "pending_manual_payment":
      case "pending":
        return order?.payment_status === "paid" ? 1 : 0;
      case "confirmed":
      case "paid":
      case "cod_pending":
        return 1;
      case "packed":
        return 2;
      case "shipped":
        return 3;
      case "delivered":
        return 4;
      default:
        return order?.payment_status === "paid" ? 1 : 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);
  const items = order.items || [];

  // Checks if user is allowed to edit/cancel order
  const isEditable = order.status === "pending";
  const isCancellable = order.status === "pending" || order.status === "confirmed";

  return (
    <MarketingLayout>
      <section className="container-prj pt-10 pb-24 space-y-8 animate-fade-up">
        {/* Back Link */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/account/orders"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold">Track Shipment</h1>
              <p className="text-xs text-muted-foreground font-subhead">Order placed on {date}</p>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex flex-wrap gap-2">
            {isEditable && (
              <button
                onClick={openItemsModal}
                className="font-subhead h-9 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs font-semibold hover:bg-secondary cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 text-muted-foreground" /> Edit Order Items
              </button>
            )}

            {isCancellable && (
              <button
                onClick={openAddressModal}
                className="font-subhead h-9 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs font-semibold hover:bg-secondary cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Change Address
              </button>
            )}

            {isCancellable && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="font-subhead h-9 inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/5 px-4 text-xs font-bold text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Cancel Order
              </button>
            )}

            {order.status === "delivered" && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="font-subhead h-9 inline-flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/5 px-4 text-xs font-bold text-warning hover:bg-warning/10 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Return Order
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Tracking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Visual Timeline Card */}
            <Reveal>
              <div className="rounded-3xl border border-border bg-background p-6 md:p-8 space-y-8 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground font-subhead">
                      Shipment ID
                    </span>
                    <h2 className="font-display text-lg font-bold text-foreground mt-0.5">
                      {orderId}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground font-subhead">
                      Status
                    </span>
                    <p
                      className={`font-subhead text-xs font-bold uppercase mt-1 tracking-wider border rounded-full px-3 py-0.5 ${
                        order.status === "confirmed" || order.payment_status === "paid"
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : order.status === "cancelled"
                            ? "text-destructive bg-destructive/10 border-destructive/20"
                            : "text-primary bg-primary/5 border-primary/20"
                      }`}
                    >
                      {order.payment_status === "paid" && (order.status === "pending" || order.status === "pending_payment")
                        ? "CONFIRMED"
                        : String(order.status || "CONFIRMED").replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                {/* Stepper Timeline */}
                {order.status === "cancelled" ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-destructive/5 border border-destructive/10 p-5 text-destructive text-xs">
                    <AlertTriangle className="h-5.5 w-5.5 shrink-0" />
                    <div>
                      <p className="font-semibold font-display">This order has been cancelled</p>
                      <p className="mt-0.5 leading-relaxed">
                        No delivery will be attempted. If payment was made online, it will be
                        refunded to your source account.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
                    <div className="relative flex items-center justify-between min-w-[500px] max-w-xl mx-auto">
                      <div className="absolute left-0 right-0 top-4 h-0.5 bg-border -z-10" />
                      <div
                        className="absolute left-0 top-4 h-0.5 bg-primary -z-10 transition-all duration-500"
                        style={{ width: `${(currentStepIdx / 4) * 100}%` }}
                      />

                      {TRACKING_STEPS.map((s, idx) => {
                        const isActive = idx === currentStepIdx;
                        const isPassed = idx < currentStepIdx;

                        return (
                          <div key={s.status} className="flex flex-col items-center relative z-10 w-24">
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center border font-display text-xs font-bold transition-all duration-300 ${
                                isPassed
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : isActive
                                    ? "bg-background border-primary text-primary shadow-[0_0_0_4px_oklch(var(--primary)/0.1)] scale-110"
                                    : "bg-background border-border text-muted-foreground"
                              }`}
                            >
                              {isPassed ? (
                                <CheckCircle2 className="h-4.5 w-4.5 fill-primary text-primary-foreground" />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={`font-subhead text-[9px] uppercase tracking-wider mt-3 font-bold text-center ${
                                isActive ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shipping summary if approved */}
                {order.status !== "pending" &&
                  order.status !== "cancelled" &&
                  order.delivery_route && (
                    <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-secondary/35 border border-border p-4 text-xs">
                      <div>
                        <span className="text-muted-foreground font-subhead block mb-0.5">
                          Delivery Route Assigned
                        </span>
                        <span className="font-semibold text-foreground">
                          {order.delivery_route}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-subhead block mb-0.5">
                          Estimated Arrival Date
                        </span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-primary" />{" "}
                          {order.delivery_date
                            ? new Date(order.delivery_date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>
                      <div className="border-t border-border/80 pt-2.5 sm:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground font-subhead block mb-0.5">
                            Shipping Carrier
                          </span>
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-primary" /> {order.carrier_name}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-subhead block mb-0.5">
                            Original Tracking ID
                          </span>
                          <span className="font-mono font-bold text-foreground text-[11px]">
                            {order.tracking_number}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </Reveal>

            {/* Tracking Logs History */}
            <Reveal delay={100}>
              <div className="rounded-3xl border border-border bg-background p-6 md:p-8 space-y-5 shadow-sm">
                <h3 className="font-display text-base font-bold text-foreground">
                  Detailed Transit History
                </h3>

                {order.tracking_history && order.tracking_history.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {order.tracking_history.map((log: any, idx: number) => {
                      const logTime = log.timestamp
                        ? new Date(log.timestamp).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";
                      return (
                        <div key={idx} className="relative group animate-fade-up">
                          <div
                            className={`absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border-2 bg-background transition ${
                              idx === order.tracking_history.length - 1
                                ? "border-primary scale-110 shadow-[0_0_0_3px_oklch(var(--primary)/0.15)]"
                                : "border-border"
                            }`}
                          />

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-muted-foreground font-subhead block">
                              {logTime}
                            </span>
                            <h4 className="font-display font-semibold text-sm text-foreground">
                              {log.title}
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {log.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No tracking logs have been posted yet.
                  </p>
                )}
              </div>
            </Reveal>
          </div>

          {/* Sidebar Invoice Summary */}
          <aside className="space-y-6">
            {/* Soil to Soul Certificate Card */}
            <div className="rounded-3xl border border-[#0F3D2E]/20 bg-[#E9EFE9]/30 p-6 space-y-4 shadow-sm relative overflow-hidden">
              {/* Golden highlight */}
              <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-amber-300/20 to-amber-500/5 blur-xl" />

              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0F3D2E]/10 text-[#0F3D2E]">
                  <ShieldCheck className="h-5.5 w-5.5 text-[#0F3D2E]" />
                </span>
                <div>
                  <h4 className="font-display text-sm font-bold text-[#0F3D2E]">
                    Soil to Soul Certified
                  </h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Traceability Guaranteed
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                This order is certified chemical-free, lab-tested, and traceable back to the
                individual farmer's soil.
              </p>

              <button
                type="button"
                onClick={() => setShowCertificateModal(true)}
                className="font-subhead h-9 w-full rounded-full bg-[#0F3D2E] text-xs font-bold text-white hover:opacity-90 transition cursor-pointer"
              >
                View Trust Certificate
              </button>

              {order.payment_status === "paid" && (
                <button
                  type="button"
                  disabled={downloadingInvoice}
                  onClick={handleDownloadInvoice}
                  className="font-subhead h-9 w-full rounded-full border border-border bg-background text-xs font-bold text-foreground hover:bg-secondary transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
                >
                  {downloadingInvoice ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    "Download Invoice PDF"
                  )}
                </button>
              )}
            </div>

            {/* Delivery address */}
            <div className="rounded-3xl border border-border bg-background p-6 space-y-4 shadow-sm">
              <h3 className="font-display text-base font-bold text-foreground">Delivery details</h3>

              <div className="space-y-3.5 text-xs">
                <div className="flex gap-2.5 items-start">
                  <MapPin className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {order.shipping_name || order.customer_name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">
                      {order.shipping_address}
                    </p>
                    {order.customer_phone && (
                      <p className="text-muted-foreground mt-1.5 font-medium">
                        📞 {order.customer_phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-3.5 flex gap-2.5 items-start">
                  <ShieldCheck className="h-4.5 w-4.5 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Payment Information</p>
                    <p className="text-muted-foreground mt-0.5 capitalize">
                      Method: {order.payment_method}
                    </p>
                    <p
                      className={`font-semibold mt-1 ${
                        order.payment_status === "paid"
                          ? "text-success"
                          : order.payment_status === "refunded"
                            ? "text-destructive"
                            : "text-warning"
                      }`}
                    >
                      Status:{" "}
                      {order.payment_status === "paid"
                        ? "Paid"
                        : order.payment_status === "refunded"
                          ? "Refunded"
                          : order.payment_method === "cod"
                            ? "Cash on Delivery Pending"
                            : "Payment Pending"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items summary */}
            <div className="rounded-3xl border border-border bg-background p-6 space-y-4 shadow-sm">
              <h3 className="font-display text-base font-bold text-foreground">Items summary</h3>

              <ul className="space-y-4">
                {items.map((i: any) => {
                  const hsn = i.hsnCode || i.hsn_code || null;
                  const rate = i.gstRate !== undefined ? i.gstRate : (i.gst_rate !== undefined ? i.gst_rate : 0);
                  const taxable = i.taxableAmount !== undefined ? i.taxableAmount : (i.taxable_amount !== undefined ? i.taxable_amount : (i.price * i.qty));
                  const gstAmt = i.gstAmount !== undefined ? i.gstAmount : (i.gst_amount !== undefined ? i.gst_amount : 0);

                  return (
                    <li key={i.slug} className="border-b border-border/40 pb-3 last:border-0 last:pb-0 text-xs">
                      <div className="flex gap-3 items-center">
                        {i.image && (
                          <img
                            src={i.image}
                            alt={i.name}
                            className="h-11 w-11 rounded-lg object-cover border border-border shrink-0"
                          />
                        )}
                        <div className="flex-grow min-w-0">
                          <p className="font-subhead font-semibold text-foreground truncate">
                            {i.name}
                          </p>
                          <p className="text-muted-foreground mt-0.5">
                            Qty {i.qty || i.quantity} · {i.weight} {hsn ? `· HSN: ${hsn}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-subhead font-bold">{inr(i.price * (i.qty || i.quantity))}</p>
                          {rate > 0 && (
                            <p className="text-[9px] text-muted-foreground font-mono">
                              Taxable: {inr(taxable)} | GST {rate}%: {inr(gstAmt)}
                            </p>
                          )}
                          {hsn && rate === 0 && (
                            <p className="text-[9px] text-emerald-700 bg-emerald-50 px-1 rounded-sm inline-block font-mono">
                              GST Exempt (0%)
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-border pt-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal (Taxable)</span>
                  <span>{inr(order.subtotal ?? (order.total_amount ? (order.total_amount - (order.shipping_cost ?? 0) - (order.total_gst ?? 0) + (order.discount_amount ?? 0)) : (order.total ?? 0)))}</span>
                </div>
                {order.discount_amount !== undefined && order.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                    <span>-{inr(order.discount_amount)}</span>
                  </div>
                )}
                {order.total_gst !== undefined && order.total_gst > 0 && (
                  <div className="flex justify-between text-muted-foreground font-mono text-amber-800">
                    <span>GST Total</span>
                    <span>+{inr(order.total_gst)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping fee</span>
                  <span>
                    {(order.shipping_cost ?? order.shipping_fee ?? 0) === 0 
                      ? "Free" 
                      : inr(order.shipping_cost ?? order.shipping_fee ?? 0)}
                  </span>
                </div>
                {((order.gateway_fee ?? 0) > 0) && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{order.payment_method === "cod" ? "COD Handling Fee" : "Gateway Fee"}</span>
                    <span>{inr(order.gateway_fee)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2.5 flex justify-between text-sm font-display font-bold text-foreground">
                  <span>Grand Total</span>
                  <span>{inr(order.total_amount ?? order.total ?? 0)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* --- DIALOG MODALS --- */}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-background border border-border rounded-3xl p-6 space-y-6 shadow-lift animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-foreground">Cancel Order</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to cancel order{" "}
              <span className="font-semibold text-foreground">{orderId}</span>? Farmer crop reserves
              will be returned, and online payments will be refunded.
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowCancelModal(false)}
                className="font-subhead h-10 flex-1 rounded-full border border-border text-xs font-semibold hover:bg-secondary transition cursor-pointer"
              >
                No, keep order
              </button>
              <button
                onClick={() => cancelMut.mutate()}
                disabled={cancelMut.isPending}
                className="font-subhead h-10 flex-1 rounded-full bg-destructive text-xs font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {cancelMut.isPending ? "Cancelling..." : "Yes, cancel order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-background border border-border rounded-3xl p-6 space-y-6 shadow-lift animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-foreground">Return Order</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Please provide a reason for return.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-subhead text-[10px] uppercase tracking-wider text-muted-foreground">
                Reason for Return
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Received damaged products, items missing, incorrect order..."
                rows={3}
                className="w-full rounded-xl border border-border p-3 text-xs outline-none focus:border-primary transition resize-none bg-background text-foreground"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnReason("");
                }}
                className="font-subhead h-10 flex-1 rounded-full border border-border text-xs font-semibold hover:bg-secondary transition cursor-pointer text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => returnMut.mutate(returnReason)}
                disabled={returnMut.isPending || !returnReason.trim()}
                className="font-subhead h-10 flex-1 rounded-full bg-warning text-xs font-bold text-warning-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {returnMut.isPending ? "Submitting..." : "Submit Return"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Edit Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-3xl p-6 space-y-4 shadow-lift animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-display font-bold text-base text-foreground">
                Edit Shipping Address
              </h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-muted-foreground block mb-1">Full Name</span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-muted-foreground block mb-1">Phone Number</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="9876543210"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-muted-foreground block mb-1">Address Line 1</span>
                <input
                  type="text"
                  value={editAddress1}
                  onChange={(e) => setEditAddress1(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-muted-foreground block mb-1">
                    Address Line 2 (Optional)
                  </span>
                  <input
                    type="text"
                    value={editAddress2}
                    onChange={(e) => setEditAddress2(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-muted-foreground block mb-1">Landmark</span>
                  <input
                    type="text"
                    value={editLandmark}
                    onChange={(e) => setEditLandmark(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-muted-foreground block mb-1">City</span>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-2.5 outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-muted-foreground block mb-1">State</span>
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-2.5 outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-muted-foreground block mb-1">Pincode</span>
                  <input
                    type="text"
                    value={editPincode}
                    onChange={(e) => setEditPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-2.5 outline-none focus:border-primary"
                  />
                </label>
              </div>
            </div>

            <button
              onClick={() => addressMut.mutate()}
              disabled={addressMut.isPending}
              className="font-subhead h-11 w-full rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition mt-4 cursor-pointer"
            >
              {addressMut.isPending ? "Saving address..." : "Save Delivery Address"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Items Modal */}
      {showItemsModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-3xl p-6 space-y-5 shadow-lift animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-display font-bold text-base text-foreground">
                Adjust Order Items
              </h3>
              <button
                onClick={() => setShowItemsModal(false)}
                className="h-7 w-7 rounded-full hover:bg-secondary flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Verify quantities. Stock updates will synchronize with the farm catalog, and payment
              balances will recalculate automatically.
            </p>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {editingItems.map((item) => (
                <div
                  key={item.slug}
                  className="flex gap-3 border border-border rounded-xl p-3 bg-secondary/5 items-center"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-10 w-10 rounded-lg object-cover border border-border"
                    />
                  )}
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-display font-medium text-foreground truncate">{item.name}</p>
                    <p className="font-semibold text-muted-foreground mt-0.5">{inr(item.price)}</p>
                  </div>

                  <div className="flex items-center rounded-full border border-border bg-background shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditQty(item.slug, -1)}
                      className="h-7 w-7 flex items-center justify-center font-bold text-muted-foreground hover:text-foreground text-sm"
                    >
                      -
                    </button>
                    <span className="font-subhead text-xs w-6 text-center text-foreground font-semibold">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditQty(item.slug, 1)}
                      className="h-7 w-7 flex items-center justify-center font-bold text-muted-foreground hover:text-foreground text-sm"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.slug)}
                    className="p-1 hover:text-destructive text-muted-foreground transition shrink-0 ml-1"
                    title="Remove item"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => itemsMut.mutate()}
              disabled={itemsMut.isPending}
              className="font-subhead h-11 w-full rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition cursor-pointer mt-3"
            >
              {itemsMut.isPending ? "Updating order totals..." : "Update Order Items"}
            </button>
          </div>
        </div>
      )}

      {/* Soil to Soul Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#FAF8F5] border-4 border-[#C5A880] rounded-2xl p-8 relative shadow-2xl animate-scale-in text-center overflow-hidden">
            {/* Corner decorations */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#C5A880]" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#C5A880]" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#C5A880]" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#C5A880]" />

            {/* Close Button */}
            <button
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-4 right-4 h-7 w-7 rounded-full hover:bg-secondary/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer border border-border/40 bg-background/60"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="font-subhead text-[10px] font-bold uppercase tracking-[0.25em] text-[#8C6D4F]">
              Prajnaa Farm Authenticity
            </span>
            <h2 className="font-serif mt-3 text-3xl font-normal text-[#0F3D2E] italic">
              Certificate of Sourcing
            </h2>

            <div className="my-6 border-y border-[#C5A880]/30 py-4 space-y-3">
              <p className="text-xs text-[#5C4D3C] italic leading-relaxed">
                This document certifies that the produce delivered under Order #{orderId} has been
                verified under our Soil-to-Soul traceability protocol.
              </p>
              <p className="text-sm font-semibold text-[#0F3D2E]">
                Verified for Customer:{" "}
                <span className="underline decoration-dotted underline-offset-4">
                  {order.shipping_name || order.customer_name}
                </span>
              </p>
            </div>

            <div className="text-left space-y-4 max-h-[160px] overflow-y-auto my-4 pr-2 border-b border-[#C5A880]/20 pb-4">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                Traceability Log
              </p>
              {items.map((i: any) => (
                <div
                  key={i.slug}
                  className="flex justify-between items-center text-xs text-[#5C4D3C] border-b border-[#C5A880]/10 pb-1.5 last:border-0"
                >
                  <div>
                    <span className="font-medium text-foreground">{i.name}</span>
                    <p className="text-[10px] text-muted-foreground">{i.weight}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#0F3D2E] text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      100% Pure
                    </span>
                    <p className="text-[9px] text-[#8c6d4f] font-medium mt-0.5">
                      Sourced: Verified Partner Farm
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6 pt-4">
              <div className="text-left">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Certified Date
                </p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{date}</p>
              </div>

              {/* Gold Stamp */}
              <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-[#E2C799] to-[#C5A880] flex items-center justify-center shadow-lg border border-white/20 select-none">
                <div className="absolute inset-1 rounded-full border border-dashed border-white/40 animate-spin-slow" />
                <span className="font-serif text-[8px] font-bold text-[#0F3D2E] uppercase text-center leading-none tracking-tighter">
                  Prajnaa
                  <br />
                  Trust
                  <br />
                  Seal
                </span>
              </div>

              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Chief Verifier
                </p>
                <p className="font-serif text-sm text-[#8c6d4f] italic mt-0.5">R. S. Sharma</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </MarketingLayout>
  );
}

export default OrderDetailPage;
