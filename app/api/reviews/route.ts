import { NextRequest, NextResponse } from "next/server";
import { db } from "@backend/db";
import { productReviews, profiles } from "@backend/schema";
import { createReviewSchema } from "@backend/validators/reviews";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/reviews?productSlug=organic-almonds
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productSlug = searchParams.get("productSlug");

    if (!productSlug) {
      const reviews = await db
        .select({
          id: productReviews.id,
          user_id: productReviews.userId,
          product_slug: productReviews.productSlug,
          rating: productReviews.rating,
          title: productReviews.title,
          body: productReviews.body,
          images: productReviews.images,
          verified: productReviews.verified,
          created_at: productReviews.createdAt,
          updated_at: productReviews.updatedAt,
        })
        .from(productReviews)
        .orderBy(desc(productReviews.createdAt))
        .limit(20);

      return NextResponse.json({ data: reviews, error: null });
    }

    // Join with profiles to get reviewer info
    const reviews = await db
      .select({
        id: productReviews.id,
        user_id: productReviews.userId,
        product_slug: productReviews.productSlug,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        images: productReviews.images,
        verified: productReviews.verified,
        created_at: productReviews.createdAt,
        updated_at: productReviews.updatedAt,
      })
      .from(productReviews)
      .where(eq(productReviews.productSlug, productSlug))
      .orderBy(desc(productReviews.createdAt));

    return NextResponse.json({ data: reviews, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 });
  }
}

// POST /api/reviews
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Zod Validation
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const newReview = await db
      .insert(productReviews)
      .values({
        id: parsed.data.productSlug + "_" + Date.now(),
        userId: parsed.data.userId,
        productSlug: parsed.data.productSlug,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        body: parsed.data.body,
        images: parsed.data.images || [],
        verified: parsed.data.verified ?? true,
        status: "approved",
      })
      .returning();

    return NextResponse.json({ data: newReview[0], error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message }, { status: 500 });
  }
}
