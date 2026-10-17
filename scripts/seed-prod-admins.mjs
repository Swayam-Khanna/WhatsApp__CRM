import postgres from "postgres";
import crypto from "crypto";
import { hashPassword } from "@better-auth/utils/password";

const prodUrl = "postgresql://neondb_owner:npg_jKvq1zyZ5usQ@ep-snowy-fog-b3wop5vp.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = postgres(prodUrl, { ssl: "require", max: 1 });

async function seedProdAdmins() {
  console.log("=== Seeding Admin Users into Production (ep-snowy-fog-b3wop5vp) ===");

  try {
    // 1. Ensure public.profiles has neon_auth_user_id column
    console.log("1. Checking and updating schema on public.profiles...");
    await sql`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS neon_auth_user_id text;
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_neon_auth_user_id_idx 
      ON public.profiles(neon_auth_user_id) 
      WHERE neon_auth_user_id IS NOT NULL;
    `;

    // 2. Inspect neon_auth tables
    const userCols = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'neon_auth' AND table_name = 'user'
    `;
    console.log("neon_auth.user columns:", userCols.map(c => c.column_name));

    const admins = [
      {
        email: "khannaswayam1@gmail.com",
        name: "Swayam Khanna",
        profileId: "fI2iZKDI6SWmIpfHgu1xfLpYPLA3",
      },
      {
        email: "aimnishant@zohomail.in",
        name: "Nishant",
        profileId: "IKrQe9EKQJZGkppuBe7k2X3tbi62",
        password: "123123123",
      },
      {
        email: "nishantsharmasolan@gmail.com",
        name: "Nishant Sharma",
        profileId: "usr_80ebbb251f384de086e5f937",
        password: "123123123",
      },
      {
        email: "tanujpmk@gmail.com",
        name: "Tanuj",
        profileId: "SL0na7KE0aeBXO8xPT1SyOkBpFV2",
      },
    ];

    for (const adm of admins) {
      console.log(`\nProcessing admin: ${adm.email}...`);

      // Check if user already exists in neon_auth.user
      const existingAuthUsers = await sql`
        SELECT id FROM neon_auth.user WHERE LOWER(email) = LOWER(${adm.email}) LIMIT 1
      `;

      let neonAuthId = existingAuthUsers[0]?.id;
      const now = new Date();

      if (!neonAuthId) {
        neonAuthId = crypto.randomUUID();
        await sql`
          INSERT INTO neon_auth.user (
            id, name, email, "emailVerified", "createdAt", "updatedAt"
          ) VALUES (
            ${neonAuthId}, ${adm.name}, ${adm.email}, true, ${now}, ${now}
          )
        `;
        console.log(`- Created neon_auth.user (ID: ${neonAuthId})`);
      } else {
        await sql`
          UPDATE neon_auth.user 
          SET "emailVerified" = true, name = COALESCE(name, ${adm.name}), "updatedAt" = ${now}
          WHERE id = ${neonAuthId}
        `;
        console.log(`- Updated existing neon_auth.user (ID: ${neonAuthId}) with emailVerified = true`);
      }

      // Check/create Google social account link in neon_auth.account
      const existingAccount = await sql`
        SELECT id FROM neon_auth.account 
        WHERE "userId" = ${neonAuthId} AND "providerId" = 'google'
      `;
      if (existingAccount.length === 0) {
        await sql`
          INSERT INTO neon_auth.account (
            id, "accountId", "providerId", "userId", "createdAt", "updatedAt"
          ) VALUES (
            ${crypto.randomUUID()}, ${adm.email}, 'google', ${neonAuthId}, ${now}, ${now}
          )
        `;
        console.log(`- Linked Google provider in neon_auth.account`);
      }

      // Check/create credential account link in neon_auth.account (for email/password sign-in)
      const existingCred = await sql`
        SELECT id FROM neon_auth.account 
        WHERE "userId" = ${neonAuthId} AND "providerId" = 'credential'
      `;
      if (adm.password) {
        const hashed = await hashPassword(adm.password);
        if (existingCred.length === 0) {
          await sql`
            INSERT INTO neon_auth.account (
              id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
            ) VALUES (
              ${crypto.randomUUID()}, ${neonAuthId}, 'credential', ${neonAuthId}, ${hashed}, ${now}, ${now}
            )
          `;
          console.log(`- Created credential account with scrypt password`);
        } else {
          await sql`
            UPDATE neon_auth.account
            SET password = ${hashed}, "updatedAt" = ${now}
            WHERE "userId" = ${neonAuthId} AND "providerId" = 'credential'
          `;
          console.log(`- Updated credential account password`);
        }
      }

      // Upsert public.profiles
      await sql`
        INSERT INTO public.profiles (
          id, email, full_name, neon_auth_user_id, created_at, updated_at
        ) VALUES (
          ${adm.profileId}, ${adm.email}, ${adm.name}, ${neonAuthId}, ${now}, ${now}
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          neon_auth_user_id = EXCLUDED.neon_auth_user_id,
          updated_at = EXCLUDED.updated_at
      `;
      console.log(`- Synced public.profiles (ID: ${adm.profileId}, neon_auth_user_id: ${neonAuthId})`);

      // Ensure admin role in public.user_roles
      const roleId = `role_${adm.profileId}_admin`;
      await sql`
        INSERT INTO public.user_roles (
          id, user_id, role, created_at
        ) VALUES (
          ${roleId}, ${adm.profileId}, 'admin', ${now}
        )
        ON CONFLICT (id) DO UPDATE SET
          role = 'admin'
      `;
      console.log(`- Confirmed admin role in public.user_roles (Role ID: ${roleId})`);
    }

    // 3. Ensure trusted origins in neon_auth.project_config
    const configRow = await sql`
      SELECT trusted_origins FROM neon_auth.project_config LIMIT 1
    `;
    if (configRow.length > 0) {
      let origins = [];
      try {
        origins = typeof configRow[0].trusted_origins === "string"
          ? JSON.parse(configRow[0].trusted_origins)
          : configRow[0].trusted_origins || [];
      } catch {}

      const requiredDomains = [
        "https://*.vercel.app",
        "https://prajnaa-farm.vercel.app",
        "https://prajnaa-farm-8zam.vercel.app",
        "https://market.prajnaa.in",
        "https://*.market.prajnaa.in",
      ];

      let changed = false;
      for (const d of requiredDomains) {
        if (!origins.some(o => o?.domain === d)) {
          origins.push({ domain: d });
          changed = true;
        }
      }

      if (changed) {
        await sql`
          UPDATE neon_auth.project_config 
          SET trusted_origins = ${JSON.stringify(origins)}::jsonb, updated_at = NOW()
        `;
        console.log("3. Synced trusted_origins in neon_auth.project_config");
      } else {
        console.log("3. Trusted origins already up to date.");
      }
    }

    console.log("\nSUCCESS: Both admin users (Swayam & Nishant) seeded into Production Better Auth!");
  } catch (err) {
    console.error("FATAL Error:", err);
  } finally {
    await sql.end();
  }
}

seedProdAdmins();
