export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  sender: "customer" | "agent" | "system";
  text: string;
  timestamp: string;
  createdAt?: string;
  status: "sent" | "delivered" | "read" | "failed";
  mediaUrl?: string;
  mediaType?: "image" | "document" | "audio" | "video";
  mediaId?: string;
  mimeType?: string;
  filename?: string;
  templateName?: string;
}

export interface WhatsAppConversation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  avatar?: string;
  lastMessageText: string;
  lastMessageTime: string;
  unreadCount: number;
  assignedAgent?: string;
  status: "active" | "resolved" | "pending_payment" | "packed" | "dispatched";
  orderId?: string;
  orderNumber?: string;
  orderTotalPaise?: number;
  orderStatus?: string;
  orderPaymentStatus?: string;
  orderItemsSummary?: string;
  shippingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  consignmentNumber?: string;
  carrier?: string;
  tags: string[];
}

export interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerState: string;
  pincode: string;
  totalAmountPaise: number;
  items: Array<{
    name: string;
    weight?: string;
    quantity: number;
    pricePaise: number;
    image?: string;
  }>;
  stage: "awaiting_payment" | "payment_confirmed" | "packing" | "ready_for_dispatch" | "shipped_india_post" | "shipped_shipping" | "delivered";
  paymentMethod: "whatsapp" | "cod" | "razorpay" | "cashfree";
  paymentStatus: "pending" | "collected" | "refunded";
  placedAt: string;
  packingStartedAt?: string;
  processingDay: number; // 1, 2, or 3
  consignmentNumber?: string;
  carrier: "Shipping" | "Shipping (Standard)" | "Shipping (Express)" | "India Post Speed Post" | "India Post Registered" | "Delhivery";
  notes?: string;
}

export interface BroadcastCampaign {
  id: string;
  name: string;
  templateName: string;
  audienceSegment: "all_customers" | "repeat_buyers" | "high_value" | "dry_fruits_buyers" | "opted_in";
  audienceCount: number;
  status: "draft" | "scheduled" | "sending" | "completed" | "cancelled";
  scheduledFor?: string;
  sentAt?: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  previewMessage: string;
  tags: string[];
}

export interface IndiaPostConsignment {
  consignmentNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  destinationPincode: string;
  serviceType: "Speed Post" | "Registered Parcel";
  bookingDate: string;
  currentStatus: "Booked" | "In Transit" | "Arrived at Hub" | "Out for Delivery" | "Delivered";
  lastLocation: string;
  lastUpdated: string;
  weightGrams: number;
  whatsappNotified: boolean;
  timeline: Array<{
    date: string;
    status: string;
    location: string;
  }>;
}

// Default Prajnaa WhatsApp Business Context
export const PRAJNAA_WHATSAPP_CONFIG = {
  businessNumber: "+91 80912 65690",
  businessNumberClean: "918091265690",
  businessName: "Prajnaa Market",
  tagline: "Pure Himalayan Produce • Direct from Mountain Farmers",
  upiId: "8091265690@okbizaxis",
  bankDetails: {
    accountName: "Prajnaa Farm Produce Pvt Ltd",
    accountNumber: "91809126569001",
    bankName: "HDFC Bank",
    ifsc: "HDFC0001824",
    branch: "Shimla Mall Road",
  },
  processingDaysMin: 2,
  processingDaysMax: 3,
};

// Seed Conversations with authentic Prajnaa orders & customers
const INITIAL_CONVERSATIONS: WhatsAppConversation[] = [];

const INITIAL_MESSAGES: Record<string, WhatsAppMessage[]> = {};

const INITIAL_FULFILLMENT_ORDERS: FulfillmentOrder[] = [];

const INITIAL_CAMPAIGNS: BroadcastCampaign[] = [];

const INITIAL_CONSIGNMENTS: IndiaPostConsignment[] = [];


export interface AutomationRule {
  id: string;
  name: string;
  trigger: "order_placed" | "payment_received" | "packing_started" | "parcel_dispatched" | "parcel_delivered";
  condition: string;
  action: string;
  messageTemplate: string;
  enabled: boolean;
  executionsCount: number;
}

