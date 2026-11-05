import { NextRequest, NextResponse } from "next/server";
import { harvestJourneyService } from "@/lib/services/harvestJourneyService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  try {
    const { journeyId } = await params;
    if (!journeyId) {
      return NextResponse.json({ error: "Journey ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const orderList: Array<{ id: string; sort_order: number }> = Array.isArray(body)
      ? body
      : body.stages || [];

    if (!Array.isArray(orderList) || orderList.length === 0) {
      return NextResponse.json(
        { error: "Order list must be a non-empty array of [{ id, sort_order }]" },
        { status: 400 }
      );
    }

    const updatedStages = await harvestJourneyService.reorderStages(journeyId, orderList);

    return NextResponse.json({
      success: true,
      message: "Stages reordered successfully",
      stages: updatedStages,
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/journeys/:journeyId/stages/reorder] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to reorder stages" }, { status: 400 });
  }
}
