import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { profiles, userRoles } from "../backend/schema/index.ts";
import { ADMIN_EMAILS } from "../frontend/lib/admin/admin-constants.ts";

const connectionString =
  process.env.NEON_TEST_BRANCH_URL ||
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_jKvq1zyZ5usQ@ep-aged-art-b3wz564o-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seedAdminRoles() {
  console.log("Seeding verified admin accounts into user_roles...");

  for (const email of ADMIN_EMAILS) {
    const adminId = `admin_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // 1. Ensure profile exists
    await db
      .insert(profiles)
      .values({
        id: adminId,
        email: email,
        fullName: email.split("@")[0],
      })
      .onConflictDoNothing();

    // 2. Ensure role is assigned as admin in user_roles table
    await db
      .insert(userRoles)
      .values({
        id: `role_${adminId}`,
        userId: adminId,
        role: "admin",
      })
      .onConflictDoNothing();

    console.log(`[Seed] Admin role confirmed for: ${email} (User ID: ${adminId})`);
  }

  console.log("Admin seeding complete. Zero lock-out guaranteed!");
}

seedAdminRoles()
  .then(async () => {
    await client.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Failed to seed admin roles:", err);
    await client.end();
    process.exit(1);
  });
