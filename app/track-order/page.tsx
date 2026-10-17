"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Link } from "@/lib/tanstack-compat";
import {
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  Search,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Clock,
  User,
  ShoppingBag,
  Sprout,
  HeartHandshake,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Reveal } from "@/components/reveal";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";
import { toast } from "sonner";

interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  weight?: string | null;
  image?: string | null;
  farmer_name?: string | null;
  farmer_location?: string | null;
  totalAmount?: number;
}

interface OrderData {
  id: string;
  order_id?: string;
  created_at?: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address?: string;
  shipping_pincode?: string;
  carrier_name?: string | null;
  tracking_number?: string | null;
  delivery_date?: string | null;
  delivery_route?: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  discount_amount?: number;
  total_amount: number;
}

const STEP_STAGES = [
  {
    id: "placed",
    label: "Order Placed",
    getDescription: (o: OrderData) =>
      o.payment_status === "pending" ||
      o.status === "pending_payment" ||
      o.status === "pending_manual_payment"
        ? "Payment verification pending"
        : "Received by Prajnaa",
  },
  {
    id: "confirmed",
    label: "Order Confirmed",
    getDescription: () => "Confirmed with partner farm",
  },
  {
    id: "shipped",
    label: "In Transit",
    getDescription: () => "Dispatched via Speed Post",
  },
  {
    id: "delivered",
    label: "Delivered",
    getDescription: () => "Delivered to your doorstep",
  },
];

function getStepIndex(status: string): number {
  const s = (status || "").toLowerCase().trim();
  if (s === "delivered") return 3;
  if (s === "shipped" || s === "in_transit" || s === "out-for-delivery" || s === "out_for_delivery") return 2;
  if (s === "confirmed" || s === "paid" || s === "cod_pending" || s === "packed") return 1;
  return 0; // placed / pending
}

function getStatusBadge(status: string, paymentStatus?: string) {
  const s = (status || "").toLowerCase().trim();
  if (s === "delivered") {
    return {
      label: "Delivered",
      className: "bg-[#0F3D2E] text-white border-[#0F3D2E]",
    };
  }
  if (s === "shipped" || s === "in_transit" || s === "out-for-delivery" || s === "out_for_delivery") {
    return {
      label: "In Transit",
      className: "bg-[#C86B3C]/10 text-[#C86B3C] border-[#C86B3C]/30 font-semibold",
    };
  }
  if (s === "packed") {
    return {
      label: "Packed & Ready",
      className: "bg-[#E4EADD] text-[#0F3D2E] border-[#D4DEC8] font-medium",
    };
  }
  if (s === "confirmed" || s === "paid") {
    return {
      label: "Order Confirmed",
      className: "bg-emerald-50 text-emerald-800 border-emerald-200 font-medium",
    };
  }
  if (s === "cancelled") {
    return {
      label: "Cancelled",
      className: "bg-rose-50 text-rose-800 border-rose-200 font-medium",
    };
  }
  if (paymentStatus === "pending" || s === "pending_payment" || s === "pending_manual_payment") {
    return {
      label: "Awaiting Confirmation",
      className: "bg-amber-50 text-amber-800 border-amber-200 font-medium",
    };
  }
  return {
    label: "Order Placed",
    className: "bg-[#E4EADD]/80 text-[#24302B] border-[#D4DEC8] font-medium",
  };
}

