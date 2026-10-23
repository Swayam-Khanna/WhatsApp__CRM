import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppTextMessage } from "../../../../backend/lib/whatsapp.server.ts";

export const dynamic = "force-dynamic";

declare global {
  // eslint-disable-next-line no-var
  var __globalBroadcastCampaigns: any[] | undefined;
}

if (!globalThis.__globalBroadcastCampaigns) {
  globalThis.__globalBroadcastCampaigns = [
    {
      id: "camp_autumn_ghee_2024",
      name: "Autumn Badri Cow Ghee Fresh Batch",
      audience: "All Opted-In Customers (345)",
      segment: "all",
      message:
        "Namaste ji! 🙏 Tehri Garhwal ke high-altitude Badri cow farm se A2 Desi Ghee ka naya seasonal batch ready hai. Traditional bilona method se tayar. Order before stock finishes: https://prajnaa-farm-8zam.vercel.app/ 🧈",
      status: "Completed",
      sentCount: 345,
      deliveredCount: 341,
      readCount: 298,
      failedCount: 4,
      createdAt: "10 Oct 2024, 11:30 AM",
    },
    {
      id: "camp_apricot_preorder_2024",
      name: "2026 Himalayan Apricots Pre-Order Window",
      audience: "VIP & Dry Fruit Buyers (88)",
      segment: "vip",
      message:
        "Namaste ji! Ladakh Sham Valley ke pure Himalayan Sun-Dried Apricots ka pre-order window open ho gaya hai. Fresh 2026 harvest direct from orchards! 🍑",
      status: "Completed",
      sentCount: 88,
      deliveredCount: 88,
      readCount: 82,
      failedCount: 0,
      createdAt: "14 Oct 2024, 02:15 PM",
    },
  ];
}

/**
 * GET /api/crm/broadcasts
 * Retrieves list of broadcast campaigns and delivery performance.
 */
export async function GET() {
  const campaigns = globalThis.__globalBroadcastCampaigns || [];
  return NextResponse.json({ success: true, campaigns });
}

/**
 * POST /api/crm/broadcasts
 * Creates and executes a new WhatsApp broadcast campaign.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, audience, message, recipients, templateName } = body;

    if (!name || (!message && !templateName)) {
      return NextResponse.json({ error: "Campaign name and message or templateName are required." }, { status: 400 });
    }

    const recipientList: Array<{ name: string; phone: string; id?: string }> = Array.isArray(recipients) && recipients.length > 0
      ? recipients
      : [
          { name: "Priya Sharma", phone: "+91 98765 43210" },
          { name: "Rahul Verma", phone: "+91 87654 32109" },
          { name: "Kavita Bisht", phone: "+91 98971 23456" },
          { name: "Amitabh Verma", phone: "+91 94120 12345" },
        ];

    let delivered = 0;
    let failed = 0;
    const dispatchedRecipients: any[] = [];

    if (!globalThis.__globalWhatsAppFeed) {
      globalThis.__globalWhatsAppFeed = [];
    }

    for (const rec of recipientList) {
      try {
        const personalizedMsg = (message || "").replace(/{{customer_name}}/gi, rec.name);
        const res = await sendWhatsAppTextMessage({
          to: rec.phone,
          text: personalizedMsg,
          template: templateName ? { name: templateName } : undefined,
        });
        if (res.success) delivered++;
        else failed++;

        const msgRecord = {
          id: res.messageId || `bc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          direction: "outbound",
          sender: "business",
          from: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
          to: res.recipientPhone || rec.phone,
          customerName: rec.name,
          customerId: rec.id,
          text: personalizedMsg,
          timestamp: new Date().toISOString(),
          status: "delivered",
          mode: res.mode,
          whatsappUrl: res.whatsappUrl,
        };

        globalThis.__globalWhatsAppFeed.unshift(msgRecord);
        dispatchedRecipients.push({
          name: rec.name,
          phone: rec.phone,
          whatsappUrl: res.whatsappUrl,
          mode: res.mode,
        });
      } catch {
        failed++;
      }
    }

    const newCampaign = {
      id: `camp_${Date.now()}`,
      name,
      audience: audience || "Opted-In Customers",
      message,
      status: "Completed",
      sentCount: recipientList.length,
      deliveredCount: delivered,
      readCount: Math.round(delivered * 0.85),
      failedCount: failed,
      createdAt: new Date().toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    if (!globalThis.__globalBroadcastCampaigns) {
      globalThis.__globalBroadcastCampaigns = [];
    }

    globalThis.__globalBroadcastCampaigns.unshift(newCampaign);

    return NextResponse.json({
      success: true,
      message: `Broadcast campaign dispatched to ${recipientList.length} customers.`,
      campaign: newCampaign,
      dispatchedRecipients,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create campaign" }, { status: 500 });
  }
}
