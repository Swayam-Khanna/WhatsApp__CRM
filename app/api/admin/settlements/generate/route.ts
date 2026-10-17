import { NextRequest, NextResponse } from "next/server";
import { generateSettlements } from "@/lib/admin/settlement-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const result = await generateSettlements();
    return NextResponse.json({
      success: true,
      message: `Generated ${result.createdCount} new pending settlements from eligible orders.`,
      data: result,
    });
  } catch (error: any) {
    console.error("[API Generate Settlements Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate settlements" },
      { status: 500 }
    );
  }
}
