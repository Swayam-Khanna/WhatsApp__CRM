import crypto from "crypto";
import { isOnlinePaymentsEnabled } from "../../../../../frontend/lib/features.ts";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!isOnlinePaymentsEnabled()) {
      return Response.json(
        {
          success: false,
          error: "Online payments are currently disabled.",
          code: "ONLINE_PAYMENTS_DISABLED",
        },
        { status: 403 }
      );
    }

    const { db } = await import("../../../../../backend/db.ts");
    const { orders } = await import("../../../../../backend/schema/orders.ts");
    const { eq, or } = await import("drizzle-orm");
    const { sendAdminEmailNotification } = await import("../../../../../frontend/lib/api/notifications.server.ts");

    const body = await req.json();
    const {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      user_id,
      items,
      amount,
      shipping_address,
      shipping_pincode,
      contact,
      notes,
      payment_method,
    } = body;

    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json(
        { success: false, error: "Missing required payment verification details" },
        { status: 400 }
      );
    }

    // 1. Verify Razorpay cryptographic HMAC SHA-256 signature
    const keySecret =
      process.env.RAZORPAY_KEY_SECRET ||
      process.env.VITE_RAZORPAY_KEY_SECRET ||
      "";

    if (!keySecret) {
      console.error("[Razorpay Verify] Server is missing RAZORPAY_KEY_SECRET");
      return Response.json(
        { success: false, error: "Razorpay secret key is not configured on the server" },
        { status: 500 }
      );
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    const isMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(razorpay_signature, "utf-8")
    );

    if (!isMatch) {
      console.warn(`[Razorpay Verify] Signature mismatch for order: ${order_id}`);
      return Response.json(
        { success: false, error: "Invalid payment signature verification failed" },
        { status: 400 }
      );
    }

    // 2. Prepare standardized order record matching database requirements
    const totalQty = Array.isArray(items)
      ? items.reduce((acc: number, item: any) => acc + (Number(item.qty) || 1), 0)
      : 1;

    const primarySku = items?.[0]?.sku || items?.[0]?.slug || "0028";
    const primaryProductName = items?.[0]?.name || "Himalayan Mountain Walnuts";
    const nowIso = new Date().toISOString();

    const orderRecord = {
      id: order_id,
      order_id: order_id,
      user_id: user_id || "guest",
      product_id: primarySku,
      product_name: primaryProductName,
      quantity: totalQty,
      amount: Number(amount) || 0,
      total_amount: Number(amount) || 0,
      payment_id: razorpay_payment_id,
      payment_status: "paid",
      order_status: "Reserved – Pre-order paid",
      status: "Reserved – Pre-order paid",
      shipping_address: shipping_address || "",
      shipping_pincode: shipping_pincode || "",
      customer_name: contact?.name || "",
      customer_email: contact?.email || "",
      customer_phone: contact?.phone || "",
      payment_method: payment_method || "razorpay",
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      notes: notes || "",
      items: items || [],
      created_at: nowIso,
      updated_at: nowIso,
    };

    // 3. Save order to Neon PostgreSQL
    try {
      await db
        .update(orders)
        .set({
          paymentStatus: "collected",
          status: "confirmed",
          updatedAt: new Date(),
        })
        .where(or(eq(orders.id, order_id), eq(orders.orderNumber, order_id)));
    } catch (dbErr: any) {
      console.error("[Razorpay Verify] Neon order update error:", dbErr?.message || dbErr);
    }

    // 3B. Atomically decrement stock for purchased items
    try {
      const { decrementOrderStockAtomic } = await import("../../../../../backend/lib/orders.server.ts");
      const normalizedItemsForStock = (items || []).map((it: any) => ({
        productId: it.productId || it.id || it.slug || primarySku,
        productSlug: it.slug || it.productSlug,
        slug: it.slug,
        sku: it.sku || primarySku,
        productName: it.name || it.productName || primaryProductName,
        quantity: Math.max(1, Number(it.quantity || it.qty || 1)),
        weightGrams: Number(it.weightGrams || it.weight_gm || 500) * Math.max(1, Number(it.quantity || it.qty || 1)),
      }));

      if (normalizedItemsForStock.length > 0) {
        await decrementOrderStockAtomic(normalizedItemsForStock, String(order_id));
        console.log(`[Stock Decrement Success] Razorpay Order #${order_id}: inventory updated automatically.`);
      }
    } catch (stockErr: any) {
      console.error(`[Stock Sync Failure] Razorpay Order #${order_id} stock decrement error:`, stockErr?.message || stockErr);
    }

    // 4. Update WhatsApp CRM order & sync to CRM outbox
    try {
      const { syncOrderToWhatsAppCrm } = await import("../../../../../backend/lib/crm-sync.server.ts");
      const cleanOrderId = String(order_id).replace(/^#+/, "");

      const crmSyncResult = await syncOrderToWhatsAppCrm({
        id: cleanOrderId,
        orderNumber: cleanOrderId,
        customerName: contact?.name || "Customer",
        customerPhone: contact?.phone || "",
        customerEmail: contact?.email || "",
        totalPaise: Math.round(Number(amount) * 100),
        status: "Processing",
        paymentStatus: "paid",
        paymentMethod: payment_method || "razorpay",
        shippingAddressSnapshot: {
          fullName: contact?.name || "",
          line1: shipping_address || "",
          postalCode: shipping_pincode || "",
        },
        items: (items || []).map((it: any) => ({
          productId: it.productId || it.id || it.slug || primarySku,
          sku: it.sku || primarySku,
          productName: it.name || it.productName || primaryProductName,
          quantity: Math.max(1, Number(it.quantity || it.qty || 1)),
          unitPricePaise: Math.round(Number(it.price || (it.unitPricePaise ? it.unitPricePaise / 100 : 0)) * 100),
          totalPaise: Math.round(Number(it.total || (it.totalPaise ? it.totalPaise / 100 : 0) || Number(it.price || 0) * Math.max(1, Number(it.quantity || it.qty || 1))) * 100),
        })),
      });

      console.log(`[Order Sync] Razorpay Order #${order_id} synced to CRM:`, crmSyncResult);
    } catch (crmErr: any) {
      console.error(`[Order Sync Failure] Razorpay Order #${order_id} failed to sync to CRM:`, crmErr?.message || crmErr);
    }

    // 5. Send confirmation notification email to admin/team
    try {
      await sendAdminEmailNotification({
        data: {
          subject: `🌱 Harvest Reserved: Order #${order_id} Paid (₹${amount})`,
          body: `A new harvest reservation has been paid!\n\nOrder ID: ${order_id}\nCustomer: ${contact?.name || "Customer"} (${contact?.email || ""}, ${contact?.phone || ""})\nProduce: ${primaryProductName} (SKU: ${primarySku}) x ${totalQty}\nAmount: ₹${amount}\nPayment ID: ${razorpay_payment_id}\nStatus: Reserved – Pre-order paid\nShipping Address:\n${shipping_address}\nNotes: ${notes || "None"}\n\nYour pack will ship on priority once harvest packing begins.`,
        },
      });
    } catch (notifErr) {
      console.warn("[Razorpay Verify] Notification email warning:", notifErr);
    }

    return Response.json({
      success: true,
      order_id,
      status: "Reserved – Pre-order paid",
      payment_id: razorpay_payment_id,
      message: "Payment successfully verified and order recorded.",
    });
  } catch (err: any) {
    console.error("[Razorpay Verify] Internal error:", err);
    return Response.json(
      { success: false, error: err.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
