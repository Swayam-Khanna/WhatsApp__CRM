"use client";

import { useState, useEffect } from "react";
import {
  Truck,
  Package,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Calendar,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  whatsappCrmService,
  IndiaPostConsignment,
  PRAJNAA_WHATSAPP_CONFIG,
} from "@/lib/services/whatsappCrmService";

export default function WhatsAppCrmTrackingPage() {
  const [consignments, setConsignments] = useState<IndiaPostConsignment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // New Consignment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrderNum, setNewOrderNum] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newConsignmentId, setNewConsignmentId] = useState("");
  const [newPincode, setNewPincode] = useState("");

  useEffect(() => {
    setConsignments(whatsappCrmService.getConsignments());
  }, []);

  const filteredConsignments = consignments.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.consignmentNumber.toLowerCase().includes(q) ||
      c.orderNumber.toLowerCase().includes(q) ||
      c.customerName.toLowerCase().includes(q) ||
      c.destinationPincode.includes(q)
    );
  });

  const handleCopy = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
    toast.success("Consignment ID copied to clipboard");
  };

  const handleSendWhatsAppTracking = (c: IndiaPostConsignment) => {
    const text = `Namaste ${c.customerName} ji! 📦 Aapka Prajnaa Market order #${c.orderNumber} dispatch ho chuka hai.\n\n• Carrier: India Post Speed Post\n• Consignment ID: ${c.consignmentNumber}\n• Destination: Pincode ${c.destinationPincode}\n\nAap is consignment number ko India Post official portal par track kar sakte hain: https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx\n\nDhanyavaad ji! 🌿`;
    toast.success(`WhatsApp dispatch update sent to ${c.customerPhone}`);
  };

  const handleCreateConsignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsignmentId.trim() || !newOrderNum.trim()) {
      toast.error("Please provide both Consignment ID and Order Number");
      return;
    }

    const created: IndiaPostConsignment = {
      consignmentNumber: newConsignmentId.trim().toUpperCase(),
      orderNumber: newOrderNum.trim(),
      customerName: newCustomerName.trim() || "Valued Customer",
      customerPhone: newCustomerPhone.trim() || "+91 98112 34567",
      destinationPincode: newPincode.trim() || "560103",
      serviceType: "Speed Post",
      bookingDate: "17 Oct 2026",
      currentStatus: "Booked",
      lastLocation: "Shimla RMS (171001)",
      lastUpdated: "Just now",
      weightGrams: 950,
      whatsappNotified: false,
      timeline: [
        { date: "17 Oct, 02:00 PM", status: "Item Booked", location: "Shimla RMS" },
      ],
    };

    whatsappCrmService.addConsignment(created);
    setConsignments(whatsappCrmService.getConsignments());
    setIsModalOpen(false);
    setNewConsignmentId("");
    setNewOrderNum("");
    toast.success(`Consignment ${created.consignmentNumber} saved & linked to #${created.orderNumber}!`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 space-y-6 bg-background">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              India Post Speed Post Tracking Desk
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
              National Carrier Integrated
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage Speed Post consignments, track parcels across India Post sorting hubs, and trigger verified WhatsApp delivery updates.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-2xs transition hover:opacity-90 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Link Consignment Number
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by Consignment ID (ED...IN), Order Number, Pincode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
        />
      </div>

      {/* Consignments List */}
      <div className="space-y-4">
        {filteredConsignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-xs text-muted-foreground">
            <Truck className="h-8 w-8 mx-auto mb-2 opacity-30 text-primary" />
            <p className="font-semibold text-foreground">No Consignments Tracked</p>
            <p className="mt-1">Link an India Post Speed Post consignment number to start tracking.</p>
          </div>
        ) : (
          filteredConsignments.map((c) => (
            <div
              key={c.consignmentNumber}
              className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xs transition hover:border-primary/40"
            >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-primary" /> {c.consignmentNumber}
                  </span>
                  <button
                    onClick={() => handleCopy(c.consignmentNumber)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy"
                  >
                    {copiedNumber === c.consignmentNumber ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                    {c.serviceType}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      c.currentStatus === "Delivered"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : c.currentStatus === "Out for Delivery"
                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {c.currentStatus.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Order: <strong className="text-foreground">#{c.orderNumber}</strong> • Customer: <strong className="text-foreground">{c.customerName}</strong> ({c.customerPhone})
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => handleSendWhatsAppTracking(c)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Send className="h-3.5 w-3.5" /> Send WhatsApp Update
                </button>
                <a
                  href="https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium flex items-center gap-1"
                >
                  India Post Portal <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Tracking Timeline Stepper */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-foreground">Consignment Milestone Log:</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                {c.timeline.map((step, idx) => (
                  <div key={idx} className="rounded-xl bg-secondary/50 p-2.5 border border-border space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-medium">{step.date}</span>
                    <p className="font-semibold text-foreground text-[11px]">{step.status}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" /> {step.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* Modal: Link Consignment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-base text-foreground">
                Link India Post Consignment
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateConsignment} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Consignment ID</label>
                <input
                  type="text"
                  placeholder="e.g. ED123456789IN"
                  value={newConsignmentId}
                  onChange={(e) => setNewConsignmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Order Number</label>
                <input
                  type="text"
                  placeholder="e.g. ORD-2026-1001"
                  value={newOrderNum}
                  onChange={(e) => setNewOrderNum(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Destination PIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 560103"
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-secondary text-foreground font-semibold hover:bg-secondary/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 cursor-pointer shadow-2xs"
                >
                  Save Consignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
