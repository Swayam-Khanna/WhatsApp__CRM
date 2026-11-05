import { db } from "../../../backend/db.ts";
import { profiles, userRoles, farmerProfiles } from "../../../backend/schema/index.ts";
import { eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { ADMIN_EMAILS } from "../admin/admin-constants.ts";

export interface NeonAuthSessionUser {
  id: string; // Neon Auth UUID
  email: string;
  emailVerified: boolean;
  name?: string | null;
  image?: string | null;
}

export interface LinkResult {
  linked: boolean;
  reason?: string;
  profileId?: string;
  isNewUser?: boolean;
  role?: "customer" | "farmer" | "admin";
}

/**
 * Resolves a Neon Auth session user ID to the internal application profile.
 * Every authenticated request queries the unique B-tree index on profiles.neon_auth_user_id.
 */
export async function resolveSessionToProfile(neonAuthUserId: string) {
  if (!neonAuthUserId) return null;
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.neonAuthUserId, neonAuthUserId))
    .limit(1);

  return rows[0] || null;
}

/**
 * Reconciles an authenticated Neon Auth session with the permanent application profiles table.
 *
 * CRITICAL SECURITY & DATA INTEGRITY INVARIANTS:
 * 1. The incoming Neon Auth user MUST have `emailVerified: true`.
 * 2. An unverified email session MUST NEVER link to an existing legacy profile.
 * 3. Never relink a profile already linked to a different Neon user ID.
 * 4. Profile creation is strictly race-safe (atomic upsert on unique index on lower(email)).
 * 5. profiles.id remains the permanent internal ID for all orders, addresses, and user_roles.
 * 6. Admin assignment: strictly verified email in ADMIN_EMAILS (lowercased).
 * 7. Farmer matching: strictly verified email matching farmer_profiles.email (non-null, non-empty).
 *    Admin-managed farmers without email cannot be linked.
 */
