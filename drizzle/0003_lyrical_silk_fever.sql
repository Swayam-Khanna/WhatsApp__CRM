CREATE TABLE "product_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"variant_name" text DEFAULT 'standard' NOT NULL,
	"stock_grams" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold_grams" integer DEFAULT 1000 NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"sold_count" integer DEFAULT 0 NOT NULL,
	"pledged_count" integer DEFAULT 0 NOT NULL,
	"preorder_enabled" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_inventory_stock_grams_check" CHECK ("product_inventory"."stock_grams" >= 0),
	CONSTRAINT "product_inventory_low_stock_threshold_check" CHECK ("product_inventory"."low_stock_threshold_grams" >= 0),
	CONSTRAINT "product_inventory_quantity_check" CHECK ("product_inventory"."quantity" >= 0),
	CONSTRAINT "product_inventory_sold_count_check" CHECK ("product_inventory"."sold_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"variant_name" text NOT NULL,
	"sku" text,
	"weight_grams" integer NOT NULL,
	"price_paise" integer NOT NULL,
	"compare_at_price_paise" integer,
	"stock_units" integer DEFAULT 0 NOT NULL,
	"stock_grams" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold_grams" integer DEFAULT 1000 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variants_weight_grams_check" CHECK ("product_variants"."weight_grams" > 0),
	CONSTRAINT "product_variants_price_paise_check" CHECK ("product_variants"."price_paise" >= 0),
	CONSTRAINT "product_variants_stock_units_check" CHECK ("product_variants"."stock_units" >= 0),
	CONSTRAINT "product_variants_stock_grams_check" CHECK ("product_variants"."stock_grams" >= 0),
	CONSTRAINT "product_variants_low_stock_threshold_check" CHECK ("product_variants"."low_stock_threshold_grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_history" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_history_grams_check" CHECK ("stock_history"."grams" >= 0),
	CONSTRAINT "stock_history_stock_before_check" CHECK ("stock_history"."stock_before" >= 0),
	CONSTRAINT "stock_history_stock_after_check" CHECK ("stock_history"."stock_after" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificate_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"certificate_id" text NOT NULL,
	"certificate_number" text,
	"farmer_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_role" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"farmer_id" text NOT NULL,
	"farmer_name" text NOT NULL,
	"farm_name" text NOT NULL,
	"last_message_text" text,
	"last_message_at" timestamp with time zone,
	"last_message_sender" text,
	"unread_by_farmer" integer DEFAULT 0 NOT NULL,
	"unread_by_admin" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_unread_farmer_check" CHECK ("conversations"."unread_by_farmer" >= 0),
	CONSTRAINT "conversations_unread_admin_check" CHECK ("conversations"."unread_by_admin" >= 0)
);
--> statement-breakpoint
CREATE TABLE "farmer_certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"farmer_id" text NOT NULL,
	"farmer_name" text NOT NULL,
	"farm_name" text NOT NULL,
	"village" text,
	"state" text,
	"farmer_slug" text,
	"certificate_number" text NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'PRAJNAA_VERIFIED' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"issued_by" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"verification_notes" text,
	"verification_url" text,
	"qr_code_data_url" text,
	"show_on_profile" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farmer_certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "last_mile_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"weight_upto_gm" integer NOT NULL,
	"delivery_office_paise" integer NOT NULL,
	"parcel_hub_paise" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "last_mile_rates_weight_check" CHECK ("last_mile_rates"."weight_upto_gm" > 0),
	CONSTRAINT "last_mile_rates_delivery_office_check" CHECK ("last_mile_rates"."delivery_office_paise" >= 0),
	CONSTRAINT "last_mile_rates_parcel_hub_check" CHECK ("last_mile_rates"."parcel_hub_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"farmer_id" text NOT NULL,
	"sender_type" text NOT NULL,
	"sender_id" text NOT NULL,
	"sender_name" text NOT NULL,
	"department_tag" text,
	"text" text NOT NULL,
	"attachments" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_sender_type_check" CHECK ("messages"."sender_type" IN ('farmer', 'admin', 'customer'))
);
--> statement-breakpoint
CREATE TABLE "pincode_zones" (
	"pincode_prefix" text PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"zone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pincode_zones_valid_zone_check" CHECK ("pincode_zones"."zone" IN ('local', 'within_state', 'zone_metro', 'other_states'))
);
--> statement-breakpoint
CREATE TABLE "shipping_slabs" (
	"id" text PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"weight_upto_gm" integer NOT NULL,
	"local_paise" integer NOT NULL,
	"within_state_paise" integer NOT NULL,
	"zone_metro_paise" integer NOT NULL,
	"other_states_paise" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_slabs_weight_check" CHECK ("shipping_slabs"."weight_upto_gm" > 0),
	CONSTRAINT "shipping_slabs_local_check" CHECK ("shipping_slabs"."local_paise" >= 0),
	CONSTRAINT "shipping_slabs_within_state_check" CHECK ("shipping_slabs"."within_state_paise" >= 0),
	CONSTRAINT "shipping_slabs_zone_metro_check" CHECK ("shipping_slabs"."zone_metro_paise" >= 0),
	CONSTRAINT "shipping_slabs_other_states_check" CHECK ("shipping_slabs"."other_states_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "system_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_shipments" ALTER COLUMN "estimated_delivery" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_shipments" ALTER COLUMN "shipped_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_shipments" ALTER COLUMN "shipped_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_shipments" ALTER COLUMN "delivered_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_shipments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_shipments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_shipments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_shipments" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_status_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_status_logs" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "cancelled_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "delivered_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ALTER COLUMN "processed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ALTER COLUMN "processed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "file_uploads" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "file_uploads" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_product_id_farmer_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."farmer_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_farmer_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."farmer_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_product_id_farmer_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."farmer_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_audit_logs" ADD CONSTRAINT "certificate_audit_logs_farmer_id_farmer_profiles_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_farmer_id_farmer_profiles_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_certificates" ADD CONSTRAINT "farmer_certificates_farmer_id_farmer_profiles_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_farmer_id_farmer_profiles_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_notifications" ADD CONSTRAINT "system_notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_inventory_product_id_idx" ON "product_inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_inventory_prod_variant_idx" ON "product_inventory" USING btree ("product_id","variant_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_history_product_id_idx" ON "stock_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_history_order_id_idx" ON "stock_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "stock_history_created_at_idx" ON "stock_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cert_audit_logs_cert_id_idx" ON "certificate_audit_logs" USING btree ("certificate_id");--> statement-breakpoint
CREATE INDEX "cert_audit_logs_farmer_id_idx" ON "certificate_audit_logs" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "conversations_farmer_id_idx" ON "conversations" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "farmer_certificates_farmer_id_idx" ON "farmer_certificates" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "farmer_certificates_status_idx" ON "farmer_certificates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_farmer_id_idx" ON "messages" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "shipping_slabs_service_weight_idx" ON "shipping_slabs" USING btree ("service","weight_upto_gm");--> statement-breakpoint
CREATE INDEX "system_notifications_user_id_idx" ON "system_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "system_notifications_read_created_idx" ON "system_notifications" USING btree ("read","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_shipments_order_id_idx" ON "order_shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_logs_order_id_idx" ON "order_status_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "file_uploads_user_id_idx" ON "file_uploads" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unit_price_check" CHECK ("order_items"."unit_price_paise" >= 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_total_paise_check" CHECK ("order_items"."total_paise" >= 0);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_gst_paise_check" CHECK ("order_items"."gst_paise" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_subtotal_paise_check" CHECK ("orders"."subtotal_paise" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tax_paise_check" CHECK ("orders"."tax_paise" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shipping_paise_check" CHECK ("orders"."shipping_paise" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_paise_check" CHECK ("orders"."discount_paise" >= 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_paise_check" CHECK ("orders"."total_paise" >= 0);