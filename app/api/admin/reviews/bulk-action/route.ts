import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/admin/audit-logger";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { ids, action, admin_id } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one review" },
        { status: 400 }
      );
    }

    const validActions = ["approve", "reject", "flag", "delete"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const adminUser = admin_id || "admin-system";

    if (action === "delete") {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .in("id", ids);

      if (error) {
        console.error("[API Admin Reviews Bulk Action DELETE] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      logAuditEvent({
        type: "general_audit",
        title: "Bulk Delete Reviews",
        message: `Permanently deleted ${ids.length} review(s).`,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${ids.length} review(s).`,
      });
    }

    let status = "pending";
    if (action === "approve") status = "approved";
    else if (action === "reject") status = "rejected";
    else if (action === "flag") status = "flagged";

    const isVerified = status === "approved";

    const { error } = await supabase
      .from("product_reviews")
      .update({
        status,
        verified: isVerified,
        moderated_at: now,
        moderated_by: adminUser,
        updated_at: now,
      })
      .in("id", ids);

    if (error) {
      console.error("[API Admin Reviews Bulk Action UPDATE] Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    logAuditEvent({
      type: "general_audit",
      title: `Bulk Action: ${action.toUpperCase()}`,
      message: `Bulk updated ${ids.length} review(s) to status '${status}'.`,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${ids.length} review(s) to ${status}.`,
    });
  } catch (err: any) {
    console.error("[API Admin Reviews Bulk Action] Server Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute bulk action" },
      { status: 500 }
    );
  }
}
