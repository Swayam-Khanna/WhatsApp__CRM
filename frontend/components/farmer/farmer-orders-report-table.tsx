"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Download,
  CheckCircle2,
  Package,
  Truck,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Calendar,
  IndianRupee,
  ShoppingBag,
  Boxes,
  X,
  ShieldCheck,
  Phone,
  Filter,
  Check,
  Eye,
} from "lucide-react";
import { inr } from "@/lib/format";
import type { FarmerScopedOrder, OrderStage } from "@/lib/services/orderService";
import { toast } from "sonner";

export interface FarmerOrderLineItem {
  id: string;
  orderId: string;
  rawOrderId: string;
  productName: string;
  productImage: string;
  weight?: string;
  quantity: string;
  quantityNum: number;
  customerName: string;
  customerCity?: string;
  customerPhone?: string;
  shippingAddress?: string;
  dateCreated: string;
  status: OrderStage;
  statusLabel: string;
  farmerRevenue: number;
  farmerRevenueFormatted: string;
  trackingNumber?: string | null;
  paymentMethod?: string;
  fullOrder?: FarmerScopedOrder;
}

// Line item transformed interface
interface FarmerOrdersReportTableProps {
  orders?: FarmerScopedOrder[];
  isLoading?: boolean;
}

export function FarmerOrdersReportTable({
  orders = [],
  isLoading = false,
}: FarmerOrdersReportTableProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [sortBy, setSortBy] = useState<"date" | "revenue" | "quantity">("date");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Order Details Modal / Quick View
  const [selectedItemForModal, setSelectedItemForModal] = useState<FarmerOrderLineItem | null>(null);

  // 1. Transform raw orders into single line item rows (strictly live orders only)
  const allLineItems: FarmerOrderLineItem[] = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [];
    }

    const itemsList: FarmerOrderLineItem[] = [];

    orders.forEach((order) => {
      const orderItems = order.items || [];
      
      if (orderItems.length === 0) {
        // Fallback for orders without itemized breakdown
        itemsList.push({
          id: `${order.id}-0`,
          orderId: order.orderId,
          rawOrderId: order.id,
          productName: "Organic Farm Produce",
          productImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80",
          weight: "1 pack",
          quantity: `${order.totalFarmerUnits} items`,
          quantityNum: order.totalFarmerUnits,
          customerName: order.customerName,
          customerCity: order.shippingCityState,
          customerPhone: order.customerPhone,
          shippingAddress: order.shippingAddress,
          dateCreated: order.createdAt,
          status: order.stage,
          statusLabel: order.statusLabel,
          farmerRevenue: order.totalFarmerAmount,
          farmerRevenueFormatted: order.totalFarmerAmountFormatted,
          trackingNumber: order.trackingNumber,
          paymentMethod: order.paymentMethod,
          fullOrder: order,
        });
      } else {
        orderItems.forEach((item, idx) => {
          itemsList.push({
            id: `${order.id}-${idx}`,
            orderId: order.orderId,
            rawOrderId: order.id,
            productName: item.name,
            productImage:
              item.image ||
              "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80",
            weight: item.weight || "1 kg",
            quantity: `${item.qty} ${item.weight ? `(${item.weight})` : "items"}`,
            quantityNum: item.qty,
            customerName: order.customerName,
            customerCity: order.shippingCityState,
            customerPhone: order.customerPhone,
            shippingAddress: order.shippingAddress,
            dateCreated: order.createdAt,
            status: order.stage,
            statusLabel: order.statusLabel,
            farmerRevenue: item.totalPrice,
            farmerRevenueFormatted: inr(item.totalPrice),
            trackingNumber: order.trackingNumber,
            paymentMethod: order.paymentMethod,
            fullOrder: order,
          });
        });
      }
    });

    return itemsList;
  }, [orders]);

  // 2. Filter line items by search query & status
  const filteredItems = useMemo(() => {
    return allLineItems.filter((item) => {
      // Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "new" && item.status !== "new" && item.status !== "confirmed") return false;
        if (statusFilter === "packed" && item.status !== "packed") return false;
        if (statusFilter === "shipped" && item.status !== "shipped") return false;
        if (statusFilter === "delivered" && item.status !== "delivered") return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = item.orderId.toLowerCase().includes(q) || item.rawOrderId.toLowerCase().includes(q);
        const matchesProduct = item.productName.toLowerCase().includes(q);
        const matchesCustomer = item.customerName.toLowerCase().includes(q);
        const matchesCity = (item.customerCity || "").toLowerCase().includes(q);

        if (!matchesId && !matchesProduct && !matchesCustomer && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [allLineItems, statusFilter, searchQuery]);

  // 3. Sort line items
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      if (sortBy === "date") {
        const timeA = new Date(a.dateCreated).getTime();
        const timeB = new Date(b.dateCreated).getTime();
        return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
      }
      if (sortBy === "revenue") {
        return sortDirection === "desc"
          ? b.farmerRevenue - a.farmerRevenue
          : a.farmerRevenue - b.farmerRevenue;
      }
      if (sortBy === "quantity") {
        return sortDirection === "desc"
          ? b.quantityNum - a.quantityNum
          : a.quantityNum - b.quantityNum;
      }
      return 0;
    });
    return list;
  }, [filteredItems, sortBy, sortDirection]);

  // 4. Pagination calculations
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentPaginatedItems = sortedItems.slice(startIndex, endIndex);

  // Checkbox selection helpers
  const allCurrentPageSelected =
    currentPaginatedItems.length > 0 &&
    currentPaginatedItems.every((item) => selectedIds.includes(item.id));

  const toggleSelectAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      const pageIds = new Set(currentPaginatedItems.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = currentPaginatedItems.map((i) => i.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  // Export to CSV function
  const handleExportCSV = () => {
    const exportData =
      selectedIds.length > 0
        ? allLineItems.filter((i) => selectedIds.includes(i.id))
        : sortedItems;

    if (exportData.length === 0) {
      toast.error("No items available to export.");
      return;
    }

    const headers = [
      "Order ID",
      "Product Name",
      "Quantity",
      "Customer Name",
      "Location",
      "Date Created",
      "Status",
      "Farmer Share (INR)",
      "Tracking Number",
    ];

    const rows = exportData.map((item) => [
      `"${item.orderId}"`,
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.quantity}"`,
      `"${item.customerName.replace(/"/g, '""')}"`,
      `"${(item.customerCity || "").replace(/"/g, '""')}"`,
      `"${new Date(item.dateCreated).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}"`,
      `"${item.statusLabel}"`,
      item.farmerRevenue,
      `"${item.trackingNumber || "N/A"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Prajnaa_Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${exportData.length} order row${exportData.length > 1 ? "s" : ""} to CSV!`);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: OrderStage, label: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Delivered</span>
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs whitespace-nowrap">
            <Truck className="h-3.5 w-3.5 text-blue-600" />
            <span>In Transit</span>
          </span>
        );
      case "packed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs whitespace-nowrap">
            <Package className="h-3.5 w-3.5 text-purple-600" />
            <span>Packed by Admin</span>
          </span>
        );
      case "confirmed":
      case "new":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Awaiting Packing</span>
          </span>
        );
    }
  };

  // Toggle date sort
  const toggleDateSort = () => {
    if (sortBy === "date") {
      setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy("date");
      setSortDirection("desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Order Report Table Container */}
      <div className="rounded-3xl border border-border/80 bg-white shadow-2xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-white">
          {/* Left Title & Row Count */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-[#0F3D2E]/10 border border-[#0F3D2E]/15 grid place-items-center text-[#0F3D2E] shrink-0">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Orders Report
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-secondary text-muted-foreground">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </div>
              <p className="font-subhead text-xs text-muted-foreground mt-0.5">
                Itemized line items of your farm produce purchased by customers
              </p>
            </div>
          </div>

          {/* Right Controls: Search, Status Dropdown, CSV Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search order ID, customer, city..."
                className="font-subhead w-full rounded-2xl border border-border/80 bg-[#fbfbf9] pl-9 pr-8 py-2 text-xs outline-none focus:border-[#0F3D2E] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter orders by status"
                className="font-subhead rounded-2xl border border-border/80 bg-[#fbfbf9] px-3 py-2 text-xs text-foreground font-medium outline-none focus:border-[#0F3D2E] transition-colors cursor-pointer appearance-none pr-8"
              >
                <option value="all">All Statuses</option>
                <option value="new">Awaiting Packing</option>
                <option value="packed">Packed by Admin</option>
                <option value="shipped">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            {/* Export to CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="font-subhead inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-border/80 bg-[#fbfbf9] text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Selected Rows Action Bar */}
        {selectedIds.length > 0 && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-bold">{selectedIds.length}</span>
              <span>{selectedIds.length === 1 ? "line item" : "line items"} selected</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportCSV}
                className="font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                Export Selected ({selectedIds.length})
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Content Section: Loading / Empty / Data Views */}
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-14 rounded-2xl bg-secondary/40 animate-pulse border border-border/40"
              />
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="py-20 text-center space-y-3 p-8">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h3 className="font-display text-base font-bold text-foreground">
              {allLineItems.length === 0
                ? "No customer orders received yet"
                : "No orders match your search criteria"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {allLineItems.length === 0
                ? "When customers purchase your listed produce from the Prajnaa marketplace, their line items will appear here in real time."
                : "Try adjusting your search query or status filter to see other customer orders."}
            </p>
            {allLineItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition cursor-pointer mt-2"
              >
                Clear active filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (hidden on small mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-[#fbfbf9] font-subhead text-[10px] uppercase tracking-[0.14em] text-muted-foreground select-none">
                    {/* Checkbox Column */}
                    <th className="px-5 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={allCurrentPageSelected}
                        onChange={toggleSelectAllCurrentPage}
                        className="h-4 w-4 rounded border-border text-[#0F3D2E] focus:ring-[#0F3D2E] cursor-pointer"
                        title="Select all on this page"
                      />
                    </th>

                    {/* Order ID */}
                    <th className="px-4 py-3.5 font-bold">Order ID</th>

                    {/* Product */}
                    <th className="px-4 py-3.5 font-bold min-w-[200px]">Product</th>

                    {/* Quantity */}
                    <th className="px-4 py-3.5 font-bold">Quantity</th>

                    {/* Customer */}
                    <th className="px-4 py-3.5 font-bold min-w-[150px]">Customer</th>

                    {/* Date Created (Sortable) */}
                    <th
                      className="px-4 py-3.5 font-bold cursor-pointer hover:text-foreground transition-colors group"
                      onClick={toggleDateSort}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date Created</span>
                        {sortBy === "date" ? (
                          sortDirection === "desc" ? (
                            <ArrowDown className="h-3 w-3 text-[#0F3D2E]" />
                          ) : (
                            <ArrowUp className="h-3 w-3 text-[#0F3D2E]" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                        )}
                      </div>
                    </th>

                    {/* Status */}
                    <th className="px-4 py-3.5 font-bold">Order Status</th>

                    {/* Farmer Revenue */}
                    <th className="px-5 py-3.5 font-bold text-right">Farmer Share</th>

                    {/* Details Action */}
                    <th className="px-4 py-3.5 text-center font-bold">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60">
                  {currentPaginatedItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-[#0F3D2E]/5 hover:bg-[#0F3D2E]/10"
                            : "hover:bg-secondary/25"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item.id)}
                            className="h-4 w-4 rounded border-border text-[#0F3D2E] focus:ring-[#0F3D2E] cursor-pointer"
                          />
                        </td>

                        {/* Order ID */}
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedItemForModal(item)}
                            className="font-mono text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-left"
                          >
                            {item.orderId}
                          </button>
                        </td>

                        {/* Product Thumbnail & Name */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl overflow-hidden bg-secondary/50 border border-border/80 shrink-0 shadow-2xs">
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-display font-semibold text-foreground text-xs block line-clamp-1">
                                {item.productName}
                              </span>
                              {item.weight && (
                                <span className="text-[11px] text-muted-foreground block">
                                  {item.weight}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-4">
                          <span className="font-subhead text-xs font-bold text-foreground block">
                            {item.quantity}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground text-xs block">
                              {item.customerName}
                            </span>
                            {item.customerCity && (
                              <span className="text-[11px] text-muted-foreground block truncate max-w-[140px]">
                                {item.customerCity}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date Created */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(item.dateCreated).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-4">
                          {renderStatusBadge(item.status, item.statusLabel)}
                        </td>

                        {/* Farmer Share Amount */}
                        <td className="px-5 py-4 text-right">
                          <span className="font-display text-xs sm:text-sm font-bold text-[#0F3D2E]">
                            {item.farmerRevenueFormatted}
                          </span>
                        </td>

                        {/* Action: Quick View Details */}
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedItemForModal(item)}
                            title="View order details"
                            className="h-7 w-7 rounded-lg inline-grid place-items-center text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards (visible on < md screens) */}
            <div className="md:hidden divide-y divide-border/60">
              {currentPaginatedItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`p-4 space-y-3 transition-colors ${
                      isSelected ? "bg-[#0F3D2E]/5" : "bg-white"
                    }`}
                  >
                    {/* Card Top: Checkbox, Order ID, Date, Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="h-4 w-4 rounded border-border text-[#0F3D2E] focus:ring-[#0F3D2E] cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedItemForModal(item)}
                          className="font-mono text-xs font-bold text-foreground underline decoration-dotted"
                        >
                          {item.orderId}
                        </button>
                      </div>

                      <div>{renderStatusBadge(item.status, item.statusLabel)}</div>
                    </div>

                    {/* Card Middle: Product Thumbnail, Details, Quantity, Revenue */}
                    <div className="flex items-start gap-3 pt-1">
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-secondary/50 border border-border/80 shrink-0 shadow-2xs">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-display font-semibold text-xs text-foreground truncate">
                          {item.productName}
                        </h4>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-subhead text-muted-foreground">
                            Qty: <strong className="text-foreground font-bold">{item.quantity}</strong>
                          </span>
                          <span className="font-display font-bold text-[#0F3D2E]">
                            {item.farmerRevenueFormatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom: Customer, Date & Quick View Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{item.customerName}</span>
                        <span>·</span>
                        <span>
                          {new Date(item.dateCreated).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedItemForModal(item)}
                        className="font-subhead text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        Details
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 sm:p-5 border-t border-border/70 bg-[#fbfbf9]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {/* Showing info & Rows per page selector */}
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-medium">
                <span>
                  Showing <strong className="text-foreground">{startIndex + 1}</strong>–
                  <strong className="text-foreground">{endIndex}</strong> of{" "}
                  <strong className="text-foreground">{totalItems}</strong> orders
                </span>

                <div className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    aria-label="Select rows per page"
                    className="font-subhead rounded-xl border border-border/80 bg-white px-2 py-1 text-xs text-foreground font-semibold outline-none focus:border-[#0F3D2E] cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Page navigation buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-border/80 bg-white text-xs font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition cursor-pointer shadow-2xs inline-flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show first, last, and current +/- 1
                      return (
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - safeCurrentPage) <= 1
                      );
                    })
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const hasGap = prevPage && page - prevPage > 1;

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {hasGap && <span className="px-1 text-muted-foreground">…</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={`h-7 w-7 rounded-xl text-xs font-bold transition cursor-pointer ${
                              page === safeCurrentPage
                                ? "bg-[#0F3D2E] text-white shadow-2xs"
                                : "bg-white border border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary"
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-border/80 bg-white text-xs font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition cursor-pointer shadow-2xs inline-flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Order Quick-View Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-border max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Order Details
                  </h3>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-secondary text-foreground">
                    {selectedItemForModal.orderId}
                  </span>
                </div>
                <p className="font-subhead text-xs text-muted-foreground mt-0.5">
                  Placed on{" "}
                  {new Date(selectedItemForModal.dateCreated).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemForModal(null)}
                className="h-8 w-8 rounded-full bg-secondary/70 hover:bg-secondary grid place-items-center text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Admin Fulfillment Notice */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900">
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Read-only status:</strong> Packaging, labeling, and courier dispatch are managed exclusively by Prajnaa Super Admin.
              </span>
            </div>

            {/* Product Item Card */}
            <div className="rounded-2xl border border-border/80 bg-[#fbfbf9] p-4 space-y-3">
              <span className="font-subhead text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Purchased Item
              </span>

              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-2xl overflow-hidden bg-white border border-border shrink-0 shadow-2xs">
                  <img
                    src={selectedItemForModal.productImage}
                    alt={selectedItemForModal.productName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-0.5 flex-1">
                  <h4 className="font-display font-bold text-sm text-foreground">
                    {selectedItemForModal.productName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Variant / Packaging: {selectedItemForModal.weight}
                  </p>
                  <p className="font-subhead text-xs font-semibold text-foreground">
                    Quantity Ordered: {selectedItemForModal.quantity}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Your Produce Earnings:</span>
                <span className="font-display text-base font-bold text-[#0F3D2E]">
                  {selectedItemForModal.farmerRevenueFormatted}
                </span>
              </div>
            </div>

            {/* Status & Courier Info */}
            <div className="rounded-2xl border border-border/80 bg-white p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Fulfillment Status:</span>
                <div>{renderStatusBadge(selectedItemForModal.status, selectedItemForModal.statusLabel)}</div>
              </div>

              {selectedItemForModal.trackingNumber && (
                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Courier AWB / Tracking:</span>
                  <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {selectedItemForModal.trackingNumber}
                  </span>
                </div>
              )}

              {selectedItemForModal.paymentMethod && (
                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Payment Mode:</span>
                  <span className="font-semibold text-foreground">
                    {selectedItemForModal.paymentMethod}
                  </span>
                </div>
              )}
            </div>

            {/* Customer & Shipping Details */}
            <div className="rounded-2xl border border-border/80 bg-white p-4 space-y-2 text-xs">
              <span className="font-subhead text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Shipping Recipient
              </span>
              <p className="font-bold text-foreground">{selectedItemForModal.customerName}</p>
              {selectedItemForModal.customerPhone && (
                <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Phone className="h-3 w-3" /> {selectedItemForModal.customerPhone}
                </p>
              )}
              {selectedItemForModal.shippingAddress && (
                <p className="text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
                  {selectedItemForModal.shippingAddress}
                </p>
              )}
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedItemForModal(null)}
                className="font-subhead px-5 py-2 rounded-2xl bg-[#0F3D2E] text-white text-xs font-bold hover:bg-[#0F3D2E]/90 transition cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
