import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, verifyAdminRequest } from "@/lib/api/admin-auth.server";
import { db } from "../../../../../backend/db.ts";
import { orders, orderStatusLogs } from "../../../../../backend/schema/orders.ts";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const authUser = await verifyAdminRequest(req);
  const adminEmail = authUser.user?.email || "admin@prajnaamarket.com";

  try {
    const body = await req.json();
    const { action, orderIds, tag } = body;

    if (!action || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ success: false, error: "Action and orderIds are required" }, { status: 400 });
    }

    const processed: string[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const rawId of orderIds) {
      const cleanId = String(rawId || "").trim().replace(/^#/, "");

      // Find order in Neon
      const [orderRow] = await db
        .select()
        .from(orders)
        .where(or(eq(orders.id, cleanId), eq(orders.orderNumber, cleanId)))
        .limit(1);

      if (!orderRow) {
        skipped.push({ id: cleanId, reason: "Order not found in database" });
        continue;
      }

      // 1. Bulk Status Transitions: mark_confirmed, mark_packed
      if (action === "mark_confirmed" || action === "mark_packed") {
        const targetStatus = action === "mark_confirmed" ? "confirmed" : "packed";

        await db
          .update(orders)
          .set({
            status: targetStatus,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderRow.id));

        // Audit log in Neon
        await db.insert(orderStatusLogs).values({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          orderId: orderRow.id,
          fromStatus: orderRow.status,
          toStatus: targetStatus,
          actorId: adminEmail,
          actorRole: "admin",
          notes: `Bulk status update to ${targetStatus}`,
        });

        processed.push(cleanId);
      } else if (action === "add_tag") {
        if (!tag || !String(tag).trim()) {
          skipped.push({ id: cleanId, reason: "No tag specified" });
          continue;
        }
        const cleanTag = String(tag).trim();
        const currentNotes = orderRow.adminNotes || "";
        const updatedNotes = currentNotes ? `${currentNotes} | Tag: ${cleanTag}` : `Tag: ${cleanTag}`;

        await db
          .update(orders)
          .set({
            adminNotes: updatedNotes,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderRow.id));

        processed.push(cleanId);
      } else {
        skipped.push({ id: cleanId, reason: `Unknown bulk action '${action}'` });
      }
    }

    return NextResponse.json({
      success: true,
      action,
      processedCount: processed.length,
      skippedCount: skipped.length,
      processed,
      skipped,
    });
  } catch (error: any) {
    console.error("[Bulk Orders Action] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process bulk action: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}
