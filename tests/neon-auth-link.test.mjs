/**
 * tests/neon-auth-link.test.mjs
 *
 * Tests for Neon Auth account linking security:
 *   1. An UNVERIFIED Neon Auth sign-in matching a legacy profile MUST NOT link (prevents pre-account takeover).
 *   2. A VERIFIED Neon Auth sign-in matching a legacy profile links cleanly, sets profiles.neon_auth_user_id, and preserves legacy profiles.id.
 *   3. Resolving session by neon_auth_user_id returns the legacy profile.
 *   4. Double first-login (concurrent / idempotent) returns the exact same profile without error.
 *   5. Collision: A profile already linked to another Neon user CANNOT be relinked.
 *   6. A VERIFIED brand-new email creates a new profile + customer role.
 */

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

try {
  process.loadEnvFile(".env.local");
} catch {}

test("Neon Auth Linking – Verified-Email-Only Enforcement & Race Safety", async (t) => {
  const { reconcileNeonAuthUser, resolveSessionToProfile } = await import(
    "../frontend/lib/auth/neon-auth-link.ts"
  );
  const { db } = await import("../backend/db.ts");
  const { profiles, userRoles } = await import("../backend/schema/index.ts");
  const { eq, sql } = await import("drizzle-orm");

  // Setup: create a synthetic legacy profile to simulate an existing customer/order owner
  const legacyProfileId = `leg_cust_${Date.now()}`;
  const legacyEmail = `legacy_customer_${Date.now()}@prajnaafarm.com`;
  const legitimateNeonUserId = crypto.randomUUID();

  await db.insert(profiles).values({
    id: legacyProfileId,
    email: legacyEmail,
    fullName: "Original Legacy Customer",
  });

  t.after(async () => {
    // Clean up test rows
    await db.delete(userRoles).where(eq(userRoles.userId, legacyProfileId));
    await db.delete(profiles).where(eq(profiles.id, legacyProfileId));
    setTimeout(() => process.exit(0), 200).unref();
  });

  await t.test("SECURITY: UNVERIFIED sign-in matching legacy email MUST NOT link", async () => {
    const unverifiedAttackerAttempt = {
      id: crypto.randomUUID(),
      email: legacyEmail,
      emailVerified: false, // <-- Attacker did not verify email
      name: "Malicious Attacker",
    };

    const result = await reconcileNeonAuthUser(unverifiedAttackerAttempt);

    assert.equal(result.linked, false, "Unverified session MUST be refused linking");
    assert.equal(result.reason, "UNVERIFIED_EMAIL_CANNOT_LINK");

    // Verify DB was NOT modified: profile still has legacy profile id and neonAuthUserId is null
    const check = await db.select().from(profiles).where(eq(profiles.id, legacyProfileId));
    assert.equal(check[0]?.fullName, "Original Legacy Customer", "Legacy customer profile must be untouched");
    assert.equal(check[0]?.neonAuthUserId, null, "neon_auth_user_id must remain null");
  });

  await t.test("VERIFIED sign-in matching legacy email links successfully to existing profiles.id", async () => {
    const legitimateVerifiedSession = {
      id: legitimateNeonUserId,
      email: legacyEmail,
      emailVerified: true, // <-- Authenticated via Google or verified OTP
      name: "Original Legacy Customer",
    };

    const result = await reconcileNeonAuthUser(legitimateVerifiedSession);

    assert.equal(result.linked, true, "Verified session must link successfully");
    assert.equal(result.profileId, legacyProfileId, "Must preserve legacy profiles.id as permanent internal ID");
    assert.equal(result.isNewUser, false, "Must not flag as new user");

    // Verify neon_auth_user_id column is properly stored in DB
    const check = await db.select().from(profiles).where(eq(profiles.id, legacyProfileId));
    assert.equal(check[0]?.neonAuthUserId, legitimateNeonUserId, "profiles.neon_auth_user_id must be populated");
  });

  await t.test("Resolution: resolveSessionToProfile resolves session user ID to legacy profile", async () => {
    const resolved = await resolveSessionToProfile(legitimateNeonUserId);
    assert.ok(resolved, "Must resolve profile from session user ID");
    assert.equal(resolved?.id, legacyProfileId, "Resolved profile ID must match legacy profile");
    assert.equal(resolved?.neonAuthUserId, legitimateNeonUserId);
  });

  await t.test("Double first-login: concurrent / repeated first-logins resolve safely and idempotently", async () => {
    const firstLoginEmail = `double_login_${Date.now()}@prajnaafarm.com`;
    const doubleLoginNeonId = crypto.randomUUID();

    const sessionPayload = {
      id: doubleLoginNeonId,
      email: firstLoginEmail,
      emailVerified: true,
      name: "Concurrent Shopper",
    };

    // Simulate two simultaneous first-login requests
    const [res1, res2] = await Promise.all([
      reconcileNeonAuthUser(sessionPayload),
      reconcileNeonAuthUser(sessionPayload),
    ]);

    assert.equal(res1.linked, true);
    assert.equal(res2.linked, true);
    assert.equal(res1.profileId, res2.profileId, "Both simultaneous logins must resolve to the identical profile ID");

    // Cleanup
    if (res1.profileId) {
      await db.delete(userRoles).where(eq(userRoles.userId, res1.profileId));
      await db.delete(profiles).where(eq(profiles.id, res1.profileId));
    }
  });

  await t.test("Collision: profile already linked to another Neon user CANNOT be relinked", async () => {
    const impostorNeonId = crypto.randomUUID();
    const collisionAttempt = {
      id: impostorNeonId,
      email: legacyEmail,
      emailVerified: true,
      name: "Different Account Same Email",
    };

    const result = await reconcileNeonAuthUser(collisionAttempt);

    assert.equal(result.linked, false, "Must refuse to relink an already-linked profile to a different Neon user");
    assert.equal(result.reason, "PROFILE_ALREADY_LINKED_TO_DIFFERENT_NEON_USER");

    // Verify existing profile mapping was NOT overwritten
    const check = await db.select().from(profiles).where(eq(profiles.id, legacyProfileId));
    assert.equal(
      check[0]?.neonAuthUserId,
      legitimateNeonUserId,
      "Existing neon_auth_user_id must remain unchanged"
    );
  });

  await t.test("VERIFIED brand-new email creates new profile and customer role", async () => {
    const newEmail = `brand_new_${Date.now()}@prajnaafarm.com`;
    const newNeonId = crypto.randomUUID();
    const newSession = {
      id: newNeonId,
      email: newEmail,
      emailVerified: true,
      name: "Brand New Shopper",
    };

    const result = await reconcileNeonAuthUser(newSession);

    assert.equal(result.linked, true);
    assert.equal(result.isNewUser, true);
    assert.ok(result.profileId?.startsWith("usr_"));

    const check = await db.select().from(profiles).where(eq(profiles.id, result.profileId));
    assert.equal(check[0]?.neonAuthUserId, newNeonId);

    // Clean up newly created row
    if (result.profileId) {
      await db.delete(userRoles).where(eq(userRoles.userId, result.profileId));
      await db.delete(profiles).where(eq(profiles.id, result.profileId));
    }
  });

  await t.test("DYNAMIC ADMIN: Verified sign-in with email in ADMIN_EMAILS receives admin role", async () => {
    const adminEmail = "khannaswayam1@gmail.com";
    const existing = await db
      .select()
      .from(profiles)
      .where(sql`lower(${profiles.email}) = ${adminEmail.toLowerCase()}`)
      .limit(1);
    const adminNeonId = existing[0]?.neonAuthUserId || crypto.randomUUID();
    const adminSession = {
      id: adminNeonId,
      email: adminEmail.toUpperCase(), // Test case insensitivity
      emailVerified: true,
      name: "Swayam Khanna",
    };

    const result = await reconcileNeonAuthUser(adminSession);
    assert.equal(result.linked, true);
    assert.equal(result.role, "admin", "User with email in ADMIN_EMAILS must receive admin role");

    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, result.profileId));
    const hasAdmin = roles.some((r) => r.role === "admin");
    assert.equal(hasAdmin, true, "user_roles table must contain admin entry");

    // Clean up if new
    if (result.isNewUser && result.profileId) {
      await db.delete(userRoles).where(eq(userRoles.userId, result.profileId));
      await db.delete(profiles).where(eq(profiles.id, result.profileId));
    }
  });

  await t.test("FARMER MATCHING: Verified sign-in matching farmer_profiles.email links userId and grants farmer role", async () => {
    const { farmerProfiles } = await import("../backend/schema/index.ts");
    const farmerEmail = `farmer_test_${Date.now()}@prajnaafarm.com`;
    const testFarmerId = `farm_t_${Date.now()}`;
    const initialPlaceholderUserId = `placeholder_owner_${Date.now()}`;

    // Seed temporary placeholder profile for foreign key
    await db.insert(profiles).values({
      id: initialPlaceholderUserId,
      email: `initial_placeholder_${Date.now()}@prajnaafarm.com`,
      fullName: "Placeholder Profile",
    });

    // Seed test farmer profile
    await db.insert(farmerProfiles).values({
      id: testFarmerId,
      userId: initialPlaceholderUserId,
      fullName: "Ramesh Organic Farmer",
      farmName: "Prajnaa Valley Farm",
      phone: "+919876543210",
      email: farmerEmail,
      state: "Uttarakhand",
      village: "Mukteshwar",
      status: "approved",
    });

    // 1. Unverified sign-in attempt MUST NOT link
    const unverifiedAttempt = {
      id: crypto.randomUUID(),
      email: farmerEmail,
      emailVerified: false,
      name: "Unverified Ramesh",
    };
    const unverifiedResult = await reconcileNeonAuthUser(unverifiedAttempt);
    assert.equal(unverifiedResult.linked, false, "Unverified user MUST NOT match or link farmer profile");

    // Check farmer userId is untouched
    const checkUnverified = await db.select().from(farmerProfiles).where(eq(farmerProfiles.id, testFarmerId));
    assert.equal(checkUnverified[0]?.userId, initialPlaceholderUserId);

    // 2. Verified sign-in attempt MUST link farmer_profiles.user_id and grant 'farmer' role
    const verifiedFarmerNeonId = crypto.randomUUID();
    const verifiedAttempt = {
      id: verifiedFarmerNeonId,
      email: farmerEmail,
      emailVerified: true,
      name: "Ramesh Organic Farmer",
    };

    const verifiedResult = await reconcileNeonAuthUser(verifiedAttempt);
    assert.equal(verifiedResult.linked, true);
    assert.equal(verifiedResult.role, "farmer", "Farmer with verified email must be assigned farmer role");

    // Check farmer_profiles.user_id updated to the reconciled profileId
    const checkVerified = await db.select().from(farmerProfiles).where(eq(farmerProfiles.id, testFarmerId));
    assert.equal(checkVerified[0]?.userId, verifiedResult.profileId, "farmer_profiles.user_id must match authenticated profileId");

    // Clean up
    await db.delete(farmerProfiles).where(eq(farmerProfiles.id, testFarmerId));
    if (verifiedResult.profileId) {
      await db.delete(userRoles).where(eq(userRoles.userId, verifiedResult.profileId));
      await db.delete(profiles).where(eq(profiles.id, verifiedResult.profileId));
    }
    await db.delete(profiles).where(eq(profiles.id, initialPlaceholderUserId));
  });

  await t.test("FARMER MATCHING: Admin-managed farmer without email is NEVER linked", async () => {
    const { farmerProfiles } = await import("../backend/schema/index.ts");
    const testAdminFarmerId = `farm_admin_managed_${Date.now()}`;
    const initialPlaceholderUserId = `placeholder_admin_f_${Date.now()}`;

    // Seed temporary placeholder profile for foreign key
    await db.insert(profiles).values({
      id: initialPlaceholderUserId,
      email: `initial_f_admin_${Date.now()}@prajnaafarm.com`,
      fullName: "Admin Managed Farmer Profile",
    });

    // Seed test farmer profile with NULL email
    await db.insert(farmerProfiles).values({
      id: testAdminFarmerId,
      userId: initialPlaceholderUserId,
      fullName: "Offline Village Farmer",
      farmName: "Offline Farm",
      phone: "+919876543299",
      email: null, // Admin-managed with no email
      state: "Uttarakhand",
      village: "Nainital",
      status: "approved",
    });

    // A shopper signs in
    const shopperEmail = `shopper_${Date.now()}@prajnaafarm.com`;
    const shopperSession = {
      id: crypto.randomUUID(),
      email: shopperEmail,
      emailVerified: true,
      name: "Random Shopper",
    };

    const result = await reconcileNeonAuthUser(shopperSession);
    assert.equal(result.linked, true);
    assert.equal(result.role, "customer", "Shopper must NOT receive farmer role");

    // Verify offline farmer is untouched
    const checkOffline = await db.select().from(farmerProfiles).where(eq(farmerProfiles.id, testAdminFarmerId));
    assert.equal(checkOffline[0]?.userId, initialPlaceholderUserId, "Offline farmer must remain with initial userId");

    // Clean up
    await db.delete(farmerProfiles).where(eq(farmerProfiles.id, testAdminFarmerId));
    if (result.profileId) {
      await db.delete(userRoles).where(eq(userRoles.userId, result.profileId));
      await db.delete(profiles).where(eq(profiles.id, result.profileId));
    }
    await db.delete(profiles).where(eq(profiles.id, initialPlaceholderUserId));
  });
});
