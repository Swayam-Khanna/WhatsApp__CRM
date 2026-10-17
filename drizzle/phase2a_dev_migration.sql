-- ============================================================================
-- Phase 2A Migration SQL for Neon PostgreSQL (Dev Branch)
-- Database: neondb (ep-aged-art-b3wz564o-pooler)
-- ============================================================================

-- 1. Create Enums if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE "public"."order_status" AS ENUM (
      'pending', 'confirmed', 'packed', 'partially_shipped',
      'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_payment_status') THEN
    CREATE TYPE "public"."order_payment_status" AS ENUM (
      'pending', 'authorized', 'paid', 'failed', 'refunded'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_payment_method') THEN
    CREATE TYPE "public"."order_payment_method" AS ENUM (
      'cod', 'whatsapp', 'razorpay', 'cashfree'
    );
  END IF;
END $$;

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS "public"."orders" (
  "id" text PRIMARY KEY NOT NULL,
  "order_number" text NOT NULL UNIQUE,
  "user_id" text NOT NULL REFERENCES "public"."profiles"("id") ON DELETE RESTRICT,
  "customer_name" text NOT NULL,
  "customer_email" text NOT NULL,
  "customer_phone" text NOT NULL,
  "status" "public"."order_status" DEFAULT 'pending' NOT NULL,
  "payment_status" "public"."order_payment_status" DEFAULT 'pending' NOT NULL,
  "payment_method" "public"."order_payment_method" NOT NULL,
  "razorpay_order_id" text UNIQUE,
  "razorpay_payment_id" text,
  "razorpay_signature" text,
  "cashfree_order_id" text,
  "subtotal_paise" integer NOT NULL,
  "tax_paise" integer DEFAULT 0 NOT NULL,
  "shipping_paise" integer DEFAULT 0 NOT NULL,
  "discount_paise" integer DEFAULT 0 NOT NULL,
  "total_paise" integer NOT NULL,
  "coupon_code" text,
  "coupon_id" text REFERENCES "public"."coupons"("id") ON DELETE SET NULL,
  "shipping_address_id" text REFERENCES "public"."addresses"("id") ON DELETE SET NULL,
  "shipping_address_snapshot" jsonb NOT NULL,
  "billing_address_snapshot" jsonb,
  "customer_notes" text,
  "admin_notes" text,
  "cancellation_reason" text,
  "cancelled_at" timestamptz,
  "delivered_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "orders_subtotal_paise_check" CHECK ("subtotal_paise" >= 0),
  CONSTRAINT "orders_tax_paise_check" CHECK ("tax_paise" >= 0),
  CONSTRAINT "orders_shipping_paise_check" CHECK ("shipping_paise" >= 0),
  CONSTRAINT "orders_discount_paise_check" CHECK ("discount_paise" >= 0),
  CONSTRAINT "orders_total_paise_check" CHECK ("total_paise" >= 0)
);

-- Orders Indexes
CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "public"."orders" ("user_id");
CREATE INDEX IF NOT EXISTS "orders_status_created_at_idx" ON "public"."orders" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "orders_payment_status_idx" ON "public"."orders" ("payment_status");

-- 3. Order Items Table
CREATE TABLE IF NOT EXISTS "public"."order_items" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL REFERENCES "public"."orders"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL REFERENCES "public"."farmer_products"("id") ON DELETE RESTRICT,
  "variant_id" text,
  "variant_name" text,
  "farmer_id" text NOT NULL REFERENCES "public"."farmer_profiles"("id") ON DELETE RESTRICT,
  "product_name" text NOT NULL,
  "product_slug" text NOT NULL,
  "product_image" text,
  "quantity" integer NOT NULL,
  "unit_price_paise" integer NOT NULL,
  "total_paise" integer NOT NULL,
  "weight_grams" integer DEFAULT 0 NOT NULL,
  "hsn_code" text,
  "gst_rate" double precision DEFAULT 5 NOT NULL,
  "gst_paise" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "order_items_unit_price_check" CHECK ("unit_price_paise" >= 0),
  CONSTRAINT "order_items_total_paise_check" CHECK ("total_paise" >= 0),
  CONSTRAINT "order_items_gst_paise_check" CHECK ("gst_paise" >= 0)
);

