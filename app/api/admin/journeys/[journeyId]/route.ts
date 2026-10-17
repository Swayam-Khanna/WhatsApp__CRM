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
    const { batch_number, final_pack_photo_url, final_pack_caption, transformation_order, stages, product_id } = body;

    const updated = await harvestJourneyService.updateJourney(journeyId, {
      batch_number,
      final_pack_photo_url,
      final_pack_caption,
      transformation_order,
      stages,
      product_id,
    });

    return NextResponse.json({
      success: true,
      message: "Harvest journey updated successfully",
      journey: updated,
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/journeys/:journeyId] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update journey" }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  try {
    const { journeyId } = await params;
    if (!journeyId) {
      return NextResponse.json({ error: "Journey ID is required" }, { status: 400 });
    }

    const updatedStages = await harvestJourneyService.assignPositionsToBatchStages(journeyId);

    return NextResponse.json({
      success: true,
      message: "Stages position migration executed successfully",
      stages: updatedStages,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/journeys/:journeyId] Fix positions error:", err);
    return NextResponse.json({ error: err.message || "Failed to fix stage positions" }, { status: 400 });
  }
}
