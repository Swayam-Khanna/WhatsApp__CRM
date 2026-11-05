import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/admin/audit-logger";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Review ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { status, admin_id } = body;

    const validStatuses = ["pending", "approved", "rejected", "flagged"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const isVerified = status === "approved";
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("product_reviews")
      .update({
        status,
        verified: isVerified,
        moderated_at: now,
        moderated_by: admin_id || "admin-system",
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API Admin Review Status PATCH] DB Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Log audit event
    logAuditEvent({
      type: "general_audit",
      title: `Review Status Changed: ${status.toUpperCase()}`,
      message: `Review #${id.substring(0, 8)} status set to '${status}'.`,
    });

    return NextResponse.json({
      success: true,
      message: `Review #${id.substring(0, 8)} status updated to ${status}`,
      data,
    });
  } catch (err: any) {
    console.error("[API Admin Review Status PATCH] Server Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to update review status" }, { status: 500 });
  }
}
