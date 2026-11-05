import {
  pgTable,
  text,
  timestamp,
  integer,
  doublePrecision,
  pgEnum,
  jsonb,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles, addresses, coupons, farmerProducts, farmerProfiles } from "./index.ts";

// Enums for Orders & Payments
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "packed",
  "partially_shipped",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
]);

export const orderPaymentStatusEnum = pgEnum("order_payment_status", [
  "pending",
  "collected",
  "refunded",
]);

// Keeps all four payment methods in schema; online payments are gated by ONLINE_PAYMENTS_ENABLED
export const orderPaymentMethodEnum = pgEnum("order_payment_method", [
  "cod",
  "whatsapp",
  "razorpay",
  "cashfree",
]);

// 1. Orders Table
// Note: All monetary amounts are stored in integer paise (1 INR = 100 paise)
// user_id is NOT NULL (Customers must be signed in with verified phone number)
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(), // e.g. "ord_17910238123_abc"
    orderNumber: text("order_number").notNull().unique(), // e.g. "ORD-2026-1001"
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    status: orderStatusEnum("status").default("pending").notNull(),
    paymentStatus: orderPaymentStatusEnum("payment_status").default("pending").notNull(),
    paymentMethod: orderPaymentMethodEnum("payment_method").notNull(),

    // Payment gateway references (retained in schema; active when ONLINE_PAYMENTS_ENABLED=true)
    razorpayOrderId: text("razorpay_order_id").unique(),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpaySignature: text("razorpay_signature"),
    cashfreeOrderId: text("cashfree_order_id"),

    // Server-computed pricing stored in integer paise with >= 0 CHECK constraints
    subtotalPaise: integer("subtotal_paise").notNull(),
    taxPaise: integer("tax_paise").default(0).notNull(),
    shippingPaise: integer("shipping_paise").default(0).notNull(),
    codFeePaise: integer("cod_fee_paise").default(0).notNull(),
    discountPaise: integer("discount_paise").default(0).notNull(),
    totalPaise: integer("total_paise").notNull(),

    // Coupon reference
    couponCode: text("coupon_code"),
    couponId: text("coupon_id").references(() => coupons.id, { onDelete: "set null" }),

    // Address snapshots (immutable historical record)
    shippingAddressId: text("shipping_address_id").references(() => addresses.id, { onDelete: "set null" }),
    shippingAddressSnapshot: jsonb("shipping_address_snapshot").notNull(),
    billingAddressSnapshot: jsonb("billing_address_snapshot"),

    // Operational notes & reasons
    customerNotes: text("customer_notes"),
    adminNotes: text("admin_notes"),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    invoiceNumber: text("invoice_number"),
    invoiceDate: timestamp("invoice_date", { withTimezone: true }),

    // timestamptz (with timezone)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
    index("orders_payment_status_idx").on(table.paymentStatus),
    check("orders_subtotal_paise_check", sql`${table.subtotalPaise} >= 0`),
    check("orders_tax_paise_check", sql`${table.taxPaise} >= 0`),
    check("orders_shipping_paise_check", sql`${table.shippingPaise} >= 0`),
    check("orders_cod_fee_paise_check", sql`${table.codFeePaise} >= 0`),
    check("orders_discount_paise_check", sql`${table.discountPaise} >= 0`),
    check("orders_total_paise_check", sql`${table.totalPaise} >= 0`),
  ]
);

// 2. Order Items Table
// farmer_id references farmerProfiles.id (nullable for legacy/historical orders)
// product_id is text without hard FK to preserve historical/legacy product records
export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    variantId: text("variant_id"),
    variantName: text("variant_name"),
    farmerId: text("farmer_id").references(() => farmerProfiles.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    productSlug: text("product_slug").notNull(),
    productImage: text("product_image"),
    quantity: integer("quantity").notNull(), // CHECK > 0

    // Unit price and totals stored in integer paise with >= 0 CHECK constraints
    unitPricePaise: integer("unit_price_paise").notNull(),
    totalPaise: integer("total_paise").notNull(),

    // Physical specifications & tax
    weightGrams: integer("weight_grams").default(0).notNull(),
    hsnCode: text("hsn_code"),
    gstRate: doublePrecision("gst_rate").default(5).notNull(),
    gstPaise: integer("gst_paise").default(0).notNull(),

    status: text("status").default("pending").notNull(), // pending | allocated | shipped | cancelled
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
    check("order_items_quantity_check", sql`${table.quantity} > 0`),
    check("order_items_unit_price_check", sql`${table.unitPricePaise} >= 0`),
    check("order_items_total_paise_check", sql`${table.totalPaise} >= 0`),
    check("order_items_gst_paise_check", sql`${table.gstPaise} >= 0`),
  ]
);

