CREATE TYPE "public"."app_role" AS ENUM('customer', 'farmer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."coupon_apply_to" AS ENUM('entire_order', 'specific_category', 'specific_items');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('amount_off', 'percent_off', 'free_shipping', 'sale_price', 'bogo');--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."farmer_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('scheduled', 'processing', 'paid', 'failed');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'pending', 'published', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('add', 'remove', 'set', 'sale', 'refund');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"country" text DEFAULT 'India' NOT NULL,
	"phone" text,
	"label" text DEFAULT 'Home' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"order_id" text,
	"redeemed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"value" double precision,
	"buy_qty" integer,
	"get_qty" integer,
	"apply_to" text DEFAULT 'entire_order' NOT NULL,
	"category_id" text,
	"item_ids" text[],
	"apply_once_per_order" boolean DEFAULT false NOT NULL,
	"include_subscriptions" boolean DEFAULT true NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"total_use_limit" integer,
	"per_customer_limit" integer,
	"times_used" integer DEFAULT 0 NOT NULL,
	"tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "farmer_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"farmer_id" text NOT NULL,
	"doc_type" text NOT NULL,
	"file_url" text NOT NULL,
	"label" text,
	"notes" text,
	"status" "doc_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp,
	"verified_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmer_payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"farmer_id" text NOT NULL,
	"gross_amount" double precision NOT NULL,
	"fees" double precision DEFAULT 0 NOT NULL,
	"net_amount" double precision NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"status" "payout_status" DEFAULT 'scheduled' NOT NULL,
	"reference" text,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farmer_products" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"farmer_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price" double precision NOT NULL,
	"compare_at_price" double precision,
	"category" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"stock_grams" integer DEFAULT 0 NOT NULL,
	"price_per_kg" double precision,
	"low_stock_threshold_grams" integer DEFAULT 1000 NOT NULL,
	"unit" text DEFAULT 'kg' NOT NULL,
	"weight_grams" integer,
	"images" text[],
	"featured" boolean DEFAULT false NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"hsn_code" text,
	"gst_applicable" boolean DEFAULT true NOT NULL,
	"gst_rate" double precision DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "farmer_products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "farmer_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"farm_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"slug" text,
	"status" "farmer_status" DEFAULT 'draft' NOT NULL,
	"state" text NOT NULL,
	"district" text,
	"village" text NOT NULL,
	"pincode" text,
	"crops" text[],
	"farming_method" text,
	"farm_size_acres" double precision,
	"years_farming" integer,
	"story" text,
	"portrait_url" text,
	"cover_image_url" text,
	"pan_number" text,
	"aadhaar_last4" text,
	"upi_id" text,
	"bank_account_name" text,
	"bank_account_number" text,
	"bank_name" text,
	"bank_ifsc" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"kishan_pehchan_patra" text,
	"total_land_area" text,
	"area_unit" text,
	"cultivated_area" text,
	"khasra_numbers" text,
	"cultivator_type" text,
	"land_ledger" jsonb,
	"trust_certificates" jsonb,
	"trust_checks" jsonb,
	"trust_application_status" text DEFAULT 'none',
	CONSTRAINT "farmer_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"newsletter" boolean DEFAULT true NOT NULL,
	"order_updates_email" boolean DEFAULT true NOT NULL,
	"order_updates_sms" boolean DEFAULT true NOT NULL,
	"promotions_email" boolean DEFAULT true NOT NULL,
	"promotions_sms" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"brand" text NOT NULL,
	"exp_month" integer NOT NULL,
	"exp_year" integer NOT NULL,
	"last4" text NOT NULL,
	"nickname" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_slug" text NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"body" text,
	"images" text[],
	"status" text DEFAULT 'pending' NOT NULL,
	"order_id" text,
	"verified" boolean DEFAULT false NOT NULL,
	"admin_reply_text" text,
	"admin_reply_at" timestamp,
	"admin_reply_by" text,
	"moderated_at" timestamp,
	"moderated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text,
	"email" text,
	"phone" text,
	"avatar_url" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recently_viewed" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_slug" text NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"type" text NOT NULL,
	"grams" integer NOT NULL,
	"stock_before" integer NOT NULL,
	"stock_after" integer NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"admin_id" text,
	"order_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" "app_role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_documents" ADD CONSTRAINT "farmer_documents_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_documents" ADD CONSTRAINT "farmer_documents_farmer_id_farmer_profiles_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_payouts" ADD CONSTRAINT "farmer_payouts_farmer_id_farmer_profiles_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_products" ADD CONSTRAINT "farmer_products_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_products" ADD CONSTRAINT "farmer_products_farmer_id_farmer_profiles_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farmer_profiles" ADD CONSTRAINT "farmer_profiles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_slug_farmer_products_slug_fk" FOREIGN KEY ("product_slug") REFERENCES "public"."farmer_products"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recently_viewed" ADD CONSTRAINT "recently_viewed_product_slug_farmer_products_slug_fk" FOREIGN KEY ("product_slug") REFERENCES "public"."farmer_products"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_slug_farmer_products_slug_fk" FOREIGN KEY ("product_slug") REFERENCES "public"."farmer_products"("slug") ON DELETE cascade ON UPDATE no action;