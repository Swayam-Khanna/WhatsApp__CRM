import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  pgEnum,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";

// Enums definitions
export const appRoleEnum = pgEnum("app_role", ["customer", "farmer", "admin"]);
export const docStatusEnum = pgEnum("doc_status", ["pending", "verified", "rejected"]);
export const farmerStatusEnum = pgEnum("farmer_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "suspended",
]);
export const payoutStatusEnum = pgEnum("payout_status", [
  "scheduled",
  "processing",
  "paid",
  "failed",
]);
export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "pending",
  "published",
  "rejected",
  "archived",
]);

// 1. Profiles (users)
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // matches firebase auth uid
  neonAuthUserId: uuid("neon_auth_user_id").unique(),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Addresses
export const addresses = pgTable("addresses", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").default("India").notNull(),
  phone: text("phone"),
  label: text("label").default("Home").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. User Roles
export const userRoles = pgTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  role: appRoleEnum("role").default("customer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Farmer Profiles
export const farmerProfiles = pgTable("farmer_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  farmName: text("farm_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  slug: text("slug").unique(),
  status: farmerStatusEnum("status").default("draft").notNull(),
  state: text("state").notNull(),
  district: text("district"),
  village: text("village").notNull(),
  pincode: text("pincode"),
  crops: text("crops").array(),
  farmingMethod: text("farming_method"),
  farmSizeAcres: doublePrecision("farm_size_acres"),
  yearsFarming: integer("years_farming"),
  story: text("story"),
  portraitUrl: text("portrait_url"),
  coverImageUrl: text("cover_image_url"),
  panNumber: text("pan_number"),
  aadhaarLast4: text("aadhaar_last4"),
  upiId: text("upi_id"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  bankIfsc: text("bank_ifsc"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  kishanPehchanPatra: text("kishan_pehchan_patra"),
  totalLandArea: text("total_land_area"),
  areaUnit: text("area_unit"),
  cultivatedArea: text("cultivated_area"),
  khasraNumbers: text("khasra_numbers"),
  cultivatorType: text("cultivator_type"),
  landLedger: jsonb("land_ledger"),
  trustCertificates: jsonb("trust_certificates"),
  trustChecks: jsonb("trust_checks"),
  trustApplicationStatus: text("trust_application_status").default("none"),
});

// 5. Farmer Products
export const farmerProducts = pgTable("farmer_products", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => profiles.id),
  farmerId: text("farmer_id").references(() => farmerProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  compareAtPrice: doublePrecision("compare_at_price"),
  category: text("category").notNull(),
  stock: integer("stock").default(0).notNull(),
  stockGrams: integer("stock_grams").default(0).notNull(),
  pricePerKg: doublePrecision("price_per_kg"),
  lowStockThresholdGrams: integer("low_stock_threshold_grams").default(1000).notNull(),
  unit: text("unit").default("kg").notNull(),
  weightGrams: integer("weight_grams"),
  images: text("images").array(),
  featured: boolean("featured").default(false).notNull(),
  status: productStatusEnum("status").default("draft").notNull(),
  hsnCode: text("hsn_code"),
  gstApplicable: boolean("gst_applicable").default(true).notNull(),
  gstRate: doublePrecision("gst_rate").default(5).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Product Reviews
export const productReviews = pgTable("product_reviews", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  productSlug: text("product_slug")
    .notNull()
    .references(() => farmerProducts.slug, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  images: text("images").array(),
  status: text("status").default("pending").notNull(),
  orderId: text("order_id"),
  verified: boolean("verified").default(false).notNull(),
  adminReplyText: text("admin_reply_text"),
  adminReplyAt: timestamp("admin_reply_at"),
  adminReplyBy: text("admin_reply_by"),
  moderatedAt: timestamp("moderated_at"),
  moderatedBy: text("moderated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 7. Wishlist Items
export const wishlistItems = pgTable("wishlist_items", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  productSlug: text("product_slug")
    .notNull()
    .references(() => farmerProducts.slug, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Recently Viewed
export const recentlyViewed = pgTable("recently_viewed", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  productSlug: text("product_slug")
    .notNull()
    .references(() => farmerProducts.slug, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
});

// 9. Payment Methods
export const paymentMethods = pgTable("payment_methods", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  brand: text("brand").notNull(),
  expMonth: integer("exp_month").notNull(),
  expYear: integer("exp_year").notNull(),
  last4: text("last4").notNull(),
  nickname: text("nickname"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 10. Farmer Documents
export const farmerDocuments = pgTable("farmer_documents", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  farmerId: text("farmer_id")
    .notNull()
    .references(() => farmerProfiles.id, { onDelete: "cascade" }),
  docType: text("doc_type").notNull(),
  fileUrl: text("file_url").notNull(),
  label: text("label"),
  notes: text("notes"),
  status: docStatusEnum("status").default("pending").notNull(),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 11. Farmer Payouts
export const farmerPayouts = pgTable("farmer_payouts", {
  id: text("id").primaryKey(),
  farmerId: text("farmer_id")
    .notNull()
    .references(() => farmerProfiles.id, { onDelete: "cascade" }),
  grossAmount: doublePrecision("gross_amount").notNull(),
  fees: doublePrecision("fees").default(0).notNull(),
  netAmount: doublePrecision("net_amount").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  status: payoutStatusEnum("status").default("scheduled").notNull(),
  reference: text("reference"),
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 12. Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  newsletter: boolean("newsletter").default(true).notNull(),
  orderUpdatesEmail: boolean("order_updates_email").default(true).notNull(),
  orderUpdatesSms: boolean("order_updates_sms").default(true).notNull(),
  promotionsEmail: boolean("promotions_email").default(true).notNull(),
  promotionsSms: boolean("promotions_sms").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 13. Coupons
export const couponTypeEnum = pgEnum("coupon_type", [
  "amount_off",
  "percent_off",
  "free_shipping",
  "sale_price",
  "bogo",
]);

export const couponApplyToEnum = pgEnum("coupon_apply_to", [
  "entire_order",
  "specific_category",
  "specific_items",
]);

export const coupons = pgTable("coupons", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // amount_off | percent_off | free_shipping | sale_price | bogo
  value: doublePrecision("value"),
  buyQty: integer("buy_qty"),
  getQty: integer("get_qty"),
  applyTo: text("apply_to").notNull().default("entire_order"), // entire_order | specific_category | specific_items
  categoryId: text("category_id"),
  itemIds: text("item_ids").array(),
  applyOncePerOrder: boolean("apply_once_per_order").default(false).notNull(),
  includeSubscriptions: boolean("include_subscriptions").default(true).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  totalUseLimit: integer("total_use_limit"),
  perCustomerLimit: integer("per_customer_limit"),
  timesUsed: integer("times_used").default(0).notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 14. Coupon Redemptions
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: text("id").primaryKey(),
  couponId: text("coupon_id")
    .notNull()
    .references(() => coupons.id, { onDelete: "cascade" }),
  customerId: text("customer_id").notNull(),
  orderId: text("order_id"),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
});

// 15. Stock Movements
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "add",
  "remove",
  "set",
  "sale",
  "refund",
]);

export const stockMovements = pgTable("stock_movements", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  type: text("type").notNull(), // 'add' | 'remove' | 'set' | 'sale' | 'refund'
  grams: integer("grams").notNull(),
  stockBefore: integer("stock_before").notNull(),
  stockAfter: integer("stock_after").notNull(),
  reason: text("reason").notNull(),
  note: text("note"),
  adminId: text("admin_id"), // nullable for sales
  orderId: text("order_id"), // nullable
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Better Auth Schema (user, session, account, verification)
export * from "./auth.ts";

// Phase 2 Orders & Webhooks Schema
export * from "./orders.ts";

// Phase 2 Uploads Schema
export * from "./uploads.ts";

// Phase 2 Inventory & Stock History Schema
export * from "./inventory.ts";

// Phase 2 System, Shipping, Messaging & Certificate Schemas
export * from "./system.ts";

// Neon Managed Auth Webhooks Idempotency Schema
export * from "./neon-auth-webhooks.ts";

// Leads & Sales Management Schema (B2B Wholesale & B2C Retail)
export * from "./leads.ts";

// WhatsApp CRM Tables (PostgreSQL-native CRM messages and orders)
export * from "./crm.ts";
