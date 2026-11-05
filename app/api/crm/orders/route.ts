import { db } from "../../../../backend/db.ts";
import { crmOrders, crmMessages } from "../../../../backend/schema/crm.ts";
import { desc, eq, or } from "drizzle-orm";
import {
  sendWhatsAppTextMessage,
  buildItemizedCrmOrderConfirmationMessage,
} from "../../../../backend/lib/whatsapp.server.ts";

export const dynamic = "force-dynamic";

// In-memory CRM orders cache (survives across requests in dev/test instance)
declare global {
  // eslint-disable-next-line no-var
  var __globalCrmOrders: any[] | undefined;
}

if (!globalThis.__globalCrmOrders) {
  globalThis.__globalCrmOrders = [];
}

/**
 * GET /api/crm/orders
 * Returns authoritative CRM orders from PostgreSQL with in-memory fallback.
 */
export async function GET() {
  try {
    const pgOrders = await db
      .select()
      .from(crmOrders)
      .orderBy(desc(crmOrders.createdAt))
      .limit(100);

    if (pgOrders && pgOrders.length > 0) {
      return Response.json({ success: true, source: "postgresql", orders: pgOrders });
    }
  } catch (err: any) {
    console.warn("[PostgreSQL] CRM orders query note:", err?.message || err);
  }

  // Fallback to in-memory store
  return Response.json({
    success: true,
    source: "memory_sync",
    orders: globalThis.__globalCrmOrders || [],
  });
}

