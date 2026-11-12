import { NextRequest, NextResponse } from "next/server";
import { uploadWhatsAppMedia, sendWhatsAppMediaMessage } from "../../../../../backend/lib/whatsapp.server.ts";
import { getDatabase } from "../../../../../lib/mongodb.ts";

export const dynamic = "force-dynamic";

/**
 * POST /api/crm/messages/upload
 * Handles direct file upload (image, video, document, audio) from CRM UI,
 * uploads to Meta Cloud API, and sends it directly to the customer on WhatsApp.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const to = (formData.get("to") as string | null) || "";
    const caption = (formData.get("caption") as string | null) || "";
    const customerId = (formData.get("customerId") as string | null) || "";
    const orderNumber = (formData.get("orderNumber") as string | null) || "";

    if (!to) {
      return NextResponse.json({ error: "Recipient phone number ('to') is required" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "File attachment is required" }, { status: 400 });
    }

    // Determine WhatsApp media type
    const mimeType = file.type || "application/octet-stream";
    let mediaType: "image" | "video" | "document" | "audio" = "document";
    if (mimeType.startsWith("image/")) {
      mediaType = "image";
    } else if (mimeType.startsWith("video/")) {
      mediaType = "video";
    } else if (mimeType.startsWith("audio/")) {
      mediaType = "audio";
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload to Meta Cloud API media storage
    const uploadRes = await uploadWhatsAppMedia({
      buffer,
      filename: file.name || `attachment-${Date.now()}`,
      mimeType,
    });

    if (!uploadRes.success || !uploadRes.mediaId) {
      console.error("[CRM Media Upload] Failed to upload to Meta:", uploadRes.error);
      return NextResponse.json({ error: uploadRes.error || "Failed to upload file to WhatsApp" }, { status: 502 });
    }

    // 2. Dispatch media message to customer
    const sendRes = await sendWhatsAppMediaMessage({
      to,
      type: mediaType,
      mediaId: uploadRes.mediaId,
      filename: file.name,
      caption,
    });

    // 3. Construct CRM message record
    const cleanTo = to.replace(/\D/g, "");
    const messageRecord = {
      id: sendRes.messageId || `msg_${Date.now()}`,
      direction: "outbound",
      sender: "business",
      from: process.env.ADMIN_WHATSAPP_NUMBER || "918091265690",
      to: sendRes.recipientPhone || cleanTo,
      text: caption || `[${mediaType.toUpperCase()} Attachment: ${file.name}]`,
      type: mediaType,
      mediaId: uploadRes.mediaId,
      mimeType,
      filename: file.name,
      timestamp: new Date().toISOString(),
      status: sendRes.success ? "sent" : "failed",
      customerId,
      orderNumber,
      mode: sendRes.mode,
      whatsappUrl: sendRes.whatsappUrl || null,
      createdAt: new Date(),
    };

    if (!globalThis.__globalWhatsAppFeed) {
      globalThis.__globalWhatsAppFeed = [];
    }
    globalThis.__globalWhatsAppFeed.unshift(messageRecord);

    // 4. Persist to MongoDB
    try {
      const db = await getDatabase();
      if (db) {
        await db.collection("crm_messages").insertOne(messageRecord);

        const to10 = cleanTo.slice(-10);
        if (to10) {
          const formattedPhone = to10.length === 10 ? `+91 ${to10.slice(0, 5)} ${to10.slice(5)}` : `+${to10}`;
          await db.collection("crm_conversations").updateOne(
            { phone: to10 },
            {
              $set: {
                id: `conv_${to10}`,
                customerPhone: formattedPhone,
                lastMessageText: caption || `📷 ${file.name}`,
                lastMessageTime: messageRecord.timestamp,
                unreadCount: 0,
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }
    } catch (dbErr) {
      console.warn("[CRM Media Upload] MongoDB write warning:", dbErr);
    }

    return NextResponse.json({
      success: true,
      result: sendRes,
      messageRecord,
    });
  } catch (err: any) {
    console.error("[CRM Media Upload] Exception:", err);
    return NextResponse.json({ error: err?.message || "Failed to process media upload" }, { status: 500 });
  }
}
