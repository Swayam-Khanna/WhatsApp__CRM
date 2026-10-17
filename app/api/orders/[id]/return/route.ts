import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../backend/lib/server-auth.ts";
import { isNeonDataProvider } from "../../../../../backend/lib/data-provider.ts";
import { db } from "../../../../../backend/db.ts";
import { orders, orderItems } from "../../../../../backend/schema/orders.ts";
import { farmerProducts } from "../../../../../backend/schema/index.ts";
import { systemNotifications } from "../../../../../backend/schema/system.ts";
import { eq, or, sql } from "drizzle-orm";
import { adminDb } from "../../../../../frontend/lib/firebase-admin.ts";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    }

    const cleanId = decodeURIComponent(id).trim().replace(/^#/, "");
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "Return Requested by Customer";

    if (isNeonDataProvider()) {
      const [order] = await db
        .select()
        .from(orders)
        .where(or(eq(orders.id, cleanId), eq(orders.orderNumber, cleanId)))
        .limit(1);

      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      if (order.userId !== user.id && user.role !== "admin") {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      const now = new Date();
      await db
        .update(orders)
        .set({
          status: "returned",
          paymentStatus: "refunded",
          cancellationReason: reason,
          updatedAt: now,
        })
        .where(eq(orders.id, order.id));

      // Restore stock
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      for (const item of items) {
        if (item.productId) {
          await db
            .update(farmerProducts)
            .set({
              stock: sql`${farmerProducts.stock} + ${item.quantity}`,
              stockGrams: item.weightGrams
                ? sql`${farmerProducts.stockGrams} + ${item.weightGrams * item.quantity}`
                : sql`${farmerProducts.stockGrams}`,
              updatedAt: now,
            })
            .where(eq(farmerProducts.id, item.productId));
        }
      }

      // Create admin notification
      try {
        await db.insert(systemNotifications).values({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: order.userId,
          type: "order_status",
          title: "Order Return Requested",
          message: `Customer ${order.customerName} requested return for order #${order.orderNumber}. Reason: ${reason}`,
          read: false,
          metadata: {
            order_id: order.id,
            order_number: order.orderNumber,
            reason,
          },
          createdAt: now,
        });
      } catch (e) {
        console.warn("[Return Order] Notification insert error:", e);
      }

      return NextResponse.json({
        success: true,
        message: "Return request submitted successfully.",
      });
    } else {
      if (!adminDb) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 500 });
      await adminDb.collection("orders").doc(cleanId).update({
        status: "returned",
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, message: "Return submitted" });
    }
  } catch (err: any) {
    console.error("[POST /api/orders/[id]/return]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
