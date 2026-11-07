import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";
import { updateFarmerCheck } from "@/../backend/models/farmer";

const VALID_CHECKS = ["identity", "land", "farmVisit", "quality"] as const;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Enforce Admin Authentication
    const authErr = await requireAdminAuth(req);
    if (authErr) return authErr;

    const rawParams = await context.params;
    const farmerId = rawParams?.id ? decodeURIComponent(rawParams.id).trim() : "";

    if (!farmerId) {
      return NextResponse.json(
        { success: false, error: "Farmer ID is required." },
        { status: 400 }
      );
    }

    // 2. Validate Body
    const body = await req.json().catch(() => ({}));
    const checkKey = body.check;
    const done = Boolean(body.done);
    const date = body.date ? String(body.date).trim() : undefined;

    if (!checkKey || !VALID_CHECKS.includes(checkKey)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid check key. Must be one of: ${VALID_CHECKS.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // 3. Update Farmer Check
    const result = await updateFarmerCheck(farmerId, checkKey, done, date);

    return NextResponse.json({
      success: true,
      checks: result.checks,
      message: `Farmer check '${checkKey}' updated to ${done ? "completed" : "pending"}.`,
    });
  } catch (err: any) {
    console.error("[Admin Update Check API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
