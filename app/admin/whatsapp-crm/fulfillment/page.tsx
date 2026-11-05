"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Send,
  Printer,
  ChevronDown,
  Calendar,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  whatsappCrmService,
  FulfillmentOrder,
  PRAJNAA_WHATSAPP_CONFIG,
} from "@/lib/services/whatsappCrmService";
import { inr } from "@/lib/format";

const PIPELINE_STAGES: Array<{ id: FulfillmentOrder["stage"]; label: string; description: string; color: string }> = [
  { id: "awaiting_payment", label: "Awaiting Payment", description: "WhatsApp UPI instructions sent", color: "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-300" },
  { id: "payment_confirmed", label: "Payment Confirmed", description: "Verified & ready for queue", color: "border-blue-500/40 bg-blue-500/5 text-blue-800 dark:text-blue-300" },
  { id: "packing", label: "Packing (2–3 Days)", description: "Sorting, inspection & sealing", color: "border-purple-500/40 bg-purple-500/5 text-purple-800 dark:text-purple-300" },
  { id: "ready_for_dispatch", label: "Ready for Dispatch", description: "Manifested for India Post", color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300" },
  { id: "shipped_india_post", label: "Dispatched (India Post)", description: "In transit with Speed Post", color: "border-sky-500/40 bg-sky-500/5 text-sky-800 dark:text-sky-300" },
  { id: "delivered", label: "Delivered", description: "Completed & feedback requested", color: "border-emerald-600/40 bg-emerald-600/10 text-emerald-900 dark:text-emerald-200" },
];

export default function WhatsAppCrmFulfillmentPage() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStageFilter, setActiveStageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  useEffect(() => {
    setOrders(whatsappCrmService.getFulfillmentOrders());
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      (o.consignmentNumber && o.consignmentNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeStageFilter !== "all" && o.stage !== activeStageFilter) return false;
    return true;
  });

  const handleAdvanceStage = (orderId: string, currentStage: FulfillmentOrder["stage"]) => {
    const stageSequence: FulfillmentOrder["stage"][] = [
      "awaiting_payment",
      "payment_confirmed",
      "packing",
      "ready_for_dispatch",
      "shipped_india_post",
      "delivered",
    ];
    const currentIndex = stageSequence.indexOf(currentStage);
    if (currentIndex < stageSequence.length - 1) {
      const nextStage = stageSequence[currentIndex + 1];
      whatsappCrmService.updateOrderStatus(orderId, nextStage);
      setOrders(whatsappCrmService.getFulfillmentOrders());
      toast.success(`Order moved to ${nextStage.replace(/_/g, " ")}`);
    }
  };

  const handleSendWhatsAppNotification = (order: FulfillmentOrder) => {
    let msg = "";
    if (order.stage === "packing") {
      msg = `Namaste ${order.customerName} ji! 🙏 Aapke Prajnaa Market order #${order.orderNumber} ki packaging shuru ho chuki hai (Day ${order.processingDay} of 3). Pure Himalayan produce ko temperature-controlled corrugation mein pack kiya ja raha hai.`;
    } else if (order.stage === "ready_for_dispatch") {
      msg = `Namaste ${order.customerName} ji! 🌿 Aapka order #${order.orderNumber} packing complete karke dispatch bay mein prepare kar diya gaya hai. India Post Speed Post pickup scheduled hai.`;
    } else if (order.stage === "shipped_india_post") {
      msg = `Namaste ${order.customerName} ji! 📦 Aapka Prajnaa parcel dispatch ho chuka hai! Consignment ID: ${order.consignmentNumber || "ED839102914IN"}. Track on India Post website.`;
    } else {
      msg = `Namaste ${order.customerName} ji! 🙏 Order #${order.orderNumber} update: Status is currently ${order.stage.replace(/_/g, " ")}. Team Prajnaa Market.`;
    }

    toast.success(`WhatsApp status alert sent to ${order.customerPhone}`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 space-y-6 bg-background">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Packaging & Fulfillment Lifecycle
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
              Standard 2–3 Days Window
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Track orders from Himalayan farmer harvest through packaging quality control and India Post Speed Post dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border p-1 bg-secondary/50 text-xs">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "kanban" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pipeline View
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "table" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Order ID, Customer, Phone, or Consignment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveStageFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              activeStageFilter === "all" ? "bg-primary text-primary-foreground font-semibold" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All Orders ({orders.length})
          </button>
          {PIPELINE_STAGES.map((s) => {
            const count = orders.filter((o) => o.stage === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStageFilter(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  activeStageFilter === s.id ? "bg-primary text-primary-foreground font-semibold" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* View: Pipeline Kanban */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-6">
          {PIPELINE_STAGES.map((stage) => {
            const stageOrders = filteredOrders.filter((o) => o.stage === stage.id);
            return (
              <div
                key={stage.id}
                className="flex flex-col rounded-2xl border border-border bg-card/60 p-3 min-w-[260px] space-y-3"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div>
                    <h3 className="font-semibold text-xs text-foreground">{stage.label}</h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{stage.description}</p>
                  </div>
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-secondary text-foreground text-[10px] font-bold flex items-center justify-center border border-border">
                    {stageOrders.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-18rem)] pr-0.5">
                  {stageOrders.length === 0 ? (
                    <div className="h-28 rounded-xl border border-dashed border-border/80 flex items-center justify-center text-[11px] text-muted-foreground">
                      No orders
                    </div>
                  ) : (
                    stageOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-border bg-card p-3 shadow-2xs space-y-2.5 transition hover:shadow-xs hover:border-primary/40"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-mono text-xs font-bold text-foreground">
                            #{order.orderNumber}
                          </span>
                          <span className="font-semibold text-xs text-primary">
                            {inr(order.totalAmountPaise / 100)}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-foreground truncate">{order.customerName}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" /> {order.customerCity}, {order.customerState}
                          </p>
                        </div>

                        {/* Processing day badge if packing */}
                        {order.stage === "packing" && (
                          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md text-[10px] text-amber-900 dark:text-amber-200 font-semibold">
                            <Clock className="h-3 w-3" />
                            <span>Packing: Day {order.processingDay} of 3</span>
                          </div>
                        )}

                        {/* Consignment if shipped */}
                        {order.consignmentNumber && (
                          <div className="bg-secondary/80 p-1.5 rounded border border-border text-[10px] font-mono">
                            <span className="text-muted-foreground block text-[9px] uppercase">Speed Post Consignment:</span>
                            <span className="font-bold text-foreground">{order.consignmentNumber}</span>
                          </div>
                        )}

                        {/* Order Items summary */}
                        <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2 space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[10px]">
                              <span className="truncate max-w-[150px]">{item.name}</span>
                              <span className="font-medium shrink-0">× {item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-1 pt-1 border-t border-border">
                          <button
                            onClick={() => handleSendWhatsAppNotification(order)}
                            className="flex-1 py-1 rounded-md bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition"
                            title="Send WhatsApp update to customer"
                          >
                            <Send className="h-2.5 w-2.5" /> WhatsApp Alert
                          </button>

                          {order.stage !== "delivered" && (
                            <button
                              onClick={() => handleAdvanceStage(order.id, order.stage)}
                              className="p-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-[10px] cursor-pointer transition shrink-0"
                              title="Advance to next fulfillment stage"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* View: Table View */
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 text-muted-foreground border-b border-border uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order (#ID)</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Method & Payment</th>
                  <th className="py-3 px-4">Consignment (India Post)</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      No orders currently in fulfillment pipeline.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-secondary/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        #{order.orderNumber}
                        <span className="block text-[10px] font-normal text-muted-foreground">{order.placedAt}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-foreground">{order.customerName}</p>
                        <p className="text-[10px] text-muted-foreground">{order.customerPhone}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-secondary border border-border text-foreground">
                          <Clock className="h-3 w-3 text-primary" />
                          {order.stage.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-foreground uppercase text-[10px] block">
                          {order.paymentMethod}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            order.paymentStatus === "collected" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {order.paymentStatus === "collected" ? "Paid" : "Awaiting Verification"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {order.consignmentNumber ? (
                          <span className="text-foreground font-semibold">{order.consignmentNumber}</span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-primary">
                        {inr(order.totalAmountPaise / 100)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSendWhatsAppNotification(order)}
                            className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium cursor-pointer"
                          >
                            Send WhatsApp
                          </button>
                          <button
                            onClick={() => handleAdvanceStage(order.id, order.stage)}
                            className="px-2 py-1 rounded bg-primary text-primary-foreground font-medium hover:opacity-90 cursor-pointer"
                          >
                            Next Stage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
