import { NextRequest, NextResponse } from "next/server";
import { harvestJourneyService } from "@/lib/services/harvestJourneyService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const cleanId = decodeURIComponent(productId).trim();
    const journey = await harvestJourneyService.getJourneyByProductId(cleanId);

    return NextResponse.json({
      success: true,
      is_preorder: true,
      journey: journey || null,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/products/:productId/journey] Error:", err);
    return NextResponse.json({ success: true, is_preorder: true, journey: null }, { status: 200 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const cleanId = decodeURIComponent(productId).trim();
    const body = await req.json().catch(() => ({}));
    const { batch_number, initial_stage } = body;

    const existing = await harvestJourneyService.getJourneyByProductId(cleanId);
    if (existing) {
      return NextResponse.json(
        {
          success: true,
          message: "Harvest journey already exists",
          journey: existing,
        },
        { status: 200 }
      );
    }

    const created = await harvestJourneyService.createJourney(cleanId, batch_number, initial_stage, {
      is_preorder: true,
      product_name: body.product_name,
      slug: body.slug,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Harvest journey created successfully",
        journey: created,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/admin/products/:productId/journey] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create journey" }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const cleanId = decodeURIComponent(productId).trim();
    const body = await req.json().catch(() => ({}));
    const { journey, stages, batch_number, final_pack_photo_url, final_pack_caption } = body;

    let targetJourney = journey;
    if (!targetJourney) {
      targetJourney = await harvestJourneyService.getJourneyByProductId(cleanId);
    }
    if (targetJourney) {
      if (Array.isArray(stages)) {
        targetJourney.stages = stages;
      }
      if (batch_number) targetJourney.batch_number = batch_number;
      if (final_pack_photo_url !== undefined) targetJourney.final_pack_photo_url = final_pack_photo_url;
      if (final_pack_caption !== undefined) targetJourney.final_pack_caption = final_pack_caption;
      targetJourney.updated_at = new Date().toISOString();

      harvestJourneyService.syncToLocalAndMemory(
        targetJourney,
        [cleanId, targetJourney.id, targetJourney.product_id].filter(Boolean) as string[]
      );
      if (targetJourney.product_id) {
        await harvestJourneyService.syncToFarmerProducts(targetJourney.product_id, targetJourney);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Harvest journey updated successfully",
      journey: targetJourney,
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/products/:productId/journey] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update journey" }, { status: 400 });
  }
}
