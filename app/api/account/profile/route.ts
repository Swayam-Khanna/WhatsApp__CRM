import { NextRequest, NextResponse } from "next/server.js";
import { getCurrentUser } from "../../../../backend/lib/server-auth.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import { profiles } from "../../../../backend/schema/index.ts";
import { eq, or, sql } from "drizzle-orm";
import { adminDb } from "../../../../frontend/lib/firebase-admin.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/account/profile
 * Returns the current user's profile row.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isNeonDataProvider()) {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(sql`${profiles.id} = ${user.id} OR ${profiles.neonAuthUserId} = ${user.neonAuthUserId || user.id}`)
        .limit(1);

      return NextResponse.json({
        success: true,
        data: profile
          ? {
              id: profile.id,
              full_name: profile.fullName,
              email: profile.email,
              phone: profile.phone,
              avatar_url: profile.avatarUrl,
              role: user.role,
            }
          : {
              id: user.id,
              full_name: user.name || "User",
              email: user.email,
              phone: null,
              avatar_url: user.image || null,
              role: user.role,
            },
      });
    } else {
      // Firestore fallback
      if (!adminDb) return NextResponse.json({ success: true, data: null });
      const doc = await adminDb.collection("profiles").doc(user.id).get();
      return NextResponse.json({ success: true, data: doc.exists ? { id: doc.id, ...doc.data() } : null });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/account/profile
 * Updates full_name and/or avatar_url for the current user.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { full_name, avatar_url, phone } = body;

    if (isNeonDataProvider()) {
      const updates: Partial<typeof profiles.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (full_name !== undefined) updates.fullName = String(full_name).trim().slice(0, 80) || null;
      if (avatar_url !== undefined) updates.avatarUrl = avatar_url || null;
      if (phone !== undefined) updates.phone = phone || null;

      const insertValues: typeof profiles.$inferInsert = {
        id: user.id,
        email: user.email || null,
        fullName: full_name !== undefined ? (String(full_name).trim().slice(0, 80) || null) : null,
        avatarUrl: avatar_url !== undefined ? (avatar_url || null) : null,
        phone: phone !== undefined ? (phone || null) : null,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .insert(profiles)
        .values(insertValues)
        .onConflictDoUpdate({
          target: profiles.id,
          set: updates,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: updated
          ? {
              id: updated.id,
              full_name: updated.fullName,
              email: updated.email,
              phone: updated.phone,
              avatar_url: updated.avatarUrl,
            }
          : null,
      });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (full_name !== undefined) patch.full_name = String(full_name).trim();
      if (avatar_url !== undefined) patch.avatar_url = avatar_url || null;
      if (phone !== undefined) patch.phone = phone || null;
      await adminDb.collection("profiles").doc(user.id).set(patch, { merge: true });
      return NextResponse.json({ success: true, data: { id: user.id, ...patch } });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
