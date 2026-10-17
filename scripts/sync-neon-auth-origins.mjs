/**
 * scripts/sync-neon-auth-origins.mjs
 *
 * Ensures neon_auth.project_config includes wildcard and production Vercel domains,
 * preventing Better Auth from rejecting valid frontend requests with HTTP 403 "Invalid origin"
 * or HTTP 403 "Invalid callbackURL".
 */

import { db } from "../backend/db.ts";
import { sql } from "drizzle-orm";

export async function syncNeonAuthOrigins() {
  const current = await db.execute(
    sql`SELECT trusted_origins FROM neon_auth.project_config LIMIT 1;`
  );

  const row = current.rows?.[0] || current[0];
  if (!row) {
    console.log("[sync-neon-auth-origins] No neon_auth.project_config row found. Skipping.");
    return;
  }

  let origins = [];
  try {
    origins =
      typeof row.trusted_origins === "string"
        ? JSON.parse(row.trusted_origins)
        : row.trusted_origins || [];
  } catch {
    origins = [];
  }

  const requiredDomains = [
    "https://*.vercel.app",
    "https://prajnaa-farm.vercel.app",
    "https://prajnaa-farm-8zam.vercel.app",
    "https://market.prajnaa.in",
    "https://*.market.prajnaa.in",
  ];

  let changed = false;
  for (const domain of requiredDomains) {
    if (!origins.some((o) => o?.domain === domain)) {
      origins.push({ domain });
      changed = true;
    }
  }

  if (changed) {
    const originsJson = JSON.stringify(origins);
    await db.execute(
      sql`UPDATE neon_auth.project_config SET trusted_origins = ${originsJson}::jsonb, updated_at = NOW();`
    );
    console.log("[sync-neon-auth-origins] Successfully synced trusted origins:", origins);
  } else {
    console.log("[sync-neon-auth-origins] All required trusted origins already configured.");
  }
}

if (process.argv[1]?.endsWith("sync-neon-auth-origins.mjs")) {
  syncNeonAuthOrigins()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[sync-neon-auth-origins] Error:", err);
      process.exit(1);
    });
}
