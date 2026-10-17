import { NextRequest, NextResponse } from "next/server";
import { getFarmerTrustData } from "@/../backend/models/farmer";
import { verifyUserAuth, verifyAdminRequest } from "@/lib/api/admin-auth.server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rawParams = await context.params;
    const farmerId = rawParams?.id ? decodeURIComponent(rawParams.id).trim() : "";

    if (!farmerId) {
      return NextResponse.json(
        { error: "Farmer ID is required" },
        { status: 400 }
      );
    }

    // Check if caller is the owner farmer or an admin
    let isOwnerOrAdmin = false;
    const url = new URL(req.url);

    // Optional query param override for testing logged-in owner experience in dev
    if (url.searchParams.get("view_as") === "owner" && process.env.NODE_ENV !== "production") {
      isOwnerOrAdmin = true;
    } else {
      const hasAuthHeader = Boolean(req.headers.get("authorization") || req.headers.get("x-admin-key") || req.headers.get("x-admin-secret"));
      const hasCookie = Boolean(req.headers.get("cookie"));

      if (hasAuthHeader || hasCookie) {
        const adminCheck = await verifyAdminRequest(req);
        if (adminCheck.authenticated) {
          isOwnerOrAdmin = true;
        } else {
          const userCheck = await verifyUserAuth(req);
          if (userCheck.authenticated && userCheck.user) {
            const userUid = userCheck.user.uid?.toLowerCase() || "";
            const userEmail = userCheck.user.email?.toLowerCase() || "";
            if (
              userUid === farmerId.toLowerCase() ||
              userEmail.includes(farmerId.toLowerCase()) ||
              farmerId.toLowerCase().includes(userUid)
            ) {
              isOwnerOrAdmin = true;
            }
          }
        }
      }
    }

    const trustData = await getFarmerTrustData(farmerId, isOwnerOrAdmin);
    return NextResponse.json({
      success: true,
      data: trustData,
    });
  } catch (error: any) {
    console.error("[Trust API Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve trust certifications" },
      { status: 500 }
    );
  }
}
