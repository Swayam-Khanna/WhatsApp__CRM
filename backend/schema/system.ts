import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles, farmerProfiles } from "./index.ts";

/**
 * 1. Shipping Slabs Table (India Post / Speed Post weight slabs)
 * Monetary amounts stored in integer paise
 */
export const shippingSlabs = pgTable(
  "shipping_slabs",
  {
    id: text("id").primaryKey(), // e.g. "slab_ip_500g"
    service: text("service").notNull(), // 'india_post' | 'speed_post'
    weightUptoGm: integer("weight_upto_gm").notNull(), // CHECK > 0
    localPaise: integer("local_paise").notNull(), // CHECK >= 0
    withinStatePaise: integer("within_state_paise").notNull(), // CHECK >= 0
    zoneMetroPaise: integer("zone_metro_paise").notNull(), // CHECK >= 0
    otherStatesPaise: integer("other_states_paise").notNull(), // CHECK >= 0
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("shipping_slabs_service_weight_idx").on(table.service, table.weightUptoGm),
    check("shipping_slabs_weight_check", sql`${table.weightUptoGm} > 0`),
    check("shipping_slabs_local_check", sql`${table.localPaise} >= 0`),
    check("shipping_slabs_within_state_check", sql`${table.withinStatePaise} >= 0`),
    check("shipping_slabs_zone_metro_check", sql`${table.zoneMetroPaise} >= 0`),
    check("shipping_slabs_other_states_check", sql`${table.otherStatesPaise} >= 0`),
  ]
);

/**
 * 2. Last-Mile Rates Table
 * Delivery office vs parcel hub rates stored in integer paise
 */
export const lastMileRates = pgTable(
  "last_mile_rates",
  {
    id: text("id").primaryKey(),
    weightUptoGm: integer("weight_upto_gm").notNull(), // CHECK > 0
    deliveryOfficePaise: integer("delivery_office_paise").notNull(), // CHECK >= 0
    parcelHubPaise: integer("parcel_hub_paise").notNull(), // CHECK >= 0
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("last_mile_rates_weight_check", sql`${table.weightUptoGm} > 0`),
    check("last_mile_rates_delivery_office_check", sql`${table.deliveryOfficePaise} >= 0`),
    check("last_mile_rates_parcel_hub_check", sql`${table.parcelHubPaise} >= 0`),
  ]
);

/**
 * 3. Pincode Zones Table
 * Maps 3-digit pincode prefixes (or 6-digit codes) to shipping zones
 */
export const pincodeZones = pgTable(
  "pincode_zones",
  {
    pincodePrefix: text("pincode_prefix").primaryKey(), // e.g. "110", "400", "560"
    state: text("state").notNull(),
    zone: text("zone").notNull(), // 'local' | 'within_state' | 'zone_metro' | 'other_states'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "pincode_zones_valid_zone_check",
      sql`${table.zone} IN ('local', 'within_state', 'zone_metro', 'other_states')`
    ),
  ]
);

/**
 * 4. App Settings Table
 * Dynamic configuration for origin pincode, gateway keys, payment fee percentages, etc.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(), // e.g. "shipping_config", "general", "gateways"
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 5. Farmer Support Conversations Table
 */
export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(), // e.g. "conv_farmer_123"
    farmerId: text("farmer_id")
      .notNull()
      .references(() => farmerProfiles.id, { onDelete: "cascade" }),
    farmerName: text("farmer_name").notNull(),
    farmName: text("farm_name").notNull(),
    lastMessageText: text("last_message_text"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessageSender: text("last_message_sender"), // 'farmer' | 'admin'
    unreadByFarmer: integer("unread_by_farmer").default(0).notNull(),
    unreadByAdmin: integer("unread_by_admin").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("conversations_farmer_id_idx").on(table.farmerId),
    check("conversations_unread_farmer_check", sql`${table.unreadByFarmer} >= 0`),
    check("conversations_unread_admin_check", sql`${table.unreadByAdmin} >= 0`),
  ]
);

/**
 * 6. Chat Messages Table
 */
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(), // e.g. "msg_179102384_abc"
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    farmerId: text("farmer_id")
      .notNull()
      .references(() => farmerProfiles.id, { onDelete: "cascade" }),
    senderType: text("sender_type").notNull(), // 'farmer' | 'admin' | 'customer'
    senderId: text("sender_id").notNull(),
    senderName: text("sender_name").notNull(),
    departmentTag: text("department_tag"), // 'orders' | 'verification' | 'payouts' | 'general'
    text: text("text").notNull(),
    attachments: jsonb("attachments"), // ChatAttachment[]
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_id_idx").on(table.conversationId),
    index("messages_farmer_id_idx").on(table.farmerId),
    check("messages_sender_type_check", sql`${table.senderType} IN ('farmer', 'admin', 'customer')`),
  ]
);

/**
 * 7. System Notifications Table
 */
export const systemNotifications = pgTable(
  "system_notifications",
  {
    id: text("id").primaryKey(), // e.g. "notif_17910238_abc"
    userId: text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'order_status' | 'general_audit' | 'settlement' | 'kyc'
    title: text("title").notNull(),
    message: text("message").notNull(),
    read: boolean("read").default(false).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("system_notifications_user_id_idx").on(table.userId),
    index("system_notifications_read_created_idx").on(table.read, table.createdAt),
  ]
);

/**
 * 8. Farmer Certificates Table
 */
export const farmerCertificates = pgTable(
  "farmer_certificates",
  {
    id: text("id").primaryKey(), // e.g. "cert_17910238_abc"
    farmerId: text("farmer_id")
      .notNull()
      .references(() => farmerProfiles.id, { onDelete: "cascade" }),
    farmerName: text("farmer_name").notNull(),
    farmName: text("farm_name").notNull(),
    village: text("village"),
    state: text("state"),
    farmerSlug: text("farmer_slug"),
    certificateNumber: text("certificate_number").notNull().unique(), // e.g. "PRJ-CERT-2026-001"
    title: text("title").notNull(),
    type: text("type").default("PRAJNAA_VERIFIED").notNull(),
    status: text("status").default("ACTIVE").notNull(), // 'ACTIVE' | 'REVOKED' | 'EXPIRED'
    issuedBy: text("issued_by").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    verificationNotes: text("verification_notes"),
    verificationUrl: text("verification_url"),
    qrCodeDataUrl: text("qr_code_data_url"),
    showOnProfile: boolean("show_on_profile").default(true).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: text("revoked_by"),
    revocationReason: text("revocation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("farmer_certificates_farmer_id_idx").on(table.farmerId),
    index("farmer_certificates_status_idx").on(table.status),
  ]
);

/**
 * 9. Certificate Audit Logs Table
 */
export const certificateAuditLogs = pgTable(
  "certificate_audit_logs",
  {
    id: text("id").primaryKey(),
    certificateId: text("certificate_id").notNull(),
    certificateNumber: text("certificate_number"),
    farmerId: text("farmer_id")
      .notNull()
      .references(() => farmerProfiles.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // 'ISSUE' | 'REVOKE' | 'RENEW' | 'UPDATE'
    actorId: text("actor_id").notNull(),
    actorRole: text("actor_role").notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("cert_audit_logs_cert_id_idx").on(table.certificateId),
    index("cert_audit_logs_farmer_id_idx").on(table.farmerId),
  ]
);