// 3. Order Shipments Table (Multi-Shipment Tracking Support)
export const orderShipments = pgTable(
  "order_shipments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    carrier: text("carrier").notNull(), // delhivery | bluedart | shiprocket | dtdc | speed_post | india_post
    trackingNumber: text("tracking_number").notNull(),
    trackingUrl: text("tracking_url"),
    status: text("status").default("manifested").notNull(), // manifested | in_transit | out_for_delivery | delivered
    deliveryRoute: text("delivery_route"),
    overrideReason: text("override_reason"),
    allocatedItemIds: text("allocated_item_ids").array(),
    estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("order_shipments_order_id_idx").on(table.orderId),
  ]
);

// 4. Order Status Audit Logs
export const orderStatusLogs = pgTable(
  "order_status_logs",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorId: text("actor_id").notNull(), // admin user id, customer user id, or "system"
    actorRole: text("actor_role").notNull(), // admin | customer | system
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("order_status_logs_order_id_idx").on(table.orderId),
  ]
);

/**
 * Sanitizes gateway webhook payload before persisting.
 * Stores strictly reconciliation fields (IDs, amounts, status, timestamps, acquirer codes).
 * Strips all sensitive PII (customer email, phone) and card details (PAN, CVV, expiry).
 */
export function sanitizeWebhookReconciliationPayload(rawPayload: any): Record<string, any> {
  if (!rawPayload || typeof rawPayload !== "object") return {};

  const clean: Record<string, any> = {};
  const allowedTopKeys = [
    "id",
    "entity",
    "event",
    "event_id",
    "created_at",
    "status",
    "amount",
    "currency",
    "order_id",
    "payment_id",
    "refund_id",
    "acquirer_data",
    "error_code",
    "error_description",
    "error_source",
    "error_step",
    "error_reason",
  ];

  for (const k of allowedTopKeys) {
    if (rawPayload[k] !== undefined) {
      clean[k] = rawPayload[k];
    }
  }

  // Sanitize nested payment entity if present (Razorpay payload.payment.entity)
  const paymentEntity = rawPayload?.payload?.payment?.entity || rawPayload?.data?.payment;
  if (paymentEntity && typeof paymentEntity === "object") {
    clean.payment_reconciliation = {
      id: paymentEntity.id,
      order_id: paymentEntity.order_id,
      amount: paymentEntity.amount,
      currency: paymentEntity.currency,
      status: paymentEntity.status,
      method: paymentEntity.method,
      captured: paymentEntity.captured,
      bank: paymentEntity.bank,
      wallet: paymentEntity.wallet,
      vpa: paymentEntity.vpa ? String(paymentEntity.vpa).replace(/^.*@/, "****@") : undefined,
      fee: paymentEntity.fee,
      tax: paymentEntity.tax,
      error_code: paymentEntity.error_code,
      error_description: paymentEntity.error_description,
      acquirer_data: paymentEntity.acquirer_data,
      created_at: paymentEntity.created_at,
    };
  }

  return clean;
}

// 5. Payment Webhook Events Table (Idempotent Webhook Processing)
export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().unique(), // Gateway event id (e.g. "evt_xxx")
  gateway: text("gateway").notNull(), // "razorpay" | "cashfree"
  eventType: text("event_type").notNull(), // "payment.captured", "order.paid", etc.
  orderId: text("order_id"),
  rawBodySha256: text("raw_body_sha256").notNull(),
  payload: jsonb("payload").notNull(), // Only reconciliation fields, NO email/phone/cards
  status: text("status").default("processed").notNull(), // processed | ignored | failed
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Order CRM Sync Outbox Table (Durable Storefront -> WhatsApp CRM Synchronization)
export const orderCrmSync = pgTable(
  "order_crm_sync",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    orderNumber: text("order_number").notNull(),
    status: text("status").default("pending").notNull(), // pending | synced | retry_pending | failed
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    payload: jsonb("payload").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("order_crm_sync_order_id_idx").on(table.orderId),
    index("order_crm_sync_order_number_idx").on(table.orderNumber),
    index("order_crm_sync_status_idx").on(table.status),
  ]
);
