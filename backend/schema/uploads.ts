import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { profiles } from "./index.ts";

/**
 * 1. Media Folders Table
 * Defines standardized storage categories in Neon so admin can easily identify and navigate assets.
 */
export const mediaFolders = pgTable(
  "media_folders",
  {
    id: text("id").primaryKey(), // e.g. "products", "farmers-kyc", "orders-invoices"
    name: text("name").notNull(), // e.g. "Product Catalog Images"
    slug: text("slug").unique().notNull(), // e.g. "products", "farmers/kyc"
    description: text("description"),
    icon: text("icon").default("folder").notNull(),
    allowedTypes: jsonb("allowed_types").notNull(), // ["image/jpeg", "image/webp", "application/pdf"]
    maxSizeMb: integer("max_size_mb").default(5).notNull(),
    isSystem: boolean("is_system").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("media_folders_slug_idx").on(table.slug),
  ]
);

/**
 * 2. Media Assets Table
 * Structured registry of every file, photo, and document in the system.
 * Indexed by folder so the Admin panel can instantly list, filter, and count files.
 */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: text("id").primaryKey(), // e.g. "ast_1741234567_abc"
    folder: text("folder").notNull(), // e.g. "products", "farmers/kyc", "orders/invoices"
    fileName: text("file_name").notNull(),
    originalName: text("original_name"),
    fileUrl: text("file_url").notNull(), // Static public URL or S3/CDN link
    storageKey: text("storage_key"), // Local relative path or S3 key
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    entityType: text("entity_type"), // "product" | "farmer" | "order" | "review" | "user" | "system"
    entityId: text("entity_id"), // ID of associated product, farmer, etc.
    uploadedBy: text("uploaded_by"), // email or user ID of uploader
    metadata: jsonb("metadata"), // { width, height, format, ... }
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("media_assets_folder_idx").on(table.folder),
    index("media_assets_entity_idx").on(table.entityType, table.entityId),
    index("media_assets_created_at_idx").on(table.createdAt),
  ]
);

/**
 * 3. File Uploads Table (Legacy Compatibility)
 */
export const fileUploads = pgTable(
  "file_uploads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileUrl: text("file_url").notNull(),
    storageKey: text("storage_key"),
    mimeType: text("mime_type").default("image/webp").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    purpose: text("purpose").default("general").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("file_uploads_user_id_idx").on(table.userId),
  ]
);
