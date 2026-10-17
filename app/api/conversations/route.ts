import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const crmOrders = globalThis.__globalCrmOrders || [];
  const feed = globalThis.__globalWhatsAppFeed || [];

  // Group by customer phone
  const convMap = new Map<string, any>();

  // Process live feed
  feed.forEach((msg) => {
    const rawPhone = msg.from || msg.to || "9999999999";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const phoneKey = cleanPhone.slice(-10);

    if (!convMap.has(phoneKey)) {
      convMap.set(phoneKey, {
        id: `conv-${phoneKey}`,
        contactId: `c-${phoneKey}`,
        name: msg.customerName || `Customer (${phoneKey})`,
        phone: rawPhone.startsWith("+91") ? rawPhone : `+91 ${phoneKey}`,
        avatar: "",
        lastMessage: msg.text,
        lastMessageTime: "Just now",
        unreadCount: msg.direction === "inbound" ? 1 : 0,
        assignedTo: "Nishant (Store Admin)",
        leadStage: "Order Placed",
        tags: ["WhatsApp Checkout", "Himalayan Harvest"],
        isPinned: true,
        isOnline: true,
        source: "WhatsApp",
        isServiceWindowActive: true,
        serviceWindowHoursRemaining: 24,
        messages: [],
      });
    }

    const conv = convMap.get(phoneKey);
    conv.messages.push({
      id: msg.id || `msg_${Date.now()}`,
      sender: msg.direction === "inbound" ? "customer" : "agent",
      senderName: msg.direction === "inbound" ? conv.name : "Nishant",
      text: msg.text,
      timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
      status: msg.status || "delivered",
    });
  });

  // Process CRM orders
  crmOrders.forEach((ord) => {
    const rawPhone = ord.customerPhone || "9999999999";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const phoneKey = cleanPhone.slice(-10);

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
            status: "read",
          },
        ],
      });
    }
  });

  const conversations = Array.from(convMap.values());
  return NextResponse.json({ success: true, data: conversations });
}
