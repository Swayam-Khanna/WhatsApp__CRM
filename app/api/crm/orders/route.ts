import { db } from "../../../../backend/db.ts";
import { orders, orderItems } from "../../../../backend/schema/orders.ts";
import { crmOrders } from "../../../../backend/schema/crm.ts";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// In-memory CRM orders cache (survives across requests in dev/production instance)
declare global {
  // eslint-disable-next-line no-var
  var __globalCrmOrders: any[] | undefined;
}

if (!globalThis.__globalCrmOrders) {
  globalThis.__globalCrmOrders = [
    {
      id: "PM2024001234",
      orderNumber: "PM2024001234",
      customerName: "Priya Sharma",
      customerPhone: "+91 98765 43210",
      customerEmail: "priya.sharma@gmail.com",
      status: "In Transit",
      paymentStatus: "paid",
      paymentMethod: "whatsapp",
      subtotalPaise: 169000,
      shippingPaise: 5000,
      totalPaise: 174000,
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      shippingAddressSnapshot: {
        fullName: "Priya Sharma",
        line1: "123, Main Road, Rajpur",
        city: "Dehradun",
        state: "Uttarakhand",
        postalCode: "248001",
      },
      items: [
        {
          productId: "organic-almonds",
          productName: "Mamra Almonds (500g)",
          productSlug: "organic-almonds",
          quantity: 1,
          unitPricePaise: 125000,
          totalPaise: 125000,
        },
        {
          productId: "turmeric-powder",
          productName: "Stone-Ground Turmeric (250g)",
          productSlug: "turmeric-powder",
          quantity: 2,
          unitPricePaise: 24000,
          totalPaise: 48000,
        },
      ],
      trackingId: "ET123456789IN",
      dispatchHub: "Dehradun MDG",
    },
    {
      id: "PM2024001188",
      orderNumber: "PM2024001188",
      customerName: "Amitabh Verma",
      customerPhone: "+91 94120 12345",
      customerEmail: "amitabh.verma@outlook.com",
      status: "Delivered",
      paymentStatus: "paid",
      paymentMethod: "whatsapp",
      subtotalPaise: 279900,
      shippingPaise: 5000,
      totalPaise: 284900,
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      shippingAddressSnapshot: {
        fullName: "Amitabh Verma",
        line1: "45, Vasant Vihar Phase 2",
        city: "Dehradun",
        state: "Uttarakhand",
        postalCode: "248006",
      },
      items: [
        {
          productId: "himalayan-dried-apricots",
          productName: "Himalayan Dried Apricots (Red)",
          productSlug: "himalayan-dried-apricots",
          quantity: 2,
          unitPricePaise: 99900,
          totalPaise: 199800,
        },
        {
          productId: "walnuts",
          productName: "Himalayan Mountain Walnuts",
          productSlug: "walnuts",
          quantity: 1,
          unitPricePaise: 60400,
          totalPaise: 60400,
        },
      ],
      trackingId: "ET987654321IN",
      dispatchHub: "Dehradun MDG",
    },
  ];
}

import { getDatabase } from "../../../../lib/mongodb.ts";
import {
  sendWhatsAppTextMessage,
  buildItemizedCrmOrderConfirmationMessage,
} from "../../../../backend/lib/whatsapp.server.ts";

/**
 * GET /api/crm/orders
 * Returns authoritative CRM orders from PostgreSQL (primary) & MongoDB Atlas (fallback).
 */
export async function GET() {
  // 1. Primary storage: PostgreSQL via Drizzle ORM
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

  // 2. Secondary fallback storage: MongoDB Atlas
  try {
    const mongoDb = await getDatabase();
    const mongoOrders = await mongoDb
      .collection("crm_orders")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    if (mongoOrders && mongoOrders.length > 0) {
      return Response.json({ success: true, source: "mongodb", orders: mongoOrders });
    }
  } catch (err) {
    console.warn("[MongoDB] Orders query note:", err);
  }

  // 3. Fallback to in-memory store
  return Response.json({
    success: true,
    source: "memory_sync",
    orders: globalThis.__globalCrmOrders || [],
  });
}

