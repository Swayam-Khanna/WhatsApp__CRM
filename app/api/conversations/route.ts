import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../backend/db.ts";
import { crmMessages } from "../../../backend/schema/crm.ts";
import { desc } from "drizzle-orm";
import { getDatabase } from "../../../lib/mongodb.ts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const crmOrders = globalThis.__globalCrmOrders || [];
  let feed = globalThis.__globalWhatsAppFeed || [];

  // 1. Primary: PostgreSQL via Drizzle ORM
  try {
    const pgMsgs = await db
      .select()
      .from(crmMessages)
      .orderBy(desc(crmMessages.createdAt))
      .limit(500);

    if (pgMsgs && pgMsgs.length > 0) {
      const mapped = pgMsgs.map((m: any) => ({
        id: m.id,
        direction: m.direction,
        sender: m.sender,
        from: m.from,
        to: m.to,
        customerName: m.customerName,
        text: m.text,
        type: m.type,
        mediaId: m.mediaId,
        mimeType: m.mimeType,
        status: m.status,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      }));
      const merged = [...feed, ...mapped];
      const seen = new Set();
      feed = merged.filter((m: any) => {
        if (!m.id || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    }
  } catch (pgErr: any) {
    console.warn("[Conversations GET] PostgreSQL note:", pgErr?.message || pgErr);
  }

  // 2. Fallback: MongoDB Atlas (if configured)
  try {
    const mongoDb = await getDatabase();
    if (mongoDb) {
      const dbMsgs = await mongoDb
        .collection("crm_messages")
        .find({})
        .sort({ createdAt: -1, timestamp: -1 })
        .limit(500)
        .toArray();

      const merged = [...feed, ...dbMsgs];
      const seen = new Set();
      feed = merged.filter((m: any) => {
        if (!m.id || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    }
  } catch (e) {
    // MongoDB optional in PostgreSQL-first deployments
  }

  // Group by customer phone
  const convMap = new Map<string, any>();

  // Process live feed
  feed.forEach((msg) => {
    const isInbound = msg.direction === "inbound" || msg.sender === "customer";
    const rawPhone = (isInbound ? msg.from : msg.to) || "9999999999";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const phoneKey = cleanPhone.slice(-10);
    if (!phoneKey || phoneKey === "8091265690") return;

    if (!convMap.has(phoneKey)) {
      convMap.set(phoneKey, {
        id: `conv-${phoneKey}`,
        contactId: `c-${phoneKey}`,
        name: msg.customerName || `Customer (+91 ${phoneKey})`,
        phone: rawPhone.startsWith("+91") ? rawPhone : `+91 ${phoneKey}`,
        avatar: "",
        lastMessage: msg.text,
        lastMessageTime: msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "Just now",
        unreadCount: isInbound ? 1 : 0,
        assignedTo: "Nishant (Store Admin)",
        leadStage: "Active Inquiry",
        tags: ["WhatsApp Live Customer", "Himalayan Harvest"],
        isPinned: true,
        isOnline: true,
        source: "WhatsApp",
        isServiceWindowActive: true,
        serviceWindowHoursRemaining: 24,
        messages: [],
      });
    }

    const conv = convMap.get(phoneKey);
    const timeStr = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "Just now";

    conv.lastMessage = msg.text;
    conv.lastMessageTime = timeStr;

    const alreadyHas = conv.messages.some((m: any) => m.id === msg.id);
    if (!alreadyHas) {
      conv.messages.push({
        id: msg.id || `msg_${Date.now()}`,
        sender: isInbound ? "customer" : "agent",
        senderName: isInbound ? conv.name : "Nishant",
        text: msg.text,
        timestamp: timeStr,
        status: msg.status || "delivered",
      });
    }
  });

  // Process CRM orders
  crmOrders.forEach((ord) => {
    const rawPhone = ord.customerPhone || "9999999999";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const phoneKey = cleanPhone.slice(-10);
    if (!phoneKey || phoneKey === "8091265690") return;

    const orderTotal = ord.totalPaise ? ord.totalPaise / 100 : ord.amount || 0;
    const itemsSummary = Array.isArray(ord.items) && ord.items.length > 0
      ? ord.items.map((i: any) => `${i.productName || i.name} × ${i.quantity || i.qty || 1}`).join(", ")
      : "Himalayan Harvest Produce";

    if (!convMap.has(phoneKey)) {
      convMap.set(phoneKey, {
        id: `conv-${phoneKey}`,
        contactId: `c-${phoneKey}`,
        name: ord.customerName || "Prajnaa Customer",
        phone: rawPhone.startsWith("+91") ? rawPhone : `+91 ${phoneKey}`,
        avatar: "",
        lastMessage: `🌾 Order #${ord.orderNumber || ord.id}: ${itemsSummary}`,
        lastMessageTime: "Just now",
        unreadCount: 1,
        assignedTo: "Nishant (Store Admin)",
        leadStage: "Order Confirmed",
        tags: ["Website Order", "WhatsApp Checkout"],
        isPinned: true,
        isOnline: true,
        dealValue: orderTotal,
        source: "WhatsApp",
        isServiceWindowActive: true,
        serviceWindowHoursRemaining: 24,
        currentRequest: {
          items: Array.isArray(ord.items) ? ord.items.map((i: any) => `${i.productName || i.name} × ${i.quantity || 1}`) : [itemsSummary],
          requestedAt: "Just now",
          fulfillmentType: "DELIVERY",
          status: "CONFIRMED",
        },
        messages: [
          {
            id: `msg_ord_in_${ord.orderNumber || ord.id}`,
            sender: "customer",
            senderName: ord.customerName || "Customer",
            text: `Namaste Nishant ji! 🙏 Maine website se order place kiya hai:\n\n🌾 Order #${ord.orderNumber || ord.id}\nItems: ${itemsSummary}\nTotal: ₹${orderTotal.toLocaleString("en-IN")}\nPayment Method: WhatsApp Order & Direct Payment`,
            timestamp: "Just now",
            status: "delivered",
          },
          {
            id: `msg_ord_out_${ord.orderNumber || ord.id}`,
            sender: "agent",
            senderName: "Nishant",
            text: `Namaste ${ord.customerName || "ji"}! 🙏 Aapka order #${ord.orderNumber || ord.id} record ho gaya hai. Hum pure Himalayan harvest direct farms se pack kar rahe hain. 2-3 din me Speed Post dispatch ho jayega.`,
            timestamp: "Just now",
            status: "delivered",
          },
        ],
      });
    }
  });

  const conversations = Array.from(convMap.values());
  return NextResponse.json({ success: true, data: conversations });
}
