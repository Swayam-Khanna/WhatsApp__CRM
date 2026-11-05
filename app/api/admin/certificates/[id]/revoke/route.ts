import { NextRequest, NextResponse } from "next/server";
import { revokeFarmerCertificate } from "@/lib/certificate/certificate-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

async function handleRevoke(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdminAuth(req);
    if (authErr) return authErr;

    const resolvedParams = await context.params;
    const body = await req.json().catch(() => ({}));

    const rawId = (resolvedParams?.id && resolvedParams.id !== "undefined" ? resolvedParams.id : null) || body.certificate_id || body.id;
    if (!rawId) {
      return NextResponse.json(
        { success: false, error: "Certificate ID is required." },
        { status: 400 }
      );
    }

    const cleanId = decodeURIComponent(rawId).trim();
    const { reason = "Revoked by administrator", admin_id = "admin-user", admin_name = "Prajnaa Admin" } = body;

    const revoked = await revokeFarmerCertificate({
      certificate_id: cleanId,
      admin_id,
      admin_name,
      reason: String(reason).trim() || "Revoked by administrator",
    });

    if (!revoked) {
      return NextResponse.json(
        { success: false, error: "Certificate not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: revoked,
      message: `Certificate ${revoked.certificate_number} has been revoked.`,
    });
  } catch (err: any) {
    console.error("[Revoke Certificate API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to revoke certificate." },
      { status: 500 }
    );
  }
}

export const PATCH = handleRevoke;
export const POST = handleRevoke;
export const DELETE = handleRevoke;