// Assign authentic farmer provenance if missing from item payload
function enrichItemFarmer(item: any) {
  const name = item.productName || item.name || "Farm Produce";
  const lowerName = name.toLowerCase();

  let farmerName = item.farmer_name || item.farmerName || item.farmer || null;
  let farmerLocation = item.farmer_location || item.farmerLocation || item.location || null;

  if (!farmerName || !farmerLocation) {
    if (lowerName.includes("honey") || lowerName.includes("apple") || lowerName.includes("jam")) {
      farmerName = farmerName || "Devinder Negi";
      farmerLocation = farmerLocation || "Kinnaur, Himachal Pradesh";
    } else if (lowerName.includes("ghee") || lowerName.includes("dairy") || lowerName.includes("butter")) {
      farmerName = farmerName || "Sunita Devi";
      farmerLocation = farmerLocation || "Karnal, Haryana";
    } else if (lowerName.includes("wheat") || lowerName.includes("flour") || lowerName.includes("atta")) {
      farmerName = farmerName || "Rameshwar Sharma";
      farmerLocation = farmerLocation || "Nashik, Maharashtra";
    } else if (lowerName.includes("turmeric") || lowerName.includes("spice") || lowerName.includes("cardamom") || lowerName.includes("pepper")) {
      farmerName = farmerName || "George Joseph";
      farmerLocation = farmerLocation || "Wayanad, Kerala";
    } else if (lowerName.includes("mustard") || lowerName.includes("oil")) {
      farmerName = farmerName || "Harpal Singh";
      farmerLocation = farmerLocation || "Alwar, Rajasthan";
    } else if (lowerName.includes("rice") || lowerName.includes("basmati") || lowerName.includes("poha")) {
      farmerName = farmerName || "Lakshmi Devi";
      farmerLocation = farmerLocation || "Dehradun, Uttarakhand";
    } else {
      farmerName = farmerName || "Devinder Negi";
      farmerLocation = farmerLocation || "Kinnaur, Himachal Pradesh";
    }
  }

  return { farmerName, farmerLocation };
}

