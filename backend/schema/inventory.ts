import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { farmerProducts } from "./index.ts";

/**
 * Product Variants Table
 * Represents pack sizes/skus (e.g. "250g", "500g", "1kg", "Tin Pack")
 */
export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(), // e.g. "var_mamra_almonds_500g"
    productId: text("product_id")
      .notNull()
      .references(() => farmerProducts.id, { onDelete: "cascade" }),
    variantName: text("variant_name").notNull(), // e.g. "500g Pouch"
    sku: text("sku").unique(), // e.g. "MAMRA-ALM-500G"
    weightGrams: integer("weight_grams").notNull(), // CHECK > 0
    pricePaise: integer("price_paise").notNull(), // CHECK >= 0
    compareAtPricePaise: integer("compare_at_price_paise"),
    stockUnits: integer("stock_units").default(0).notNull(), // CHECK >= 0
    stockGrams: integer("stock_grams").default(0).notNull(), // CHECK >= 0
    lowStockThresholdGrams: integer("low_stock_threshold_grams").default(1000).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("product_variants_product_id_idx").on(table.productId),
    check("product_variants_weight_grams_check", sql`${table.weightGrams} > 0`),
    check("product_variants_price_paise_check", sql`${table.pricePaise} >= 0`),
    check("product_variants_stock_units_check", sql`${table.stockUnits} >= 0`),
    check("product_variants_stock_grams_check", sql`${table.stockGrams} >= 0`),
    check("product_variants_low_stock_threshold_check", sql`${table.lowStockThresholdGrams} >= 0`),
  ]
);

/**
 * Product Inventory Table (Migrated from Firestore `product_inventory`)
 * Single source of truth for stock_grams and derived availability.
 */
export const productInventory = pgTable(
  "product_inventory",
  {
    id: text("id").primaryKey(), // e.g. "inv_prod_123_var_456"
    productId: text("product_id")
      .notNull()
      .references(() => farmerProducts.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    variantName: text("variant_name").default("standard").notNull(),
    stockGrams: integer("stock_grams").default(0).notNull(), // CHECK >= 0
    lowStockThresholdGrams: integer("low_stock_threshold_grams").default(1000).notNull(),
    quantity: integer("quantity").default(0).notNull(), // backward compatible (kg or units)
    soldCount: integer("sold_count").default(0).notNull(),
    pledgedCount: integer("pledged_count").default(0).notNull(),
    preorderEnabled: boolean("preorder_enabled").default(false).notNull(),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("product_inventory_product_id_idx").on(table.productId),
    index("product_inventory_prod_variant_idx").on(table.productId, table.variantId),
    check("product_inventory_stock_grams_check", sql`${table.stockGrams} >= 0`),
    check("product_inventory_low_stock_threshold_check", sql`${table.lowStockThresholdGrams} >= 0`),
    check("product_inventory_quantity_check", sql`${table.quantity} >= 0`),
    check("product_inventory_sold_count_check", sql`${table.soldCount} >= 0`),
  ]
);

/**
 * Stock History / Movements Audit Trail (Migrated from Firestore `stock_history` & `stock_movements`)
 */
export const stockHistory = pgTable(
  "stock_history",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => farmerProducts.id, { onDelete: "cascade" }),
    variantId: text("variant_id"),
    variantName: text("variant_name"),
    type: text("type").notNull(), // 'sale' | 'restock' | 'manual_correction' | 'refund' | 'add' | 'remove' | 'set'
    grams: integer("grams").notNull(), // CHECK >= 0
    stockBefore: integer("stock_before").notNull(), // CHECK >= 0
    stockAfter: integer("stock_after").notNull(), // CHECK >= 0
    changeAmount: integer("change_amount").default(0).notNull(), // delta
    quantityBefore: integer("quantity_before").default(0).notNull(),
    quantityAfter: integer("quantity_after").default(0).notNull(),
    reason: text("reason").notNull(),
    note: text("note"),
    orderId: text("order_id"),
    adminId: text("admin_id"),
    userEmail: text("user_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("stock_history_product_id_idx").on(table.productId),
    index("stock_history_order_id_idx").on(table.orderId),
    index("stock_history_created_at_idx").on(table.createdAt),
    check("stock_history_grams_check", sql`${table.grams} >= 0`),
    check("stock_history_stock_before_check", sql`${table.stockBefore} >= 0`),
    check("stock_history_stock_after_check", sql`${table.stockAfter} >= 0`),
  ]
);
