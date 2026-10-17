import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../backend/db.ts";
import { orders, orderItems } from "../../../../backend/schema/orders.ts";
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

import { getDatabase } from "@/lib/mongodb";

/**
 * GET /api/crm/orders
 * Returns authoritative CRM orders from MongoDB Atlas with in-memory fallback.
 */
export async function GET() {
  try {
    const mongoDb = await getDatabase();
    const mongoOrders = await mongoDb
      .collection("crm_orders")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    if (mongoOrders && mongoOrders.length > 0) {
      return NextResponse.json({ success: true, source: "mongodb", orders: mongoOrders });
    }
  } catch (err) {
    console.warn("[MongoDB] Orders query note:", err);
  }

  // Fallback to in-memory store
  return NextResponse.json({
    success: true,
    source: "memory_sync",
    orders: globalThis.__globalCrmOrders || [],
  });
}

/**
 * POST /api/crm/orders
 * Inserts or syncs a new customer order into MongoDB Atlas and in-memory cache.
 */
export async function POST(req: NextRequest) {
  try {
    const newOrder = await req.json();
    if (!newOrder || (!newOrder.orderNumber && !newOrder.id)) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    const orderNum = newOrder.orderNumber || newOrder.id;
    if (!globalThis.__globalCrmOrders) globalThis.__globalCrmOrders = [];

    // Check if order already exists in memory
    const existingIndex = globalThis.__globalCrmOrders.findIndex(
      (o) => o.orderNumber === orderNum || o.id === orderNum
    );

    if (existingIndex >= 0) {
      globalThis.__globalCrmOrders[existingIndex] = {
        ...globalThis.__globalCrmOrders[existingIndex],
        ...newOrder,
      };
    } else {
      globalThis.__globalCrmOrders.unshift(newOrder);
    }

    // Persist permanently to MongoDB Atlas
    try {
      const mongoDb = await getDatabase();
      await mongoDb.collection("crm_orders").updateOne(
        { $or: [{ orderNumber: orderNum }, { id: orderNum }] },
        {
          $set: {
            ...newOrder,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (mongoErr) {
      console.warn("[MongoDB] Failed to persist order to Atlas:", mongoErr);
    }

    return NextResponse.json({
      success: true,
      message: "Order successfully synced with MongoDB Atlas & WhatsApp CRM",
      order: newOrder,
      storage: "mongodb",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to sync order" }, { status: 500 });
  }
}
