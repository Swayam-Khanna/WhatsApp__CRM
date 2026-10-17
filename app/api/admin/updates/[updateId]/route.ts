import { NextRequest, NextResponse } from "next/server";
import { harvestJourneyService } from "@/lib/services/harvestJourneyService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ updateId: string }> }
) {
  try {
    const { updateId } = await params;
    if (!updateId) {
      return NextResponse.json({ error: "Update ID is required" }, { status: 400 });
    }

    await harvestJourneyService.deleteUpdate(updateId);

    return NextResponse.json({
      success: true,
      message: "Update deleted successfully",
    });
  } catch (err: any) {
    console.error("[DELETE /api/admin/updates/:updateId] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete update" }, { status: 400 });
  }
}
