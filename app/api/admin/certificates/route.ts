import { NextRequest, NextResponse } from "next/server";
import { getAllCertificates } from "@/lib/certificate/certificate-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    // Fetch farmer-submitted trust certificates
    const { getAdminCertificates } = await import("@/../backend/models/farmer");
    const trustCerts = await getAdminCertificates(statusFilter ? statusFilter.toLowerCase() : undefined);

    if (statusFilter?.toLowerCase() === "pending" || searchParams.get("scope") === "trust") {
      return NextResponse.json({
        success: true,
        data: trustCerts,
        count: trustCerts.length,
      });
    }

    const certs = await getAllCertificates();
    let filtered = certs;
    if (statusFilter && statusFilter !== "ALL") {
      filtered = certs.filter((c) => c.status === statusFilter.toUpperCase());
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      count: filtered.length,
    });
  } catch (err: any) {
    console.error("[Get All Certificates API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch certificates." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authErr = await requireAdminAuth(req);
    if (authErr) return authErr;

    const body = await req.json().catch(() => ({}));
    const farmerId = body.farmer_id || body.farmerId;

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

    const { issueFarmerCertificate } = await import("@/lib/certificate/certificate-service");
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
    console.error("[Issue Certificate API Error in /api/admin/certificates]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to issue certificate." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authErr = await requireAdminAuth(req);
    if (authErr) return authErr;

    const body = await req.json().catch(() => ({}));
    const certId = body.certificate_id || body.id || body.certificate_number;
    if (!certId) {
      return NextResponse.json({ success: false, error: "Certificate ID is required." }, { status: 400 });
    }

    const { revokeFarmerCertificate } = await import("@/lib/certificate/certificate-service");
    const revoked = await revokeFarmerCertificate({
      certificate_id: String(certId).trim(),
      admin_id: body.admin_id || "admin-user",
      admin_name: body.admin_name || "Prajnaa Admin",
      reason: String(body.reason || "Revoked by administrator").trim(),
    });

    if (!revoked) {
      return NextResponse.json({ success: false, error: "Certificate not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: revoked,
      message: `Certificate ${revoked.certificate_number} has been revoked.`,
    });
  } catch (err: any) {
    console.error("[Revoke in /api/admin/certificates error]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to revoke certificate." }, { status: 500 });
  }
}

export const DELETE = PATCH;

