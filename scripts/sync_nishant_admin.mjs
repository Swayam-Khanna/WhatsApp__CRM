import postgres from 'postgres';
import { hashPassword } from '@better-auth/utils/password';

const sqlDev = postgres('postgresql://neondb_owner:npg_jKvq1zyZ5usQ@ep-aged-art-b3wz564o.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
const sqlProd = postgres('postgresql://neondb_owner:npg_jKvq1zyZ5usQ@ep-snowy-fog-b3wop5vp.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function syncAdminUser(sql, dbName, { email, nameUser, legacyProfileId, neonAuthUserId, password }) {
  console.log(`\n  -> Syncing ${email} on ${dbName}...`);
  const hashedPassword = await hashPassword(password);

  // 1. Ensure neon_auth.user
  const [existingUser] = await sql`SELECT id FROM neon_auth.user WHERE lower(email) = ${email.toLowerCase()}`;
  if (!existingUser) {
    console.log(`     Inserting into neon_auth.user...`);
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${neonAuthUserId}::uuid, ${nameUser}, ${email}, true, 'admin', NOW(), NOW())
    `;
  } else {
    console.log(`     Updating neon_auth.user to role=admin, emailVerified=true...`);
    await sql`
      UPDATE neon_auth.user
      SET role = 'admin', "emailVerified" = true, name = ${nameUser}, "updatedAt" = NOW()
      WHERE lower(email) = ${email.toLowerCase()}
    `;
  }

  // 2. Ensure neon_auth.account has credential provider with valid Better Auth scrypt password
  const existingCredAcc = await sql`
    SELECT id FROM neon_auth.account 
    WHERE "userId"::text = ${neonAuthUserId} AND "providerId" = 'credential'
  `;
  if (existingCredAcc.length === 0) {
    console.log(`     Inserting credential account with scrypt password...`);
    await sql`
      INSERT INTO neon_auth.account (
        id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${neonAuthUserId}, 'credential', ${neonAuthUserId}::uuid, ${hashedPassword}, NOW(), NOW()
      )
    `;
  } else {
    console.log(`     Updating credential account password...`);
    await sql`
      UPDATE neon_auth.account
      SET password = ${hashedPassword}, "accountId" = ${neonAuthUserId}, "updatedAt" = NOW()
      WHERE "userId"::text = ${neonAuthUserId} AND "providerId" = 'credential'
    `;
  }

  // Also ensure Google provider account exists for @gmail.com users
  const existingGoogleAcc = await sql`
    SELECT id FROM neon_auth.account 
    WHERE "userId"::text = ${neonAuthUserId} AND "providerId" = 'google'
  `;
  if (existingGoogleAcc.length === 0) {
    console.log(`     Linking Google provider in neon_auth.account...`);
    await sql`
      INSERT INTO neon_auth.account (
        id, "accountId", "providerId", "userId", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), ${email}, 'google', ${neonAuthUserId}::uuid, NOW(), NOW()
      )
    `;
  } else {
    await sql`
      UPDATE neon_auth.account
      SET password = NULL, "updatedAt" = NOW()
      WHERE "userId"::text = ${neonAuthUserId} AND "providerId" = 'google'
    `;
  }

  // 3. Update public.profiles
  await sql`
    INSERT INTO public.profiles (
      id, email, full_name, neon_auth_user_id, created_at, updated_at
    ) VALUES (
      ${legacyProfileId}, ${email}, ${nameUser}, ${neonAuthUserId}::uuid, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = ${nameUser},
      email = ${email},
      neon_auth_user_id = ${neonAuthUserId}::uuid,
      updated_at = NOW()
  `;

  // 4. Ensure public.user_roles has role='admin'
  // Remove conflicting customer role if present
  await sql`
    DELETE FROM public.user_roles 
    WHERE user_id = ${legacyProfileId} AND role != 'admin'
  `;

  const [roleLegacy] = await sql`
    SELECT id FROM public.user_roles WHERE user_id = ${legacyProfileId} AND role = 'admin'
  `;
  if (!roleLegacy) {
    await sql`
      INSERT INTO public.user_roles (id, user_id, role, created_at)
      VALUES ('role_' || ${legacyProfileId} || '_admin', ${legacyProfileId}, 'admin', NOW())
      ON CONFLICT DO NOTHING
    `;
  }
}

async function syncDb(name, sql) {
  console.log(`\n=== SYNCING ${name} ===`);

  // Nishant Gmail
  await syncAdminUser(sql, name, {
    email: 'nishantsharmasolan@gmail.com',
    nameUser: 'Nishant Sharma',
    legacyProfileId: 'usr_80ebbb251f384de086e5f937',
    neonAuthUserId: 'c222551d-d552-48b2-b23e-bc6ea4e639da',
    password: '123123123',
  });

  // Nishant Zoho (also update to 123123123)
  await syncAdminUser(sql, name, {
    email: 'aimnishant@zohomail.in',
    nameUser: 'Nishant',
    legacyProfileId: 'IKrQe9EKQJZGkppuBe7k2X3tbi62',
    neonAuthUserId: 'bd35018f-f690-4d76-b861-ad3d07a2ddc1',
    password: '123123123',
  });

  // Update users_with_roles view
  await sql`DROP VIEW IF EXISTS public.users_with_roles CASCADE;`;
  await sql`
    CREATE VIEW public.users_with_roles AS
    SELECT
      p.id AS profile_id,
      p.full_name,
      p.email,
      COALESCE(r.role::text, u.role::text, 'customer') AS role,
      u."emailVerified",
      p.neon_auth_user_id,
      r.created_at AS role_assigned_at
    FROM public.profiles p
    LEFT JOIN public.user_roles r ON p.id = r.user_id
    LEFT JOIN neon_auth.user u ON p.neon_auth_user_id::text = u.id::text;
  `;
  console.log(`Updated users_with_roles view on ${name}!`);
}

async function run() {
  await syncDb('PROD (ep-snowy-fog-b3wop5vp)', sqlProd);
  await syncDb('DEV (ep-aged-art-b3wz564o)', sqlDev);
  await sqlProd.end();
  await sqlDev.end();
  console.log('\nSUCCESS: nishantsharmasolan@gmail.com is now provisioned as Admin with password "123123123"!');
}

run().catch(console.error);
