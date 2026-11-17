import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

export const isPostgresConfigured = Boolean(
  (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) ||
  (process.env.NEON_TEST_BRANCH_URL && process.env.NEON_TEST_BRANCH_URL.trim().length > 0)
);

const rawConnectionString =
  process.env.NEON_TEST_BRANCH_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/prajna";

function createPostgresClient(): postgres.Sql {
  let validUrl = "postgresql://postgres:postgres@localhost:5432/prajna";
  
  if (rawConnectionString && typeof rawConnectionString === "string" && rawConnectionString.trim().length > 0) {
    try {
      const parsed = new URL(rawConnectionString);
      const isProductionAllowed = process.env.ALLOW_PRODUCTION_DB === "true" || Boolean(process.env.VERCEL);
      const prodHostPattern = process.env.PRODUCTION_DB_HOST || "ep-snowy-fog";
      if (!isProductionAllowed && parsed.hostname.includes(prodHostPattern)) {
        throw new Error("[SAFETY GUARD] Connection refused: connecting to production database requires ALLOW_PRODUCTION_DB=true.");
      }
      if (parsed.protocol.startsWith("postgres")) {
        validUrl = rawConnectionString;
      }
    } catch (err: any) {
      if (err.message?.includes("[SAFETY GUARD]")) {
        console.error(err.message);
        throw err;
      }
      // If DATABASE_URL is not a valid URL (e.g. during build time or invalid env), fallback safely
      console.warn("[Backend DB] Warning: Invalid or unparseable DATABASE_URL provided. Falling back to local placeholder.");
    }
  }

  try {
    const isSsl = validUrl.includes("ssl") || validUrl.includes("66.116.253.180") || process.env.DATABASE_SSL === "true";
    return postgres(validUrl, {
      max: process.env.NODE_ENV === "production" ? 10 : 5,
      idle_timeout: 15,
      connect_timeout: 2,
      ssl: isSsl ? "prefer" : undefined,
    });
  } catch (e: any) {
    console.warn("[Backend DB] Failed to initialize postgres client:", e.message);
    return postgres("postgresql://postgres:postgres@localhost:5432/prajna", { max: 1, connect_timeout: 1 });
  }
}

// Guard against multiple connections in dev HMR
declare global {
  var postgresClientGlobal: undefined | postgres.Sql;
  var crmTablesEnsured: undefined | boolean;
}

export const client =
  globalThis.postgresClientGlobal ?? createPostgresClient();

// Cache on globalThis in all environments to prevent connection pool leaks
globalThis.postgresClientGlobal = client;

export const db = drizzle(client, { schema });

// Circuit Breaker for PostgreSQL resilience & performance
let lastPgFailure = 0;

export function isPostgresAvailable(): boolean {
  if (!isPostgresConfigured) return false;
  if (Date.now() - lastPgFailure < 30000) {
    return false;
  }
  return true;
}

export function reportPostgresFailure(err?: any) {
  lastPgFailure = Date.now();
  if (err?.message) {
    console.warn("[PostgreSQL] Circuit breaker activated (30s):", err.message);
  }
}

export function reportPostgresSuccess() {
  lastPgFailure = 0;
}

// Asynchronously ensure CRM tables exist on startup if PostgreSQL is connected
if (isPostgresConfigured && !globalThis.crmTablesEnsured) {
  globalThis.crmTablesEnsured = true;
  Promise.resolve().then(async () => {
    try {
      await client.unsafe(`
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
      `);
      reportPostgresSuccess();
    } catch (e: any) {
      reportPostgresFailure(e);
    }
  });
}
