import postgres from "postgres";

const dbs = [
  {
    name: "ep-snowy-fog-b3wop5vp (PROD)",
    url: "postgresql://neondb_owner:npg_jKvq1zyZ5usQ@ep-snowy-fog-b3wop5vp.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  },
  {
    name: "ep-aged-art-b3wz564o (DEV)",
    url: "postgresql://neondb_owner:npg_jKvq1zyZ5usQ@ep-aged-art-b3wz564o.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  },
];

async function checkNishantAdmin() {
  const emails = ["nishantsharmasolan@gmail.com", "aimnishant@zohomail.in"];
  for (const { name, url } of dbs) {
    console.log(`\n=== ${name} ===`);
    const sql = postgres(url, { ssl: "require", max: 1 });
    try {
      for (const email of emails) {
        console.log(`\nChecking: ${email}`);
        const authUser = await sql`SELECT * FROM neon_auth.user WHERE lower(email) = ${email.toLowerCase()}`;
        console.log("neon_auth.user:", authUser);

        if (authUser.length > 0) {
          const authAcc = await sql`SELECT id, "accountId", "providerId", "userId", password IS NOT NULL as has_password, length(password) as pwd_len FROM neon_auth.account WHERE "userId" = ${authUser[0].id}`;
          console.log("neon_auth.account:", authAcc);
        }

        const prof = await sql`SELECT * FROM public.profiles WHERE lower(email) = ${email.toLowerCase()}`;
        console.log("public.profiles:", prof);

        if (prof.length > 0) {
          for (const p of prof) {
            const roles = await sql`SELECT * FROM public.user_roles WHERE user_id = ${p.id}`;
            console.log(`user_roles for profile ${p.id}:`, roles);
          }
        }
      }
    } catch (e) {
      console.error(e.message);
    } finally {
      await sql.end();
    }
  }
}

checkNishantAdmin();
