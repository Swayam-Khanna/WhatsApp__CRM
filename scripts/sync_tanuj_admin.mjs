import postgres from 'postgres';

const sqlDev = postgres('postgresql://neondb_owner:npg_jKvq1zyZ5usQ@ep-aged-art-b3wz564o.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
const sqlProd = postgres('postgresql://neondb_owner:npg_jKvq1zyZ5usQ@ep-snowy-fog-b3wop5vp.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

async function syncDb(name, sql) {
  console.log(`\n=== SYNCING ${name} FOR TANUJ ===`);
  const email = 'tanujpmk@gmail.com';
  const nameUser = 'Tanuj';
  const legacyProfileId = 'SL0na7KE0aeBXO8xPT1SyOkBpFV2';
  const neonAuthUserId = 'd52a9f98-ad92-4773-b88d-065979ed72eb';

  // 1. Ensure neon_auth.user has role='admin'
  const [existingUser] = await sql`SELECT id FROM neon_auth.user WHERE lower(email) = ${email.toLowerCase()}`;
  if (!existingUser) {
    console.log(`Inserting into neon_auth.user on ${name}...`);
    await sql`
      INSERT INTO neon_auth.user (id, name, email, "emailVerified", role, "createdAt", "updatedAt")
      VALUES (${neonAuthUserId}::uuid, ${nameUser}, ${email}, true, 'admin', NOW(), NOW())
    `;
  } else {
    console.log(`Updating neon_auth.user on ${name} to role=admin...`);
    await sql`
      UPDATE neon_auth.user
      SET role = 'admin', "emailVerified" = true, name = ${nameUser}, "updatedAt" = NOW()
      WHERE lower(email) = ${email.toLowerCase()}
    `;
  }

  // 2. Ensure neon_auth.account has Google provider
  const [existingAcc] = await sql`SELECT id FROM neon_auth.account WHERE "userId"::text = ${neonAuthUserId}`;
  if (!existingAcc) {
    console.log(`Inserting into neon_auth.account on ${name}...`);
    await sql`
      INSERT INTO neon_auth.account (id, "accountId", "providerId", "userId", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${email}, 'google', ${neonAuthUserId}::uuid, NOW(), NOW())
    `;
  }

  // 3. Update public.profiles
  await sql`
    INSERT INTO public.profiles (id, email, full_name, neon_auth_user_id, created_at, updated_at)
    VALUES (${legacyProfileId}, ${email}, ${nameUser}, ${neonAuthUserId}::uuid, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      full_name = ${nameUser},
      neon_auth_user_id = ${neonAuthUserId}::uuid,
      updated_at = NOW()
  `;

  // 4. Ensure public.user_roles has role='admin' and clean up duplicate customer roles
  await sql`
    DELETE FROM public.user_roles 
    WHERE user_id = ${legacyProfileId} OR user_id = ${neonAuthUserId}
  `;
  await sql`
    INSERT INTO public.user_roles (id, user_id, role, created_at)
    VALUES ('role_' || ${legacyProfileId} || '_admin', ${legacyProfileId}, 'admin', NOW())
    ON CONFLICT (id) DO UPDATE SET role = 'admin'
  `;

  // 5. Ensure public.users_with_roles view exists
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

  console.log(`Successfully synced Tanuj as Admin on ${name}!`);
}

async function run() {
  await syncDb('PROD (ep-snowy-fog-b3wop5vp)', sqlProd);
  await syncDb('DEV (ep-aged-art-b3wz564o)', sqlDev);
  await sqlProd.end();
  await sqlDev.end();
}

run().catch(console.error);
