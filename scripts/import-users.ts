/**
 * Firebase Auth to DEV Neon PostgreSQL Users Importer
 *
 * Copies Firebase Auth users into Better Auth (`user`, `account`),
 * `profiles`, and `user_roles` tables in the DEV Neon branch.
 *
 * Safeguards:
 * - NEVER reads or writes production Neon (strictly rejects ep-snowy-fog-b3wop5vp).
 * - Defaults to --dry-run (no writes performed).
 * - Only performs database writes when --execute is explicitly passed.
 * - Zero PII printed: All emails, names, and phone numbers are completely masked or omitted from terminal output.
 * - Re-runnable: Idempotent upserts by user ID without duplicate rows.
 *
 * Usage:
 *   npx tsx scripts/import-users.ts            # Dry run (safe, default)
 *   npx tsx scripts/import-users.ts --execute  # Execute import into DEV Neon
 */

import postgres from "postgres";
import dotenv from "dotenv";
import { getAuth } from "firebase-admin/auth";
import { adminApp, adminDb } from "../frontend/lib/firebase-admin.ts";
import { ADMIN_EMAILS } from "../frontend/lib/admin/admin-constants.ts";

dotenv.config({ path: ".env" });

// 1. Connection URL verification and production safeguard
const devDbUrl = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;

if (!devDbUrl) {
  console.error("FATAL: DATABASE_URL or NEON_TEST_BRANCH_URL is not set.");
  process.exit(1);
}

// Strict production guard: Never allow production Neon host
if (devDbUrl.includes("ep-snowy-fog-b3wop5vp")) {
  console.error("\n==================================================================");
  console.error("FATAL BLOCKED: Database connection points to PRODUCTION Neon!");
  console.error("Endpoint: ep-snowy-fog-b3wop5vp");
  console.error("This script is strictly barred from modifying production data.");
  console.error("==================================================================\n");
  process.exit(1);
}

const isExecute = process.argv.includes("--execute");
const isDryRun = !isExecute;

const sql = postgres(devDbUrl, { ssl: "require", max: 5 });

