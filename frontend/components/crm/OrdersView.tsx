"use client";

import React from "react";
import {
  FileSpreadsheet,
  Plus,
  Search,
  X,
  ShoppingBag,
  Check,
  Tag,
  Truck,
  Eye,
} from "lucide-react";

interface OrdersViewProps {
  orderTabCounts: Record<string, number>;
  ordersFilter: string;
  setOrdersFilter: (filter: string) => void;
  ordersSearch: string;
  setOrdersSearch: (search: string) => void;
  filteredUnifiedOrders: any[];
  handleExportOrdersCsv: () => void;
  setShowAddOrderModal: (show: boolean) => void;
  handleMarkOrderAsPaid: (order: any) => void;
  setSelectedOrderForView: (order: any) => void;
  setEditTrackingNumber: (tracking: string) => void;
  setShowTrackingModal: (show: boolean) => void;
  setStatusUpdateChoice: (status: any) => void;
  setCustomStatusMessage: (msg: string) => void;
  setIsEditingStatusTemplate: (edit: boolean) => void;
  setShowStatusModal: (show: boolean) => void;
  setActiveNav: (nav: string) => void;
}

export default function OrdersView({
  orderTabCounts,
  ordersFilter,
  setOrdersFilter,
  ordersSearch,
  setOrdersSearch,
  filteredUnifiedOrders,
  handleExportOrdersCsv,
  setShowAddOrderModal,
  handleMarkOrderAsPaid,
  setSelectedOrderForView,
  setEditTrackingNumber,
  setShowTrackingModal,
  setStatusUpdateChoice,
  setCustomStatusMessage,
  setIsEditingStatusTemplate,
  setShowStatusModal,
  setActiveNav,
}: OrdersViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">Orders Management</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage, track, and update all customer orders from WhatsApp and web checkout.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportOrdersCsv}
            className="px-3.5 sm:px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Export Orders to CSV / Excel spreadsheet"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddOrderModal(true)}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> + Create Order
          </button>
        </div>
      </div>

      {/* Search and Quick Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs with Counters */}
        <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: "all", label: "All Orders", count: orderTabCounts.all },
            { id: "pending", label: "Pending", count: orderTabCounts.pending },
            { id: "processing", label: "Processing", count: orderTabCounts.processing },
            { id: "packed", label: "Packed", count: orderTabCounts.packed },
            { id: "shipped", label: "Shipped", count: orderTabCounts.shipped },
            { id: "completed", label: "Completed", count: orderTabCounts.completed },
            { id: "cancelled", label: "Cancelled", count: orderTabCounts.cancelled },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setOrdersFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                ordersFilter === pill.id
                  ? "bg-emerald-600 text-white font-bold shadow-2xs"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  ordersFilter === pill.id
                    ? "bg-white/20 text-white"
                    : "bg-neutral-200/80 text-neutral-600"
                }`}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[220px] max-w-xs w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={ordersSearch}
            onChange={(e) => setOrdersSearch(e.target.value)}
            placeholder="Search order #, customer, phone..."
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {ordersSearch && (
            <button
              onClick={() => setOrdersSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200/80 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3.5 font-bold whitespace-nowrap">Order ID</th>
                <th className="p-3.5 font-bold whitespace-nowrap">Customer</th>
                <th className="p-3.5 font-bold whitespace-nowrap">Items</th>
                <th className="p-3.5 font-bold whitespace-nowrap">Amount</th>
                <th className="p-3.5 font-bold text-center whitespace-nowrap">Payment</th>
                <th className="p-3.5 font-bold text-center whitespace-nowrap">Status</th>
                <th className="p-3.5 font-bold text-center whitespace-nowrap">Date</th>
                <th className="p-3.5 font-bold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredUnifiedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-neutral-400">
                      <ShoppingBag className="h-8 w-8 stroke-1 text-neutral-300" />
                      <p className="text-sm font-semibold text-neutral-700">No orders found</p>
                      <p className="text-xs text-neutral-500 max-w-sm">
                        {ordersFilter !== "all"
                          ? `There are no orders currently marked as "${ordersFilter}". Switch tab or create an order.`
                          : "No orders found in the database. Use '+ Create Order' to add one."}
                      </p>
                      <button
                        onClick={() => setShowAddOrderModal(true)}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Create Order Now
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUnifiedOrders.map((ord) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-amber-50 text-amber-900 border-amber-200",
                    processing: "bg-sky-50 text-sky-900 border-sky-200",
                    packed: "bg-purple-50 text-purple-900 border-purple-200",
                    shipped: "bg-indigo-50 text-indigo-900 border-indigo-200",
                    completed: "bg-emerald-50 text-emerald-900 border-emerald-200",
                    delivered: "bg-emerald-50 text-emerald-900 border-emerald-200",
                    cancelled: "bg-rose-50 text-rose-900 border-rose-200",
                  };
                  const currentStatusKey = String(ord.orderStatus || "Pending").toLowerCase();
                  const statusBadgeClass = statusColors[currentStatusKey] || "bg-neutral-100 text-neutral-800 border-neutral-200";

                  return (
                    <tr
                      key={ord.orderNumber}
                      className="hover:bg-neutral-50/70 transition"
                    >
                      <td className="p-3.5 font-mono font-bold text-neutral-900 whitespace-nowrap">
                        <span className="text-emerald-700">{ord.orderNumber}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-neutral-900">{ord.customerName || "Customer"}</div>
                        {ord.customerPhone && (
                          <div className="text-[11px] text-neutral-400 font-mono">{ord.customerPhone}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-neutral-600">
                        {ord.items && ord.items.length > 0 ? (
                          <span title={ord.items.map((i: any) => `${i.name} (${i.qty})`).join(", ")}>
                            {ord.items[0]?.name}
                            {ord.items.length > 1 ? ` +${ord.items.length - 1} more` : ""}
                          </span>
                        ) : (
                          `${ord.itemsCount || 1} items`
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-neutral-900 whitespace-nowrap">
                        ₹{Number(ord.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {String(ord.paymentStatus || "").toLowerCase() === "paid" ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 select-none pointer-events-none">
                            <Check className="h-3 w-3" /> Paid
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkOrderAsPaid(ord)}
                            title="1-Click: Verify & Mark Payment as Paid"
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 transition inline-flex items-center gap-1 cursor-pointer group shadow-2xs"
                          >
                            <span>Pending</span>
                            <span className="text-[9px] font-extrabold text-emerald-700 underline ml-0.5">
                              ✓ Mark Paid
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <span className={`inline-flex flex-row items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap select-none pointer-events-none shadow-3xs leading-none ${statusBadgeClass}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                          <span>{ord.orderStatus || "Pending"}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-neutral-500 whitespace-nowrap text-center">{ord.date}</td>
                      <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* 1. Tracking ID Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForView(ord);
                              setEditTrackingNumber(ord.trackingNumber || "");
                              setShowTrackingModal(true);
                            }}
                            title={ord.trackingNumber ? `Consignment: ${ord.trackingNumber}` : "Add / Edit Tracking ID"}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                              ord.trackingNumber
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800"
                            }`}
                          >
                            <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="font-mono text-[11px] truncate max-w-[120px]">
                              {ord.trackingNumber ? ord.trackingNumber : "Tracking ID"}
                            </span>
                          </button>

                          {/* 2. Shipping Button -> Opens Status Change Page */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForView(ord);
                              setStatusUpdateChoice((ord.orderStatus as any) || "Processing");
                              setCustomStatusMessage("");
                              setIsEditingStatusTemplate(false);
                              setShowStatusModal(true);
                            }}
                            title="Change Order Status & Shipping Updates"
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Truck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                            <span>Shipping</span>
                          </button>

                          {/* 3. View Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForView(ord);
                              setActiveNav("order_details");
                            }}
                            title="View Order Details & Invoice"
                            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 shrink-0" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
