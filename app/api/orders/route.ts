import { NextRequest, NextResponse } from "next/server.js";
import { getCurrentUser } from "../../../backend/lib/server-auth.ts";
import { isNeonDataProvider } from "../../../backend/lib/data-provider.ts";
import { db } from "../../../backend/db.ts";
import { orders, orderItems } from "../../../backend/schema/orders.ts";
import { eq, desc } from "drizzle-orm";
import { adminDb } from "../../../frontend/lib/firebase-admin.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders
 * Returns the authenticated customer's full order list, including items.
 * Query params: ?limit=50&offset=0
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (isNeonDataProvider()) {
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, user.id))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      // Fetch items for each order
      const itemsByOrderId: Record<string, any[]> = {};
      for (const o of rows) {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, o.id));
        itemsByOrderId[o.id] = items.map((item) => ({
          name: item.productName,
          slug: item.productSlug,
          qty: item.quantity,
          weight: item.weightGrams ? `${item.weightGrams}g` : null,
          price: item.unitPricePaise / 100,
          image: item.productImage || null,
        }));
      }

      const data = rows.map((o) => {
        // Derive address string from shippingAddressSnapshot JSONB
        const snap = (o.shippingAddressSnapshot as any) || {};
        const shippingAddress = [
          snap.line1,
          snap.line2,
          snap.city,
          snap.state,
          snap.postalCode || snap.postal_code,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          id: o.id,
          order_id: o.orderNumber,
          status: o.status,
          payment_status: o.paymentStatus,
          payment_method: o.paymentMethod,
          total: o.totalPaise / 100,
          subtotal: o.subtotalPaise / 100,
          shipping_fee: o.shippingPaise / 100,
          customer_name: o.customerName,
          customer_phone: o.customerPhone,
          shipping_address: shippingAddress,
          delivery_date: null,
          items: itemsByOrderId[o.id] || [],
          created_at: o.createdAt,
          updated_at: o.updatedAt,
        };
      });

      return NextResponse.json({ success: true, data });
    } else {
      // Firestore fallback
      if (!adminDb) return NextResponse.json({ success: true, data: [] });
      const snap = await adminDb
        .collection("orders")
        .where("user_id", "==", user.id)
        .orderBy("created_at", "desc")
        .limit(limit)
        .get();
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ success: true, data });
    }
  } catch (err: any) {
    console.error("[GET /api/orders]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
