import { NextRequest, NextResponse } from "next/server";
import {
  getCertificateByFarmer,
  updateCertificateVisibility,
} from "@/lib/certificate/certificate-service";
import { verifyUserAuth } from "@/lib/api/admin-auth.server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const farmerIdOrSlug = searchParams.get("farmer_id") || searchParams.get("slug");

    if (!farmerIdOrSlug) {
      return NextResponse.json(
        { success: false, error: "Farmer identifier is required." },
        { status: 400 }
      );
    }

    const cert = await getCertificateByFarmer(farmerIdOrSlug);

    return NextResponse.json({
      success: true,
      data: cert,
    });
  } catch (err: any) {
    console.error("[Get Farmer Certificate API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch certificate." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await verifyUserAuth(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: "Authentication required to update certificate settings." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { certificate_id, farmer_user_id, show_on_profile } = body;

    if (!certificate_id || typeof show_on_profile !== "boolean") {
      return NextResponse.json(
        { success: false, error: "certificate_id and show_on_profile (boolean) are required." },
        { status: 400 }
      );
    }

    const ok = await updateCertificateVisibility(
      certificate_id,
      farmer_user_id || "farmer-user",
      show_on_profile
    );

    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Failed to update certificate visibility." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Certificate profile visibility updated to ${show_on_profile ? "ON" : "OFF"}.`,
    });
  } catch (err: any) {
    console.error("[Update Visibility API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update visibility." },
      { status: 500 }
    );
  }
}