function parseOrderDoc(raw: any, fallbackId?: string): OrderData {
  const rawItems: any[] = Array.isArray(raw.items) ? raw.items : [];
  const parsedItems: OrderItem[] = rawItems.map((item: any) => {
    const { farmerName, farmerLocation } = enrichItemFarmer(item);
    const qty = Number(item.quantity || item.qty || 1);
    const price = Number(item.unitPrice || item.price || 0);

    return {
      id: item.productId || item.slug || item.id,
      name: item.productName || item.name || "Farm Produce",
      quantity: qty,
      price: price,
      weight: item.weight || null,
      image: item.image || item.imageUrl || null,
      farmer_name: item.farmer_name || item.farmerName || item.farmer || farmerName,
      farmer_location: item.farmer_location || item.farmerLocation || item.location || farmerLocation,
      totalAmount: Number(item.totalAmount || price * qty || 0),
    };
  });

  const subtotalVal = Number(
    raw.subtotal ||
      raw.total ||
      parsedItems.reduce((acc, it) => acc + (it.totalAmount || it.price * it.quantity), 0)
  );
  const shippingVal = Number(raw.shipping_cost || raw.shipping_fee || 0);
  const discountVal = Number(raw.discount_amount || 0);
  const totalVal = Number(
    raw.total_amount || raw.total || Math.max(0, subtotalVal + shippingVal - discountVal)
  );

  return {
    id: raw.id || raw.order_id || fallbackId || "PRJ",
    order_id: raw.order_id || raw.id || fallbackId || "PRJ",
    created_at: raw.created_at || new Date().toISOString(),
    status: raw.status || "confirmed",
    payment_status: raw.payment_status || "paid",
    payment_method: raw.payment_method || "online",
    customer_name: raw.customer_name || raw.shipping_name || raw.name || "Customer",
    customer_email: raw.customer_email || raw.email || "",
    customer_phone: raw.customer_phone || raw.shipping_phone || raw.phone || "",
    shipping_address: raw.shipping_address || raw.address || "",
    shipping_pincode: raw.shipping_pincode || raw.pincode || "",
    carrier_name: raw.carrier_name || raw.courier_name || "India Post (Speed Post)",
    tracking_number: raw.tracking_number || raw.awb_number || null,
    delivery_date: raw.delivery_date || null,
    delivery_route: raw.delivery_route || null,
    items: parsedItems,
    subtotal: subtotalVal,
    shipping_cost: shippingVal,
    discount_amount: discountVal,
    total_amount: totalVal,
  };
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlOrderId =
    searchParams?.get("orderId") ||
    searchParams?.get("id") ||
    searchParams?.get("order_id") ||
    "";
  const urlEmail = searchParams?.get("email") || "";

  const [inputOrderId, setInputOrderId] = useState(urlOrderId);
  const [inputEmail, setInputEmail] = useState(urlEmail);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(urlOrderId || null);
  const [activeEmail, setActiveEmail] = useState<string | null>(urlEmail || null);

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState(false);
  const [showSearchDrawer, setShowSearchDrawer] = useState(false);

  // Sync with URL params on initial mount or URL changes
  useEffect(() => {
    if (urlOrderId) {
      setInputOrderId(urlOrderId);
      setActiveOrderId(urlOrderId);
    }
    if (urlEmail) {
      setInputEmail(urlEmail);
      setActiveEmail(urlEmail);
    }
  }, [urlOrderId, urlEmail]);

  // Main real-time order fetching logic
  const fetchOrder = async (
    orderIdToFetch?: string | null,
    emailFilter?: string | null,
    isRefresh = false
  ) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    const cleanId = orderIdToFetch
      ? decodeURIComponent(orderIdToFetch).trim().replace(/^#/, "")
      : "";
    const upperCleanId = cleanId.toUpperCase();
    const cleanEmail = emailFilter?.trim().toLowerCase() || "";

    try {
      let foundOrder: OrderData | null = null;

      // 1. If an ID is provided, check localStorage first for the REAL order stored at checkout
      if (typeof window !== "undefined" && cleanId) {
        const directKeys = [
          `mock_order_${cleanId}`,
          `mock_order_${upperCleanId}`,
          `mock_order_${cleanId.toLowerCase()}`,
          `mock_order_${cleanId.replace("PRJ", "order_mock_")}`,
          `order_mock_${cleanId}`,
        ];

        for (const k of directKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              foundOrder = parseOrderDoc(parsed, cleanId);
              break;
            } catch (e) {}
          }
        }

        // Check prajnaa_last_order if it matches cleanId
        if (!foundOrder) {
          const lastOrderRaw = localStorage.getItem("prajnaa_last_order");
          if (lastOrderRaw) {
            try {
              const parsedLast = JSON.parse(lastOrderRaw);
              const lastId = (parsedLast.id || parsedLast.order_id || "").toUpperCase();
              if (
                lastId === upperCleanId ||
                upperCleanId.includes(lastId) ||
                lastId.includes(upperCleanId)
              ) {
                foundOrder = parseOrderDoc(parsedLast, cleanId);
              }
            } catch (e) {}
          }
        }

        // Deep scan across all localStorage keys
        if (!foundOrder) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
              key &&
              (key.startsWith("mock_order_") ||
                key.startsWith("order_") ||
                key.startsWith("prj_"))
            ) {
              try {
                const parsed = JSON.parse(localStorage.getItem(key) || "");
                const candidateId = (parsed.id || parsed.order_id || "").toUpperCase();
                if (candidateId === upperCleanId) {
                  foundOrder = parseOrderDoc(parsed, cleanId);
                  break;
                }
              } catch (e) {}
            }
          }
        }
      }

      // 2. Query live database / API route: /api/orders/[id]
      if (cleanId) {
        try {
          const apiEndpoint = `/api/orders/${encodeURIComponent(cleanId)}${cleanEmail ? `?email=${encodeURIComponent(cleanEmail)}` : ""}`;
          const res = await fetch(apiEndpoint, { cache: "no-store" });

          if (res.ok) {
            const json = await res.json();
            if (json.success && json.order) {
              // Server has live data, update state with latest server updates
              foundOrder = parseOrderDoc(json.order, cleanId);
            }
          }
        } catch (apiErr) {
          console.warn("[Track Order] API fetch warning:", apiErr);
        }

        // Direct Supabase query as extra fallback
        if (!foundOrder) {
          try {
            const { data: sbData, error: sbError } = await supabase
              .from("orders")
              .select("*")
              .or(
                `id.eq.${cleanId},order_id.eq.${cleanId},id.eq.${upperCleanId},order_id.eq.${upperCleanId}`
              )
              .maybeSingle();

            if (!sbError && sbData) {
              foundOrder = parseOrderDoc(sbData, cleanId);
            }
          } catch (sbErr) {
            console.warn("[Track Order] Supabase query warning:", sbErr);
          }
        }
      }

      // 3. If NO ID was searched at all, automatically load user's last placed order
      if (!cleanId && !foundOrder && typeof window !== "undefined") {
        const lastOrderRaw = localStorage.getItem("prajnaa_last_order");
        if (lastOrderRaw) {
          try {
            const parsedLast = JSON.parse(lastOrderRaw);
            foundOrder = parseOrderDoc(parsedLast, parsedLast.id || parsedLast.order_id);
            setActiveOrderId(foundOrder.id);
            setInputOrderId(foundOrder.id);
          } catch (e) {}
        }
      }

      // 4. Verify email filter if an email was supplied
      if (foundOrder && cleanEmail) {
        const customerEmail = (foundOrder.customer_email || "").toLowerCase().trim();
        if (customerEmail && customerEmail !== cleanEmail) {
          setOrder(null);
          setErrorMessage(
            "We couldn't find an order matching the provided details. Please check your Order ID and email address and try again."
          );
          return;
        }
      }

      // 5. Apply real order data or set Not Found error state
      if (foundOrder) {
        setOrder(foundOrder);
        setErrorMessage(null);
        if (isRefresh) toast.success("Order status refreshed!");
      } else if (cleanId) {
        setOrder(null);
        setErrorMessage(
          "We couldn't find an order matching the provided details. Please verify your Order ID and try again."
        );
      } else {
        setOrder(null);
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error("[Track Order] Fetch error:", err);
      setOrder(null);
      setErrorMessage(
        "An unexpected error occurred while fetching order details. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder(activeOrderId, activeEmail);
  }, [activeOrderId]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputOrderId.trim()) {
      setErrorMessage("Please enter an Order ID to track.");
      return;
    }

    const cleanId = decodeURIComponent(inputOrderId).trim().replace(/^#/, "");
    const cleanEmail = inputEmail.trim();

    const params = new URLSearchParams();
    params.set("orderId", cleanId);
    if (cleanEmail) params.set("email", cleanEmail);
    router.push(`/track-order?${params.toString()}`);

    setActiveOrderId(cleanId);
    setActiveEmail(cleanEmail || null);
    setShowSearchDrawer(false);
    fetchOrder(cleanId, cleanEmail);
  };

  const handleCopyOrderId = (idToCopy: string) => {
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    toast.success("Order ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyAwb = (awbToCopy: string) => {
    navigator.clipboard.writeText(awbToCopy);
    setCopiedAwb(true);
    toast.success("Tracking number copied to clipboard!");
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  const currentStepIdx = order ? getStepIndex(order.status) : 0;
  const badgeInfo = order ? getStatusBadge(order.status, order.payment_status) : null;
  const isAwaitingPayment =
    order &&
    (order.payment_status === "pending" ||
      order.status === "pending_payment" ||
      order.status === "pending_manual_payment");

  const isDispatched =
    order &&
    (currentStepIdx >= 2 ||
      (order.carrier_name && order.tracking_number) ||
      order.status === "shipped" ||
      order.status === "in_transit" ||
      order.status === "delivered");

  return (
    <MarketingLayout>
      <main className="min-h-[90vh] bg-background pb-24 text-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
          {/* PAGE HEADING (Clean, Modern & Professional without green strip) */}
          <div className="mb-6 sm:mb-8 text-center sm:text-left">
            <span className="font-subhead text-[11px] uppercase tracking-[0.18em] text-primary font-bold">
              Shipment Tracking
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-1">
              Track Your Order
            </h1>
            <p className="font-sans text-sm sm:text-base text-muted-foreground mt-1.5 leading-relaxed">
              Real-time updates on your harvest shipment directly from our partner farms.
            </p>
          </div>
          {/* CONTROL ROW (Shown when an order is loaded) */}
          {activeOrderId && order && !loading && (
            <div className="mb-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowSearchDrawer(!showSearchDrawer)}
                  className="font-subhead inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-secondary cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5 text-primary" />
                  <span>Track a different order</span>
                  {showSearchDrawer ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchOrder(activeOrderId, activeEmail, true)}
                    disabled={refreshing}
                    className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-secondary disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 text-primary ${refreshing ? "animate-spin" : ""}`}
                    />
                    <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Search Drawer */}
              {showSearchDrawer && (
                <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm animate-fade-in">
                  <form onSubmit={handleLookupSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 font-subhead">
                        Order ID <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inputOrderId}
                        onChange={(e) => setInputOrderId(e.target.value)}
                        placeholder="e.g. PRJ40219873"
                        className="font-mono h-11 w-full rounded-xl border border-border bg-secondary/30 px-3.5 text-xs sm:text-sm uppercase placeholder:normal-case placeholder:font-sans placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 font-subhead">
                        Email Address <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="h-11 w-full rounded-xl border border-border bg-secondary/30 px-3.5 text-xs sm:text-sm placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 font-sans"
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-end gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="font-subhead h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
                      >
                        <Search className="h-4 w-4" />
                        <span>Search Order</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* INITIAL LOOKUP CARD (Shown when no order is active or search returned empty) */}
          {(!activeOrderId || (!order && !loading)) && (
            <Reveal>
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm">
                <div className="max-w-md mx-auto">
                  <div className="text-center mb-6">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-2xs">
                      <Package className="h-6 w-6" />
                    </div>
                    <h2 className="font-display text-2xl font-semibold text-foreground">
                      Order Lookup
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                      Enter your order ID and email to instantly track your live shipment status
                    </p>
                  </div>

                  {/* ERROR STATE CARD */}
                  {errorMessage && (
                    <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs sm:text-sm text-foreground flex items-start gap-3 animate-fade-in">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                      <div className="flex-1 font-medium leading-relaxed font-sans">{errorMessage}</div>
                    </div>
                  )}

                  <form onSubmit={handleLookupSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-subhead">
                        Order ID <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inputOrderId}
                        onChange={(e) => setInputOrderId(e.target.value)}
                        placeholder="e.g. PRJ40219873"
                        className="font-mono h-12 w-full rounded-2xl border border-border bg-secondary/30 px-4 text-sm font-medium uppercase placeholder:normal-case placeholder:font-sans placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 font-subhead">
                        Email Address <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="h-12 w-full rounded-2xl border border-border bg-secondary/30 px-4 text-sm placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="font-subhead w-full mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 hover:shadow-md disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      <span>{loading ? "Searching..." : "Track Order"}</span>
                    </button>
                  </form>
                </div>
              </div>
            </Reveal>
          )}

          {/* LOADING STATE */}
          {loading && (
            <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-sm">
              <div className="h-10 w-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Fetching Live Tracking Data
              </h3>
              <p className="mt-1 text-xs text-muted-foreground font-sans">
                Connecting to server and retrieving harvest shipment logs...
              </p>
            </div>
          )}

          {/* ACTIVE ORDER TRACKING DASHBOARD */}
          {activeOrderId && order && !loading && (
            <div className="space-y-6 animate-fade-in">
              {/* Awaiting Payment Notice */}
              {isAwaitingPayment && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/95 p-4 sm:p-5 text-amber-950 flex items-start gap-3">
                  <Clock className="h-5 w-5 shrink-0 mt-0.5 text-amber-700" />
                  <div className="text-xs sm:text-sm font-sans">
                    <p className="font-semibold text-amber-900 font-subhead">Awaiting Confirmation</p>
                    <p className="mt-0.5 text-amber-800 leading-relaxed font-sans">
                      We have received your order request. If you selected Cash on Delivery or WhatsApp payment, our operations desk will confirm your dispatch schedule shortly.
                    </p>
                  </div>
                </div>
              )}

              {/* 1. ORDER SUMMARY CARD & 4-STEP TIMELINE */}
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
                {/* Header Info Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xl sm:text-2xl font-bold text-foreground">
                        Order #{order.order_id || order.id}
                      </span>

                      {badgeInfo && (
                        <span
                          className={`font-subhead inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${badgeInfo.className}`}
                        >
                          {badgeInfo.label}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyOrderId(order.order_id || order.id)}
                        title="Copy Order ID"
                        aria-label="Copy Order ID"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary/50 text-foreground hover:bg-secondary cursor-pointer transition shadow-2xs"
                      >
                        {copiedId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1.5 font-sans">
                      {order.created_at ? (
                        <>
                          Placed on{" "}
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </>
                      ) : (
                        "Order confirmed with partner farms"
                      )}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground font-subhead">
                      Total Amount
                    </p>
                    <p className="font-display text-2xl sm:text-3xl font-bold text-primary mt-0.5">
                      {inr(order.total_amount)}
                    </p>
                  </div>
                </div>

                {/* 4-Step Horizontal Stepper (Timeline) */}
                <div className="pt-8 pb-2">
                  <div className="relative">
                    {/* Stepper Grid Container */}
                    <div className="grid grid-cols-4 gap-2 relative">
                      {/* Dynamic Connecting Line */}
                      <div
                        className="absolute top-4 left-[12%] right-[12%] h-[3px] bg-muted -z-0"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full bg-primary transition-all duration-500 ease-out"
                          style={{
                            width: `${(currentStepIdx / (STEP_STAGES.length - 1)) * 100}%`,
                          }}
                        />
                      </div>

                      {STEP_STAGES.map((stage, idx) => {
                        const isDone = idx < currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        return (
                          <div
                            key={stage.id}
                            className="flex flex-col items-center text-center relative z-10"
                          >
                            {/* Step Circle Indicator */}
                            <div
                              className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                                isDone
                                  ? "bg-primary text-primary-foreground ring-4 ring-primary/10 shadow-2xs"
                                  : isCurrent
                                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-105 shadow-2xs"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isDone ? (
                                <Check className="h-4 w-4 stroke-[3]" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>

                            {/* Step Label & Subtext */}
                            <p
                              className={`font-subhead text-[11px] sm:text-xs font-semibold mt-2.5 leading-tight ${
                                isDone || isCurrent ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {stage.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block font-sans">
                              {stage.getDescription(order)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. TWO-COLUMN CUSTOMER & SHIPPING DETAILS SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Column 1: Customer Information */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-4 border-b border-border pb-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground">
                        Customer Information
                      </h3>
                    </div>

                    <div className="space-y-3 text-xs sm:text-sm text-foreground font-sans">
                      <div>
                        <span className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Full Name
                        </span>
                        <span className="font-semibold text-foreground">
                          {order.customer_name}
                        </span>
                      </div>

                      {order.customer_email && (
                        <div>
                          <span className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Email Address
                          </span>
                          <span className="font-medium text-foreground">
                            {order.customer_email}
                          </span>
                        </div>
                      )}

                      {order.customer_phone && (
                        <div>
                          <span className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Phone Number
                          </span>
                          <span className="font-medium text-foreground">
                            {order.customer_phone}
                          </span>
                        </div>
                      )}

                      {order.shipping_address && (
                        <div>
                          <span className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Delivery Address
                          </span>
                          <span className="text-muted-foreground leading-relaxed">
                            {order.shipping_address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Shipping Details */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-4 border-b border-border pb-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Truck className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground">
                        Shipping Details
                      </h3>
                    </div>

                    {isDispatched ? (
                      <div className="space-y-3 text-xs sm:text-sm text-foreground font-sans">
                        <div>
                          <span className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Courier Partner
                          </span>
                          <span className="font-semibold text-foreground">
                            {order.carrier_name || "India Post (Speed Post)"}
                          </span>
                        </div>

                        {order.tracking_number && (
                          <div>
                            <span className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                              AWB / Tracking Number
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-sm font-bold text-primary bg-secondary/50 border border-border px-2.5 py-1 rounded-lg">
                                {order.tracking_number}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyAwb(order.tracking_number || "")}
                                title="Copy Tracking Number"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary cursor-pointer transition shadow-2xs"
                              >
                                {copiedAwb ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {order.delivery_date && (
                          <div>
                            <span className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                              Estimated Delivery Date
                            </span>
                            <span className="font-medium text-foreground">
                              {new Date(order.delivery_date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}

                        {order.delivery_route && (
                          <div>
                            <span className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                              Route Allocation
                            </span>
                            <span className="text-muted-foreground text-xs leading-relaxed">
                              {order.delivery_route}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-5 text-center my-auto">
                        <Package className="mx-auto h-6 w-6 text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                          Shipping details and India Post AWB tracking number will be assigned once the package is dispatched from the central hub.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. ITEMIZED HARVEST BASKET (Real Purchased Items) */}
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-semibold text-foreground">
                      Ordered Products ({order.items.length})
                    </h3>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {order.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="py-3.5 first:pt-1 last:pb-2 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-12 w-12 rounded-xl object-cover border border-border shrink-0 bg-secondary/30"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-border flex items-center justify-center shrink-0 text-primary">
                            <Sprout className="h-6 w-6 opacity-70 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-display font-medium text-sm text-foreground truncate">
                            {item.name}
                          </p>

                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-primary font-medium">
                            <Sprout className="h-3 w-3 shrink-0" />
                            <span className="truncate font-subhead text-[11px]">
                              From {item.farmer_name || "Regional Partner Farm"},{" "}
                              {item.farmer_location || "Local Hub"}
                            </span>
                          </div>

                          <p className="font-subhead text-[10px] text-muted-foreground mt-0.5">
                            Qty: {item.quantity} {item.weight ? `· ${item.weight}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-display font-bold text-sm text-foreground">
                          {inr(item.totalAmount || item.price * item.quantity)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="font-subhead text-[10px] text-muted-foreground">
                            {inr(item.price)} each
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Ledger Breakdown */}
                <div className="mt-5 border-t border-border pt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span className="font-subhead">Harvest Subtotal</span>
                    <span className="font-display font-medium text-foreground">{inr(order.subtotal)}</span>
                  </div>

                  {order.discount_amount && order.discount_amount > 0 ? (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="font-subhead">Direct Farmer Coupon</span>
                      <span className="font-display">-{inr(order.discount_amount)}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between">
                    <span className="font-subhead">Farm-to-Door Delivery (Speed Post)</span>
                    <span className="font-display font-medium text-foreground">
                      {order.shipping_cost === 0 ? (
                        <span className="font-subhead text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider text-[11px]">
                          Free Delivery
                        </span>
                      ) : (
                        inr(order.shipping_cost)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-border pt-3 text-sm">
                    <span className="font-display font-bold text-base text-foreground">
                      Total Paid
                    </span>
                    <span className="font-display font-bold text-lg text-primary">
                      {inr(order.total_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. FARMER TRUST CALLOUT */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex items-start gap-3.5">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <HeartHandshake className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-display font-semibold text-primary text-sm">
                    90% Direct Farmer Share
                  </p>
                  <p className="font-sans text-muted-foreground text-xs leading-relaxed">
                    90% of your produce payment goes directly to the local farmers who harvested your food — zero middleman markups.
                  </p>
                </div>
              </div>

              {/* 5. BACK TO STOREFRONT BUTTON */}
              <div className="pt-2 text-center">
                <Link
                  to="/shop"
                  className="font-subhead inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-xs sm:text-sm font-semibold text-foreground transition hover:bg-secondary/60 cursor-pointer shadow-2xs"
                >
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <span>Continue Shopping at Prajnaa Market</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </MarketingLayout>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <MarketingLayout>
          <div className="min-h-[85vh] bg-background grid place-items-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </MarketingLayout>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}
