import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import { userRoles, profiles } from "../../../../backend/schema/index.ts";
import { eq, sql } from "drizzle-orm";
import { adminDb } from "../../../../frontend/lib/firebase-admin.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * Returns list of platform admins.
 */
export async function GET(req: NextRequest) {
  try {
    const authErr = await requireAdminAuth(req);
    if (authErr) return authErr;

    if (isNeonDataProvider()) {
      const rows = await db
        .select({
          userId: userRoles.userId,
          role: userRoles.role,
          createdAt: userRoles.createdAt,
          email: profiles.email,
          fullName: profiles.fullName,
        })
        .from(userRoles)
        .leftJoin(profiles, eq(userRoles.userId, profiles.id))
        .where(eq(userRoles.role, "admin"));

      const uniqueAdmins = new Map<string, any>();
      for (const r of rows) {
        const key = (r.email || r.userId || "").toLowerCase().trim();
        if (key && !uniqueAdmins.has(key)) {
          uniqueAdmins.set(key, {
            user_id: r.userId,
            email: r.email || "No email",
            name: r.fullName || null,
            role: r.role,
            created_at: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          });
        }
      }

      return NextResponse.json({ success: true, data: Array.from(uniqueAdmins.values()) });
    } else {
      if (!adminDb) return NextResponse.json({ success: true, data: [] });
      const snap = await adminDb.collection("user_roles").where("role", "==", "admin").get();
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ success: true, data });
    }
  } catch (err: any) {
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Promotes a user by email to admin role.
 */
export async function POST(req: NextRequest) {
  try {
    const authErr = await requireAdminAuth(req);
    if (authErr) return authErr;

    const body = await req.json();
    const email = String(body.email || body.target_email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    if (isNeonDataProvider()) {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(sql`LOWER(${profiles.email}) = ${email}`)
        .limit(1);

      if (!profile) {
        return NextResponse.json(
          { error: `No registered user found with email "${email}". The user must register or log in first.` },
          { status: 404 }
        );
      }

      // Clean up any existing duplicate or conflicting role records for this user
      await db
        .delete(userRoles)
        .where(eq(userRoles.userId, profile.id));

      if (profile.neonAuthUserId) {
        await db
          .delete(userRoles)
          .where(eq(userRoles.userId, profile.neonAuthUserId));
      }

      await db.insert(userRoles).values({
        id: `role_${profile.id}_admin`,
        userId: profile.id,
        role: "admin",
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: `User ${email} has been granted Admin privileges.`,
      });
    } else {
      if (!adminDb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
      const snap = await adminDb.collection("profiles").where("email", "==", email).limit(1).get();
      if (snap.empty) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const targetUid = snap.docs[0].id;
      await adminDb.collection("user_roles").doc(targetUid).set({ role: "admin", updated_at: new Date() }, { merge: true });
      return NextResponse.json({ success: true, message: "Promoted to admin" });
    }
  } catch (err: any) {
    console.error("[POST /api/admin/users]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users
 * Revokes admin privileges from a user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authErr = await requireAdminAuth(req);
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("user_id") || searchParams.get("target_user_id");

    if (!targetUserId) {
      return NextResponse.json({ error: "user_id is required." }, { status: 400 });
    }

    if (isNeonDataProvider()) {
      await db
        .delete(userRoles)
        .where(eq(userRoles.userId, targetUserId));

      return NextResponse.json({
        success: true,
        message: "Admin role revoked successfully.",
      });
    } else {
      if (!adminDb) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
      await adminDb.collection("user_roles").doc(targetUserId).delete();
      return NextResponse.json({ success: true, message: "Admin role revoked." });
    }
  } catch (err: any) {
    console.error("[DELETE /api/admin/users]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
