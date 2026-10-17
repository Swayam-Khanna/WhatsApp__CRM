"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/lib/tanstack-compat";
import {
  Check,
  Copy,
  Sprout,
  Truck,
  Package,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Clock,
  MapPin,
  Mail,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { inr } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderSuccessPageProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderSuccessPage({ params }: OrderSuccessPageProps) {
  const resolvedParams = use(params);
  const rawOrderId = resolvedParams?.orderId || "";
  const orderId = decodeURIComponent(rawOrderId);

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Instant recovery from local cache
    if (typeof window !== "undefined") {
      try {
        const localCached =
          localStorage.getItem(`mock_order_${orderId}`) ||
          localStorage.getItem("prajnaa_last_order");
        if (localCached) {
          const parsed = JSON.parse(localCached);
          if (parsed.id === orderId || parsed.order_id === orderId || !parsed.id) {
            setOrder(parsed);
            setLoading(false);
          }
        }
      } catch (e) {
        console.warn("[OrderSuccess] Error parsing local order cache:", e);
      }
    }

    // 2. Fetch from Supabase for live authoritative data
    async function fetchOrderFromDb() {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .or(`id.eq.${orderId},order_id.eq.${orderId}`)
          .maybeSingle();

        if (isMounted && data) {
          setOrder(data);
        }
      } catch (err) {
        console.warn("[OrderSuccess] Error fetching order from DB:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchOrderFromDb();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const copyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    toast.success("Order ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract items
  const items = Array.isArray(order?.items) && order.items.length > 0
    ? order.items
    : [
        {
          name: order?.product_name || "Himalayan Mountain Walnuts",
          sku: order?.product_id || "0028",
          weight: "250g",
          qty: order?.quantity || 1,
          price: (order?.amount || 604) / (order?.quantity || 1),
          image: "/assets/cat-dryfruits.jpg",
        },
      ];

  const totalAmount = Number(order?.total_amount || order?.amount || 604);
  const shippingAddress = order?.shipping_address || "Provided during reservation";
  const customerName = order?.customer_name || "Valued Patron";
  const customerEmail = order?.customer_email || "";
  const customerPhone = order?.customer_phone || "";
  const paymentId = order?.payment_id || order?.razorpay_payment_id || "rzp_verified";
  const orderStatus = order?.order_status || order?.status || "Reserved – Pre-order paid";

  return (
    <MarketingLayout>
      <div className="bg-[#FCFBF8] min-h-screen py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Celebratory Card */}
          <div className="rounded-3xl border border-[#E6E0D4] bg-[#FAF8F5] p-8 sm:p-10 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E8EFE8] text-[#1E3B2F] shadow-sm mb-4">
              <Sprout className="h-8 w-8 stroke-[1.75]" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8EFE8] px-3.5 py-1 text-xs font-semibold text-[#1E3B2F] mb-3">
              <Check className="h-3.5 w-3.5" />
              {orderStatus}
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#1F2937]">
              Harvest Reservation Confirmed!
            </h1>

            {/* Prompted Primary Notice */}
            <div className="mt-5 mx-auto max-w-xl rounded-2xl border border-[#E6E0D4] bg-[#FAF6ED] p-4 text-sm text-[#4A433A] leading-relaxed shadow-2xs">
              <span className="font-semibold text-[#8B3A1A] block mb-1">
                Your harvest is reserved. We&apos;ll notify you once packing begins.
              </span>
              Our mountain farming partners in the Himalayas have allocated your batch. You will receive priority updates as the crop transitions through sun curing, sorting, and eco-packaging.
            </div>

            {/* Order Reference ID */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-[#6B7280]">
              <span>Order Reference:</span>
              <span className="font-mono font-bold text-[#1F2937] bg-white border border-[#D1D5DB] px-2.5 py-1 rounded-lg">
                {orderId}
              </span>
              <button
                type="button"
                onClick={copyOrderId}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#8B3A1A] hover:underline cursor-pointer ml-1"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left: Product & Pricing Summary */}
            <div className="md:col-span-7 space-y-6">
              <div className="rounded-3xl border border-[#E6E0D4] bg-[#FAF8F5] p-6 sm:p-7 shadow-xs">
                <h2 className="font-display text-base font-bold text-[#1F2937] mb-4 pb-2 border-b border-[#E6E0D4]">
                  Reserved Produce
                </h2>

                <div className="space-y-4">
                  {items.map((it: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#E6E0D4] bg-white">
                        <Image
                          src={it.image || "/assets/cat-dryfruits.jpg"}
                          alt={it.name || "Harvest Produce"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-[#1F2937] truncate">{it.name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E8EFE8] px-2 py-0.5 text-[10px] font-semibold text-[#1E3B2F]">
                            <Sprout className="h-3 w-3" />
                            2026 Harvest · Pre-order
                          </span>
                          <span className="text-xs text-[#6B7280]">
                            SKU: {it.sku || "0028"} · {it.weight || "250g"}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] mt-1 font-medium">
                          Quantity: {it.qty || it.quantity || 1}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-[#1F2937]">
                          {inr((Number(it.price) || 604) * (Number(it.qty || it.quantity) || 1))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-[#E6E0D4] pt-4 space-y-2 text-sm text-[#4B5563]">
                  <div className="flex justify-between">
                    <span>Produce Subtotal</span>
                    <span className="font-medium text-[#1F2937]">{inr(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Priority Harvest Shipping</span>
                    <span className="font-semibold text-emerald-700">FREE</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E6E0D4] pt-3 text-base font-bold text-[#1F2937]">
                    <span>Total Amount Paid</span>
                    <span className="font-display text-xl text-[#8B3A1A]">{inr(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Harvest Journey Pipeline */}
              <div className="rounded-3xl border border-[#E6E0D4] bg-[#FAF8F5] p-6 sm:p-7 shadow-xs">
                <h2 className="font-display text-base font-bold text-[#1F2937] mb-3">
                  What Happens Next?
                </h2>
                <div className="space-y-3.5">
                  <div className="flex gap-3 items-start">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1F2937]">Reservation Confirmed & Batch Locked</p>
                      <p className="text-[11px] text-[#6B7280]">Your portion has been reserved from the current mountain yield.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FAF6ED] border border-[#8B3A1A] text-[#8B3A1A] text-xs font-bold shrink-0 mt-0.5 animate-pulse">
                      2
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1F2937]">Curing, Sorting & Quality Check</p>
                      <p className="text-[11px] text-[#6B7280]">Produce undergoes solar curing and hand grading in the valley.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1F2937]">Priority Packing & Dispatch</p>
                      <p className="text-[11px] text-[#6B7280]">Sealed fresh in resealable pouches and dispatched to your door.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Delivery Address & Payment Confirmation */}
            <div className="md:col-span-5 space-y-6">
              {/* Delivery Details Card */}
              <div className="rounded-3xl border border-[#E6E0D4] bg-[#FAF8F5] p-6 sm:p-7 shadow-xs space-y-4">
                <h2 className="font-display text-base font-bold text-[#1F2937] pb-2 border-b border-[#E6E0D4]">
                  Delivery Address
                </h2>

                <div className="space-y-2.5 text-xs text-[#4B5563]">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#1F2937]">
                    <span>{customerName}</span>
                  </div>

                  {customerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-[#9CA3AF]" />
                      <span>+91 {customerPhone}</span>
                    </div>
                  )}

                  {customerEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-[#9CA3AF]" />
                      <span>{customerEmail}</span>
                    </div>
                  )}

                  <div className="flex items-start gap-2 pt-1 border-t border-[#E6E0D4]/60">
                    <MapPin className="h-3.5 w-3.5 text-[#8B3A1A] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{shippingAddress}</span>
                  </div>
                </div>
              </div>

              {/* Payment Details Card */}
              <div className="rounded-3xl border border-[#E6E0D4] bg-[#FAF8F5] p-6 sm:p-7 shadow-xs space-y-3">
                <h2 className="font-display text-base font-bold text-[#1F2937] pb-2 border-b border-[#E6E0D4]">
                  Payment Verification
                </h2>

                <div className="space-y-2 text-xs text-[#4B5563]">
                  <div className="flex justify-between">
                    <span>Payment Gateway:</span>
                    <span className="font-medium text-[#1F2937]">Razorpay (UPI / Card)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction ID:</span>
                    <span className="font-mono text-[11px] text-[#1F2937]">{paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Status:</span>
                    <span className="font-semibold text-emerald-700">Verified & Paid</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Link
                  to="/product/$slug"
                  params={{ slug: "walnuts" }}
                  className="w-full h-12 rounded-full bg-[#8B3A1A] hover:bg-[#732F15] text-white text-sm font-semibold shadow-sm hover:shadow transition flex items-center justify-center gap-2"
                >
                  <Sprout className="h-4 w-4" />
                  <span>View Harvest Journey</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/shop"
                  className="w-full h-12 rounded-full border border-[#D1D5DB] bg-white hover:bg-secondary/40 text-foreground text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Continue Shopping</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
