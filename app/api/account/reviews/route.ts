import { NextRequest, NextResponse } from "next/server.js";
import { getCurrentUser } from "../../../../backend/lib/server-auth.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import { productReviews } from "../../../../backend/schema/index.ts";
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
          id: productReviews.id,
          product_slug: productReviews.productSlug,
          rating: productReviews.rating,
          title: productReviews.title,
          body: productReviews.body,
          created_at: productReviews.createdAt,
        })
        .from(productReviews)
        .where(eq(productReviews.userId, targetUserId))
        .orderBy(desc(productReviews.createdAt));

      return NextResponse.json({ success: true, data: rows });
    } else {
      if (!adminDb) return NextResponse.json({ success: true, data: [] });
      const snap = await adminDb
        .collection("product_reviews")
        .where("user_id", "==", targetUserId)
        .get();

      const items = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          product_slug: d.product_slug || d.productSlug,
          rating: Number(d.rating || 5),
          title: d.title || null,
          body: d.body || d.text || null,
          created_at: d.created_at || d.createdAt || new Date().toISOString(),
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
    const { id, productSlug, rating, title, body: reviewBody } = body;

    if (!targetUserId || !productSlug || rating === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const reviewId = id || `rev_${targetUserId}_${Date.now()}`;

    if (isNeonDataProvider()) {
      const [inserted] = await db
        .insert(productReviews)
        .values({
          id: reviewId,
          userId: targetUserId,
          productSlug,
          rating: Math.max(1, Math.min(5, Number(rating))),
          title: title || null,
          body: reviewBody || null,
          status: "pending",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: productReviews.id,
          set: {
            rating: Math.max(1, Math.min(5, Number(rating))),
            title: title || null,
            body: reviewBody || null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return NextResponse.json({ success: true, data: inserted });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      const payload = {
        user_id: targetUserId,
        product_slug: productSlug,
        rating: Math.max(1, Math.min(5, Number(rating))),
        title: title || null,
        body: reviewBody || null,
        updated_at: new Date().toISOString(),
      };
      await adminDb.collection("product_reviews").doc(reviewId).set(payload, { merge: true });
      return NextResponse.json({ success: true, data: { id: reviewId, ...payload } });
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
      return NextResponse.json({ error: "Missing review ID or user ID" }, { status: 400 });
    }

    if (isNeonDataProvider()) {
      await db
        .delete(productReviews)
        .where(and(eq(productReviews.id, id), eq(productReviews.userId, targetUserId)));

      return NextResponse.json({ success: true });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      await adminDb.collection("product_reviews").doc(id).delete();
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
