import { NextRequest, NextResponse } from "next/server";
import { executePayout } from "@/lib/admin/settlement-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing or invalid settlement ids array" }, { status: 400 });
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await executePayout(id);
        successCount++;
      } catch (err: any) {
        errors.push(`Settlement ${id.substring(0, 8)}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk processing completed for ${successCount}/${ids.length} settlements.`,
      processedCount: successCount,
      errors,
    });
  } catch (err: any) {
    console.error("[API Bulk Process Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to bulk process settlements" }, { status: 500 });
  }
}
