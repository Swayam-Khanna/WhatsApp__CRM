import { NextRequest, NextResponse } from "next/server";
import { issueFarmerCertificate } from "@/lib/certificate/certificate-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = await requireAdminAuth(req);
    if (authErr) return authErr;

    const resolvedParams = await context.params;
    const body = await req.json().catch(() => ({}));

    const farmerId =
      (resolvedParams?.id && resolvedParams.id !== "undefined" ? resolvedParams.id : null) ||
      body.farmer_id ||
      body.farmerId;

    if (!farmerId) {
      return NextResponse.json(
        { success: false, error: "Farmer ID is required." },
        { status: 400 }
      );
    }

    const {
      farmer_name,
      farm_name,
      village,
      state,
      farmer_slug,
      certificate_number,
      title,
      issued_by,
      valid_until,
      verification_notes,
      admin_id = "admin-lead",
      admin_name = "Prajnaa Verification Board",
    } = body;

    if (!farmer_name || !farm_name) {
      return NextResponse.json(
        { success: false, error: "Farmer name and Farm name are required." },
        { status: 400 }
      );
    }

    const cert = await issueFarmerCertificate({
      farmer_id: farmerId,
      farmer_name,
      farm_name,
      village,
      state,
      farmer_slug,
      certificate_number,
      issued_by,
      valid_until,
      verification_notes,
      admin_id,
      admin_name,
    });

    return NextResponse.json({
      success: true,
      data: cert,
      message: `Official Certificate ${cert.certificate_number} issued successfully for ${farmer_name}.`,
    });
  } catch (err: any) {
    console.error("[Issue Certificate API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to issue certificate." },
      { status: 500 }
    );
  }
}
