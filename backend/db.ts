import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

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
      max: process.env.NODE_ENV === "production" ? 20 : 5,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: isSsl ? "prefer" : undefined,
    });
  } catch (e: any) {
    console.warn("[Backend DB] Failed to initialize postgres client:", e.message);
    return postgres("postgresql://postgres:postgres@localhost:5432/prajna", { max: 1 });
  }
}

// Guard against multiple connections in dev HMR
declare global {
  var postgresClientGlobal: undefined | postgres.Sql;
}

const client =
  globalThis.postgresClientGlobal ?? createPostgresClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.postgresClientGlobal = client;
}

export { client };
export const db = drizzle(client, { schema });
