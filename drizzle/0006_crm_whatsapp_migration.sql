-- Phase 4: WhatsApp CRM Tables (PostgreSQL-Native)
-- Authoritative storage for CRM messages and orders, removing MongoDB dependency

CREATE TABLE IF NOT EXISTS "crm_orders" (
  "id" text PRIMARY KEY NOT NULL,
  "order_number" text NOT NULL UNIQUE,
  "customer_name" text,
  "customer_phone" text NOT NULL,
  "customer_email" text,
  "total_paise" integer NOT NULL,
  "subtotal_paise" integer DEFAULT 0,
  "shipping_paise" integer DEFAULT 0,
  "discount_paise" integer DEFAULT 0,
  "status" text DEFAULT 'Processing' NOT NULL,
  "payment_status" text DEFAULT 'pending' NOT NULL,
  "payment_method" text DEFAULT 'whatsapp' NOT NULL,
  "shipping_address_snapshot" jsonb,
  "items" jsonb,
  "whatsapp_confirmation" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "crm_orders_order_number_idx" ON "crm_orders" ("order_number");
CREATE INDEX IF NOT EXISTS "crm_orders_customer_phone_idx" ON "crm_orders" ("customer_phone");
CREATE INDEX IF NOT EXISTS "crm_orders_created_at_idx" ON "crm_orders" ("created_at");

CREATE TABLE IF NOT EXISTS "crm_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "direction" text NOT NULL,
  "sender" text NOT NULL,
  "from" text NOT NULL,
  "to" text NOT NULL,
  "customer_name" text,
  "text" text NOT NULL,
  "type" text DEFAULT 'text' NOT NULL,
  "media_id" text,
  "mime_type" text,
  "business_phone_number_id" text,
  "status" text DEFAULT 'delivered' NOT NULL,
  "is_automated" boolean DEFAULT false NOT NULL,
  "customer_id" text,
  "order_number" text,
  "mode" text,
  "whatsapp_url" text,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "crm_messages_from_idx" ON "crm_messages" ("from");
CREATE INDEX IF NOT EXISTS "crm_messages_to_idx" ON "crm_messages" ("to");
CREATE INDEX IF NOT EXISTS "crm_messages_order_number_idx" ON "crm_messages" ("order_number");
CREATE INDEX IF NOT EXISTS "crm_messages_created_at_idx" ON "crm_messages" ("created_at");