-- Order Items Indexes
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "public"."order_items" ("order_id");
CREATE INDEX IF NOT EXISTS "order_items_product_id_idx" ON "public"."order_items" ("product_id");

-- 4. Order Shipments Table
CREATE TABLE IF NOT EXISTS "public"."order_shipments" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL REFERENCES "public"."orders"("id") ON DELETE CASCADE,
  "carrier" text NOT NULL,
  "tracking_number" text NOT NULL,
  "tracking_url" text,
  "status" text DEFAULT 'manifested' NOT NULL,
  "delivery_route" text,
  "override_reason" text,
  "allocated_item_ids" text[],
  "estimated_delivery" timestamptz,
  "shipped_at" timestamptz DEFAULT now() NOT NULL,
  "delivered_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Order Shipments Indexes
CREATE INDEX IF NOT EXISTS "order_shipments_order_id_idx" ON "public"."order_shipments" ("order_id");

-- 5. Order Status Audit Logs Table
CREATE TABLE IF NOT EXISTS "public"."order_status_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL REFERENCES "public"."orders"("id") ON DELETE CASCADE,
  "from_status" text,
  "to_status" text NOT NULL,
  "actor_id" text NOT NULL,
  "actor_role" text NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- Order Status Logs Indexes
CREATE INDEX IF NOT EXISTS "order_status_logs_order_id_idx" ON "public"."order_status_logs" ("order_id");

-- 6. Payment Webhook Events Table (Idempotent reconciliation)
CREATE TABLE IF NOT EXISTS "public"."payment_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event_id" text NOT NULL UNIQUE,
  "gateway" text NOT NULL,
  "event_type" text NOT NULL,
  "order_id" text,
  "raw_body_sha256" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'processed' NOT NULL,
  "error_message" text,
  "processed_at" timestamptz DEFAULT now() NOT NULL
);

-- 7. File Uploads Table
CREATE TABLE IF NOT EXISTS "public"."file_uploads" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL,
  "file_url" text NOT NULL,
  "storage_key" text,
  "mime_type" text DEFAULT 'image/webp' NOT NULL,
  "size_bytes" integer NOT NULL,
  "purpose" text DEFAULT 'general' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- File Uploads Indexes
CREATE INDEX IF NOT EXISTS "file_uploads_user_id_idx" ON "public"."file_uploads" ("user_id");

-- 8. Product Variants Table
CREATE TABLE IF NOT EXISTS "public"."product_variants" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL REFERENCES "public"."farmer_products"("id") ON DELETE CASCADE,
  "variant_name" text NOT NULL,
  "sku" text UNIQUE,
  "weight_grams" integer NOT NULL,
  "price_paise" integer NOT NULL,
  "compare_at_price_paise" integer,
  "stock_units" integer DEFAULT 0 NOT NULL,
  "stock_grams" integer DEFAULT 0 NOT NULL,
  "low_stock_threshold_grams" integer DEFAULT 1000 NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "product_variants_weight_grams_check" CHECK ("weight_grams" > 0),
  CONSTRAINT "product_variants_price_paise_check" CHECK ("price_paise" >= 0),
  CONSTRAINT "product_variants_stock_units_check" CHECK ("stock_units" >= 0),
  CONSTRAINT "product_variants_stock_grams_check" CHECK ("stock_grams" >= 0),
  CONSTRAINT "product_variants_low_stock_threshold_check" CHECK ("low_stock_threshold_grams" >= 0)
);

-- Product Variants Indexes
CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx" ON "public"."product_variants" ("product_id");

-- 9. Product Inventory Table (from Firestore `product_inventory`)
CREATE TABLE IF NOT EXISTS "public"."product_inventory" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL REFERENCES "public"."farmer_products"("id") ON DELETE CASCADE,
  "variant_id" text REFERENCES "public"."product_variants"("id") ON DELETE SET NULL,
  "variant_name" text DEFAULT 'standard' NOT NULL,
  "stock_grams" integer DEFAULT 0 NOT NULL,
  "low_stock_threshold_grams" integer DEFAULT 1000 NOT NULL,
  "quantity" integer DEFAULT 0 NOT NULL,
  "sold_count" integer DEFAULT 0 NOT NULL,
  "pledged_count" integer DEFAULT 0 NOT NULL,
  "preorder_enabled" boolean DEFAULT false NOT NULL,
  "updated_by" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "product_inventory_stock_grams_check" CHECK ("stock_grams" >= 0),
  CONSTRAINT "product_inventory_low_stock_threshold_check" CHECK ("low_stock_threshold_grams" >= 0),
  CONSTRAINT "product_inventory_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "product_inventory_sold_count_check" CHECK ("sold_count" >= 0)
);

