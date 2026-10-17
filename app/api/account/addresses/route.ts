import { NextRequest, NextResponse } from "next/server.js";
import { getCurrentUser } from "../../../../backend/lib/server-auth.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import { addresses } from "../../../../backend/schema/index.ts";
import { eq, and, desc } from "drizzle-orm";
import { adminDb } from "../../../../frontend/lib/firebase-admin.ts";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId") || user?.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
    }

    if (isNeonDataProvider()) {
      const rows = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, targetUserId))
        .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));

      const mapped = rows.map((r) => ({
        id: r.id,
        label: r.label,
        full_name: r.fullName,
        phone: r.phone,
        line1: r.line1,
        line2: r.line2,
        city: r.city,
        state: r.state,
        postal_code: r.postalCode,
        country: r.country,
        is_default: r.isDefault,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }));

      return NextResponse.json({ success: true, data: mapped });
    } else {
      if (!adminDb) return NextResponse.json({ success: true, data: [] });
      const snap = await adminDb
        .collection("addresses")
        .where("user_id", "==", targetUserId)
        .get();

      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({ success: true, data: items });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const body = await req.json();
    const targetUserId = body.userId || user?.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const {
      id,
      label,
      full_name,
      phone,
      line1,
      line2,
      city,
      state,
      postal_code,
      country,
      is_default,
    } = body;

    if (!full_name || !line1 || !city || !state || !postal_code) {
      return NextResponse.json({ error: "Missing required address fields" }, { status: 400 });
    }

    if (isNeonDataProvider()) {
      const isDefault = Boolean(is_default);

      if (isDefault) {
        // Clear previous defaults for this user
        await db
          .update(addresses)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(addresses.userId, targetUserId));
      }

      const addressId = id || `addr_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

      const [upserted] = await db
        .insert(addresses)
        .values({
          id: addressId,
          userId: targetUserId,
          label: label || "Home",
          fullName: full_name,
          phone: phone || null,
          line1,
          line2: line2 || null,
          city,
          state,
          postalCode: postal_code,
          country: country || "India",
          isDefault,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: addresses.id,
          set: {
            label: label || "Home",
            fullName: full_name,
            phone: phone || null,
            line1,
            line2: line2 || null,
            city,
            state,
            postalCode: postal_code,
            country: country || "India",
            isDefault,
            updatedAt: new Date(),
          },
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: {
          id: upserted.id,
          label: upserted.label,
          full_name: upserted.fullName,
          phone: upserted.phone,
          line1: upserted.line1,
          line2: upserted.line2,
          city: upserted.city,
          state: upserted.state,
          postal_code: upserted.postalCode,
          country: upserted.country,
          is_default: upserted.isDefault,
        },
      });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      const addressId = id || `addr_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      const payload = {
        user_id: targetUserId,
        label: label || "Home",
        full_name,
        phone: phone || null,
        line1,
        line2: line2 || null,
        city,
        state,
        postal_code,
        country: country || "India",
        is_default: Boolean(is_default),
        updated_at: new Date().toISOString(),
      };
      await adminDb.collection("addresses").doc(addressId).set(payload, { merge: true });
      return NextResponse.json({ success: true, data: { id: addressId, ...payload } });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const body = await req.json();
    const { id } = body;
    const targetUserId = body.userId || user?.id;

    if (!targetUserId || !id) {
      return NextResponse.json({ error: "Missing user or address ID" }, { status: 400 });
    }

    if (isNeonDataProvider()) {
      await db
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(addresses.userId, targetUserId));

      await db
        .update(addresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(addresses.id, id), eq(addresses.userId, targetUserId)));

      return NextResponse.json({ success: true });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      await adminDb.collection("addresses").doc(id).update({ is_default: true });
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const targetUserId = searchParams.get("userId") || user?.id;

    if (!id || !targetUserId) {
      return NextResponse.json({ error: "Missing address ID or user ID" }, { status: 400 });
    }

    if (isNeonDataProvider()) {
      await db
        .delete(addresses)
        .where(and(eq(addresses.id, id), eq(addresses.userId, targetUserId)));

      return NextResponse.json({ success: true });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      await adminDb.collection("addresses").doc(id).delete();
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
