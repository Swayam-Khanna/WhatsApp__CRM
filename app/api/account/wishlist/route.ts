import { NextRequest, NextResponse } from "next/server.js";
import { getCurrentUser } from "../../../../backend/lib/server-auth.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import { wishlistItems } from "../../../../backend/schema/index.ts";
import { eq, and, desc } from "drizzle-orm";
import { adminDb } from "../../../../frontend/lib/firebase-admin.ts";

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
        .select({
          product_slug: wishlistItems.productSlug,
          created_at: wishlistItems.createdAt,
        })
        .from(wishlistItems)
        .where(eq(wishlistItems.userId, targetUserId))
        .orderBy(desc(wishlistItems.createdAt));

      return NextResponse.json({ success: true, data: rows });
    } else {
      if (!adminDb) return NextResponse.json({ success: true, data: [] });
      const snap = await adminDb
        .collection("wishlist_items")
        .where("user_id", "==", targetUserId)
        .get();

      const items = snap.docs.map((doc) => ({
        product_slug: doc.data().product_slug,
        created_at: doc.data().created_at,
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
    const { productSlug } = body;

    if (!targetUserId || !productSlug) {
      return NextResponse.json({ error: "Missing userId or productSlug" }, { status: 400 });
    }

    if (isNeonDataProvider()) {
      const id = `wish_${targetUserId}_${productSlug}`;
      await db
        .insert(wishlistItems)
        .values({
          id,
          userId: targetUserId,
          productSlug,
        })
        .onConflictDoNothing();

      return NextResponse.json({ success: true, data: { product_slug: productSlug } });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      const id = `wish_${targetUserId}_${productSlug}`;
      await adminDb.collection("wishlist_items").doc(id).set({
        user_id: targetUserId,
        product_slug: productSlug,
        created_at: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({ success: true, data: { product_slug: productSlug } });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const targetUserId = searchParams.get("userId") || user?.id;

    if (!slug || !targetUserId) {
      return NextResponse.json({ error: "Missing slug or userId" }, { status: 400 });
    }

    if (isNeonDataProvider()) {
      await db
        .delete(wishlistItems)
        .where(and(eq(wishlistItems.userId, targetUserId), eq(wishlistItems.productSlug, slug)));

      return NextResponse.json({ success: true });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      const snap = await adminDb
        .collection("wishlist_items")
        .where("user_id", "==", targetUserId)
        .where("product_slug", "==", slug)
        .get();

      const batch = adminDb.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
