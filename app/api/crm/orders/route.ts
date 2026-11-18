import {
  db as pgDb,
  isPostgresConfigured,
  isPostgresAvailable,
  reportPostgresFailure,
  reportPostgresSuccess,
} from "../../../../backend/db.ts";
import { crmOrders } from "../../../../backend/schema/crm.ts";
import { desc } from "drizzle-orm";
import { getDatabase } from "../../../../lib/mongodb.ts";
import {
  sendWhatsAppTextMessage,
  buildItemizedCrmOrderConfirmationMessage,
} from "../../../../backend/lib/whatsapp.server.ts";
import {
  getStoredOrders,
  saveStoredOrder,
  saveStoredMessage,
} from "../../../../backend/lib/crm-store.server.ts";

export const dynamic = "force-dynamic";

let cachedOrders: { data: any; timestamp: number } | null = null;

function invalidateOrdersCache() {
  cachedOrders = null;
}

/**
 * GET /api/crm/orders
 * Returns authoritative CRM orders combining PostgreSQL, MongoDB, and Persistent Disk Store.
 * Guarantees every device sees identical orders.
 */
export async function GET() {
  // 1. Return from in-memory cache if fresh (2.5 second TTL)
  if (cachedOrders && Date.now() - cachedOrders.timestamp < 2500) {
    return Response.json(cachedOrders.data);
  }

  const storedOrders = getStoredOrders();
  let pgOrders: any[] = [];
  let mongoOrders: any[] = [];

  // 2. Primary relational storage: PostgreSQL (when configured & available)
  if (isPostgresAvailable()) {
    try {
      pgOrders = await pgDb
        .select()
        .from(crmOrders)
        .orderBy(desc(crmOrders.createdAt))
        .limit(100);
      reportPostgresSuccess();
    } catch (err: any) {
      reportPostgresFailure(err);
      console.warn("[PostgreSQL] CRM orders query note:", err?.message || err);
    }
  }

  // 3. Fallback database: MongoDB Atlas
  try {
    const mongoDb = await getDatabase();
    if (mongoDb) {
      mongoOrders = await mongoDb
        .collection("crm_orders")
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
    }
  } catch (err) {
    console.warn("[MongoDB] Orders query note:", err);
  }

  // 3.5. Universal Cloud Sync: When running in local dev / hybrid mode,
  // pull live orders from production (crm.prajnaa.in)
  let prodOrders: any[] = [];
  try {
    const isLocal = process.env.NEXT_PUBLIC_APP_URL?.includes("localhost") || !process.env.VERCEL;
    if (isLocal) {
      const controller = new AbortController();
      const fetchTimer = setTimeout(() => controller.abort(), 2500);
      const prodRes = await fetch("https://crm.prajnaa.in/api/crm/orders", {
        signal: controller.signal,
        headers: { "x-crm-source": "local-sync" },
      });
      clearTimeout(fetchTimer);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (Array.isArray(prodData.orders)) {
          prodOrders = prodData.orders;
          prodOrders.forEach((ro: any) => {
            if (ro && (ro.orderNumber || ro.id)) {
              saveStoredOrder(ro);
            }
          });
        }
      }
    }
  } catch (err) {
    // Silently continue if offline
  }

  // Deduplicate orders by orderNumber / id
  const orderMap = new Map<string, any>();

  // Order of precedence: PostgreSQL > MongoDB > Production Cloud > Persistent Disk Store
  storedOrders.forEach((o) => {
    const num = (o.orderNumber || o.id || "").toString().trim();
    if (num) orderMap.set(num, o);
  });

  prodOrders.forEach((o) => {
    const num = (o.orderNumber || o.id || "").toString().trim();
    if (num) orderMap.set(num, { ...orderMap.get(num), ...o });
  });

  mongoOrders.forEach((o) => {
    const num = (o.orderNumber || o.id || "").toString().trim();
    if (num) orderMap.set(num, { ...orderMap.get(num), ...o });
  });

  pgOrders.forEach((o) => {
    const num = (o.orderNumber || o.id || "").toString().trim();
    if (num) orderMap.set(num, { ...orderMap.get(num), ...o });
  });

  const merged = Array.from(orderMap.values());
  const payload = {
    success: true,
    orders: merged,
    total: merged.length,
    source: "persistent_universal",
  };

  cachedOrders = { data: payload, timestamp: Date.now() };
  return Response.json(payload);
}

/**
 * POST /api/crm/orders
 * Validates, idempotently persists order, and initiates official WhatsApp confirmation.
 * Persists universally to disk, PostgreSQL, and MongoDB so every device gets the exact same state.
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

    const totalPaise = Number(newOrder.totalPaise ?? (newOrder.amount ? newOrder.amount * 100 : 0));

    // 3. Lookup existing order in persistent store or MongoDB
    const storedList = getStoredOrders();
    const existingOrder = storedList.find(
      (o) => o.orderNumber === orderNum || o.id === orderNum
    );

    let mongoDb: any = null;
    let dbExistingOrder: any = null;
    try {
      mongoDb = await getDatabase();
      if (mongoDb) {
        dbExistingOrder = await mongoDb.collection("crm_orders").findOne({
          $or: [{ orderNumber: orderNum }, { id: orderNum }],
        });
      }
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

    // 5. WhatsApp Confirmation
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
    } else if (Array.isArray(persistedOrder.items) && persistedOrder.items.length > 0) {
      try {
        const confirmationMessage = buildItemizedCrmOrderConfirmationMessage({
          customerName: persistedOrder.customerName || "Customer",
          orderNumber: orderNum,
          items: persistedOrder.items,
          totalPaise: persistedOrder.totalPaise,
          paymentStatus: persistedOrder.paymentStatus,
          shippingPaise: persistedOrder.shippingPaise,
          discountPaise: persistedOrder.discountPaise,
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

        // Log confirmation message
        const msgRecord = {
          id: sendResult.messageId || `msg_conf_${Date.now()}`,
          direction: "outbound",
          sender: "business",
          from: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
          to: sendResult.recipientPhone || customerPhone,
          customerName: persistedOrder.customerName,
          text: confirmationMessage,
          timestamp: new Date().toISOString(),
          status: "sent",
          orderNumber: orderNum,
          type: "order_confirmation",
          mode: sendResult.mode,
          whatsappUrl: sendResult.whatsappUrl || null,
          createdAt: new Date().toISOString(),
        };

        saveStoredMessage(msgRecord);

        if (mongoDb) {
          try {
            await mongoDb.collection("crm_messages").insertOne(msgRecord);
          } catch {}
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

    // 6. Save order to Persistent Disk Store
    saveStoredOrder(persistedOrder);

    // 7. Save to PostgreSQL if configured & available
    if (isPostgresAvailable()) {
      try {
        await pgDb
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
        reportPostgresSuccess();
      } catch (pgErr) {
        reportPostgresFailure(pgErr);
        console.warn("[PostgreSQL] Order persist note:", pgErr);
      }
    }

    // 8. Save to MongoDB Atlas if available
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
        console.warn("[MongoDB] Order persist note:", mongoErr);
      }
    }

    invalidateOrdersCache();

    return Response.json({
      success: true,
      order: persistedOrder,
      whatsapp: whatsappNotification,
      storage: "persistent_universal",
    });
  } catch (err: any) {
    console.error("[CRM Orders POST Error]:", err);
    return Response.json(
      { error: "Internal Server Error: Failed to process order", code: "INTERNAL_ERROR", details: err?.message },
      { status: 500 }
    );
  }
}
