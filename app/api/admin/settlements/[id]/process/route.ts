import { NextRequest, NextResponse } from "next/server";
import { executePayout, validateSettlementPreflight } from "@/lib/admin/settlement-service";
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
    const body = await req.json().catch(() => ({}));
    const idempotencyKey = body.idempotencyKey || req.headers.get("x-idempotency-key") || `idem_${id}_${Date.now()}`;

    // Server-side Pre-flight validation
    const preflight = await validateSettlementPreflight(id);
    if (!preflight.valid) {
      return NextResponse.json(
        {
          error: "Pre-flight validation failed",
          reasons: preflight.reasons,
          preflight,
        },
        { status: 422 }
      );
    }

    const result = await executePayout(id, idempotencyKey);
    return NextResponse.json({
      success: true,
      message: "Payout processing initiated with provider.",
      result,
    });
  } catch (error: any) {
    console.error("[API Process Settlement Error]:", error);
    return NextResponse.json(
      { error: error.message || "Payout execution failed" },
      { status: 400 }
    );
  }
}
