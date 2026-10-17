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

async function checkTanujAdmin() {
  const email = "tanujpmk@gmail.com";
  for (const { name, url } of dbs) {
    console.log(`\n=== ${name} ===`);
    const sql = postgres(url, { ssl: "require", max: 1 });
    try {
      const authUser = await sql`SELECT id, email, name, role, "emailVerified" FROM neon_auth.user WHERE lower(email) = ${email.toLowerCase()}`;
      console.log("neon_auth.user:", authUser);

      const prof = await sql`SELECT id, email, full_name, neon_auth_user_id FROM public.profiles WHERE lower(email) = ${email.toLowerCase()}`;
      console.log("public.profiles:", prof);

      if (prof.length > 0) {
        for (const p of prof) {
          const roles = await sql`SELECT * FROM public.user_roles WHERE user_id = ${p.id}`;
          console.log(`user_roles for profile ${p.id}:`, roles);
        }
      }

      const viewUser = await sql`SELECT * FROM public.users_with_roles WHERE lower(email) = ${email.toLowerCase()}`;
      console.log("users_with_roles view:", viewUser);
    } catch (e) {
      console.error(e.message);
    } finally {
      await sql.end();
    }
  }
}

checkTanujAdmin();
