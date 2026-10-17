import { NextRequest, NextResponse } from "next/server.js";
import { getCurrentUser } from "../../../../backend/lib/server-auth.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import { recentlyViewed } from "../../../../backend/schema/index.ts";
import { eq, desc } from "drizzle-orm";
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
          product_slug: recentlyViewed.productSlug,
          viewed_at: recentlyViewed.viewedAt,
        })
        .from(recentlyViewed)
        .where(eq(recentlyViewed.userId, targetUserId))
        .orderBy(desc(recentlyViewed.viewedAt))
        .limit(40);

      return NextResponse.json({ success: true, data: rows });
    } else {
      if (!adminDb) return NextResponse.json({ success: true, data: [] });
      const snap = await adminDb
        .collection("recently_viewed")
        .where("user_id", "==", targetUserId)
        .get();

      const items = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          product_slug: d.product_slug,
          viewed_at: d.viewed_at || d.viewedAt || new Date().toISOString(),
        };
      });

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

    const id = `rv_${targetUserId}_${productSlug}`;

    if (isNeonDataProvider()) {
      await db
        .insert(recentlyViewed)
        .values({
          id,
          userId: targetUserId,
          productSlug,
          viewedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: recentlyViewed.id,
          set: {
            viewedAt: new Date(),
          },
        });

      return NextResponse.json({ success: true, data: { product_slug: productSlug } });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      await adminDb.collection("recently_viewed").doc(id).set(
        {
          user_id: targetUserId,
          product_slug: productSlug,
          viewed_at: new Date().toISOString(),
        },
        { merge: true }
      );

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
    const targetUserId = searchParams.get("userId") || user?.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (isNeonDataProvider()) {
      await db
        .delete(recentlyViewed)
        .where(eq(recentlyViewed.userId, targetUserId));

      return NextResponse.json({ success: true });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      const snap = await adminDb
        .collection("recently_viewed")
        .where("user_id", "==", targetUserId)
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