export async function reconcileNeonAuthUser(user: NeonAuthSessionUser): Promise<LinkResult> {
  const { id: neonAuthUserId, email, emailVerified, name } = user;

  if (!email) {
    return { linked: false, reason: "MISSING_EMAIL" };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Helper to assign role and link farmer profiles after profile resolution
  const postProcessProfile = async (profileId: string): Promise<"customer" | "farmer" | "admin"> => {
    // 0. Check existing role from database user_roles table (preserves manual admin assignments in Neon)
    const existingRoles = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, profileId));

    if (existingRoles.some((r) => r.role === "admin")) {
      return "admin";
    }

    // 1. Dynamic Admin Check
    if (ADMIN_EMAILS.has(normalizedEmail)) {
      await db.execute(sql`
        INSERT INTO user_roles (id, user_id, role, created_at)
        VALUES (${`role_${profileId}_admin`}, ${profileId}, 'admin', NOW())
        ON CONFLICT (id) DO UPDATE SET role = 'admin'
      `);
      return "admin";
    }

    // 2. Farmer Matching Rule (verified email matching farmer_profiles.email)
    const matchingFarmers = await db
      .select({ id: farmerProfiles.id, userId: farmerProfiles.userId })
      .from(farmerProfiles)
      .where(
        sql`lower(${farmerProfiles.email}) = ${normalizedEmail} AND ${farmerProfiles.email} IS NOT NULL AND length(trim(${farmerProfiles.email})) > 0`
      )
      .limit(5);

    if (matchingFarmers.length > 0) {
      for (const farmer of matchingFarmers) {
        if (farmer.userId !== profileId) {
          await db
            .update(farmerProfiles)
            .set({ userId: profileId, updatedAt: new Date() })
            .where(eq(farmerProfiles.id, farmer.id));
        }
      }

      await db.execute(sql`
        INSERT INTO user_roles (id, user_id, role, created_at)
        VALUES (${`role_${profileId}_farmer`}, ${profileId}, 'farmer', NOW())
        ON CONFLICT (id) DO NOTHING
      `);
      return "farmer";
    }

    // 3. Default Customer Role
    await db.execute(sql`
      INSERT INTO user_roles (id, user_id, role, created_at)
      VALUES (${`role_${profileId}_customer`}, ${profileId}, 'customer', NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    return "customer";
  };

  // 1. Check if profile already linked by neon_auth_user_id (idempotent fast path)
  const existingByNeonId = await db
    .select()
    .from(profiles)
    .where(eq(profiles.neonAuthUserId, neonAuthUserId))
    .limit(1);

  if (existingByNeonId[0]) {
    const role = await postProcessProfile(existingByNeonId[0].id);
    return { linked: true, profileId: existingByNeonId[0].id, isNewUser: false, role };
  }

  // 2. Look up existing legacy profiles by lower(email)
  const existingByEmail = await db
    .select()
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${normalizedEmail}`)
    
    .limit(2);

  // SECURITY GUARD: Flag duplicate profiles sharing the same lowercase email for manual review
  if (existingByEmail.length > 1) {
    console.error(
      `[MANUAL_REVIEW_REQUIRED: DUPLICATE_PROFILES_FOR_EMAIL] Found ${existingByEmail.length} profiles for email "${normalizedEmail}": ${existingByEmail.map((p) => p.id).join(", ")}. Automated linking refused.`
    );
    return {
      linked: false,
      reason: "DUPLICATE_PROFILES_FLAGGED_FOR_MANUAL_REVIEW",
    };
  }

  if (existingByEmail[0]) {
    // SECURITY GUARD 1: Never link to existing profile if incoming email is unverified
    if (!emailVerified) {
      return {
        linked: false,
        reason: "UNVERIFIED_EMAIL_CANNOT_LINK",
      };
    }

    // Link by verified email: set profiles.neon_auth_user_id in one atomic transaction
    const updateResult = await db.execute(sql`
      UPDATE profiles
      SET neon_auth_user_id = ${neonAuthUserId},
          full_name = COALESCE(full_name, ${name || null}),
          updated_at = NOW()
      WHERE id = ${existingByEmail[0].id}
        AND (neon_auth_user_id IS NULL OR neon_auth_user_id = ${neonAuthUserId})
      RETURNING id, neon_auth_user_id
    `);

    if (updateResult.length === 0) {
      return {
        linked: false,
        reason: "PROFILE_ALREADY_LINKED_TO_DIFFERENT_NEON_USER",
        profileId: existingByEmail[0].id,
      };
    }

    const role = await postProcessProfile(existingByEmail[0].id);

    return {
      linked: true,
      profileId: existingByEmail[0].id,
      isNewUser: false,
      role,
    };
  }

  // SECURITY GUARD: Never link or claim farmer profile if incoming email is unverified
  if (!emailVerified) {
    const matchingFarmers = await db
      .select({ id: farmerProfiles.id })
      .from(farmerProfiles)
      .where(
        sql`lower(${farmerProfiles.email}) = ${normalizedEmail} AND ${farmerProfiles.email} IS NOT NULL AND length(trim(${farmerProfiles.email})) > 0`
      )
      .limit(1);

    if (matchingFarmers.length > 0) {
      return {
        linked: false,
        reason: "UNVERIFIED_EMAIL_CANNOT_LINK_FARMER",
      };
    }
  }

  // 3. No existing profile found: Create new profile
  // For new users with no prior profile, provision the application profile and role
  // immediately so their account data persists in Neon and they are recognized on subsequent logins.
  const newProfileId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;

  // Single atomic upsert on unique index lower(email) – completely race-safe for concurrent first-logins
  const insertResult = await db.execute(sql`
    INSERT INTO profiles (id, neon_auth_user_id, email, full_name, created_at, updated_at)
    VALUES (${newProfileId}, ${neonAuthUserId}, ${normalizedEmail}, ${name || null}, NOW(), NOW())
    ON CONFLICT ((lower(email))) DO UPDATE
      SET neon_auth_user_id = COALESCE(profiles.neon_auth_user_id, EXCLUDED.neon_auth_user_id),
          updated_at = NOW()
      WHERE profiles.neon_auth_user_id IS NULL OR profiles.neon_auth_user_id = EXCLUDED.neon_auth_user_id
    RETURNING id, neon_auth_user_id
  `);

  if (insertResult.length === 0) {
    return {
      linked: false,
      reason: "PROFILE_ALREADY_LINKED_TO_DIFFERENT_NEON_USER",
    };
  }

  const resolvedProfile = insertResult[0] as { id: string; neon_auth_user_id: string };
  const isNew = resolvedProfile.id === newProfileId;

  const role = await postProcessProfile(resolvedProfile.id);

  return {
    linked: true,
    profileId: resolvedProfile.id,
    isNewUser: isNew,
    role,
  };
}
