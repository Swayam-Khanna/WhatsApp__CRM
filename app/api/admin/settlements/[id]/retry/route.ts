import { NextRequest, NextResponse } from "next/server";
import { retrySettlement } from "@/lib/admin/settlement-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const result = await retrySettlement(id);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (err: any) {
    console.error("[API Retry Settlement Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to retry settlement" }, { status: 500 });
  }
}
