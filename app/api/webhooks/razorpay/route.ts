import crypto from "crypto";
import { NextResponse } from "next/server.js";
import { isOnlinePaymentsEnabled } from "../../../../frontend/lib/features.ts";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!isOnlinePaymentsEnabled()) {
      return Response.json(
        {
          received: true,
          ignored: true,
          message: "Online payments disabled. Webhook acknowledged without mutations.",
        },
        { status: 200 }
      );
    }
    const { db } = await import("../../../../backend/db.ts");
    const { orders } = await import("../../../../backend/schema/orders.ts");
    const { eq, or } = await import("drizzle-orm");
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(bodyText)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(bodyText);

    // Handle payment successful events
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentEntity = event.payload.payment?.entity || event.payload.order?.entity;

      if (!paymentEntity) {
        return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
      }

      // Razorpay allows passing custom metadata in 'notes' when creating an order
      const orderId = paymentEntity.notes?.order_id || paymentEntity.notes?.orderId;
      const razorpayOrderId = paymentEntity.order_id || paymentEntity.id;

      let finalOrderId = orderId;
      if (!finalOrderId && razorpayOrderId) {
        const [foundOrder] = await db
          .select({ id: orders.id, orderNumber: orders.orderNumber })
          .from(orders)
          .where(or(eq(orders.razorpayOrderId, razorpayOrderId), eq(orders.id, razorpayOrderId)))
          .limit(1);
        if (foundOrder) {
          finalOrderId = foundOrder.orderNumber || foundOrder.id;
        }
      }

      if (finalOrderId) {
        const suffix = finalOrderId.split("-")[1] || Math.floor(10000 + Math.random() * 90000).toString();
        const invoiceNumber = `INV-2026-${suffix}`;
        const invoiceDate = new Date();

        // Update Neon PostgreSQL order status to collected/confirmed
        try {
          await db
            .update(orders)
            .set({
              paymentStatus: "collected",
              status: "confirmed",
              invoiceNumber,
              invoiceDate,
              updatedAt: new Date(),
            })
            .where(or(eq(orders.id, finalOrderId), eq(orders.orderNumber, finalOrderId)));
        } catch (dbErr) {
          console.warn("Neon order update warning:", dbErr);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Webhook error:", error.message);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
