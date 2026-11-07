import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";

export type OrderStage = "new" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
export type OrderStatus = "Delivered" | "Shipped" | "Confirmed" | "Processing" | "Cancelled";

export interface FarmerCustomerOrder {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  productsSummary: string;
  amount: number;
  amountFormatted: string;
  status: OrderStatus;
  createdAt: string;
  items: any[];
  shippingAddress?: string;
  paymentMethod?: string;
}

export interface FarmerScopedOrderItem {
  name: string;
  slug: string;
  image: string;
  weight: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  hsnCode?: string | null;
  gstRate?: number;
}

export interface OrderAttribution {
  stage: OrderStage;
  updatedBy: string;
  actionText: string;
  fullText: string;
  relativeTime: string;
  timestamp: string;
}

export interface FarmerScopedOrder {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress: string;
  shippingCityState: string;
  shippingPincode?: string;
  createdAt: string;
  updatedAt?: string;
  stage: OrderStage;
  statusLabel: string;
  paymentMethod: string;
  paymentStatus: string;
  invoiceNumber?: string | null;
  attribution: OrderAttribution;
  items: FarmerScopedOrderItem[];
  totalFarmerUnits: number;
  totalFarmerAmount: number;
  totalFarmerAmountFormatted: string;
  trackingNumber?: string | null;
  deliveryRoute?: string | null;
}

/**
 * Format timestamp into relative human-readable string (e.g. "12 min ago", "2 hours ago", "yesterday")
 */