/**
 * POST /api/crm/orders
 * Validates, idempotently persists order to PostgreSQL, and initiates official WhatsApp confirmation.
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate if WHATSAPP_CRM_API_KEY is configured
    const expectedApiKey = process.env.WHATSAPP_CRM_API_KEY;
    if (expectedApiKey) {
      const authHeader =
        req.headers.get("x-crm-api-key") ||
        req.headers.get("x-api-key") ||
        req.headers.get("authorization")?.replace("Bearer ", "");
      if (authHeader !== expectedApiKey) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json(
        { error: "Invalid order data: Missing request body", code: "EMPTY_BODY" },
        { status: 400 }
      );
    }

    const newOrder = body;

    // 2. Validate essential fields
    const orderNum = (newOrder.orderNumber || newOrder.id || "").trim();
    if (!orderNum) {
      return Response.json(
        { error: "Invalid order data: 'orderNumber' or 'id' is required", code: "MISSING_ORDER_NUMBER" },
        { status: 400 }
      );
    }

    const customerPhone = (newOrder.customerPhone || "").trim();
    if (!customerPhone) {
      return Response.json(
        { error: "Invalid order data: 'customerPhone' is required", code: "MISSING_PHONE" },
        { status: 400 }
      );
    }

    if (!Array.isArray(newOrder.items) || newOrder.items.length === 0) {
      return Response.json(
        { error: "Invalid order data: 'items' array cannot be empty", code: "EMPTY_ITEMS" },
        { status: 400 }
      );
    }

    const totalPaise = Number(newOrder.totalPaise);
    if (isNaN(totalPaise) || totalPaise < 0) {
      return Response.json(
        { error: "Invalid order data: 'totalPaise' must be a non-negative integer", code: "INVALID_TOTAL" },
        { status: 400 }
      );
    }

    if (!globalThis.__globalCrmOrders) globalThis.__globalCrmOrders = [];

    // 3. Idempotent lookup: Check if order already exists in memory or PostgreSQL
    const existingIndex = globalThis.__globalCrmOrders.findIndex(
      (o) => o.orderNumber === orderNum || o.id === orderNum
    );
    const existingOrder = existingIndex >= 0 ? globalThis.__globalCrmOrders[existingIndex] : null;

    let dbExistingOrder: any = null;
    try {
      const found = await db
        .select()
        .from(crmOrders)
        .where(or(eq(crmOrders.orderNumber, orderNum), eq(crmOrders.id, orderNum)))
        .limit(1);
      if (found && found.length > 0) {
        dbExistingOrder = found[0];
      }
    } catch (dbErr: any) {
      console.warn("[PostgreSQL] CRM order lookup note:", dbErr?.message || dbErr);
    }

    const previousConfirmation = existingOrder?.whatsappConfirmation || dbExistingOrder?.whatsappConfirmation;
    const alreadyConfirmed = Boolean(previousConfirmation?.sent);

    // 4. Clean and normalize order record
    const persistedOrder = {
      ...(existingOrder || dbExistingOrder || {}),
      ...newOrder,
      id: orderNum,
      orderNumber: orderNum,
      customerPhone,
      totalPaise: Math.round(totalPaise),
      status: newOrder.status || "Processing",
      paymentStatus: newOrder.paymentStatus || "pending",
      paymentMethod: newOrder.paymentMethod || "whatsapp",
      updatedAt: new Date().toISOString(),
    };

    if (!persistedOrder.createdAt) {
      persistedOrder.createdAt = new Date().toISOString();
    }

    // 5. Initiate WhatsApp Confirmation (Idempotent: Only if not already sent)
    let whatsappNotification: any = {
      sent: false,
      duplicatePrevented: alreadyConfirmed,
    };

    if (alreadyConfirmed) {
      whatsappNotification = {
        sent: true,
        duplicatePrevented: true,
        messageId: previousConfirmation?.messageId,
        mode: previousConfirmation?.mode,
        sentAt: previousConfirmation?.sentAt,
      };
      persistedOrder.whatsappConfirmation = previousConfirmation;
    } else if (newOrder.customerOptOut) {
      whatsappNotification = {
        sent: false,
        skipped: true,
        reason: "Customer opted out of WhatsApp notifications",
      };
      persistedOrder.whatsappConfirmation = whatsappNotification;
    } else {
      try {
        const confirmationMessage = buildItemizedCrmOrderConfirmationMessage({
          customerName: persistedOrder.customerName || "Customer",
          orderNumber: orderNum,
          items: persistedOrder.items,
          totalPaise: persistedOrder.totalPaise,
          paymentStatus: persistedOrder.paymentStatus,
        });

        const sendResult = await sendWhatsAppTextMessage({
          to: customerPhone,
          text: confirmationMessage,
        });

        whatsappNotification = {
          sent: sendResult.success,
          duplicatePrevented: false,
          messageId: sendResult.messageId,
          mode: sendResult.mode,
          whatsappUrl: sendResult.whatsappUrl || null,
          sentAt: new Date().toISOString(),
        };

        persistedOrder.whatsappConfirmation = whatsappNotification;

        // Push outbound confirmation into CRM messages collection & live inbox feed
        const msgRecord = {
          id: sendResult.messageId || `msg_conf_${Date.now()}`,
          direction: "outbound",
          sender: "business",
          from: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
          to: sendResult.recipientPhone,
          customerName: persistedOrder.customerName,
          text: confirmationMessage,
          timestamp: new Date().toISOString(),
          status: "sent",
          orderNumber: orderNum,
          type: "order_confirmation",
          mode: sendResult.mode,
          whatsappUrl: sendResult.whatsappUrl || null,
          createdAt: new Date(),
        };

        if (!globalThis.__globalWhatsAppFeed) globalThis.__globalWhatsAppFeed = [];
        globalThis.__globalWhatsAppFeed.unshift(msgRecord);

        try {
          await db
            .insert(crmMessages)
            .values({
              id: msgRecord.id,
              direction: "outbound",
              sender: "business",
              from: msgRecord.from,
              to: msgRecord.to,
              customerName: msgRecord.customerName || null,
              text: msgRecord.text,
              type: "order_confirmation",
              status: "sent",
              orderNumber: orderNum,
              mode: sendResult.mode,
              whatsappUrl: sendResult.whatsappUrl || null,
              timestamp: new Date(msgRecord.timestamp),
              createdAt: msgRecord.createdAt,
            })
            .onConflictDoNothing();
        } catch (msgErr: any) {
          console.warn("[PostgreSQL] Failed to log confirmation message:", msgErr?.message || msgErr);
        }
      } catch (waErr: any) {
        console.warn("[WhatsApp Confirmation] Dispatch warning:", waErr.message);
        whatsappNotification = {
          sent: false,
          error: waErr.message || "Failed to dispatch WhatsApp message",
          failedAt: new Date().toISOString(),
        };
        persistedOrder.whatsappConfirmation = whatsappNotification;
      }
    }

    // 6. Persist to memory and PostgreSQL
    if (existingIndex >= 0) {
      globalThis.__globalCrmOrders[existingIndex] = persistedOrder;
    } else {
      globalThis.__globalCrmOrders.unshift(persistedOrder);
    }

    let persistedInPg = false;
    try {
      await db
        .insert(crmOrders)
        .values({
          id: orderNum,
          orderNumber: orderNum,
          customerName: persistedOrder.customerName || null,
          customerPhone: persistedOrder.customerPhone,
          customerEmail: persistedOrder.customerEmail || null,
          totalPaise: persistedOrder.totalPaise,
          subtotalPaise: persistedOrder.subtotalPaise || 0,
          shippingPaise: persistedOrder.shippingPaise || 0,
          discountPaise: persistedOrder.discountPaise || 0,
          status: persistedOrder.status || "Processing",
          paymentStatus: persistedOrder.paymentStatus || "pending",
          paymentMethod: persistedOrder.paymentMethod || "whatsapp",
          shippingAddressSnapshot: persistedOrder.shippingAddressSnapshot || null,
          items: persistedOrder.items || [],
          whatsappConfirmation: persistedOrder.whatsappConfirmation || null,
          createdAt: new Date(persistedOrder.createdAt),
          updatedAt: new Date(persistedOrder.updatedAt),
        })
        .onConflictDoUpdate({
          target: crmOrders.orderNumber,
          set: {
            customerName: persistedOrder.customerName || null,
            customerPhone: persistedOrder.customerPhone,
            customerEmail: persistedOrder.customerEmail || null,
            totalPaise: persistedOrder.totalPaise,
            subtotalPaise: persistedOrder.subtotalPaise || 0,
            shippingPaise: persistedOrder.shippingPaise || 0,
            discountPaise: persistedOrder.discountPaise || 0,
            status: persistedOrder.status || "Processing",
            paymentStatus: persistedOrder.paymentStatus || "pending",
            paymentMethod: persistedOrder.paymentMethod || "whatsapp",
            shippingAddressSnapshot: persistedOrder.shippingAddressSnapshot || null,
            items: persistedOrder.items || [],
            whatsappConfirmation: persistedOrder.whatsappConfirmation || null,
            updatedAt: new Date(),
          },
        });
      persistedInPg = true;
    } catch (pgErr: any) {
      console.warn("[PostgreSQL] Failed to persist order:", pgErr?.message || pgErr);
    }

    return Response.json({
      success: true,
      message: alreadyConfirmed
        ? "Order updated; WhatsApp confirmation was already dispatched"
        : "Order successfully persisted and WhatsApp confirmation initiated",
      order: persistedOrder,
      whatsappNotification,
      storage: persistedInPg ? "postgresql" : "memory_sync",
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to process order" }, { status: 500 });
  }
}