-- Product Inventory Indexes
CREATE INDEX IF NOT EXISTS "product_inventory_product_id_idx" ON "public"."product_inventory" ("product_id");
CREATE INDEX IF NOT EXISTS "product_inventory_prod_variant_idx" ON "public"."product_inventory" ("product_id", "variant_id");

-- 10. Stock History Table (from Firestore `stock_history` & `stock_movements`)
CREATE TABLE IF NOT EXISTS "public"."stock_history" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL REFERENCES "public"."farmer_products"("id") ON DELETE CASCADE,
  "variant_id" text,
  "variant_name" text,
  "type" text NOT NULL,
  "grams" integer NOT NULL,
  "stock_before" integer NOT NULL,
  "stock_after" integer NOT NULL,
  "change_amount" integer DEFAULT 0 NOT NULL,
  "quantity_before" integer DEFAULT 0 NOT NULL,
  "quantity_after" integer DEFAULT 0 NOT NULL,
  "reason" text NOT NULL,
  "note" text,
  "order_id" text,
  "admin_id" text,
  "user_email" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "stock_history_grams_check" CHECK ("grams" >= 0),
  CONSTRAINT "stock_history_stock_before_check" CHECK ("stock_before" >= 0),
  CONSTRAINT "stock_history_stock_after_check" CHECK ("stock_after" >= 0)
);

-- Stock History Indexes
CREATE INDEX IF NOT EXISTS "stock_history_product_id_idx" ON "public"."stock_history" ("product_id");
CREATE INDEX IF NOT EXISTS "stock_history_order_id_idx" ON "public"."stock_history" ("order_id");
CREATE INDEX IF NOT EXISTS "stock_history_created_at_idx" ON "public"."stock_history" ("created_at");

-- 11. Shipping Slabs Table
CREATE TABLE IF NOT EXISTS "public"."shipping_slabs" (
  "id" text PRIMARY KEY NOT NULL,
  "service" text NOT NULL,
  "weight_upto_gm" integer NOT NULL,
  "local_paise" integer NOT NULL,
  "within_state_paise" integer NOT NULL,
  "zone_metro_paise" integer NOT NULL,
  "other_states_paise" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "shipping_slabs_weight_check" CHECK ("weight_upto_gm" > 0),
  CONSTRAINT "shipping_slabs_local_check" CHECK ("local_paise" >= 0),
  CONSTRAINT "shipping_slabs_within_state_check" CHECK ("within_state_paise" >= 0),
  CONSTRAINT "shipping_slabs_zone_metro_check" CHECK ("zone_metro_paise" >= 0),
  CONSTRAINT "shipping_slabs_other_states_check" CHECK ("other_states_paise" >= 0)
);

-- Shipping Slabs Indexes
CREATE INDEX IF NOT EXISTS "shipping_slabs_service_weight_idx" ON "public"."shipping_slabs" ("service", "weight_upto_gm");

-- 12. Last-Mile Rates Table
CREATE TABLE IF NOT EXISTS "public"."last_mile_rates" (
  "id" text PRIMARY KEY NOT NULL,
  "weight_upto_gm" integer NOT NULL,
  "delivery_office_paise" integer NOT NULL,
  "parcel_hub_paise" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "last_mile_rates_weight_check" CHECK ("weight_upto_gm" > 0),
  CONSTRAINT "last_mile_rates_delivery_office_check" CHECK ("delivery_office_paise" >= 0),
  CONSTRAINT "last_mile_rates_parcel_hub_check" CHECK ("parcel_hub_paise" >= 0)
);

-- 13. Pincode Zones Table
CREATE TABLE IF NOT EXISTS "public"."pincode_zones" (
  "pincode_prefix" text PRIMARY KEY NOT NULL,
  "state" text NOT NULL,
  "zone" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "pincode_zones_valid_zone_check" CHECK ("zone" IN ('local', 'within_state', 'zone_metro', 'other_states'))
);

