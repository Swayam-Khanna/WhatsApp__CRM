-- Phase 3: Leads & Sales Management Module Migration
-- B2B Wholesale Pipeline & B2C Retail Pipeline

CREATE TABLE IF NOT EXISTS "business_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "business_type" text NOT NULL,
  "address_line1" text NOT NULL,
  "address_line2" text,
  "city" text NOT NULL,
  "state" text NOT NULL,
  "postal_code" text NOT NULL,
  "gstin" text,
  "pan" text,
  "website" text,
  "credit_approved" boolean DEFAULT false NOT NULL,
  "credit_limit_paise" integer DEFAULT 0 NOT NULL,
  "credit_period_days" integer DEFAULT 0 NOT NULL,
  "outstanding_balance_paise" integer DEFAULT 0 NOT NULL,
  "accounting_customer_id" text,
  "accounting_provider" text DEFAULT 'zoho_books',
  "accounting_last_synced_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "business_account_contacts" (
  "id" text PRIMARY KEY NOT NULL,
  "business_account_id" text NOT NULL REFERENCES "business_accounts"("id") ON DELETE CASCADE,
  "contact_name" text NOT NULL,
  "phone" text NOT NULL,
  "email" text,
  "role" text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sales_pipelines" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "business_model" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sales_stages" (
  "id" text PRIMARY KEY NOT NULL,
  "pipeline_id" text NOT NULL REFERENCES "sales_pipelines"("id") ON DELETE CASCADE,
  "stage_key" text NOT NULL,
  "name" text NOT NULL,
  "order_index" integer NOT NULL,
  "is_terminal" boolean DEFAULT false NOT NULL,
  "is_success" boolean DEFAULT false NOT NULL,
  "required_fields" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "leads" (
  "id" text PRIMARY KEY NOT NULL,
  "reference" text UNIQUE NOT NULL,
  "business_model" text NOT NULL,
  "contact_id" text NOT NULL,
  "contact_name" text NOT NULL,
  "contact_phone" text NOT NULL,
  "contact_email" text,
  "business_account_id" text REFERENCES "business_accounts"("id") ON DELETE SET NULL,
  "business_name" text,
  "pipeline_id" text NOT NULL,
  "stage_id" text NOT NULL,
  "stage_key" text NOT NULL,
  "owner_id" text,
  "owner_name" text,
  "source" text NOT NULL,
  "source_reference" text,
  "priority" text DEFAULT 'normal' NOT NULL,
  "estimated_value_paise" integer DEFAULT 0 NOT NULL,
  "currency" text DEFAULT 'INR' NOT NULL,
  "expected_quantity" text,
  "expected_frequency" text,
  "requested_price_tier" text,
  "requested_payment_terms" text,
  "requested_credit_limit_paise" integer DEFAULT 0,
  "requested_credit_period_days" integer DEFAULT 0,
  "delivery_postal_code" text,
  "checkout_reference" text,
  "pending_reason" text,
  "next_action" text,
  "next_follow_up_at" timestamp,
  "first_response_at" timestamp,
  "notes" text,
  "won_at" timestamp,
  "lost_at" timestamp,
  "lost_reason" text,
  "conversion_rule_applied" text,
  "linked_order_id" text,
  "accounting_sync_status" text DEFAULT 'pending',
  "accounting_last_synced_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);

CREATE INDEX IF NOT EXISTS "leads_contact_phone_idx" ON "leads" ("contact_phone");
CREATE INDEX IF NOT EXISTS "leads_stage_key_idx" ON "leads" ("stage_key");
CREATE INDEX IF NOT EXISTS "leads_owner_id_idx" ON "leads" ("owner_id");
CREATE INDEX IF NOT EXISTS "leads_business_model_idx" ON "leads" ("business_model");

CREATE TABLE IF NOT EXISTS "lead_items" (
  "id" text PRIMARY KEY NOT NULL,
  "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL,
  "product_name" text NOT NULL,
  "product_slug" text,
  "quantity" integer NOT NULL,
  "unit" text DEFAULT 'units' NOT NULL,
  "indicative_unit_price_paise" integer NOT NULL,
  "indicative_total_paise" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lead_activities" (
  "id" text PRIMARY KEY NOT NULL,
  "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "actor_id" text,
  "actor_name" text NOT NULL,
  "activity_type" text NOT NULL,
  "summary" text NOT NULL,
  "details" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lead_tasks" (
  "id" text PRIMARY KEY NOT NULL,
  "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "assigned_to_id" text,
  "assigned_to_name" text,
  "task_type" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "due_at" timestamp NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "completed_at" timestamp,
  "completed_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "quotes" (
  "id" text PRIMARY KEY NOT NULL,
  "quote_number" text UNIQUE NOT NULL,
  "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "version" integer DEFAULT 1 NOT NULL,
  "subtotal_paise" integer NOT NULL,
  "discount_paise" integer DEFAULT 0 NOT NULL,
  "tax_paise" integer DEFAULT 0 NOT NULL,
  "total_paise" integer NOT NULL,
  "payment_terms" text NOT NULL,
  "delivery_terms" text DEFAULT 'Door delivery via India Post Speed Post',
  "valid_until" timestamp NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "shared_via_whatsapp_at" timestamp,
  "notes" text,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "quote_items" (
  "id" text PRIMARY KEY NOT NULL,
  "quote_id" text NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL,
  "product_name" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit" text DEFAULT 'units' NOT NULL,
  "unit_price_paise" integer NOT NULL,
  "total_paise" integer NOT NULL,
  "discount_percent" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lead_order_links" (
  "id" text PRIMARY KEY NOT NULL,
  "lead_id" text NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "order_id" text NOT NULL,
  "order_number" text NOT NULL,
  "business_model" text NOT NULL,
  "conversion_type" text NOT NULL,
  "total_paise" integer NOT NULL,
  "payment_status" text NOT NULL,
  "converted_by_id" text,
  "converted_by_name" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "credit_approvals" (
  "id" text PRIMARY KEY NOT NULL,
  "business_account_id" text NOT NULL REFERENCES "business_accounts"("id") ON DELETE CASCADE,
  "lead_id" text REFERENCES "leads"("id") ON DELETE SET NULL,
  "requested_credit_limit_paise" integer NOT NULL,
  "requested_period_days" integer NOT NULL,
  "approved_credit_limit_paise" integer NOT NULL,
  "approved_period_days" integer NOT NULL,
  "status" text NOT NULL,
  "decision_notes" text,
  "authorized_by_id" text NOT NULL,
  "authorized_by_name" text NOT NULL,
  "authorized_role" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "integration_links" (
  "id" text PRIMARY KEY NOT NULL,
  "entity_type" text NOT NULL,
  "internal_id" text NOT NULL,
  "provider" text DEFAULT 'zoho_books' NOT NULL,
  "external_customer_id" text,
  "external_invoice_id" text,
  "external_invoice_number" text,
  "invoice_status" text,
  "outstanding_balance_paise" integer DEFAULT 0,
  "last_synced_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "integration_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "job_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "entity_type" text NOT NULL,
  "provider" text DEFAULT 'zoho_books' NOT NULL,
  "payload" jsonb,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 3 NOT NULL,
  "last_error" text,
  "next_retry_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
