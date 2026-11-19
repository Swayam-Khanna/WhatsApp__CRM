import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "../../../../lib/mongodb.ts";
import {
  getStoredNotifications,
  saveStoredNotification,
  markStoredNotificationRead,
  markAllStoredNotificationsRead,
} from "../../../../backend/lib/crm-store.server.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/notifications
 * Retrieves all CRM notifications with persistent MongoDB & disk backup.
 */
export async function GET() {
  try {
    const memoryNotifications = getStoredNotifications();
    let mongoNotifications: any[] = [];

    try {
      const db = await getDatabase();
      if (db) {
        mongoNotifications = await db
          .collection("crm_notifications")
          .find({})
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray();
      }
    } catch (dbErr) {
      console.warn("[CRM Notifications] MongoDB fetch note:", dbErr);
    }

    // Combine & deduplicate by ID or orderNumber
    const notifMap = new Map<string, any>();
    [...memoryNotifications, ...mongoNotifications].forEach((n) => {
      if (!n) return;
      const key = n.id || n.orderNumber || n.orderId;
      if (key && !notifMap.has(key)) {
        notifMap.set(key, n);
      }
    });

    const notifications = Array.from(notifMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("[CRM Notifications] GET error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/notifications
 * Creates a notification or handles read actions.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "mark_read" && body.notificationId) {
      markStoredNotificationRead(body.notificationId);
      try {
        const db = await getDatabase();
        if (db) {
          await db.collection("crm_notifications").updateOne(
            { $or: [{ id: body.notificationId }, { orderNumber: body.notificationId }, { orderId: body.notificationId }] },
            { $set: { read: true, updatedAt: new Date() } }
          );
        }
      } catch {}
      return NextResponse.json({ success: true, message: "Marked as read" });
    }

    if (body.action === "mark_all_read") {
      markAllStoredNotificationsRead();
      try {
        const db = await getDatabase();
        if (db) {
          await db.collection("crm_notifications").updateMany({}, { $set: { read: true, updatedAt: new Date() } });
        }
      } catch {}
      return NextResponse.json({ success: true, message: "All marked as read" });
    }

    // Save new notification
    const saved = saveStoredNotification(body);
    try {
      const db = await getDatabase();
      if (db && saved) {
        await db.collection("crm_notifications").updateOne(
          { id: saved.id },
          { $set: saved },
          { upsert: true }
        );
      }
    } catch {}

    return NextResponse.json({ success: true, notification: saved });
  } catch (error: any) {
    console.error("[CRM Notifications] POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process notification" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/crm/notifications
 * Updates notification read state.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { id, read } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
    }

    if (read !== false) {
      markStoredNotificationRead(id);
      try {
        const db = await getDatabase();
        if (db) {
          await db.collection("crm_notifications").updateOne(
            { $or: [{ id }, { orderNumber: id }, { orderId: id }] },
            { $set: { read: true, updatedAt: new Date() } }
          );
        }
      } catch {}
    }

    return NextResponse.json({ success: true, id, read: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update notification" }, { status: 500 });
  }
}
