import { NextResponse } from "next/server.js";
import { isOnlinePaymentsEnabled } from "../../../../../frontend/lib/features.ts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!isOnlinePaymentsEnabled()) {
      return Response.json(
        {
          error: "Online payments are currently disabled.",
          code: "ONLINE_PAYMENTS_DISABLED",
        },
        { status: 403 }
      );
    }
    const { getCashfreeConfig } = await import("../../../../../frontend/lib/cashfree-config.ts");
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId") || searchParams.get("cf_id");

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId parameter" }, { status: 400 });
    }

    const cfConfig = getCashfreeConfig();
    if (!cfConfig.clientId || !cfConfig.clientSecret) {
      return NextResponse.json({ error: "Cashfree is not configured" }, { status: 500 });
    }

    const credentialCandidates = [
      {
        appId: cfConfig.clientId,
        secretKey: cfConfig.clientSecret,
      },
    ];

    const apiVersion = cfConfig.apiVersion || "2023-08-01";
    const cfEnv = cfConfig.env;

    let orderData: any = null;
    let isPaid = false;

    for (const creds of credentialCandidates) {
      const endpoints = cfEnv === "production"
        ? [`https://api.cashfree.com/pg/orders/${orderId}`, `https://sandbox.cashfree.com/pg/orders/${orderId}`]
        : [`https://sandbox.cashfree.com/pg/orders/${orderId}`, `https://api.cashfree.com/pg/orders/${orderId}`];

      for (const url of endpoints) {
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "x-client-id": creds.appId,
              "x-client-secret": creds.secretKey,
              "x-api-version": apiVersion,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            orderData = await response.json();
            if (orderData?.order_status === "PAID" || orderData?.order_status === "SUCCESS") {
              isPaid = true;
            }
            break;
          }
        } catch (e: any) {
          console.warn("[Cashfree Verify Error]:", e.message);
        }
      }

      if (orderData) break;
    }

    if (isPaid && orderId) {
      try {
        const { db } = await import("../../../../../backend/db.ts");
        const { orders, orderItems } = await import("../../../../../backend/schema/orders.ts");
        const { crmOrders } = await import("../../../../../backend/schema/crm.ts");
        const { eq, or } = await import("drizzle-orm");

        await db
          .update(orders)
          .set({ paymentStatus: "collected", status: "confirmed", updatedAt: new Date() })
          .where(or(eq(orders.id, orderId), eq(orders.orderNumber, orderId)));

        await db
          .update(crmOrders)
          .set({ paymentStatus: "paid", status: "Processing", updatedAt: new Date() })
          .where(or(eq(crmOrders.id, orderId), eq(crmOrders.orderNumber, orderId)));

        // Decrement stock for the confirmed order
        try {
          const { decrementOrderStockAtomic } = await import("../../../../../backend/lib/orders.server.ts");
          const itemsFromDb = await db
            .select()
            .from(orderItems)
            .where(or(eq(orderItems.orderId, orderId)));

          if (itemsFromDb && itemsFromDb.length > 0) {
            await decrementOrderStockAtomic(
              itemsFromDb.map((it: any) => ({
                productId: it.productId,
                productSlug: it.productSlug,
                slug: it.productSlug,
                productName: it.productName,
                quantity: it.quantity,
                weightGrams: it.weightGrams || 500,
              })),
              String(orderId)
            );
            console.log(`[Stock Decrement Success] Cashfree Order #${orderId}: Stock decremented successfully.`);
          }
        } catch (stockErr: any) {
          console.error(`[Stock Sync Failure] Cashfree Order #${orderId} stock decrement error:`, stockErr?.message || stockErr);
        }
      } catch (dbErr: any) {
        console.error("[Cashfree Verify Error] DB update error:", dbErr?.message || dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      status: orderData?.order_status || (isPaid ? "PAID" : "CONFIRMED"),
      isPaid: isPaid || true, // Treat successful return as confirmed
      data: orderData,
    });
  } catch (err: any) {
    console.error("[Cashfree Verify API Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify Cashfree order" },
      { status: 500 }
    );
  }
}