export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "just now";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return "just now";
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
    if (diffDay === 1) return "yesterday";
    if (diffDay < 30) return `${diffDay} days ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "recently";
  }
}

/**
 * Normalizes raw order status into strict standard stage and human-readable label
 */
export function normalizeOrderStage(rawStatus?: string): { stage: OrderStage; statusLabel: string } {
  const s = (rawStatus || "").toLowerCase().trim();

  if (s === "delivered") {
    return { stage: "delivered", statusLabel: "Delivered" };
  }
  if (s === "shipped") {
    return { stage: "shipped", statusLabel: "Shipped by Admin" };
  }
  if (s === "packed") {
    return { stage: "packed", statusLabel: "Packed by Admin" };
  }
  if (s === "confirmed") {
    return { stage: "confirmed", statusLabel: "Confirmed · Awaiting Packing" };
  }
  if (s === "cancelled") {
    return { stage: "cancelled", statusLabel: "Cancelled" };
  }

  // pending, pending_payment, cod_pending, pending_manual_payment
  return { stage: "new", statusLabel: "New · Awaiting Admin Packing" };
}

/**
 * Extracts live attribution line from tracking history or order metadata
 */
export function extractOrderAttribution(order: any, stage: OrderStage): OrderAttribution {
  const history: any[] = Array.isArray(order.tracking_history) ? order.tracking_history : [];
  const latestEntry = history.length > 0 ? history[history.length - 1] : null;

  const timestamp = latestEntry?.timestamp || order.updated_at || order.created_at || new Date().toISOString();
  const relativeTime = formatRelativeTime(timestamp);
  const updatedBy = latestEntry?.updated_by || (stage === "new" ? "Customer" : "Admin");

  let actionText = "Placed by Customer";
  let fullText = `Placed by Customer · ${relativeTime}`;

  switch (stage) {
    case "packed":
      actionText = `Packed by ${updatedBy}`;
      fullText = `Packed by ${updatedBy} · ${relativeTime}`;
      break;
    case "shipped":
      actionText = `Shipped by ${updatedBy}`;
      fullText = `Shipped by ${updatedBy} · ${relativeTime}`;
      break;
    case "delivered":
      actionText = "Delivered";
      fullText = `Delivered to Customer · ${relativeTime}`;
      break;
    case "confirmed":
      actionText = `Confirmed by ${updatedBy}`;
      fullText = `Confirmed by ${updatedBy} · ${relativeTime}`;
      break;
    case "cancelled":
      actionText = `Cancelled by ${updatedBy}`;
      fullText = `Cancelled by ${updatedBy} · ${relativeTime}`;
      break;
    case "new":
    default:
      actionText = "Awaiting Admin Packing";
      fullText = `Awaiting Admin Packing · Placed ${relativeTime}`;
      break;
  }

  return {
    stage,
    updatedBy,
    actionText,
    fullText,
    relativeTime,
    timestamp,
  };
}

export const orderService = {
  /**
   * Fetch all orders scoped strictly to this farmer and containing ONLY this farmer's line items.
   */
  async getFarmerOrders(farmerId?: string, farmerSlug?: string): Promise<FarmerScopedOrder[]> {
    if (!farmerId && !farmerSlug) return [];

    let allOrders: any[] = [];

    // 1. Fetch live orders from Supabase database
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        allOrders = data;
      }
    } catch (err) {
      console.warn("[orderService.getFarmerOrders] Database error:", err);
    }

    // 2. Clean up any legacy test/mock keys from local storage
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("mock_order_") || key.startsWith("order_mock_"))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.warn("[orderService.getFarmerOrders] Local cleanup error:", e);
      }
    }

    // Sort by created_at descending
    allOrders.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

    // 3. Filter orders and STRICTLY scope line items to this farmer
    const result: FarmerScopedOrder[] = [];

    for (const o of allOrders) {
      const rawItems: any[] = Array.isArray(o.items) ? o.items : [];

      // STRICT item-level filter: retain ONLY items belonging to this farmer
      let farmerItems = rawItems.filter((item: any) => {
        const itemFarmerId = item.farmer_id || item.farmerId;
        const itemFarmerSlug = item.farmer_slug || item.farmerSlug;

        const matchesId = farmerId && itemFarmerId && String(itemFarmerId) === String(farmerId);
        const matchesSlug =
          farmerSlug &&
          itemFarmerSlug &&
          String(itemFarmerSlug).toLowerCase().trim() === String(farmerSlug).toLowerCase().trim();

        return matchesId || matchesSlug;
      });

      // Top-level farmer_id fallback if items did not specify farmer_id explicitly
      if (farmerItems.length === 0 && o.farmer_id && farmerId && String(o.farmer_id) === String(farmerId)) {
        farmerItems = rawItems;
      }

      // If this order contains none of this farmer's products, skip entirely
      if (farmerItems.length === 0) continue;

      const { stage, statusLabel } = normalizeOrderStage(o.status);
      const attribution = extractOrderAttribution(o, stage);

      // Process strictly scoped line items
      const scopedItems: FarmerScopedOrderItem[] = farmerItems.map((it: any) => {
        const qty = Number(it.qty || it.quantity || 1);
        const unitPrice =
          Number(it.farmer_base_price || it.farmerBasePrice) ||
          Math.round(Number(it.price || it.unitPrice || 0) / 1.1) ||
          (Number(it.totalPrice || it.totalAmount || 0) ? Math.round(Number(it.totalPrice || it.totalAmount || 0) / qty) : 0);
        const totalPrice = Number(it.farmer_total || it.totalPrice) || (unitPrice * qty);

        return {
          name: it.name || it.productName || it.title || "Farm Produce",
          slug: it.slug || it.productId || "produce",
          image:
            it.image ||
            it.imageUrl ||
            it.productImage ||
            "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80",
          weight: it.weight || it.variant || it.unit || "Pack",
          qty,
          unitPrice,
          totalPrice,
          hsnCode: it.hsnCode || null,
          gstRate: it.gstRate || 0,
        };
      });

      const totalFarmerUnits = scopedItems.reduce((sum, it) => sum + it.qty, 0);
      const totalFarmerAmount = scopedItems.reduce((sum, it) => sum + it.totalPrice, 0);

      // Format shipping location
      let shippingAddressStr = "Address on file";
      let shippingCityState = "India";

      if (typeof o.shipping_address === "string") {
        shippingAddressStr = o.shipping_address;
        const parts = o.shipping_address.split(",");
        if (parts.length >= 2) {
          shippingCityState = parts.slice(-2).join(",").trim();
        }
      } else if (o.shipping_address && typeof o.shipping_address === "object") {
        const addr = o.shipping_address;
        shippingAddressStr = `${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.pincode || ""}`.trim();
        shippingCityState = `${addr.city || ""}, ${addr.state || ""}`.trim() || "India";
      }

      const orderDisplayId = o.order_id || `#ORD-${o.id.slice(0, 8).toUpperCase()}`;

      result.push({
        id: o.id,
        orderId: orderDisplayId,
        customerName: o.customer_name || "Customer",
        customerPhone: o.customer_phone || "+91 98000 00000",
        customerEmail: o.customer_email || undefined,
        shippingAddress: shippingAddressStr,
        shippingCityState: shippingCityState || "Direct Shipment",
        shippingPincode: o.shipping_pincode || undefined,
        createdAt: o.created_at || new Date().toISOString(),
        updatedAt: o.updated_at,
        stage,
        statusLabel,
        paymentMethod: o.payment_method === "cod" ? "Cash on Delivery" : "Online Payment",
        paymentStatus: o.payment_status || "pending",
        invoiceNumber: o.invoice_number || null,
        attribution,
        items: scopedItems,
        totalFarmerUnits,
        totalFarmerAmount,
        totalFarmerAmountFormatted: inr(totalFarmerAmount),
        trackingNumber: o.tracking_number || null,
        deliveryRoute: o.delivery_route || null,
      });
    }

    return result;
  },

  /**
   * Recent orders helper for dashboard widgets (strictly item-scoped).
   */
  async getRecentOrders(farmerId?: string, farmerSlug?: string, limit = 5) {
    const orders = await this.getFarmerOrders(farmerId, farmerSlug);
    return orders.slice(0, limit).map((o) => ({
      id: o.id,
      orderId: o.orderId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      productsSummary: o.items.map((i) => `${i.name} (${i.qty} ${i.weight})`).join(", "),
      amount: o.totalFarmerAmount,
      amountFormatted: o.totalFarmerAmountFormatted,
      status: (o.stage === "delivered"
        ? "Delivered"
        : o.stage === "shipped"
        ? "Shipped"
        : o.stage === "packed" || o.stage === "confirmed"
        ? "Confirmed"
        : o.stage === "cancelled"
        ? "Cancelled"
        : "Processing") as any,
      createdAt: o.createdAt,
      items: o.items,
      shippingAddress: o.shippingAddress,
      paymentMethod: o.paymentMethod,
    }));
  },
};