export interface CustomerContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  totalOrders: number;
  totalSpendPaise: number;
  tags: string[];
  lastOrderDate: string;
  optInStatus: boolean;
}

const INITIAL_AUTOMATIONS: AutomationRule[] = [
  {
    id: "auto_1",
    name: "Instant Order Placed & Payment Confirmation",
    trigger: "order_placed",
    condition: "Payment method is 'whatsapp'",
    action: "Send short order confirmation with official UPI details",
    messageTemplate: "Namaste {{customer_name}} ji! Aapka order #{{order_number}} successfully receive ho gaya hai. Payment details: prajnaa@upi.",
    enabled: true,
    executionsCount: 248,
  },
  {
    id: "auto_2",
    name: "Payment Confirmed Alert",
    trigger: "payment_received",
    condition: "Payment status changes to 'collected'",
    action: "Send short payment confirmation",
    messageTemplate: "Thank you {{customer_name}} ji! Aapka payment confirm ho gaya hai.",
    enabled: true,
    executionsCount: 214,
  },
  {
    id: "auto_3",
    name: "Order Processing Update",
    trigger: "packing_started",
    condition: "Order in packing for >24 hours",
    action: "Send short processing timeline",
    messageTemplate: "Ji, aapka order processing mein hai. Dispatch mein lagbhag 2–3 din lag sakte hain.",
    enabled: true,
    executionsCount: 182,
  },
  {
    id: "auto_4",
    name: "Shipping Dispatch Alert",
    trigger: "parcel_dispatched",
    condition: "Consignment ID assigned",
    action: "Send short dispatch alert with tracking link",
    messageTemplate: "Good news {{customer_name}} ji! Aapka order dispatch ho gaya hai. Tracking: Shipping Portal (Consignment: {{consignment_id}})",
    enabled: true,
    executionsCount: 169,
  },
  {
    id: "auto_5",
    name: "Delivery Confirmation",
    trigger: "parcel_delivered",
    condition: "Speed Post status is 'Delivered'",
    action: "Send short delivery confirmation",
    messageTemplate: "Ji, aapka order successfully deliver ho gaya hai. Thank you!",
    enabled: true,
    executionsCount: 154,
  },
];

const INITIAL_CUSTOMERS: CustomerContact[] = [];

// In-Memory & LocalStorage Service
class WhatsAppCrmService {
  private getStorageKey(key: string) {
    return `prajnaa_wa_crm_${key}`;
  }

  // 1. Conversations
  getConversations(): WhatsAppConversation[] {
    if (typeof window === "undefined") return INITIAL_CONVERSATIONS;
    try {
      const deletedPhones: string[] = JSON.parse(
        localStorage.getItem(this.getStorageKey("deleted_phones")) || "[]"
      );
      const globalDeleted: string[] = JSON.parse(
        localStorage.getItem("prajnaa_deleted_phones") || "[]"
      );
      const allDeleted = new Set([...deletedPhones, ...globalDeleted]);

      const data = localStorage.getItem(this.getStorageKey("conversations"));
      const list: WhatsAppConversation[] = data ? JSON.parse(data) : INITIAL_CONVERSATIONS;
      return list.filter((c) => {
        const clean = (c.customerPhone || "").replace(/\D/g, "").slice(-10);
        return !allDeleted.has(clean);
      });
    } catch {
      return INITIAL_CONVERSATIONS;
    }
  }

