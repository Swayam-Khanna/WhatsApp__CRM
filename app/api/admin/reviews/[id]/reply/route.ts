import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/admin/audit-logger";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(
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
    const replyText = typeof body.reply_text === "string" ? body.reply_text.trim() : "";
    const adminId = body.admin_id || "admin-user";

    if (!replyText) {
      return NextResponse.json(
        { success: false, error: "Reply text cannot be empty" },
        { status: 400 }
      );
    }

    if (replyText.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: `Reply text exceeds maximum limit of 1000 characters (current: ${replyText.length} characters).`,
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("product_reviews")
      .update({
        admin_reply_text: replyText,
        admin_reply_at: now,
        admin_reply_by: adminId,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API Admin Review Reply POST] DB Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Log audit event
    logAuditEvent({
      type: "general_audit",
      title: "Review Replied",
      message: `Admin replied to review #${id.substring(0, 8)}: "${replyText.substring(0, 50)}..."`,
    });

    return NextResponse.json({
      success: true,
      message: "Official reply posted successfully",
      data,
    });
  } catch (err: any) {
    console.error("[API Admin Review Reply POST] Server Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to post reply" },
      { status: 500 }
    );
  }
}
