"use client";

import React from "react";
import { X, Printer, Package, CheckCircle } from "lucide-react";
import { inr } from "@/lib/format";

interface PackingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
}

export function PackingSlipModal({ isOpen, onClose, orders }: PackingSlipModalProps) {
  if (!isOpen || orders.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-5xl lg:max-w-6xl my-8 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-border pb-3 print:hidden">
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" /> Packing Slips ({orders.length})
            </h3>
            <p className="text-xs text-muted-foreground">Print fulfillment manifests and warehouse slips.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Print Slips
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Slips Content */}
        <div className="space-y-8 divide-y divide-dashed divide-border print:divide-stone-400">
          {orders.map((order, orderIdx) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const orderCode = order.order_id || order.id;

            return (
              <div key={order.id || orderIdx} className="pt-6 first:pt-0 space-y-4 print:page-break-after-always">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-border pb-3">
                  <div>
                    <h2 className="font-display font-bold text-xl text-primary">Prajnaa Market</h2>
                    <p className="text-[11px] text-muted-foreground">Authentic Himalayan & Natural Farm Produce</p>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold text-base text-foreground">
                      PACKING SLIP #{orderCode}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Date: {new Date(order.created_at || Date.now()).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Recipient & Shipping Information */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-secondary/30 p-3 rounded-xl print:border print:border-stone-300">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      Deliver To:
                    </div>
                    <div className="font-bold text-foreground text-sm">{order.customer_name || "Customer"}</div>
                    <div className="text-muted-foreground whitespace-pre-line mt-0.5">
                      {order.shipping_address || "No address provided"}
                    </div>
                    {order.customer_phone && (
                      <div className="text-muted-foreground mt-1">📞 {order.customer_phone}</div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      Shipping Details:
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Carrier: </span>
                      {order.carrier_name || "Standard Carrier"}
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Route: </span>
                      {order.delivery_route || "Direct Dispatch"}
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Tracking ID: </span>
                      <span className="font-mono font-bold text-foreground">
                        {order.tracking_number || "To be assigned"}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-semibold text-foreground">Payment Method: </span>
                      <span className="uppercase font-bold text-foreground">
                        {order.payment_method || "COD"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items to Pack */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Manifest Items ({items.length})
                  </div>
                  <table className="w-full text-xs border border-border rounded-xl overflow-hidden print:border-stone-300">
                    <thead className="bg-secondary/40 font-subhead text-[10px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">SKU / Item</th>
                        <th className="px-3 py-2 text-left">Variant/Weight</th>
                        <th className="px-3 py-2 text-center w-16">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-center w-16 print:table-cell">Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border print:divide-stone-300">
                      {items.map((it: any, itIdx: number) => (
                        <tr key={itIdx}>
                          <td className="px-3 py-2 font-medium text-foreground">
                            {it.name || it.productName || "Product"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{it.weight || "Standard"}</td>
                          <td className="px-3 py-2 text-center font-bold text-foreground">
                            {it.qty || it.quantity || 1}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {inr(Number(it.price || it.unitPrice || 0))}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="h-4 w-4 border border-stone-400 rounded-sm mx-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer notes */}
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-border">
                  <div>Packed by: _______________________</div>
                  <div>Inspected by: _______________________</div>
                  <div>Thank you for choosing Prajnaa Farm!</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
