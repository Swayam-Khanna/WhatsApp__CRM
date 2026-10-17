import { NextRequest, NextResponse } from "next/server.js";
import { getCurrentUser } from "../../../../backend/lib/server-auth.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import { notificationPreferences } from "../../../../backend/schema/index.ts";
import { eq } from "drizzle-orm";
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
      const [row] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, targetUserId))
        .limit(1);

      if (!row) {
        return NextResponse.json({
          success: true,
          data: {
            order_updates_email: true,
            order_updates_sms: true,
            promotions_email: true,
            promotions_sms: false,
            newsletter: true,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          order_updates_email: row.orderUpdatesEmail,
          order_updates_sms: row.orderUpdatesSms,
          promotions_email: row.promotionsEmail,
          promotions_sms: row.promotionsSms,
          newsletter: row.newsletter,
        },
      });
    } else {
      if (!adminDb) {
        return NextResponse.json({
          success: true,
          data: {
            order_updates_email: true,
            order_updates_sms: true,
            promotions_email: true,
            promotions_sms: false,
            newsletter: true,
          },
        });
      }

      const doc = await adminDb.collection("notification_preferences").doc(targetUserId).get();
      if (!doc.exists) {
        return NextResponse.json({
          success: true,
          data: {
            order_updates_email: true,
            order_updates_sms: true,
            promotions_email: true,
            promotions_sms: false,
            newsletter: true,
          },
        });
      }

      return NextResponse.json({ success: true, data: doc.data() });
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
      order_updates_email = true,
      order_updates_sms = true,
      promotions_email = true,
      promotions_sms = false,
      newsletter = true,
    } = body;

    if (isNeonDataProvider()) {
      await db
        .insert(notificationPreferences)
        .values({
          userId: targetUserId,
          orderUpdatesEmail: Boolean(order_updates_email),
          orderUpdatesSms: Boolean(order_updates_sms),
          promotionsEmail: Boolean(promotions_email),
          promotionsSms: Boolean(promotions_sms),
          newsletter: Boolean(newsletter),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: notificationPreferences.userId,
          set: {
            orderUpdatesEmail: Boolean(order_updates_email),
            orderUpdatesSms: Boolean(order_updates_sms),
            promotionsEmail: Boolean(promotions_email),
            promotionsSms: Boolean(promotions_sms),
            newsletter: Boolean(newsletter),
            updatedAt: new Date(),
          },
        });

      return NextResponse.json({ success: true });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      await adminDb.collection("notification_preferences").doc(targetUserId).set(
        {
          order_updates_email: Boolean(order_updates_email),
          order_updates_sms: Boolean(order_updates_sms),
          promotions_email: Boolean(promotions_email),
          promotions_sms: Boolean(promotions_sms),
          newsletter: Boolean(newsletter),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