-- 14. App Settings Table
CREATE TABLE IF NOT EXISTS "public"."app_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "description" text,
  "updated_by" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- 15. Conversations Table
CREATE TABLE IF NOT EXISTS "public"."conversations" (
  "id" text PRIMARY KEY NOT NULL,
  "farmer_id" text NOT NULL REFERENCES "public"."farmer_profiles"("id") ON DELETE CASCADE,
  "farmer_name" text NOT NULL,
  "farm_name" text NOT NULL,
  "last_message_text" text,
  "last_message_at" timestamptz,
  "last_message_sender" text,
  "unread_by_farmer" integer DEFAULT 0 NOT NULL,
  "unread_by_admin" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "conversations_unread_farmer_check" CHECK ("unread_by_farmer" >= 0),
  CONSTRAINT "conversations_unread_admin_check" CHECK ("unread_by_admin" >= 0)
);

-- Conversations Indexes
CREATE INDEX IF NOT EXISTS "conversations_farmer_id_idx" ON "public"."conversations" ("farmer_id");

-- 16. Messages Table
CREATE TABLE IF NOT EXISTS "public"."messages" (
  "id" text PRIMARY KEY NOT NULL,
  "conversation_id" text NOT NULL REFERENCES "public"."conversations"("id") ON DELETE CASCADE,
  "farmer_id" text NOT NULL REFERENCES "public"."farmer_profiles"("id") ON DELETE CASCADE,
  "sender_type" text NOT NULL,
  "sender_id" text NOT NULL,
  "sender_name" text NOT NULL,
  "department_tag" text,
  "text" text NOT NULL,
  "attachments" jsonb,
  "read_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "messages_sender_type_check" CHECK ("sender_type" IN ('farmer', 'admin', 'customer'))
);

-- Messages Indexes
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "public"."messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "messages_farmer_id_idx" ON "public"."messages" ("farmer_id");

-- 17. System Notifications Table
CREATE TABLE IF NOT EXISTS "public"."system_notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "read" boolean DEFAULT false NOT NULL,
  "metadata" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- System Notifications Indexes
CREATE INDEX IF NOT EXISTS "system_notifications_user_id_idx" ON "public"."system_notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "system_notifications_read_created_idx" ON "public"."system_notifications" ("read", "created_at");

-- 18. Farmer Certificates Table
CREATE TABLE IF NOT EXISTS "public"."farmer_certificates" (
  "id" text PRIMARY KEY NOT NULL,
  "farmer_id" text NOT NULL REFERENCES "public"."farmer_profiles"("id") ON DELETE CASCADE,
  "farmer_name" text NOT NULL,
  "farm_name" text NOT NULL,
  "village" text,
  "state" text,
  "farmer_slug" text,
  "certificate_number" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "type" text DEFAULT 'PRAJNAA_VERIFIED' NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "issued_by" text NOT NULL,
  "issued_at" timestamptz DEFAULT now() NOT NULL,
  "valid_until" timestamptz NOT NULL,
  "verification_notes" text,
  "verification_url" text,
  "qr_code_data_url" text,
  "show_on_profile" boolean DEFAULT true NOT NULL,
  "revoked_at" timestamptz,
  "revoked_by" text,
  "revocation_reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

-- Farmer Certificates Indexes
CREATE INDEX IF NOT EXISTS "farmer_certificates_farmer_id_idx" ON "public"."farmer_certificates" ("farmer_id");
CREATE INDEX IF NOT EXISTS "farmer_certificates_status_idx" ON "public"."farmer_certificates" ("status");

-- 19. Certificate Audit Logs Table
CREATE TABLE IF NOT EXISTS "public"."certificate_audit_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "certificate_id" text NOT NULL,
  "certificate_number" text,
  "farmer_id" text NOT NULL REFERENCES "public"."farmer_profiles"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "actor_id" text NOT NULL,
  "actor_role" text NOT NULL,
  "details" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- Certificate Audit Logs Indexes
CREATE INDEX IF NOT EXISTS "cert_audit_logs_cert_id_idx" ON "public"."certificate_audit_logs" ("certificate_id");
CREATE INDEX IF NOT EXISTS "cert_audit_logs_farmer_id_idx" ON "public"."certificate_audit_logs" ("farmer_id");
