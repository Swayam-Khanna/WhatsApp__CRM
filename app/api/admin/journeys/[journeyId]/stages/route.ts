import { NextRequest, NextResponse } from "next/server";
import { harvestJourneyService } from "@/lib/services/harvestJourneyService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ journeyId: string }> }
) {
  try {
    const { journeyId } = await params;
    if (!journeyId) {
      return NextResponse.json({ error: "Journey ID is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      label,
      icon,
      icon_type,
      icon_value,
      stage_type_id,
      status,
      stage_date,
      description,
      image_url,
      images,
      sort_order,
      transformation_photo_id,
      show_in_transformation,
      product_id,
    } = body;

    if (!label || !label.trim()) {
      return NextResponse.json({ error: "Stage label / name is required" }, { status: 400 });
    }

    const stage = await harvestJourneyService.createStage(journeyId, {
      label,
      icon,
      icon_type,
      icon_value,
      stage_type_id,
      status,
      stage_date,
      description,
      image_url,
      images,
      sort_order,
      transformation_photo_id,
      show_in_transformation,
      product_id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Stage created successfully",
        stage,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/admin/journeys/:journeyId/stages] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create stage" }, { status: 400 });
  }
}
