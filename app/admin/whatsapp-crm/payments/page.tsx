"use client";

import { useState, useEffect } from "react";
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Copy,
  Check,
  ExternalLink,
  Send,
  Building,
  CreditCard,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  whatsappCrmService,
  FulfillmentOrder,
  PRAJNAA_WHATSAPP_CONFIG,
} from "@/lib/services/whatsappCrmService";
import { inr } from "@/lib/format";

export default function WhatsAppCrmPaymentsPage() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [utrInput, setUtrInput] = useState("");

  useEffect(() => {
    const list = whatsappCrmService.getFulfillmentOrders();
    setOrders(list);
    if (list.length > 0 && !selectedOrderId) {
      setSelectedOrderId(list[0].id);
    }
  }, [selectedOrderId]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(PRAJNAA_WHATSAPP_CONFIG.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
    toast.success("UPI ID copied to clipboard");
  };

  const handleVerifyOrderPayment = (orderId: string) => {
    const note = utrInput.trim() ? `Verified with UTR: ${utrInput.trim()}` : "Manually verified by finance operator";
    whatsappCrmService.updateOrderStatus(orderId, "payment_confirmed", note);
    setOrders(whatsappCrmService.getFulfillmentOrders());
    setUtrInput("");
    toast.success(`Payment verified and confirmed for #${selectedOrder?.orderNumber}!`);
  };

  const handleSendPaymentInstructionsWhatsApp = (order: FulfillmentOrder) => {
    toast.success(`Payment instructions and UPI QR sent to ${order.customerPhone} on WhatsApp`);
  };

  const dynamicUpiUri = selectedOrder
    ? whatsappCrmService.generateUpiIntent(selectedOrder.orderNumber, selectedOrder.totalAmountPaise / 100)
    : "";

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 space-y-6 bg-background">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Payment QR & Direct Verification Desk
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
              UPI & Direct Transfer
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Reconcile payments for "WhatsApp Order & Direct Payment" orders before initiating Himalayan packaging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-card border border-border px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
            <span className="text-muted-foreground">Official UPI:</span>
            <code className="font-mono font-bold text-foreground">{PRAJNAA_WHATSAPP_CONFIG.upiId}</code>
            <button
              onClick={handleCopyUpi}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {copiedUpi ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Orders Awaiting Payment / Verification (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Orders Pending Payment / Verification</h3>
              <span className="text-xs text-muted-foreground">{orders.length} total orders</span>
            </div>

            <div className="divide-y divide-border">
              {orders.map((o) => {
                const isSelected = o.id === selectedOrder?.id;
                const isPaid = o.paymentStatus === "collected";
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`p-3.5 transition cursor-pointer hover:bg-secondary/60 rounded-xl ${
                      isSelected ? "bg-secondary border border-primary/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">#{o.orderNumber}</span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isPaid
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {isPaid ? "PAID & VERIFIED" : "AWAITING VERIFICATION"}
                          </span>
                        </div>
                        <p className="text-xs text-foreground font-medium">{o.customerName} ({o.customerPhone})</p>
                        <p className="text-[11px] text-muted-foreground">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display font-bold text-sm text-primary block">
                          {inr(o.totalAmountPaise / 100)}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">{o.stage.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Payment Action Card & QR Code (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedOrder && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" /> Payment Reconciler
                </h3>
                <span className="font-mono text-xs font-bold text-primary">#{selectedOrder.orderNumber}</span>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-6 bg-secondary/40 rounded-2xl border border-border space-y-3">
                <div className="h-44 w-44 rounded-2xl bg-white p-3 border border-border/80 shadow-xs flex flex-col items-center justify-center">
                  {/* SVG Mock QR Code */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      dynamicUpiUri
                    )}`}
                    alt="Prajnaa Market UPI QR"
                    className="h-36 w-36 object-contain"
                  />
                </div>
                <div className="text-center space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Scan via any UPI App</p>
                  <p className="text-[11px] text-muted-foreground">Google Pay • PhonePe • Paytm • BHIM</p>
                  <p className="font-display font-bold text-base text-primary pt-1">
                    {inr(selectedOrder.totalAmountPaise / 100)}
                  </p>
                </div>
              </div>

              {/* Bank Details Strip */}
              <div className="rounded-xl bg-secondary/60 p-3.5 space-y-2 text-xs border border-border">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                  <Building className="h-3.5 w-3.5 text-primary" /> Official Bank Account Details
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Beneficiary:</span>
                    <strong className="text-foreground">{PRAJNAA_WHATSAPP_CONFIG.bankDetails.accountName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Bank:</span>
                    <strong className="text-foreground">{PRAJNAA_WHATSAPP_CONFIG.bankDetails.bankName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Account No:</span>
                    <code className="text-foreground font-mono">{PRAJNAA_WHATSAPP_CONFIG.bankDetails.accountNumber}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">IFSC Code:</span>
                    <code className="text-foreground font-mono">{PRAJNAA_WHATSAPP_CONFIG.bankDetails.ifsc}</code>
                  </div>
                </div>
              </div>

              {/* Manual Verification Form */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Bank UTR / Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 12-digit UTR from customer's screenshot..."
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleVerifyOrderPayment(selectedOrder.id)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Confirm Payment & Advance to Packing
                  </button>

                  <button
                    onClick={() => handleSendPaymentInstructionsWhatsApp(selectedOrder)}
                    className="w-full py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium text-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="h-3.5 w-3.5 text-primary" /> Send QR & Bank Info on WhatsApp
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
