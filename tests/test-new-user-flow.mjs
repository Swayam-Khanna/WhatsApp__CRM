import crypto from "node:crypto";
import { db } from "../backend/db.ts";
import { reconcileNeonAuthUser, resolveSessionToProfile } from "../frontend/lib/auth/neon-auth-link.ts";
import { profiles, userRoles } from "../backend/schema/index.ts";
import { eq, sql } from "drizzle-orm";

async function testNewUserFlow() {
  console.log("=== Testing New User Flow ===");
  const testNeonId = crypto.randomUUID();
  const testEmail = `newuser_${Date.now()}@example.com`;

  console.log(`Testing unverified email signup: ${testEmail}`);
  // Step 1: Unverified user (standard email signup before verification)
  const unverifiedResult = await reconcileNeonAuthUser({
    id: testNeonId,
    email: testEmail,
    emailVerified: false,
    name: "New Unverified User",
  });
  console.log("Unverified result:", unverifiedResult);

  const profileAfterUnverified = await resolveSessionToProfile(testNeonId);
  console.log("Profile after unverified in DB:", profileAfterUnverified);

  console.log("\nTesting verified user signup / Google login:");
  // Step 2: Verified user (or Google login)
  const verifiedResult = await reconcileNeonAuthUser({
    id: testNeonId,
    email: testEmail,
    emailVerified: true,
    name: "New Verified User",
  });
  console.log("Verified result:", verifiedResult);

  const profileAfterVerified = await resolveSessionToProfile(testNeonId);
  console.log("Profile after verified in DB:", profileAfterVerified);

  console.log("\nTesting second login for same user (is it recognized or new user?):");
  // Step 3: Second login
  const secondLoginResult = await reconcileNeonAuthUser({
    id: testNeonId,
    email: testEmail,
    emailVerified: true,
    name: "New Verified User",
  });
  console.log("Second login result:", secondLoginResult);

  // Clean up test data
  if (profileAfterVerified) {
    await db.delete(userRoles).where(eq(userRoles.userId, profileAfterVerified.id));
    await db.delete(profiles).where(eq(profiles.id, profileAfterVerified.id));
    console.log("Cleaned up test data.");
  }
}

testNewUserFlow()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  });