interface UserImportRecord {
  uid: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  role: "admin" | "farmer" | "customer";
  providers: Array<{
    id: string;
    accountId: string;
    providerId: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to mask identifier for safe logging without PII
function maskUid(uid: string): string {
  if (uid.length <= 8) return "***";
  return `${uid.slice(0, 4)}...${uid.slice(-4)}`;
}

async function run() {
  console.log("==================================================================");
  console.log("       FIREBASE AUTH TO BETTER AUTH / DEV NEON USERS IMPORTER     ");
  console.log("==================================================================");
  console.log(`Mode: ${isExecute ? ">>> EXECUTE MODE (Writing to DEV Neon) <<<" : "--- DRY-RUN MODE (Safe, Read-Only Analysis) ---"}`);
  console.log(`Target Branch: DEV Neon (${devDbUrl.split("@")[1]?.split("/")[0] || "dev"})`);
  console.log("==================================================================\n");

  try {
    // 2. Fetch existing roles from Firestore user_roles collection
    console.log("Reading existing roles from Firestore user_roles collection...");
    const firestoreRoleMap = new Map<string, "admin" | "farmer" | "customer">();
    if (adminDb) {
      try {
        const rolesSnap = await adminDb.collection("user_roles").get();
        for (const doc of rolesSnap.docs) {
          const data = doc.data();
          const targetUserId = data.user_id || doc.id.replace("admin_", "");
          const r = String(data.role || "").toLowerCase();
          if (r === "admin" || r === "farmer" || r === "customer") {
            firestoreRoleMap.set(targetUserId, r as any);
          }
        }
        console.log(`Found ${firestoreRoleMap.size} role mappings in Firestore.\n`);
      } catch (err: any) {
        console.warn("[Warning] Could not read Firestore user_roles:", err.message);
      }
    }

    // 3. Fetch all Firebase Auth users
    console.log("Retrieving Firebase Auth user accounts...");
    const firebaseAuth = getAuth(adminApp);
    const listResult = await firebaseAuth.listUsers(1000);
    const rawUsers = listResult.users;
    console.log(`Retrieved ${rawUsers.length} Firebase Auth user records.\n`);

    const parsedUsers: UserImportRecord[] = [];

    for (const u of rawUsers) {
      const email = u.email || `${u.uid}@migrated.prajnaafarm.com`;
      const name = u.displayName || email.split("@")[0] || "Valued Customer";
      const emailVerified = Boolean(u.emailVerified);
      const image = u.photoURL || null;
      const phone = u.phoneNumber || null;
      const createdAt = u.metadata.creationTime ? new Date(u.metadata.creationTime) : new Date();
      const updatedAt = new Date();

      // Determine role:
      // Priority 1: ADMIN_EMAILS whitelist
      // Priority 2: Firestore user_roles collection
      // Priority 3: Default "customer"
      let role: "admin" | "farmer" | "customer" = "customer";
      if (u.email && ADMIN_EMAILS.has(u.email.toLowerCase().trim())) {
        role = "admin";
      } else if (firestoreRoleMap.has(u.uid)) {
        role = firestoreRoleMap.get(u.uid)!;
      }

      // Map Auth Providers to Better Auth account rows
      const providers: Array<{ id: string; accountId: string; providerId: string }> = [];

      if (u.providerData && u.providerData.length > 0) {
        for (const p of u.providerData) {
          const isGoogle = p.providerId.includes("google");
          const providerId = isGoogle ? "google" : "credential";
          const accountId = isGoogle ? p.uid || u.uid : u.uid;
          providers.push({
            id: `acc_${u.uid}_${providerId}`,
            accountId,
            providerId,
          });
        }
      } else {
        // Fallback: Default to credential account
        providers.push({
          id: `acc_${u.uid}_credential`,
          accountId: u.uid,
          providerId: "credential",
        });
      }

      parsedUsers.push({
        uid: u.uid,
        name,
        email,
        emailVerified,
        image,
        phone,
        role,
        providers,
        createdAt,
        updatedAt,
      });
    }

    // 4. Output Summary (NO PII)
    console.log("------------------------------------------------------------------");
    console.log("                     USERS IMPORT ANALYSIS                        ");
    console.log("------------------------------------------------------------------");
    console.log(`Total Firebase Auth Users Analyzed : ${parsedUsers.length}`);
    console.log(`Users with Email Verified          : ${parsedUsers.filter((u) => u.emailVerified).length}`);
    console.log(`Google OAuth Linked Accounts       : ${parsedUsers.filter((u) => u.providers.some((p) => p.providerId === "google")).length}`);
    console.log(`Email/Password Accounts            : ${parsedUsers.filter((u) => u.providers.some((p) => p.providerId === "credential")).length}`);
    console.log(`Roles Breakdown                    : Admin: ${parsedUsers.filter((u) => u.role === "admin").length} | Farmer: ${parsedUsers.filter((u) => u.role === "farmer").length} | Customer: ${parsedUsers.filter((u) => u.role === "customer").length}`);
    console.log("------------------------------------------------------------------");
    console.log("\nUser Records Anonymized Summary (No PII):");
    console.log("Masked UID".padEnd(18) + "Verified?".padEnd(12) + "Providers".padEnd(20) + "Role");
    console.log("".padEnd(65, "-"));
    for (const u of parsedUsers) {
      console.log(
        maskUid(u.uid).padEnd(18) +
        (u.emailVerified ? "✓ Yes" : "✗ No").padEnd(12) +
        u.providers.map((p) => p.providerId).join(", ").padEnd(20) +
        u.role
      );
    }
    console.log("".padEnd(65, "-"));

    if (isDryRun) {
      console.log("\n==================================================================");
      console.log("                    DRY-RUN COMPLETED                             ");
      console.log("No data was written to DEV Neon.");
      console.log("Zero PII was exposed.");
      console.log("To execute the user import into DEV Neon, run:");
      console.log("  npx tsx scripts/import-users.ts --execute");
      console.log("==================================================================\n");
    } else {
      console.log("\n==================================================================");
      console.log("           EXECUTING USER IMPORT INTO DEV NEON DATABASE           ");
      console.log("==================================================================");

      let userRowsCount = 0;
      let accountRowsCount = 0;
      let profileRowsCount = 0;
      let roleRowsCount = 0;

      for (const u of parsedUsers) {
        // A. Upsert into Better Auth "user" table (SAME id, email, emailVerified)
        await sql`
          INSERT INTO "user" (
            id, name, email, email_verified, image, created_at, updated_at
          ) VALUES (
            ${u.uid}, ${u.name}, ${u.email}, ${u.emailVerified}, ${u.image}, ${u.createdAt}, ${u.updatedAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            email_verified = EXCLUDED.email_verified,
            image = EXCLUDED.image,
            updated_at = EXCLUDED.updated_at;
        `;
        userRowsCount++;

        // B. Upsert into Better Auth "account" table
        for (const prov of u.providers) {
          await sql`
            INSERT INTO account (
              id, account_id, provider_id, user_id, created_at, updated_at
            ) VALUES (
              ${prov.id}, ${prov.accountId}, ${prov.providerId}, ${u.uid}, ${u.createdAt}, ${u.updatedAt}
            )
            ON CONFLICT (id) DO UPDATE SET
              account_id = EXCLUDED.account_id,
              provider_id = EXCLUDED.provider_id,
              updated_at = EXCLUDED.updated_at;
          `;
          accountRowsCount++;
        }

        // C. Upsert into "profiles" table (SAME id)
        await sql`
          INSERT INTO profiles (
            id, full_name, email, phone, avatar_url, created_at, updated_at
          ) VALUES (
            ${u.uid}, ${u.name}, ${u.email}, ${u.phone}, ${u.image}, ${u.createdAt}, ${u.updatedAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = EXCLUDED.updated_at;
        `;
        profileRowsCount++;

        // D. Upsert into "user_roles" table
        const roleId = `role_${u.uid}`;
        await sql`
          INSERT INTO user_roles (
            id, user_id, role, created_at
          ) VALUES (
            ${roleId}, ${u.uid}, ${u.role}, ${u.createdAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            role = EXCLUDED.role;
        `;
        roleRowsCount++;
      }

      console.log("\n==================================================================");
      console.log("               USER IMPORT COMPLETED SUCCESSFULLY                 ");
      console.log("==================================================================");
      console.log(`Better Auth 'user' rows processed     : ${userRowsCount}`);
      console.log(`Better Auth 'account' rows processed  : ${accountRowsCount}`);
      console.log(`Application 'profiles' processed      : ${profileRowsCount}`);
      console.log(`Application 'user_roles' processed    : ${roleRowsCount}`);
      console.log("==================================================================\n");

      // Post-import Database Verification from DEV Neon
      console.log("==================================================================");
      console.log("            DEV NEON POST-IMPORT DATABASE VERIFICATION            ");
      console.log("==================================================================");
      const [uStats] = await sql`SELECT COUNT(*)::int AS count FROM "user"`;
      const [aStats] = await sql`SELECT COUNT(*)::int AS count FROM account`;
      const [pStats] = await sql`SELECT COUNT(*)::int AS count FROM profiles`;
      const [rStats] = await sql`SELECT COUNT(*)::int AS count FROM user_roles`;

      console.log(`Total 'user' in DB       : ${uStats.count}`);
      console.log(`Total 'account' in DB    : ${aStats.count}`);
      console.log(`Total 'profiles' in DB   : ${pStats.count}`);
      console.log(`Total 'user_roles' in DB : ${rStats.count}`);
      console.log("==================================================================\n");
    }
  } catch (err: any) {
    console.error("\nFATAL ERROR during user import:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
