"use client";

import React, { useState } from "react";
import Link from "next/router";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  ArrowUpDown,
  Download,
  Printer,
  CheckCircle,
  Tag as TagIcon,
  AlertCircle,
  RotateCw,
  ExternalLink,
  Truck,
} from "lucide-react";
import { inr } from "@/lib/format";
import {
  getWixFulfillmentLabel,
  FULFILLMENT_BADGE_STYLES,
  getWixPaymentLabel,
  PAYMENT_BADGE_STYLES,
  PAYMENT_METHOD_SHORT_LABELS,
} from "@/lib/orders/order-constants";
import { ColumnSetting } from "./OrdersToolbar";

interface OrdersTableProps {
  orders: any[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  columns: ColumnSetting[];
  selectedIds: string[];
  onSelectAll: (allIds: string[]) => void;
  onToggleSelect: (id: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (column: string) => void;
  onBulkStatusChange: (action: "mark_confirmed" | "mark_packed") => void;
  onBulkAddTag: () => void;
  onBulkPrintPackingSlips: () => void;
  onExportCsv: (onlySelected?: boolean) => void;
}

export function OrdersTable({
  orders,
  isLoading,
  isError,
  onRetry,
  columns,
  selectedIds,
  onSelectAll,
  onToggleSelect,
  sortBy,
  sortOrder,
  onSortChange,
  onBulkStatusChange,
  onBulkAddTag,
  onBulkPrintPackingSlips,
  onExportCsv,
}: OrdersTableProps) {
  const router = useRouter();
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedRowIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isColVisible = (id: string) => {
    const col = columns.find((c) => c.id === id);
    return col ? col.visible : true;
  };

  const allOrderIds = orders.map((o) => String(o.id || o.order_id));
  const isAllSelected = allOrderIds.length > 0 && allOrderIds.every((id) => selectedIds.includes(id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleRowClick = (orderId: string) => {
    router.push(`/admin/orders/${orderId}`);
  };

  return (
    <div className="space-y-3">
      {/* Bulk Actions Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-2.5 shadow-sm text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 font-subhead font-semibold text-primary">
            <CheckCircle className="h-4 w-4" />
            <span>{selectedIds.length} order{selectedIds.length > 1 ? "s" : ""} selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onBulkStatusChange("mark_confirmed")}
              className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-secondary font-medium transition cursor-pointer"
            >
              Mark Confirmed
            </button>
            <button
              type="button"
              onClick={() => onBulkStatusChange("mark_packed")}
              className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-secondary font-medium transition cursor-pointer"
            >
              Mark Packed
            </button>
            <button
              type="button"
              onClick={onBulkPrintPackingSlips}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-secondary font-medium transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Packing Slips</span>
            </button>
            <button
              type="button"
              onClick={onBulkAddTag}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-secondary font-medium transition cursor-pointer"
            >
              <TagIcon className="h-3.5 w-3.5" />
              <span>Add Tag</span>
            </button>
            <button
              type="button"
              onClick={() => onExportCsv(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-secondary font-medium transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Selected CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="h-4 w-4 bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive/60" />
            <p className="text-sm font-medium text-foreground">Failed to load live orders</p>
            <p className="text-xs text-muted-foreground">Please check your network connection and retry.</p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 transition cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h4 className="font-display font-semibold text-base text-foreground">No orders found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No orders matched your current filters, search terms, or status selection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/35 border-b border-border">
                <tr className="font-subhead text-[10px] uppercase tracking-[0.12em] text-muted-foreground text-left select-none">
                  {/* Selection Checkbox */}
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={() => onSelectAll(isAllSelected ? [] : allOrderIds)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </th>

                  {/* Order ID */}
                  {isColVisible("order_id") && (
                    <th className="px-4 py-3.5 font-bold">
                      Order
                    </th>
                  )}

                  {/* Date Created */}
                  {isColVisible("date") && (
                    <th
                      onClick={() => onSortChange("created_at")}
                      className="px-4 py-3.5 font-bold cursor-pointer hover:text-foreground transition"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date Created</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  )}

                  {/* Customer */}
                  {isColVisible("customer") && (
                    <th className="px-4 py-3.5 font-bold">Customer</th>
                  )}

                  {/* Payment */}
                  {isColVisible("payment") && (
                    <th className="px-4 py-3.5 font-bold">Payment</th>
                  )}

                  {/* Fulfillment */}
                  {isColVisible("fulfillment") && (
                    <th className="px-4 py-3.5 font-bold">Fulfillment</th>
                  )}

                  {/* Tracking */}
                  {isColVisible("tracking") && (
                    <th className="px-4 py-3.5 font-bold">Tracking</th>
                  )}

                  {/* Total */}
                  {isColVisible("total") && (
                    <th
                      onClick={() => onSortChange("total")}
                      className="px-4 py-3.5 font-bold text-right cursor-pointer hover:text-foreground transition"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  )}

                  {/* Items */}
                  {isColVisible("items") && (
                    <th className="px-4 py-3.5 font-bold text-center">Items</th>
                  )}

                  {/* Tags */}
                  {isColVisible("tags") && (
                    <th className="px-4 py-3.5 font-bold">Tags</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {orders.map((order) => {
                  const id = String(order.id || order.order_id);
                  const orderCode = order.order_id || id;
                  const isSelected = selectedIds.includes(id);
                  const isExpanded = !!expandedRowIds[id];

                  const rawStatus = order.status;
                  const fulfillmentLabel = getWixFulfillmentLabel(rawStatus);
                  const fulfillmentStyle = FULFILLMENT_BADGE_STYLES[fulfillmentLabel];

                  const paymentLabel = getWixPaymentLabel(order.payment_status, order.payment_method);
                  const paymentStyle = PAYMENT_BADGE_STYLES[paymentLabel];
                  const methodLabel = PAYMENT_METHOD_SHORT_LABELS[String(order.payment_method || "").toLowerCase()] || "COD";

                  const isCancelled = fulfillmentLabel === "Canceled";
                  const items: any[] = Array.isArray(order.items) ? order.items : [];
                  const tags: string[] = Array.isArray(order.tags) ? order.tags : [];

                  const createdDate = order.created_at || order.createdAt;
                  const formattedDate = createdDate
                    ? new Date(createdDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";
                  const formattedTime = createdDate
                    ? new Date(createdDate).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  return (
                    <React.Fragment key={id}>
                      <tr
                        onClick={() => handleRowClick(id)}
                        className={`transition-colors cursor-pointer group select-none ${
                          isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-secondary/20"
                        } ${isCancelled ? "opacity-60 bg-muted/20" : ""}`}
                      >
                        {/* Row Checkbox */}
                        <td
                          className="px-4 py-3.5 w-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(id)}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                        </td>

                        {/* Order ID */}
                        {isColVisible("order_id") && (
                          <td className="px-4 py-3.5">
                            <span className="font-display font-bold text-foreground group-hover:text-primary transition flex items-center gap-1.5">
                              #{orderCode}
                            </span>
                            {order.source === "admin_manual" && (
                              <span className="text-[9px] font-subhead uppercase tracking-wider text-muted-foreground font-semibold">
                                Manual Order
                              </span>
                            )}
                          </td>
                        )}

                        {/* Date Created */}
                        {isColVisible("date") && (
                          <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                            <div className="font-medium text-foreground">{formattedDate}</div>
                            <div className="text-[10px] text-muted-foreground font-subhead">{formattedTime}</div>
                          </td>
                        )}

                        {/* Customer */}
                        {isColVisible("customer") && (
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-foreground truncate max-w-[180px]">
                              {order.customer_name || "—"}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {order.customer_email || order.customer_phone || "—"}
                            </div>
                          </td>
                        )}

                        {/* Payment */}
                        {isColVisible("payment") && (
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${paymentStyle.bg} ${paymentStyle.text} ${paymentStyle.border}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${paymentStyle.dot}`} />
                                {paymentLabel}
                              </span>
                              <span className="text-[10px] uppercase font-subhead font-bold text-muted-foreground tracking-wider px-1">
                                {methodLabel}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Fulfillment */}
                        {isColVisible("fulfillment") && (
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${fulfillmentStyle.bg} ${fulfillmentStyle.text} ${fulfillmentStyle.border}`}
                            >
                              {fulfillmentLabel}
                            </span>
                          </td>
                        )}

                        {/* Tracking */}
                        {isColVisible("tracking") && (
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {(() => {
                              const shipments: any[] =
                                Array.isArray(order.shipments) && order.shipments.length > 0
                                  ? order.shipments
                                  : order.tracking_number
                                  ? [
                                      {
                                        carrier: order.carrier_name || "Courier",
                                        tracking_number: order.tracking_number,
                                        tracking_url: order.tracking_url || null,
                                      },
                                    ]
                                  : [];

                              if (shipments.length === 0) {
                                return <span className="text-muted-foreground">—</span>;
                              }

                              if (shipments.length === 1) {
                                const shp = shipments[0];
                                return (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="font-semibold text-foreground">{shp.carrier}:</span>
                                    {shp.tracking_url ? (
                                      <a
                                        href={shp.tracking_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="font-mono text-primary hover:underline flex items-center gap-0.5"
                                        title={`Track package with ${shp.carrier}`}
                                      >
                                        <span>{shp.tracking_number}</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span className="font-mono text-foreground">{shp.tracking_number}</span>
                                    )}
                                  </div>
                                );
                              }

                              // Multi-shipment orders
                              return (
                                <div
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary/80 border border-border text-foreground text-[11px] font-semibold"
                                  title={shipments
                                    .map((s) => `${s.carrier}: ${s.tracking_number}`)
                                    .join("\n")}
                                >
                                  <Truck className="h-3 w-3 text-primary" />
                                  <span>{shipments.length} shipments</span>
                                </div>
                              );
                            })()}
                          </td>
                        )}

                        {/* Total */}
                        {isColVisible("total") && (
                          <td className="px-4 py-3.5 text-right font-display font-bold text-foreground whitespace-nowrap">
                            {inr(Number(order.total ?? order.total_amount ?? 0))}
                          </td>
                        )}

                        {/* Items inline expand */}
                        {isColVisible("items") && (
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => toggleExpand(e, id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition cursor-pointer ${
                                isExpanded
                                  ? "bg-secondary text-foreground border-border"
                                  : "bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                              }`}
                            >
                              <span>{items.length} item{items.length > 1 ? "s" : ""}</span>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </td>
                        )}

                        {/* Tags */}
                        {isColVisible("tags") && (
                          <td className="px-4 py-3.5">
                            {tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[160px]">
                                {tags.map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.2 rounded bg-secondary text-foreground text-[10px] font-medium"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* Expanded Line Items Row */}
                      {isExpanded && (
                        <tr className="bg-secondary/15 border-b border-border/80">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase font-subhead tracking-wider font-bold text-muted-foreground">
                                Ordered Products ({items.length})
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {items.map((item: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 bg-card border border-border rounded-xl p-2.5"
                                  >
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.name || item.productName}
                                        className="h-9 w-9 rounded-lg object-cover border border-border shrink-0"
                                      />
                                    ) : (
                                      <div className="h-9 w-9 rounded-lg bg-secondary border border-border grid place-items-center shrink-0">
                                        <Package className="h-4 w-4 text-muted-foreground/60" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="font-display font-medium text-xs text-foreground truncate">
                                        {item.name || item.productName || "Product"}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        Qty: {item.qty || item.quantity || 1} · {item.weight || ""}
                                      </p>
                                    </div>
                                    <div className="font-display font-bold text-xs text-foreground">
                                      {inr(Number(item.price || item.unitPrice || 0) * Number(item.qty || item.quantity || 1))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
