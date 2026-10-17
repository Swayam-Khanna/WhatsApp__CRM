import postgres from "postgres";

const connString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/postgres";

async function initializeDatabase() {
  console.log("🔌 Connecting to PostgreSQL...");
  const sql = postgres(connString, { ssl: "prefer" });

  try {
    console.log("📦 Creating enum types...");
    await sql`DO $$ BEGIN CREATE TYPE app_role AS ENUM ('customer', 'farmer', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$;`;
    await sql`DO $$ BEGIN CREATE TYPE doc_status AS ENUM ('pending', 'verified', 'rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;`;
    await sql`DO $$ BEGIN CREATE TYPE farmer_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'suspended'); EXCEPTION WHEN duplicate_object THEN null; END $$;`;
    await sql`DO $$ BEGIN CREATE TYPE payout_status AS ENUM ('scheduled', 'processing', 'paid', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;`;
    await sql`DO $$ BEGIN CREATE TYPE product_status AS ENUM ('draft', 'pending', 'published', 'rejected', 'archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;`;
    await sql`DO $$ BEGIN CREATE TYPE coupon_type AS ENUM ('amount_off', 'percent_off', 'free_shipping', 'sale_price', 'bogo'); EXCEPTION WHEN duplicate_object THEN null; END $$;`;
    await sql`DO $$ BEGIN CREATE TYPE coupon_apply_to AS ENUM ('entire_order', 'specific_category', 'specific_items'); EXCEPTION WHEN duplicate_object THEN null; END $$;`;

    console.log("🏗️ Creating tables...");
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        full_name TEXT,
        email TEXT,
        phone TEXT,
        avatar_url TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        postal_code TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        line1 TEXT NOT NULL,
        line2 TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        country TEXT DEFAULT 'India' NOT NULL,
        phone TEXT,
        label TEXT DEFAULT 'Home' NOT NULL,
        is_default BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        role app_role DEFAULT 'customer' NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS farmer_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        farm_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        slug TEXT UNIQUE,
        status farmer_status DEFAULT 'draft' NOT NULL,
        state TEXT NOT NULL,
        district TEXT,
        village TEXT NOT NULL,
        pincode TEXT,
        crops TEXT[],
        farming_method TEXT,
        farm_size_acres DOUBLE PRECISION,
        years_farming INTEGER,
        story TEXT,
        portrait_url TEXT,
        cover_image_url TEXT,
        pan_number TEXT,
        aadhaar_last4 TEXT,
        upi_id TEXT,
        bank_account_name TEXT,
        bank_account_number TEXT,
        bank_name TEXT,
        bank_ifsc TEXT,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        kishan_pehchan_patra TEXT,
        total_land_area TEXT,
        area_unit TEXT,
        cultivated_area TEXT,
        khasra_numbers TEXT,
        cultivator_type TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS farmer_products (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id),
        farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        price DOUBLE PRECISION NOT NULL,
        compare_at_price DOUBLE PRECISION,
        category TEXT NOT NULL,
        stock INTEGER DEFAULT 0 NOT NULL,
        unit TEXT DEFAULT 'kg' NOT NULL,
        weight_grams INTEGER,
        images TEXT[],
        featured BOOLEAN DEFAULT false NOT NULL,
        status product_status DEFAULT 'draft' NOT NULL,
        hsn_code TEXT,
        gst_applicable BOOLEAN DEFAULT true NOT NULL,
        gst_rate DOUBLE PRECISION DEFAULT 5 NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        product_slug TEXT NOT NULL REFERENCES farmer_products(slug) ON DELETE CASCADE,
        rating INTEGER NOT NULL,
        title TEXT,
        body TEXT,
        images TEXT[],
        status TEXT DEFAULT 'pending' NOT NULL,
        order_id TEXT,
        verified BOOLEAN DEFAULT false NOT NULL,
        admin_reply_text TEXT,
        admin_reply_at TIMESTAMPTZ,
        admin_reply_by TEXT,
        moderated_at TIMESTAMPTZ,
        moderated_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        product_slug TEXT NOT NULL REFERENCES farmer_products(slug) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS recently_viewed (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        product_slug TEXT NOT NULL REFERENCES farmer_products(slug) ON DELETE CASCADE,
        viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        brand TEXT NOT NULL,
        exp_month INTEGER NOT NULL,
        exp_year INTEGER NOT NULL,
        last4 TEXT NOT NULL,
        nickname TEXT,
        is_default BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS farmer_documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
        doc_type TEXT NOT NULL,
        file_url TEXT NOT NULL,
        label TEXT,
        notes TEXT,
        status doc_status DEFAULT 'pending' NOT NULL,
        verified_at TIMESTAMPTZ,
        verified_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS farmer_payouts (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL REFERENCES farmer_profiles(id) ON DELETE CASCADE,
        gross_amount DOUBLE PRECISION NOT NULL,
        fees DOUBLE PRECISION DEFAULT 0 NOT NULL,
        net_amount DOUBLE PRECISION NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        status payout_status DEFAULT 'scheduled' NOT NULL,
        reference TEXT,
        settled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
        newsletter BOOLEAN DEFAULT true NOT NULL,
        order_updates_email BOOLEAN DEFAULT true NOT NULL,
        order_updates_sms BOOLEAN DEFAULT true NOT NULL,
        promotions_email BOOLEAN DEFAULT true NOT NULL,
        promotions_sms BOOLEAN DEFAULT true NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        value DOUBLE PRECISION,
        buy_qty INTEGER,
        get_qty INTEGER,
        apply_to TEXT NOT NULL DEFAULT 'entire_order',
        category_id TEXT,
        item_ids TEXT[],
        apply_once_per_order BOOLEAN DEFAULT false NOT NULL,
        include_subscriptions BOOLEAN DEFAULT true NOT NULL,
        start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
        end_date TIMESTAMPTZ,
        total_use_limit INTEGER,
        per_customer_limit INTEGER,
        times_used INTEGER DEFAULT 0 NOT NULL,
        tags TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id TEXT PRIMARY KEY,
        coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
        customer_id TEXT NOT NULL,
        order_id TEXT,
        redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    console.log("✅ All tables initialized successfully in PostgreSQL!");
    console.log("Tables:", tables.map(t => t.table_name).join(", "));
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

initializeDatabase();
