import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, verifyAdminRequest } from "@/lib/api/admin-auth.server";
import { verifyOrRejectCertificate } from "@/../backend/models/farmer";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Enforce Admin Authentication
    const authErr = await requireAdminAuth(req);
    if (authErr) return authErr;

    const adminCheck = await verifyAdminRequest(req);
    const adminId = adminCheck.user?.uid || "admin-lead";

    const rawParams = await context.params;
    const certId = rawParams?.id ? decodeURIComponent(rawParams.id).trim() : "";

    if (!certId) {
      return NextResponse.json(
        { success: false, error: "Certificate ID is required." },
        { status: 400 }
      );
    }

    // 2. Validate Body
    const body = await req.json().catch(() => ({}));
    const action = body.action as "verify" | "reject" | undefined;
    const reason = body.reason ? String(body.reason).trim() : "";

    if (action !== "verify" && action !== "reject") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Must be 'verify' or 'reject'.",
        },
        { status: 400 }
      );
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        {
          success: false,
          error: "A reason is mandatory when rejecting a certificate.",
        },
        { status: 400 }
      );
    }

    // 3. Process Verification / Rejection
    const result = await verifyOrRejectCertificate(certId, action, reason, adminId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.certificate,
      message: result.message,
    });
  } catch (err: any) {
    console.error("[Admin Verify/Reject API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
