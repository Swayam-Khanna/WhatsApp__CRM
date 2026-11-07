import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/**
 * 1. CRM Orders Table (Authoritative PostgreSQL storage for WhatsApp CRM synced orders)
 */
export const crmOrders = pgTable(
  "crm_orders",
  {
    id: text("id").primaryKey(), // matches orderNumber or unique order id
    orderNumber: text("order_number").notNull().unique(),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    totalPaise: integer("total_paise").notNull(),
    subtotalPaise: integer("subtotal_paise").default(0),
    shippingPaise: integer("shipping_paise").default(0),
    discountPaise: integer("discount_paise").default(0),
    status: text("status").default("Processing").notNull(),
    paymentStatus: text("payment_status").default("pending").notNull(),
    paymentMethod: text("payment_method").default("whatsapp").notNull(),
    shippingAddressSnapshot: jsonb("shipping_address_snapshot"),
    items: jsonb("items"),
    whatsappConfirmation: jsonb("whatsapp_confirmation"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("crm_orders_order_number_idx").on(table.orderNumber),
    index("crm_orders_customer_phone_idx").on(table.customerPhone),
    index("crm_orders_created_at_idx").on(table.createdAt),
  ]
);

/**
 * 2. CRM Messages Table (Authoritative PostgreSQL storage for live WhatsApp chat conversations)
 */
export const crmMessages = pgTable(
  "crm_messages",
  {
    id: text("id").primaryKey(), // wamid.* or msg_*
    direction: text("direction").notNull(), // 'inbound' | 'outbound'
    sender: text("sender").notNull(), // 'customer' | 'business'
    from: text("from").notNull(),
    to: text("to").notNull(),
    customerName: text("customer_name"),
    text: text("text").notNull(),
    type: text("type").default("text").notNull(),
    mediaId: text("media_id"),
    mimeType: text("mime_type"),
    businessPhoneNumberId: text("business_phone_number_id"),
    status: text("status").default("delivered").notNull(), // 'sent' | 'delivered' | 'read' | 'failed'
    isAutomated: boolean("is_automated").default(false).notNull(),
    customerId: text("customer_id"),
    orderNumber: text("order_number"),
    mode: text("mode"),
    whatsappUrl: text("whatsapp_url"),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("crm_messages_from_idx").on(table.from),
    index("crm_messages_to_idx").on(table.to),
    index("crm_messages_order_number_idx").on(table.orderNumber),
    index("crm_messages_created_at_idx").on(table.createdAt),
  ]
);