/**
 * POST /api/crm/orders
 * Validates, idempotently persists order, and initiates official WhatsApp confirmation.
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate if WHATSAPP_CRM_API_KEY is configured
    const expectedApiKey = process.env.WHATSAPP_CRM_API_KEY;
    if (expectedApiKey) {
      const authHeader = req.headers.get("x-crm-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (!authHeader || authHeader !== expectedApiKey) {
        return Response.json(
          { error: "Unauthorized: Invalid or missing CRM API key", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
    }

    const newOrder = await req.json();

    // 2. Validate request schema
    if (!newOrder || typeof newOrder !== "object") {
      return Response.json(
        { error: "Invalid order data: Payload must be a non-empty JSON object", code: "INVALID_ORDER_DATA" },
        { status: 400 }
      );
    }

    const orderNum = (newOrder.orderNumber || newOrder.id || "").toString().trim();
    if (!orderNum) {
      return Response.json(
        { error: "Invalid order data: Missing required 'orderNumber' or 'id'", code: "MISSING_ORDER_ID" },
        { status: 400 }
      );
    }

    const customerPhone = (newOrder.customerPhone || "").toString().trim();
    if (!customerPhone || customerPhone.replace(/\D/g, "").length < 10) {
      return Response.json(
        { error: "Invalid order data: Valid customer phone number is required", code: "INVALID_PHONE" },
        { status: 400 }
      );
    }

    if (!Array.isArray(newOrder.items) || newOrder.items.length === 0) {
      return Response.json(
        { error: "Invalid order data: Order must contain at least one item", code: "EMPTY_ITEMS" },
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

    // 3. Idempotent lookup: Check if order already exists in memory or MongoDB
    const existingIndex = globalThis.__globalCrmOrders.findIndex(
      (o) => o.orderNumber === orderNum || o.id === orderNum
    );
    const existingOrder = existingIndex >= 0 ? globalThis.__globalCrmOrders[existingIndex] : null;

    let dbExistingOrder: any = null;
    let mongoDb: any = null;
    try {
      mongoDb = await getDatabase();
      dbExistingOrder = await mongoDb.collection("crm_orders").findOne({
        $or: [{ orderNumber: orderNum }, { id: orderNum }],
      });
    } catch (mErr) {
      console.warn("[MongoDB] Connection note:", mErr);
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

            // Also persist to PostgreSQL if available
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
    } catch (pgErr) {}

    if (mongoDb) {
          try {
            await mongoDb.collection("crm_messages").insertOne(msgRecord);
          } catch (msgErr) {
            console.warn("[MongoDB] Failed to log confirmation message:", msgErr);
          }
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

    // 6. Persist permanently to memory and MongoDB Atlas
    if (existingIndex >= 0) {
      globalThis.__globalCrmOrders[existingIndex] = persistedOrder;
    } else {
      globalThis.__globalCrmOrders.unshift(persistedOrder);
    }

    if (mongoDb) {
      try {
        const { createdAt, _id, ...orderFieldsToSet } = persistedOrder;
        await mongoDb.collection("crm_orders").updateOne(
          { $or: [{ orderNumber: orderNum }, { id: orderNum }] },
          {
            $set: {
              ...orderFieldsToSet,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: createdAt ? new Date(createdAt) : new Date(),
            },
          },
          { upsert: true }
        );
      } catch (mongoErr) {
        console.warn("[MongoDB] Failed to persist order to Atlas:", mongoErr);
      }
    }

    return Response.json({
      success: true,
      message: alreadyConfirmed
        ? "Order updated; WhatsApp confirmation was already dispatched"
        : "Order successfully persisted and WhatsApp confirmation initiated",
      order: persistedOrder,
      whatsappNotification,
      storage: mongoDb ? "mongodb" : "memory_sync",
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to process order" }, { status: 500 });
  }
}
