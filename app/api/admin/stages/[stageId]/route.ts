import { NextRequest, NextResponse } from "next/server";
import { harvestJourneyService } from "@/lib/services/harvestJourneyService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  try {
    const { stageId } = await params;
    if (!stageId) {
      return NextResponse.json({ error: "Stage ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const updatedStage = await harvestJourneyService.updateStage(stageId, body);

    return NextResponse.json({
      success: true,
      message: "Stage updated successfully",
      stage: updatedStage,
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/stages/:stageId] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update stage" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  try {
    const { stageId } = await params;
    if (!stageId) {
      return NextResponse.json({ error: "Stage ID is required" }, { status: 400 });
    }

    await harvestJourneyService.deleteStage(stageId);

    return NextResponse.json({
      success: true,
      message: "Stage deleted successfully",
    });
  } catch (err: any) {
    console.error("[DELETE /api/admin/stages/:stageId] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete stage" }, { status: 400 });
  }
}
