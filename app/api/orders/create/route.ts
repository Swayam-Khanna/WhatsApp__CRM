import { createOrderAtomic, OrderError } from "../../../../backend/lib/orders.server.ts";
import { getCurrentUser } from "../../../../backend/lib/server-auth.ts";
import { isOnlinePaymentsEnabled } from "../../../../frontend/lib/features.ts";
import { sendOrderConfirmationEmail } from "../../../../frontend/lib/orders/order-email-sender.ts";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddressSnapshot,
      billingAddressSnapshot,
      paymentMethod,
      couponCode,
      customerNotes,
    } = body;

    // 1. Validate Payment Method and Online Payments Flag
    if (!paymentMethod || !["cod", "whatsapp", "razorpay", "cashfree"].includes(paymentMethod)) {
      return Response.json(
        { error: "Invalid payment method. Must be cod, whatsapp, razorpay, or cashfree.", code: "INVALID_PAYMENT_METHOD" },
        { status: 400 }
      );
    }

    if ((paymentMethod === "razorpay" || paymentMethod === "cashfree") && !isOnlinePaymentsEnabled()) {
      return Response.json(
        {
          error: "Online payments (Razorpay / Cashfree) are currently disabled. Please choose Cash on Delivery or WhatsApp Order.",
          code: "ONLINE_PAYMENTS_DISABLED",
        },
        { status: 403 }
      );
    }

    // 2. Identify User
    const authUser = await getCurrentUser(req);
    const resolvedUserId = authUser?.id || (customerPhone ? `guest_${customerPhone.replace(/\D/g, "")}` : null);

    if (!resolvedUserId) {
      return Response.json(
        { error: "User authentication or phone number required to place an order.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    if (!customerPhone || !/^[6-9]\d{9}$/.test(customerPhone.trim().replace(/\D/g, "").slice(-10))) {
      return Response.json(
        { error: "A valid 10-digit Indian phone number is required.", code: "INVALID_PHONE" },
        { status: 400 }
      );
    }

    if (!shippingAddressSnapshot || !shippingAddressSnapshot.postalCode) {
      return Response.json(
        { error: "Valid shipping address and postal code are required.", code: "INVALID_ADDRESS" },
        { status: 400 }
      );
    }

    // 3. Create Order via Atomic Transaction
    const result = await createOrderAtomic({
      userId: resolvedUserId,
      customerName: customerName || authUser?.name || "Valued Customer",
      customerEmail: customerEmail || authUser?.email || "",
      customerPhone: customerPhone.trim(),
      items: items || [],
      shippingAddressSnapshot,
      billingAddressSnapshot,
      paymentMethod,
      couponCode,
      customerNotes,
    });

    // 4. Send Order Confirmation Email (respects EMAIL_DISABLED staging safety flag)
    void sendOrderConfirmationEmail({
      order: result.order,
      items: (result.order as any).items,
    });

    // 5. Synchronize with WhatsApp CRM (Transactional Outbox Pattern)
    let crmSyncResult: any = null;
    try {
      const { syncOrderToWhatsAppCrm } = await import("../../../../backend/lib/crm-sync.server.ts");
      crmSyncResult = await syncOrderToWhatsAppCrm(result.order, (result.order as any).items);
    } catch (crmErr: any) {
      console.warn("[Orders API] Background CRM sync warning:", crmErr?.message || crmErr);
      crmSyncResult = {
        success: false,
        status: "retry_pending",
        orderNumber: result.order.orderNumber || result.order.id,
        error: crmErr?.message || "CRM sync failed",
      };
    }

    // 6. Push to local instance cache and inbound WhatsApp feed
    try {
      if (!globalThis.__globalCrmOrders) globalThis.__globalCrmOrders = [];
      const orderRecord = {
        ...result.order,
        whatsappUrl: result.whatsappUrl || null,
        crmSyncStatus: crmSyncResult?.status || "synced",
      };
      const orderNum = orderRecord.orderNumber || orderRecord.id;
      const existingIdx = globalThis.__globalCrmOrders.findIndex(
        (o: any) => o.orderNumber === orderNum || o.id === orderNum
      );
      if (existingIdx >= 0) {
        globalThis.__globalCrmOrders[existingIdx] = orderRecord;
      } else {
        globalThis.__globalCrmOrders.unshift(orderRecord);
      }

      if (paymentMethod === "whatsapp") {
        if (!globalThis.__globalWhatsAppFeed) globalThis.__globalWhatsAppFeed = [];
        const waText = result.whatsappUrl
          ? decodeURIComponent(result.whatsappUrl.split("text=")[1] || "")
          : `🌾 New Order #${orderNum} placed via WhatsApp`;

        const feedMsg = {
          id: `msg_wa_${orderNum}`,
          direction: "inbound",
          from: orderRecord.customerPhone,
          customerName: orderRecord.customerName,
          text: waText,
          timestamp: new Date().toISOString(),
          status: "delivered",
          orderNumber: orderNum,
        };

        const existingMsgIdx = globalThis.__globalWhatsAppFeed.findIndex(
          (m: any) => m.orderNumber === orderNum || m.id === feedMsg.id
        );
        if (existingMsgIdx >= 0) {
          globalThis.__globalWhatsAppFeed[existingMsgIdx] = feedMsg;
        } else {
          globalThis.__globalWhatsAppFeed.unshift(feedMsg);
        }
      }
    } catch {}

    return Response.json({
      success: true,
      order: result.order,
      whatsappUrl: result.whatsappUrl || null,
      crmSync: crmSyncResult,
    });
  } catch (error: any) {
    if (error instanceof OrderError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error("[Orders API] Error creating order:", error);
    return Response.json(
      { error: error.message || "Failed to create order.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
