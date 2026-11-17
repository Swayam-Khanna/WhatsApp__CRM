"use client";

import React, { useState, use, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Package,
  Truck,
  IndianRupee,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  Edit2,
  Trash2,
  Tag as TagIcon,
  MessageSquare,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  X,
  Plus,
  Loader2,
  Send,
  Eye,
  Check,
  Calendar,
  CreditCard,
  Sprout,
  ShieldCheck,
  ChevronDown,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { getClientAuthToken } from "@/lib/api/admin-auth.client";
import {
  getWixFulfillmentLabel,
  FULFILLMENT_BADGE_STYLES,
  getWixPaymentLabel,
  PAYMENT_BADGE_STYLES,
  PAYMENT_METHOD_LABELS,
  OrderShipment,
} from "@/lib/orders/order-constants";
import { getCarrierTrackingUrl } from "@/lib/orders/order-carriers";
import { CancelOrderDialog } from "@/components/admin/orders/CancelOrderDialog";
import { PackingSlipModal } from "@/components/admin/orders/PackingSlipModal";
import { AddTrackingModal } from "@/components/admin/orders/AddTrackingModal";
import { AccordionSection } from "@/components/admin/orders/accordion-section";
import {
  OrderHarvestJourneySection,
  OrderHarvestStage,
  DEFAULT_ORDER_STAGES,
} from "@/components/admin/orders/order-harvest-journey-section";
import { inventoryService } from "@/lib/services/inventoryService";
import { formatStock, parseWeightToGrams } from "@/lib/weight-utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;
  const router = useRouter();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  // Dialog & Modal States
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isAddTrackingOpen, setIsAddTrackingOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<OrderShipment | null>(null);
  const [isConfirmWhatsAppOpen, setIsConfirmWhatsAppOpen] = useState(false);
  const [isMarkCodPaidOpen, setIsMarkCodPaidOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isRejectPaymentOpen, setIsRejectPaymentOpen] = useState(false);

  // Form States
  const [newTagInput, setNewTagInput] = useState("");
  const [newInternalNote, setNewInternalNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [waPaymentRef, setWaPaymentRef] = useState("");
  const [waPaymentDate, setWaPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [codCollectorName, setCodCollectorName] = useState("Delivery Agent");
  const [codPaymentRef, setCodPaymentRef] = useState("Cash Collected at Doorstep");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Loading States
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [isSavingHarvest, setIsSavingHarvest] = useState(false);

  // Accordion Sections State
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [hasInitializedSections, setHasInitializedSections] = useState(false);

  // Fetch Order Details
  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-order-detail", orderId],
    enabled: !!orderId && !authLoading,
    queryFn: async () => {
      const cleanOrderId = decodeURIComponent(orderId).trim().replace(/^#/, "");
      const idToken = await getClientAuthToken();
      let serverErr = "";
      try {
        const res = await fetch(`/api/admin/orders/${encodeURIComponent(cleanOrderId)}`, {
          headers: {
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            if (data.order) return data.order;
          }
        } else {
          serverErr = `HTTP ${res.status}`;
        }
      } catch (err: any) {
        serverErr = err.message || "Network error";
      }

      throw new Error(serverErr || "Order not found");
    },
  });

  // Populate form fields & setup default open accordion sections
  useEffect(() => {
    if (order) {
      setEditAddress(order.shipping_address || "");
      setEditPincode(order.shipping_pincode || "");

      if (!hasInitializedSections) {
        const s = String(order.status || "").toLowerCase();
        if (["pending", "cod_pending", "pending_payment", "pending_manual_payment"].includes(s)) {
          setOpenSections(["items", "payment"]);
        } else if (["confirmed", "paid", "packed"].includes(s)) {
          setOpenSections(["delivery", "items"]);
        } else {
          // Shipped / Delivered / Other
          setOpenSections(["harvest", "timeline"]);
        }
        setHasInitializedSections(true);
      }
    }
  }, [order, hasInitializedSections]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleExpandAll = () => {
    setOpenSections(["items", "customer", "payment", "delivery", "harvest", "timeline"]);
  };

  const handleCollapseAll = () => {
    setOpenSections([]);
  };

  // Status transition handler
  const handleTransitionStatus = async (nextStatus: string, options: any = {}) => {
    if (!order) return;
    setIsUpdatingStatus(true);
    const targetCleanId = String(order.order_id || order.id || orderId || "").trim().replace(/^#/, "");
    const rawDocId = String(order.id || targetCleanId).trim();

    try {
      const idToken = await getClientAuthToken();
      let updatedViaApi = false;

      try {
        const res = await fetch(`/api/admin/orders/${encodeURIComponent(targetCleanId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            status: nextStatus,
            ...options,
          }),
        });

        const contentType = res.headers.get("content-type") || "";
        let resData: any = null;
        if (contentType.includes("application/json")) {
          resData = await res.json().catch(() => null);
        }

        if (res.ok && (resData?.success || resData?.order)) {
          updatedViaApi = true;
          toast.success(resData?.message || `Status updated to ${nextStatus}`);
        } else if (!res.ok && resData?.error) {
          throw new Error(resData.error);
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes("<!DOCTYPE") && !apiErr.message.includes("Unexpected token")) {
          throw apiErr;
        }
      }

      if (!updatedViaApi) {
        throw new Error("Failed to update status via API");
      }

      if (nextStatus === "cancelled" && Array.isArray(order.items)) {
        for (const item of order.items) {
          const itemIdentifier = item.slug || item.productId;
          if (itemIdentifier) {
            const itemGrams = Number(
              item.weight_gm ||
                item.grams ||
                parseWeightToGrams(item.weight) * (Number(item.qty || item.quantity) || 1)
            );
            await inventoryService.revertStockForOrder({
              productId: itemIdentifier,
              variantId: item.variantId || "default",
              grams: itemGrams,
              quantity: Number(item.qty || item.quantity || 1),
              orderId: targetCleanId,
              reason: "Order cancelled / refunded",
              userEmail: user?.email || "admin",
            });
          }
        }
      }

      await qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
      await qc.invalidateQueries({ queryKey: ["admin-inventory-list"] });
      await qc.invalidateQueries({ queryKey: ["admin-inventory-history"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Generic patch handler
  const handlePatchOrder = async (patchPayload: any, successMessage?: string) => {
    if (!order) return false;
    const targetCleanId = String(order.order_id || order.id || orderId || "").trim().replace(/^#/, "");
    const rawDocId = String(order.id || targetCleanId).trim();

    try {
      const idToken = await getClientAuthToken();
      let updatedViaApi = false;

      try {
        const res = await fetch(`/api/admin/orders/${encodeURIComponent(targetCleanId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify(patchPayload),
        });

        const contentType = res.headers.get("content-type") || "";
        let resData: any = null;
        if (contentType.includes("application/json")) {
          resData = await res.json().catch(() => null);
        }

        if (res.ok && (resData?.success || resData?.order)) {
          updatedViaApi = true;
          toast.success(successMessage || resData?.message || "Order updated successfully");
        } else if (!res.ok && resData?.error) {
          throw new Error(resData.error);
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes("<!DOCTYPE") && !apiErr.message.includes("Unexpected token")) {
          throw apiErr;
        }
      }

      if (!updatedViaApi) {
        throw new Error("Failed to update order via API");
      }

      await qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
      return true;
    } catch (err: any) {
      toast.error(err.message || "Failed to update order");
      return false;
    }
  };

  // Download Invoice PDF
  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloadingInvoice(true);
    const targetCleanId = String(order.order_id || order.id || orderId || "").trim().replace(/^#/, "");
    try {
      const idToken = await getClientAuthToken();
      const res = await fetch(`/api/orders/${encodeURIComponent(targetCleanId)}/invoice`, {
        headers: {
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let errMsg = "Failed to generate invoice";
        if (contentType.includes("application/json")) {
          const errJson = await res.json().catch(() => ({}));
          errMsg = errJson.error || errMsg;
        }
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const newTab = window.open(blobUrl, "_blank");
      if (!newTab) {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `Invoice_${targetCleanId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
      toast.success("Invoice downloaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to download invoice");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  // Add Internal Note
  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternalNote.trim()) return;
    setSubmittingNote(true);
    try {
      const ok = await handlePatchOrder({ new_internal_note: newInternalNote.trim() }, "Internal note posted");
      if (ok) setNewInternalNote("");
    } finally {
      setSubmittingNote(false);
    }
  };

  // Add Tag
  const handleAddTag = async () => {
    if (!newTagInput.trim() || !order) return;
    const cleanTag = newTagInput.trim();
    const currentTags = Array.isArray(order.tags) ? order.tags : [];
    if (currentTags.includes(cleanTag)) {
      toast.info("Tag already exists");
      setNewTagInput("");
      return;
    }
    const ok = await handlePatchOrder({ tags: [...currentTags, cleanTag] }, `Tag "${cleanTag}" added`);
    if (ok) setNewTagInput("");
  };

  // Remove Tag
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!order) return;
    const currentTags = Array.isArray(order.tags) ? order.tags : [];
    await handlePatchOrder({ tags: currentTags.filter((t: string) => t !== tagToRemove) }, "Tag removed");
  };

  // Save Shipping Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAddress.trim()) return toast.error("Address cannot be empty");
    if (!/^\d{6}$/.test(editPincode.trim())) return toast.error("PIN code must be exactly 6 digits");

    const ok = await handlePatchOrder(
      {
        shipping_address: editAddress.trim(),
        shipping_pincode: editPincode.trim(),
      },
      "Shipping address updated"
    );
    if (ok) setIsEditAddressOpen(false);
  };

  // Confirm WhatsApp Payment
  const handleConfirmWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waPaymentRef.trim()) return toast.error("Please enter UTR or verification reference");

    const ok = await handlePatchOrder(
      {
        payment_action: "confirm_whatsapp_payment",
        payment_reference: waPaymentRef.trim(),
        payment_date: new Date(waPaymentDate).toISOString(),
      },
      "WhatsApp payment confirmed as Paid!"
    );
    if (ok) setIsConfirmWhatsAppOpen(false);
  };

  // Mark COD Paid
  const handleMarkCodPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await handlePatchOrder(
      {
        payment_action: "mark_cod_paid",
        collector_name: codCollectorName.trim(),
        payment_reference: codPaymentRef.trim(),
      },
      "COD cash collection recorded as Paid!"
    );
    if (ok) setIsMarkCodPaidOpen(false);
  };

  // Reject Payment
  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await handlePatchOrder(
      {
        payment_action: "reject_whatsapp_payment",
        rejection_reason: rejectionReason.trim() || "Payment verification failed or timed out",
      },
      "Payment rejected and status updated to unpaid"
    );
    if (ok) {
      setIsRejectPaymentOpen(false);
      setRejectionReason("");
    }
  };

  // Record Refund
  const handleRecordRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0) return toast.error("Please enter a valid refund amount");

    const ok = await handlePatchOrder(
      {
        payment_action: "record_refund",
        refund_amount: amt,
        refund_reason: refundReason.trim(),
      },
      `Refund of ₹${amt} recorded`
    );
    if (ok) setIsRefundModalOpen(false);
  };

  // Copy helper
  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Loading skeleton matching accordion layout
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] dark:bg-background py-10 px-4">
        <div className="max-w-[820px] mx-auto space-y-5 animate-pulse">
          {/* Top Bar Skeleton */}
          <div className="flex justify-between items-center">
            <div className="h-5 w-40 bg-muted rounded-md" />
            <div className="flex gap-2">
              <div className="h-9 w-24 bg-muted rounded-xl" />
              <div className="h-9 w-24 bg-muted rounded-xl" />
            </div>
          </div>
          {/* Header Card Skeleton */}
          <div className="h-32 bg-card border border-border rounded-2xl p-6" />
          {/* Summary Strip Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-card border border-border rounded-2xl" />
            ))}
          </div>
          {/* Accordion Skeletons */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (isError || !order) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] dark:bg-background py-20 px-4">
        <div className="max-w-[500px] mx-auto text-center space-y-4 bg-card border border-border rounded-3xl p-8 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="font-display font-bold text-xl text-foreground">Order Not Found</h2>
          <p className="text-xs font-subhead text-muted-foreground leading-relaxed">
            We couldn't locate order #{orderId}. It may have been archived, canceled, or removed from the system.
          </p>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-xs font-subhead font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  // Real data normalization
  const orderCode = String(order.order_id || order.id || "").trim().replace(/^#/, "");
  const rawStatus = String(order.status || "pending").toLowerCase();
  const fulfillmentLabel = getWixFulfillmentLabel(rawStatus);
  const fulfillmentStyle = FULFILLMENT_BADGE_STYLES[fulfillmentLabel] || "bg-secondary text-secondary-foreground";

  const paymentLabel = getWixPaymentLabel(order.payment_status, order.payment_method);
  const paymentStyle = PAYMENT_BADGE_STYLES[paymentLabel] || "bg-secondary text-secondary-foreground";
  const methodClean = String(order.payment_method || "").toLowerCase();
  const methodLabel = PAYMENT_METHOD_LABELS[methodClean] || "Cash on Delivery";

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const tags: string[] = Array.isArray(order.tags) ? order.tags : [];
  const internalNotes: any[] = Array.isArray(order.internal_notes) ? order.internal_notes : [];
  const trackingHistory: any[] = Array.isArray(order.tracking_history) ? order.tracking_history : [];

  const totalGrams = items.reduce(
    (acc, item) =>
      acc +
      Number(
        item.weight_gm ||
          item.grams ||
          parseWeightToGrams(item.weight) * (Number(item.qty || item.quantity) || 1)
      ),
    0
  );
  const createdDate = order.created_at || order.createdAt;
  const formattedPlacedDate = createdDate
    ? new Date(createdDate).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  // Google Maps link & WhatsApp link
  const customerPhoneClean = (order.customer_phone || "").replace(/\D/g, "");
  const waPrefillText = encodeURIComponent(
    `Namaste ${order.customer_name || "Customer"}, this is regarding your order #${orderCode} of ₹${
      order.total_amount || order.total || 0
    } from Prajnaa Farm.`
  );
  const waChatUrl = customerPhoneClean
    ? `https://wa.me/91${customerPhoneClean.slice(-10)}?text=${waPrefillText}`
    : null;

  const googleMapsUrl = order.shipping_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.shipping_address)}`
    : null;

  // Single primary button whose label strictly depends on status
  const renderHeaderPrimaryAction = () => {
    if (["pending", "cod_pending", "pending_payment", "pending_manual_payment"].includes(rawStatus)) {
      return (
        <button
          type="button"
          disabled={isUpdatingStatus}
          onClick={() => handleTransitionStatus("confirmed")}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-subhead text-xs font-bold shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
        >
          {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          <span>Confirm order</span>
        </button>
      );
    }
    if (["confirmed", "paid"].includes(rawStatus)) {
      return (
        <button
          type="button"
          disabled={isUpdatingStatus}
          onClick={() => handleTransitionStatus("packed")}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-subhead text-xs font-bold shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
        >
          {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
          <span>Mark as packed</span>
        </button>
      );
    }
    if (rawStatus === "packed") {
      return (
        <button
          type="button"
          disabled={isUpdatingStatus}
          onClick={() => setIsAddTrackingOpen(true)}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-subhead text-xs font-bold shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
        >
          <Truck className="h-4 w-4" />
          <span>Add tracking & ship</span>
        </button>
      );
    }
    if (rawStatus === "delivered") {
      return (
        <button
          type="button"
          disabled={downloadingInvoice}
          onClick={handleDownloadInvoice}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-subhead text-xs font-bold shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
        >
          {downloadingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          <span>View invoice</span>
        </button>
      );
    }
    // Default fallback (e.g. shipped, cancelled)
    return (
      <button
        type="button"
        disabled={downloadingInvoice}
        onClick={handleDownloadInvoice}
        className="h-10 px-4 rounded-xl border border-border bg-background hover:bg-secondary text-xs font-subhead font-semibold text-foreground flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
      >
        {downloadingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4 text-muted-foreground" />}
        <span>Print invoice</span>
      </button>
    );
  };

  // Harvest stages computed summary
  const harvestStages: OrderHarvestStage[] = Array.isArray(order.harvest_stages) && order.harvest_stages.length > 0
    ? order.harvest_stages
    : DEFAULT_ORDER_STAGES;
  const harvestPhotosCount = harvestStages.filter((s) => s.image_url || (s.images && s.images.length > 0)).length;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-background text-foreground py-8 px-4 sm:px-6">
      {/* Centered Single-Column Container (max-width ~820px) */}
      <div className="max-w-[820px] mx-auto space-y-5 sm:space-y-6">
        
        {/* 1. TOP BAR: Breadcrumb left, actions right */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Breadcrumb: Orders / #ORDER_ID */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-subhead">
            <Link
              href="/admin/orders"
              className="text-muted-foreground hover:text-foreground font-semibold transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Orders</span>
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <span className="font-mono font-bold text-foreground">#{orderCode}</span>
          </nav>

          {/* Right Top Bar Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={downloadingInvoice}
              onClick={handleDownloadInvoice}
              className="h-9 px-3 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-subhead font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download or Print PDF invoice"
            >
              {downloadingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="hidden sm:inline">Print invoice</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPackingSlipOpen(true)}
              className="h-9 px-3 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-subhead font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View packing slip"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Packing slip</span>
            </button>

            {fulfillmentLabel !== "Canceled" && (
              <button
                type="button"
                onClick={() => setIsCancelDialogOpen(true)}
                className="h-9 px-3 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-subhead font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cancel order and restock items"
              >
                <X className="h-3.5 w-3.5" />
                <span>Cancel order</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. HEADER CARD: Order ID, Status Badge, Placed date/time & ONE primary action button */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>#{orderCode}</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(String(orderCode), "Order ID")}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Copy Order ID"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </h1>
              <span
                className={`text-[11px] font-subhead uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${fulfillmentStyle}`}
              >
                {fulfillmentLabel}
              </span>
            </div>
            <p className="text-xs font-subhead text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Placed {formattedPlacedDate}</span>
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="shrink-0 self-stretch sm:self-center">
            {renderHeaderPrimaryAction()}
          </div>
        </div>

        {/* 3. SUMMARY STRIP (4 cells): Customer | Items | Total | Payment Status (2x2 on mobile) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Customer */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-subhead uppercase tracking-wider text-muted-foreground font-semibold block">
              Customer
            </span>
            <p className="font-display text-sm font-bold text-foreground truncate">
              {order.customer_name || "Guest Checkout"}
            </p>
            <p className="text-[11px] font-subhead text-muted-foreground truncate">
              {order.shipping_pincode ? `PIN ${order.shipping_pincode}` : "Direct Dispatch"}
            </p>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-subhead uppercase tracking-wider text-muted-foreground font-semibold block">
              Items Ordered
            </span>
            <p className="font-display text-sm font-bold text-foreground truncate">
              {items.length} {items.length === 1 ? "Product" : "Products"}
            </p>
            <p className="text-[11px] font-subhead text-muted-foreground truncate">
              {formatStock(totalGrams)} total
            </p>
          </div>

          {/* Total Amount */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-subhead uppercase tracking-wider text-muted-foreground font-semibold block">
              Order Total
            </span>
            <p className="font-mono text-base font-bold text-foreground truncate">
              {inr(order.total_amount || order.total || 0)}
            </p>
            <p className="text-[11px] font-subhead text-muted-foreground truncate">
              {methodLabel}
            </p>
          </div>

          {/* Payment Status */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
            <span className="text-[10px] font-subhead uppercase tracking-wider text-muted-foreground font-semibold block">
              Payment Status
            </span>
            <div className="pt-0.5">
              <span
                className={`inline-block text-[11px] font-subhead font-bold px-2 py-0.5 rounded-md ${paymentStyle}`}
              >
                {paymentLabel}
              </span>
            </div>
            <p className="text-[10px] font-subhead text-muted-foreground truncate mt-0.5">
              {order.payment_reference ? `Ref: ${order.payment_reference}` : "Verified via Admin"}
            </p>
          </div>
        </div>

        {/* 4. TOOLBAR: Expand all / Collapse all links */}
        <div className="flex items-center justify-between text-xs font-subhead px-1">
          <span className="text-muted-foreground font-medium">Order Details & Lifecycle Sections</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExpandAll}
              className="font-semibold text-primary hover:underline cursor-pointer"
            >
              Expand all
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* 5. ACCORDION SECTIONS */}
        <div className="space-y-3.5">
          
          {/* SECTION A: Items */}
          <AccordionSection
            id="items"
            title="Items"
            icon={<Package className="h-4 w-4" />}
            summary={`${items.length} products • ${formatStock(totalGrams)}`}
            isOpen={openSections.includes("items")}
            onToggle={() => toggleSection("items")}
          >
            {items.length === 0 ? (
              <p className="text-xs font-subhead text-muted-foreground py-2">No items listed in this order.</p>
            ) : (
              <div className="space-y-3 divide-y divide-border/60">
                {items.map((item, idx) => {
                  const itemPrice = Number(item.price) || 0;
                  const itemQty = Number(item.quantity) || 1;
                  const lineTotal = item.total || itemPrice * itemQty;

                  return (
                    <div
                      key={item.id || `item-${idx}`}
                      className="pt-3 first:pt-0 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail */}
                        <div className="h-12 w-12 rounded-xl bg-secondary/60 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image || item.image_url ? (
                            <img
                              src={item.image || item.image_url}
                              alt={item.name || item.title || "Product item"}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Name & Variant */}
                        <div className="min-w-0">
                          <p className="font-display text-xs font-bold text-foreground break-words line-clamp-2">
                            {item.name || item.title || "Organic Produce"}
                          </p>
                          <p className="text-[11px] font-subhead text-muted-foreground truncate">
                            {item.weight || item.variant || "Standard pack"} • Qty: {itemQty}
                          </p>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="text-right shrink-0">
                        <p className="font-mono text-xs font-bold text-foreground">
                          {inr(lineTotal)}
                        </p>
                        <p className="text-[10px] font-subhead text-muted-foreground">
                          {inr(itemPrice)} × {itemQty}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddTrackingOpen(true)}
                    className="h-8 px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-subhead font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Add tracking no.</span>
                  </button>
                </div>
              </div>
            )}
          </AccordionSection>

          {/* SECTION B: Customer & shipping */}
          <AccordionSection
            id="customer"
            title="Customer & shipping"
            icon={<MapPin className="h-4 w-4" />}
            summary={`${order.customer_name || "Customer"} • ${order.shipping_pincode || ""}`}
            isOpen={openSections.includes("customer")}
            onToggle={() => toggleSection("customer")}
          >
            <div className="space-y-4 text-xs font-subhead">
              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-secondary/35 border border-border/70">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Phone / WhatsApp
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium text-foreground">
                      {order.customer_phone || "Not provided"}
                    </p>
                    {waChatUrl && (
                      <a
                        href={waChatUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-600/20 transition-colors"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Email Address
                  </span>
                  <p className="font-medium text-foreground truncate">
                    {order.customer_email || "Not provided"}
                  </p>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Delivery Address
                </span>
                <p className="text-foreground leading-relaxed break-words bg-secondary/20 p-3 rounded-xl border border-border/60">
                  {order.shipping_address || "No address entered"}
                  {order.shipping_pincode && ` — PIN: ${order.shipping_pincode}`}
                </p>
              </div>

              {/* Billing Note / Special instructions */}
              {order.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Customer Notes
                  </span>
                  <p className="italic text-muted-foreground bg-secondary/15 p-2.5 rounded-lg border border-border/40">
                    "{order.notes}"
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditAddressOpen(true)}
                  className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3 w-3 text-muted-foreground" />
                  <span>Edit address</span>
                </button>

                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    <span>Open map</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      `${order.shipping_address || ""} PIN: ${order.shipping_pincode || ""}`,
                      "Shipping address"
                    )
                  }
                  className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="h-3 w-3 text-muted-foreground" />
                  <span>Copy address</span>
                </button>
              </div>
            </div>
          </AccordionSection>

          {/* SECTION C: Payment */}
          <AccordionSection
            id="payment"
            title="Payment"
            icon={<CreditCard className="h-4 w-4" />}
            summary={`${paymentLabel} • ${inr(order.total_amount || order.total || 0)}`}
            isOpen={openSections.includes("payment")}
            onToggle={() => toggleSection("payment")}
          >
            <div className="space-y-4 text-xs font-subhead">
              {/* Financial Breakdown Table */}
              <div className="space-y-2 p-3.5 rounded-xl bg-secondary/35 border border-border/70">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono text-foreground">{inr(order.subtotal || order.subtotal_amount || order.total || 0)}</span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>Discount</span>
                    <span className="font-mono">-{inr(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping charges</span>
                  <span className="font-mono text-foreground">
                    {Number(order.shipping_cost) > 0 ? inr(order.shipping_cost) : "FREE"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST / Taxes</span>
                  <span className="font-mono text-foreground">{inr(order.tax_amount || 0)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-foreground">
                  <span>Total Amount</span>
                  <span className="font-mono text-base">{inr(order.total_amount || order.total || 0)}</span>
                </div>
              </div>

              {/* Payment Details Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-secondary/20 border border-border/60">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                    Payment Method
                  </span>
                  <p className="font-semibold text-foreground mt-0.5">{methodLabel}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                    Reference / UTR
                  </span>
                  <p className="font-mono text-foreground mt-0.5">{order.payment_reference || "Direct Verification"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                    Status
                  </span>
                  <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${paymentStyle}`}>
                    {paymentLabel}
                  </span>
                </div>
              </div>

              {/* Payment Actions: Single primary button + More dropdown */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {/* ONE Visible Primary Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (methodClean.includes("cod") || methodClean.includes("cash")) {
                      setIsMarkCodPaidOpen(true);
                    } else {
                      setIsConfirmWhatsAppOpen(true);
                    }
                  }}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground font-subhead text-xs font-bold shadow-xs hover:opacity-90 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Confirm payment received</span>
                </button>

                {/* More Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-haspopup="true"
                      className="h-9 px-3 rounded-xl border border-border bg-background hover:bg-secondary text-xs font-subhead font-semibold text-foreground inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>More ...</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg rounded-xl p-1 z-50">
                    {waChatUrl && (
                      <DropdownMenuItem asChild>
                        <a
                          href={waChatUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 text-xs font-subhead rounded-lg hover:bg-secondary cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Open WhatsApp chat</span>
                        </a>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => setIsRejectPaymentOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-subhead rounded-lg hover:bg-destructive/10 text-destructive cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject payment</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 border-border/60" />
                    <DropdownMenuItem
                      onClick={() => setIsRefundModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-subhead rounded-lg hover:bg-secondary cursor-pointer"
                    >
                      <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Record refund</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </AccordionSection>

          {/* SECTION D: Delivery & route */}
          <AccordionSection
            id="delivery"
            title="Delivery & route"
            icon={<Truck className="h-4 w-4" />}
            summary={order.carrier_name ? `${order.carrier_name}${order.tracking_number ? " • " + order.tracking_number : ""}` : "Not assigned yet"}
            isOpen={openSections.includes("delivery")}
            onToggle={() => toggleSection("delivery")}
          >
            <div className="space-y-4 text-xs font-subhead">
              {!order.carrier_name && !order.tracking_number ? (
                /* Unassigned Single-Line View */
                <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-muted-foreground font-medium">
                    No carrier assigned yet. Products are pending dispatch route assignment.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddTrackingOpen(true)}
                    className="h-8 px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-center"
                  >
                    <Truck className="h-3 w-3" />
                    <span>Edit route & carrier</span>
                  </button>
                </div>
              ) : (
                /* Assigned Route & Carrier Details */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-secondary/35 border border-border/70">
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Shipping Carrier
                      </span>
                      <p className="font-semibold text-foreground truncate">{order.carrier_name || "Shipping"}</p>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Tracking Number
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">
                          {order.tracking_number || "Pending"}
                        </span>
                        {order.tracking_number && (
                          <a
                            href={getCarrierTrackingUrl(order.carrier_name, order.tracking_number, order.tracking_url) || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-primary hover:underline inline-flex items-center gap-0.5 text-[11px]"
                            title="Open tracking page"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Delivery Route
                      </span>
                      <p className="font-medium text-foreground truncate">
                        {order.delivery_route || "Direct Dispatch Valley Route"}
                      </p>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Estimated Arrival Date
                      </span>
                      <p className="font-medium text-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {order.delivery_date
                          ? new Date(order.delivery_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "3-5 business days"}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddTrackingOpen(true)}
                      className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                      <span>Edit route & carrier</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* SECTION E: Harvest journey */}
          <AccordionSection
            id="harvest"
            title="Harvest journey"
            icon={<Sprout className="h-4 w-4" />}
            summary={`${harvestPhotosCount} of ${harvestStages.length} photos added`}
            isOpen={openSections.includes("harvest")}
            onToggle={() => toggleSection("harvest")}
          >
            <OrderHarvestJourneySection
              stages={harvestStages}
              isSaving={isSavingHarvest}
              onUpdateStages={async (updated) => {
                setIsSavingHarvest(true);
                try {
                  await handlePatchOrder({ harvest_stages: updated }, "Harvest stages updated");
                } finally {
                  setIsSavingHarvest(false);
                }
              }}
            />
          </AccordionSection>

          {/* SECTION F: Timeline, notes & tags (merged) */}
          <AccordionSection
            id="timeline"
            title="Timeline, notes & tags"
            icon={<Clock className="h-4 w-4" />}
            summary={`${trackingHistory.length} logs • ${tags.length} tags`}
            isOpen={openSections.includes("timeline")}
            onToggle={() => toggleSection("timeline")}
          >
            <div className="space-y-5 text-xs font-subhead">
              {/* Order Tags */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                  Order Tags
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-foreground text-xs font-medium border border-border/80"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="p-0.5 text-muted-foreground hover:text-destructive rounded-full"
                        title="Remove tag"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}

                  {/* Add Tag Inline Form */}
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Add tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="h-7 px-2.5 rounded-lg border border-border bg-background text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary w-28"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="h-7 px-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Internal Notes Textarea */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Internal Notes
                  </span>
                  <span className="text-[10px] text-muted-foreground italic">
                    never shown to customers
                  </span>
                </div>

                <form onSubmit={handleAddInternalNote} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Write a private note regarding packing, customer preferences, or carrier notes..."
                    value={newInternalNote}
                    onChange={(e) => setNewInternalNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote || !newInternalNote.trim()}
                      className="h-8 px-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      {submittingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      <span>Post note</span>
                    </button>
                  </div>
                </form>

                {/* Existing Internal Notes List */}
                {internalNotes.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {internalNotes.map((note, idx) => (
                      <div
                        key={note.id || `note-${idx}`}
                        className="p-2.5 rounded-lg bg-secondary/35 border border-border/60 text-xs space-y-1"
                      >
                        <p className="text-foreground leading-relaxed break-words">{note.note}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {note.created_by || "Admin"} •{" "}
                          {note.created_at
                            ? new Date(note.created_at).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Log List */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                  Activity Log & Transit History
                </span>

                {trackingHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">No recorded activity logs yet.</p>
                ) : (
                  <div className="space-y-2.5 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
                    {trackingHistory.map((log: any, idx: number) => {
                      const logDate = log.timestamp
                        ? new Date(log.timestamp).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—";

                      return (
                        <div key={idx} className="relative text-xs space-y-0.5">
                          <div className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground">{log.title || "Status update"}</p>
                            <span className="text-[10px] text-muted-foreground">{logDate}</span>
                          </div>
                          {log.description && (
                            <p className="text-muted-foreground break-words">{log.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DIALOGS & MODALS PRESERVED                               */}
      {/* ========================================================= */}

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        orderId={String(orderCode)}
        onConfirm={async (reason) => {
          await handleTransitionStatus("cancelled", { cancellation_reason: reason });
          setIsCancelDialogOpen(false);
        }}
      />

      {/* Packing Slip Modal */}
      <PackingSlipModal
        isOpen={isPackingSlipOpen}
        onClose={() => setIsPackingSlipOpen(false)}
        orders={order ? [order] : []}
      />

      {/* Add Tracking Modal */}
      <AddTrackingModal
        isOpen={isAddTrackingOpen}
        onClose={() => {
          setIsAddTrackingOpen(false);
          setEditingShipment(null);
        }}
        order={order}
        editShipment={editingShipment}
        onSave={async (payload: any) => {
          return await handlePatchOrder(payload, "Tracking saved");
        }}
      />

      {/* Edit Address Modal */}
      {isEditAddressOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Edit Shipping Address</h3>
              <button
                type="button"
                onClick={() => setIsEditAddressOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAddress} className="space-y-3 text-xs font-subhead">
              <div>
                <label className="font-semibold block mb-1">Street Address</label>
                <textarea
                  rows={3}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">PIN Code (6 digits)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={editPincode}
                  onChange={(e) => setEditPincode(e.target.value)}
                  className="w-full p-2 rounded-xl border border-border bg-background font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditAddressOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-border font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Payment Verification Modal */}
      {isConfirmWhatsAppOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Confirm Payment Received</h3>
              <button
                type="button"
                onClick={() => setIsConfirmWhatsAppOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmWhatsApp} className="space-y-3 text-xs font-subhead">
              <div>
                <label className="font-semibold block mb-1">Bank Reference / UPI UTR / Note</label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678 or Cashier Verified"
                  value={waPaymentRef}
                  onChange={(e) => setWaPaymentRef(e.target.value)}
                  className="w-full p-2 rounded-xl border border-border bg-background"
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={waPaymentDate}
                  onChange={(e) => setWaPaymentDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-border bg-background"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmWhatsAppOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-border font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90"
                >
                  Confirm as Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COD Cash Collection Modal */}
      {isMarkCodPaidOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Record COD Cash Received</h3>
              <button
                type="button"
                onClick={() => setIsMarkCodPaidOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleMarkCodPaid} className="space-y-3 text-xs font-subhead">
              <div>
                <label className="font-semibold block mb-1">Collected By</label>
                <input
                  type="text"
                  value={codCollectorName}
                  onChange={(e) => setCodCollectorName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-border bg-background"
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Receipt / Voucher Reference</label>
                <input
                  type="text"
                  value={codPaymentRef}
                  onChange={(e) => setCodPaymentRef(e.target.value)}
                  className="w-full p-2 rounded-xl border border-border bg-background"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMarkCodPaidOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-border font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90"
                >
                  Confirm COD Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {isRejectPaymentOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-destructive">Reject Payment</h3>
              <button
                type="button"
                onClick={() => setIsRejectPaymentOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRejectPayment} className="space-y-3 text-xs font-subhead">
              <div>
                <label className="font-semibold block mb-1">Rejection Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Invalid UTR, transaction cancelled by bank"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2 rounded-xl border border-border bg-background"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectPaymentOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-border font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-destructive text-destructive-foreground font-bold hover:opacity-90"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Refund Modal */}
      {isRefundModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Record Refund</h3>
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRecordRefund} className="space-y-3 text-xs font-subhead">
              <div>
                <label className="font-semibold block mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full p-2 rounded-xl border border-border bg-background font-mono"
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Refund Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Damaged during courier transit, customer returned item"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-2 rounded-xl border border-border bg-background"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-border font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90"
                >
                  Record Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