  saveConversations(conversations: WhatsAppConversation[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.getStorageKey("conversations"), JSON.stringify(conversations));
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      const conversations = this.getConversations();
      const target = conversations.find((c) => c.id === conversationId);
      const updated = conversations.filter((c) => c.id !== conversationId);
      this.saveConversations(updated);

      localStorage.removeItem(this.getStorageKey(`messages_${conversationId}`));

      const targetPhone = target?.customerPhone || "";
      const cleanPhone = targetPhone.replace(/\D/g, "").slice(-10);

      if (cleanPhone) {
        const deletedPhones: string[] = JSON.parse(
          localStorage.getItem(this.getStorageKey("deleted_phones")) || "[]"
        );
        if (!deletedPhones.includes(cleanPhone)) {
          deletedPhones.push(cleanPhone);
          localStorage.setItem(this.getStorageKey("deleted_phones"), JSON.stringify(deletedPhones));
        }

        const globalDeleted: string[] = JSON.parse(
          localStorage.getItem("prajnaa_deleted_phones") || "[]"
        );
        if (!globalDeleted.includes(cleanPhone)) {
          globalDeleted.push(cleanPhone);
          localStorage.setItem("prajnaa_deleted_phones", JSON.stringify(globalDeleted));
        }

        try {
          await fetch(
            `/api/crm/messages?phone=${encodeURIComponent(cleanPhone)}&customerId=${encodeURIComponent(conversationId)}`,
            { method: "DELETE" }
          );
        } catch (err) {
          console.warn("[CRM Service] Backend delete error:", err);
        }
      }
      return true;
    } catch (err) {
      console.error("[CRM Service] Delete conversation failed:", err);
      return false;
    }
  }

  // 2. Messages
  getMessages(conversationId: string): WhatsAppMessage[] {
    if (typeof window === "undefined") return INITIAL_MESSAGES[conversationId] || [];
    try {
      const all = localStorage.getItem(this.getStorageKey(`messages_${conversationId}`));
      const rawList: WhatsAppMessage[] = all ? JSON.parse(all) : INITIAL_MESSAGES[conversationId] || [];
      const seenIds = new Set<string>();
      const seenSigs = new Set<string>();
      const cleanList: WhatsAppMessage[] = [];
      for (const m of rawList) {
        if (!m || !m.text) continue;
        if (m.id && seenIds.has(m.id)) continue;
        const sig = `${m.sender}_${m.text.trim()}`;
        if (seenSigs.has(sig) && !m.id?.startsWith("wamid.")) continue;
        if (m.id) seenIds.add(m.id);
        seenSigs.add(sig);
        cleanList.push(m);
      }
      return cleanList;
    } catch {
      return INITIAL_MESSAGES[conversationId] || [];
    }
  }

  async sendMessage(conversationId: string, text: string, sender: "agent" | "customer" = "agent"): Promise<WhatsAppMessage> {
    const messages = this.getMessages(conversationId);
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Deduplication guard: ignore rapid double submission within 2.5 seconds
    const recentDuplicate = messages.find(
      (m) =>
        m.sender === sender &&
        m.text.trim() === text.trim() &&
        m.createdAt &&
        Math.abs(now.getTime() - new Date(m.createdAt).getTime()) < 2500
    );
    if (recentDuplicate) {
      return recentDuplicate;
    }

    const newMsg: WhatsAppMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      sender,
      text,
      timestamp: timeString,
      createdAt: now.toISOString(),
      status: "sent",
    };

    messages.push(newMsg);
    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey(`messages_${conversationId}`), JSON.stringify(messages));
    }

    // Update conversation last message
    const conversations = this.getConversations();
    const targetIdx = conversations.findIndex((c) => c.id === conversationId);
    let targetPhone = "";
    let customerName = "";
    let orderNumber = "";
    if (targetIdx !== -1) {
      conversations[targetIdx].lastMessageText = text;
      conversations[targetIdx].lastMessageTime = timeString;
      targetPhone = conversations[targetIdx].customerPhone || "";
      customerName = conversations[targetIdx].customerName || "";
      orderNumber = conversations[targetIdx].orderNumber || "";
      if (sender === "agent") {
        conversations[targetIdx].unreadCount = 0;
      } else {
        conversations[targetIdx].unreadCount = (conversations[targetIdx].unreadCount || 0) + 1;
      }
      this.saveConversations(conversations);
    }

    // Real API call to Meta Cloud API via CRM Backend
    if (sender === "agent" && targetPhone && typeof window !== "undefined") {
      try {
        const res = await fetch("/api/crm/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: targetPhone,
            text,
            customerName,
            orderNumber,
            sender: "business",
          }),
        });
        const data = await res.json();
        if (data.success) {
          newMsg.id = data.result?.messageId || newMsg.id;
          if (data.result?.success) {
            newMsg.status = "delivered";
            (newMsg as any).metaStatus = "delivered";
          } else {
            // Meta status is pending verification: message is successfully recorded in CRM pipeline
            newMsg.status = "sent";
            (newMsg as any).metaStatus = "pending";
            (newMsg as any).whatsappUrl = data.result?.whatsappUrl;
            (newMsg as any).metaPending = true;
          }
        } else {
          newMsg.status = "failed";
          (newMsg as any).error = data.error || "Failed to record message";
        }
      } catch (err: any) {
        newMsg.status = "failed";
        (newMsg as any).error = err.message || "Network error";
      }

      // Update persisted message status in localStorage
      localStorage.setItem(this.getStorageKey(`messages_${conversationId}`), JSON.stringify(messages));
    }

    return newMsg;
  }

  async syncLiveMessages(): Promise<{ newMessagesCount: number }> {
    if (typeof window === "undefined") return { newMessagesCount: 0 };
    try {
      const res = await fetch("/api/crm/messages");
      if (!res.ok) return { newMessagesCount: 0 };
      const data = await res.json();
      if (!data.success || !Array.isArray(data.messages)) return { newMessagesCount: 0 };

      let updatedCount = 0;
      const conversations = this.getConversations();

      const deletedPhones: string[] = JSON.parse(
        localStorage.getItem(this.getStorageKey("deleted_phones")) || "[]"
      );
      const globalDeleted: string[] = JSON.parse(
        localStorage.getItem("prajnaa_deleted_phones") || "[]"
      );
      const allDeleted = new Set([...deletedPhones, ...globalDeleted]);

      for (const msg of data.messages) {
        const isInbound = msg.direction === "inbound" || msg.sender === "customer";
        const customerRawPhone = isInbound ? msg.from : msg.to;
        const cleanMsgPhone = (customerRawPhone || "").replace(/\D/g, "").slice(-10);
        const businessPhoneClean = PRAJNAA_WHATSAPP_CONFIG.businessNumberClean.slice(-10);
        if (!cleanMsgPhone || cleanMsgPhone === businessPhoneClean || allDeleted.has(cleanMsgPhone)) continue;

        let conv = conversations.find((c) => c.customerPhone.replace(/\D/g, "").slice(-10) === cleanMsgPhone);
        const timeStr = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        if (!conv) {
          const newConvId = `conv_${cleanMsgPhone}`;
          conv = {
            id: newConvId,
            customerName: msg.customerName || `Customer (+91 ${cleanMsgPhone})`,
            customerPhone: `+91 ${cleanMsgPhone}`,
            lastMessageText: msg.text || "",
            lastMessageTime: timeStr,
            unreadCount: isInbound ? 1 : 0,
            status: "active",
            tags: ["WhatsApp Live Customer"],
          };
          conversations.unshift(conv);
          this.saveConversations(conversations);
        } else {
          conv.lastMessageText = msg.text || conv.lastMessageText;
          conv.lastMessageTime = timeStr;
          this.saveConversations(conversations);
        }

        const convMessages = this.getMessages(conv.id);
        const exists = convMessages.some(
          (m) =>
            m.id === msg.id ||
            (((m.sender === "agent" && (msg.sender === "business" || msg.direction === "outbound")) ||
              (m.sender === "customer" && (msg.sender === "customer" || msg.direction === "inbound"))) &&
              m.text.trim() === (msg.text || "").trim())
        );

        if (!exists) {
          convMessages.push({
            id: msg.id || `msg_${Date.now()}`,
            conversationId: conv.id,
            sender: isInbound ? "customer" : "agent",
            text: msg.text || "",
            timestamp: timeStr,
            status: msg.status || "delivered",
            mediaId: msg.mediaId,
            mediaUrl: msg.mediaUrl,
            mediaType: msg.type || (msg.mediaId ? "image" : undefined),
            mimeType: msg.mimeType,
            filename: msg.filename,
          });
          localStorage.setItem(this.getStorageKey(`messages_${conv.id}`), JSON.stringify(convMessages));
          updatedCount++;
        }
      }

      return { newMessagesCount: updatedCount };
    } catch {
      return { newMessagesCount: 0 };
    }
  }

  // 3. Fulfillment Pipeline
  getFulfillmentOrders(): FulfillmentOrder[] {
    if (typeof window === "undefined") return INITIAL_FULFILLMENT_ORDERS;
    try {
      const data = localStorage.getItem(this.getStorageKey("fulfillment_orders"));
      return data ? JSON.parse(data) : INITIAL_FULFILLMENT_ORDERS;
    } catch {
      return INITIAL_FULFILLMENT_ORDERS;
    }
  }

  updateOrderStatus(orderId: string, stage: FulfillmentOrder["stage"], notes?: string): boolean {
    const orders = this.getFulfillmentOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    order.stage = stage;
    if (notes) order.notes = notes;
    if (stage === "payment_confirmed") {
      order.paymentStatus = "collected";
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey("fulfillment_orders"), JSON.stringify(orders));
    }
    return true;
  }

  // 4. Broadcast Campaigns
  getCampaigns(): BroadcastCampaign[] {
    if (typeof window === "undefined") return INITIAL_CAMPAIGNS;
    try {
      const data = localStorage.getItem(this.getStorageKey("campaigns"));
      return data ? JSON.parse(data) : INITIAL_CAMPAIGNS;
    } catch {
      return INITIAL_CAMPAIGNS;
    }
  }

  createCampaign(campaign: Omit<BroadcastCampaign, "id" | "sentCount" | "deliveredCount" | "readCount" | "failedCount">): BroadcastCampaign {
    const campaigns = this.getCampaigns();
    const newCamp: BroadcastCampaign = {
      ...campaign,
      id: `camp_${Date.now()}`,
      sentCount: campaign.status === "sending" || campaign.status === "completed" ? campaign.audienceCount : 0,
      deliveredCount: campaign.status === "completed" ? Math.floor(campaign.audienceCount * 0.98) : 0,
      readCount: campaign.status === "completed" ? Math.floor(campaign.audienceCount * 0.82) : 0,
      failedCount: campaign.status === "completed" ? Math.floor(campaign.audienceCount * 0.02) : 0,
    };
    campaigns.unshift(newCamp);
    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey("campaigns"), JSON.stringify(campaigns));
    }
    return newCamp;
  }

  // 5. Consignments
  getConsignments(): IndiaPostConsignment[] {
    if (typeof window === "undefined") return INITIAL_CONSIGNMENTS;
    try {
      const data = localStorage.getItem(this.getStorageKey("consignments"));
      return data ? JSON.parse(data) : INITIAL_CONSIGNMENTS;
    } catch {
      return INITIAL_CONSIGNMENTS;
    }
  }

  addConsignment(consignment: IndiaPostConsignment) {
    const consignments = this.getConsignments();
    consignments.unshift(consignment);
    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey("consignments"), JSON.stringify(consignments));
    }
  }

  // 6. Automations
  getAutomations(): AutomationRule[] {
    if (typeof window === "undefined") return INITIAL_AUTOMATIONS;
    try {
      const data = localStorage.getItem(this.getStorageKey("automations"));
      return data ? JSON.parse(data) : INITIAL_AUTOMATIONS;
    } catch {
      return INITIAL_AUTOMATIONS;
    }
  }

  toggleAutomation(id: string): boolean {
    const autos = this.getAutomations();
    const target = autos.find((a) => a.id === id);
    if (!target) return false;
    target.enabled = !target.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey("automations"), JSON.stringify(autos));
    }
    return target.enabled;
  }

  // 7. Customers
  getCustomers(): CustomerContact[] {
    if (typeof window === "undefined") return INITIAL_CUSTOMERS;
    try {
      const data = localStorage.getItem(this.getStorageKey("customers"));
      return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  }

  // Generate UPI QR link for Prajnaa Market
  generateUpiIntent(orderNumber: string, amountInr: number): string {
    const cleanPaise = Math.round(amountInr * 100);
    const amountStr = (cleanPaise / 100).toFixed(2);
    const payeeName = encodeURIComponent("Prajnaa Market");
    const note = encodeURIComponent(`Order ${orderNumber}`);
    return `upi://pay?pa=${PRAJNAA_WHATSAPP_CONFIG.upiId}&pn=${payeeName}&am=${amountStr}&cu=INR&tn=${note}`;
  }
}

export const whatsappCrmService = new WhatsAppCrmService();

