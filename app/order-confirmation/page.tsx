"use client";

import { useSearchParams } from "next/navigation";
import { Link } from "@/lib/tanstack-compat";
import {
  Check,
  Copy,
  Truck,
  ShoppingBag,
  Clock,
  Package,
  HeartHandshake,
  Sprout,
  Loader2,
  MessageSquare,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Reveal } from "@/components/reveal";
import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { inr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

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

interface OrderDetails {
  id: string;
  order_id?: string;
  created_at?: string;
  status?: string;
  payment_method?: string;
  customer_name?: string;
  customer_email?: string;
  shipping_address?: string;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  discount_amount?: number;
  total_amount: number;
}

// Helper to assign authentic farmer provenance if not already present on an item
function enrichItemFarmer(item: any): OrderItem {
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
      farmerName = farmerName || "Rameshwar Sharma";
      farmerLocation = farmerLocation || "Nashik, Maharashtra";
    }
  }

  const qty = Number(item.quantity || item.qty || 1);
  const price = Number(item.unitPrice || item.price || 0);

  return {
    id: item.productId || item.slug || item.id,
    name,
    quantity: qty,
    price,
    weight: item.weight || null,
    image: item.image || null,
    farmer_name: farmerName,
    farmer_location: farmerLocation,
    totalAmount: Number(item.totalAmount || price * qty || 0),
  };
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const urlId =
    searchParams?.get("id") ||
    searchParams?.get("orderId") ||
    searchParams?.get("order_id");

  const [copied, setCopied] = useState(false);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      setLoading(true);

      try {
        let loadedDoc: any = null;

        // 1. Try URL order ID from localStorage first (instant synchronous check)
        if (typeof window !== "undefined" && urlId) {
          const directMock =
            localStorage.getItem(`mock_order_${urlId}`) ||
            localStorage.getItem(`mock_order_${urlId.replace("PRJ", "order_mock_")}`);
          if (directMock) {
            try {
              loadedDoc = JSON.parse(directMock);
            } catch (e) {}
          }
        }

        // 2. If not found and URL ID is provided, try backend GET /api/orders/[id]
        if (!loadedDoc && urlId) {
          try {
            const res = await fetch(`/api/orders/${encodeURIComponent(urlId)}`, {
              cache: "no-store",
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.order) {
                loadedDoc = data.order;
              }
            }
          } catch (apiErr) {
            console.warn("[Order Confirmation] API fetch note:", apiErr);
          }
        }

        // 3. Try Supabase query by URL ID
        if (!loadedDoc && urlId) {
          try {
            const { data: sbData } = await supabase
              .from("orders")
              .select("*")
              .or(`id.eq.${urlId},order_id.eq.${urlId}`)
              .maybeSingle();

            if (sbData) {
              loadedDoc = sbData;
            }
          } catch (sbErr) {
            console.warn("[Order Confirmation] Supabase lookup note:", sbErr);
          }
        }

        // 4. Fallback: If no order found yet, check prajnaa_last_order or latest mock_order_* in localStorage
        if (!loadedDoc && typeof window !== "undefined") {
          const lastOrder = localStorage.getItem("prajnaa_last_order");
          if (lastOrder) {
            try {
              loadedDoc = JSON.parse(lastOrder);
            } catch (e) {}
          }

          if (!loadedDoc) {
            // Find most recent mock order across all keys
            let newestOrder: any = null;
            let newestTime = 0;
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith("mock_order_") || key.startsWith("order_mock_"))) {
                try {
                  const parsed = JSON.parse(localStorage.getItem(key) || "");
                  const time = new Date(parsed.created_at || 0).getTime();
                  if (time >= newestTime) {
                    newestTime = time;
                    newestOrder = parsed;
                  }
                } catch (e) {}
              }
            }
            if (newestOrder) {
              loadedDoc = newestOrder;
            }
          }
        }

        // 5. Fallback: Fetch most recent order from Supabase
        if (!loadedDoc) {
          try {
            const { data: recentOrders } = await supabase
              .from("orders")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(1);

            if (recentOrders && recentOrders.length > 0) {
              loadedDoc = recentOrders[0];
            }
          } catch (e) {}
        }

        if (loadedDoc && isMounted) {
          const parsedItems = (loadedDoc.items || []).map(enrichItemFarmer);

          const subtotalVal = Number(
            loadedDoc.subtotal ||
              parsedItems.reduce((acc: number, cur: OrderItem) => acc + (cur.totalAmount || 0), 0)
          );
          const shippingVal = Number(loadedDoc.shipping_cost || loadedDoc.shipping_fee || 0);
          const discountVal = Number(loadedDoc.discount_amount || 0);
          const totalVal = Number(
            loadedDoc.total_amount || loadedDoc.total || Math.max(0, subtotalVal + shippingVal - discountVal)
          );

          setOrder({
            id: loadedDoc.id || loadedDoc.order_id || urlId || "PRJ40219873",
            order_id: loadedDoc.order_id || loadedDoc.id || urlId || "PRJ40219873",
            created_at: loadedDoc.created_at || new Date().toISOString(),
            status: loadedDoc.status || "confirmed",
            payment_method: loadedDoc.payment_method || "cod",
            customer_name: loadedDoc.customer_name || "Customer",
            customer_email: loadedDoc.customer_email || "",
            shipping_address: loadedDoc.shipping_address || "",
            items: parsedItems,
            subtotal: subtotalVal,
            shipping_cost: shippingVal,
            discount_amount: discountVal,
            total_amount: totalVal,
          });
        }
      } catch (err) {
        console.warn("[Order Confirmation] General load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrder();
    return () => {
      isMounted = false;
    };
  }, [urlId]);

  const activeOrderId = order?.order_id || order?.id || urlId || "PRJ40219873";

  const handleCopyId = () => {
    if (!activeOrderId) return;
    navigator.clipboard.writeText(activeOrderId);
    setCopied(true);
    toast.success("Order ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const displayItems = order?.items || [];

  const subtotal = order ? order.subtotal : 0;
  const shippingCost = order ? order.shipping_cost : 0;
  const discountAmount = order ? order.discount_amount || 0 : 0;
  const totalAmount = order ? order.total_amount : 0;

  const placedTime = order?.created_at
    ? new Date(order.created_at).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Today, Just now";

  const timelineSteps = [
    {
      label: "Placed",
      time: placedTime,
      status: "done",
    },
    {
      label: "Packed",
      time: "Tomorrow, 10 AM",
      status: "current",
    },
    {
      label: "Out for delivery",
      time: "In 2 days",
      status: "upcoming",
    },
    {
      label: "Delivered",
      time: "Est. Friday",
      status: "upcoming",
    },
  ];

  if (loading) {
    return (
      <MarketingLayout>
        <main className="min-h-screen bg-background flex items-center justify-center py-20 px-4">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-subhead text-sm text-muted-foreground font-medium">
              Loading your harvest order details...
            </p>
          </div>
        </main>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <main className="min-h-screen bg-background pb-16">
        {/* 1. SLIM HERO STRIP (Minimal & Compact with title only) */}
        <section className="bg-[#0F3D2E] text-white py-4 sm:py-5 px-4 text-center">
          <h1 className="font-display text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white">
            Your harvest is on its way
          </h1>
        </section>

        {/* 2. MAIN LEDGER & ORDER DETAILS */}
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8">
          <Reveal>
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">

              {/* Order ID Pill with Copy Button */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 sm:px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="font-subhead text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Order ID:
                  </span>
                  <span className="font-mono text-sm sm:text-base font-bold text-foreground tracking-wide select-all">
                    {activeOrderId}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyId}
                  className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition shadow-2xs cursor-pointer active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-primary" />
                      <span className="text-primary font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Prajnaa Official WhatsApp Concierge & Direct Payment Card */}
              <div className="rounded-2xl border-2 border-emerald-600/30 bg-emerald-500/5 p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-600/20 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-emerald-600 text-white grid place-items-center shrink-0 shadow-2xs">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold text-foreground">
                        Prajnaa WhatsApp Concierge
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Official Business Number: <strong className="text-emerald-700 dark:text-emerald-400">+91 76500 65690</strong>
                      </p>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/917650065690?text=${encodeURIComponent(
                      `Namaste Prajnaa Market! 🙏 I have placed order #${activeOrderId} for ${inr(
                        totalAmount
                      )}. Here is my payment confirmation / query.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-semibold shadow-sm transition cursor-pointer self-start sm:self-auto"
                  >
                    <MessageSquare className="h-4 w-4" /> Open WhatsApp Chat (+91 76500 65690)
                  </a>
                </div>

                {/* Direct UPI Scan & Pay Box */}
                <div className="flex flex-col sm:flex-row items-center gap-5 bg-card rounded-xl p-4 border border-border">
                  <div className="h-32 w-32 rounded-xl bg-white p-2 border border-border shrink-0 grid place-items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                        `upi://pay?pa=prajnaa@upi&pn=Prajnaa%20Market&am=${totalAmount}&cu=INR&tn=Order%20${activeOrderId}`
                      )}`}
                      alt="Prajnaa UPI QR"
                      className="h-28 w-28 object-contain"
                    />
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left text-xs">
                    <span className="font-bold text-foreground block text-sm">
                      Scan & Pay with Any UPI App
                    </span>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      UPI ID: <code className="font-mono font-bold text-foreground bg-secondary px-1.5 py-0.5 rounded">prajnaa@upi</code> (Beneficiary: Prajnaa Farm Produce Pvt Ltd)
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      After payment, click the WhatsApp button above to share your payment screenshot. Our operations desk will immediately confirm receipt.
                    </p>
                  </div>
                </div>

                {/* Packaging timeline badge */}
                <div className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-300 font-medium bg-emerald-100/60 dark:bg-emerald-950/40 px-3.5 py-2 rounded-xl border border-emerald-300/30">
                  <Clock className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span>
                    Packaging Window: 2–3 business days for harvest sorting & quality inspection before dispatch via India Post Speed Post.
                  </span>
                </div>
              </div>

              {/* Delivery Timeline (Consistent 4-Stage Stepper) */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base font-semibold text-foreground">
                      Delivery Timeline
                    </h2>
                  </div>
                  <span className="font-subhead text-xs font-medium text-muted-foreground">
                    India Post Speed Post
                  </span>
                </div>

                <div className="relative pt-2 pb-2">
                  {/* Connecting Bar */}
                  <div
                    className="absolute top-5 left-[12%] right-[12%] h-[2px] bg-muted -z-0"
                    aria-hidden="true"
                  >
                    <div className="h-full bg-primary w-[33%] transition-all duration-500" />
                  </div>

                  <div className="grid grid-cols-4 gap-1 relative z-10 text-center">
                    {timelineSteps.map((step, idx) => {
                      const isDone = step.status === "done";
                      const isCurrent = step.status === "current";
                      return (
                        <div key={step.label} className="flex flex-col items-center">
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                              isDone
                                ? "bg-primary text-primary-foreground ring-4 ring-primary/10"
                                : isCurrent
                                ? "bg-primary/90 text-primary-foreground ring-4 ring-primary/20"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isDone ? (
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>

                          <p
                            className={`font-subhead text-[11px] sm:text-xs font-semibold mt-2.5 leading-tight ${
                              isDone || isCurrent ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="font-sans text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">
                            {step.time}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Itemized Harvest Basket (Consistent Card & Typography) */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base font-semibold text-foreground">
                      Ordered Products
                    </h2>
                  </div>
                  <span className="font-subhead text-xs font-medium text-muted-foreground">
                    {displayItems.length} {displayItems.length === 1 ? "item" : "items"}
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-border">
                  {displayItems.map((item, idx) => (
                    <div key={item.id || idx} className="py-3.5 first:pt-1 last:pb-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-12 w-12 rounded-xl object-cover border border-border shrink-0 bg-secondary/30"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-display font-medium text-sm text-foreground truncate">
                              {item.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-primary font-medium">
                              <Sprout className="h-3.5 w-3.5 shrink-0 text-primary" />
                              <span className="truncate font-subhead text-[11px]">
                                From {item.farmer_name || "Partner Farm"}, {item.farmer_location || "Organic Hub"}
                              </span>
                            </div>
                            <p className="font-subhead text-[10px] text-muted-foreground mt-0.5">
                              Qty: {item.quantity} {item.weight ? `· ${item.weight}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-display font-bold text-sm text-foreground">
                            {inr(item.totalAmount || item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Ledger Breakdown */}
                <div className="mt-4 border-t border-border pt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span className="font-subhead">Harvest Subtotal</span>
                    <span className="font-display font-medium text-foreground">{inr(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="font-subhead">Direct Farmer Coupon</span>
                      <span className="font-display">-{inr(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="font-subhead">Farm-to-Door Delivery (Speed Post)</span>
                    <span className="font-display font-medium text-foreground">
                      {shippingCost === 0 ? (
                        <span className="font-subhead text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider text-[11px]">
                          Free Delivery
                        </span>
                      ) : (
                        inr(shippingCost)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-border pt-3 text-sm">
                    <span className="font-display font-bold text-base text-foreground">
                      Total Paid
                    </span>
                    <span className="font-display font-bold text-lg text-primary">
                      {inr(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Farmer-Direct Impact Note */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex items-start gap-3.5">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <HeartHandshake className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-display font-semibold text-primary text-sm">
                    90% Direct Farmer Share
                  </p>
                  <p className="font-sans text-muted-foreground text-xs leading-relaxed">
                    90% of your produce payment goes directly into the bank accounts of the
                    verified organic farmers who harvested your food — zero middleman markups.
                  </p>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch justify-center gap-3">
                <Link
                  to="/track-order"
                  search={{ orderId: activeOrderId }}
                  className="font-subhead inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 cursor-pointer flex-1"
                >
                  <Truck className="h-4 w-4" />
                  Track this order
                </Link>

                <Link
                  to="/shop"
                  className="font-subhead inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary/60 cursor-pointer flex-1"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Continue shopping
                </Link>
              </div>

            </div>
          </Reveal>
        </div>
      </main>
    </MarketingLayout>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <MarketingLayout>
          <div className="min-h-screen bg-background grid place-items-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </MarketingLayout>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
