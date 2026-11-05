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
      return NextResponse.json({ error: "Product identifier is required" }, { status: 400 });
    }

    const cleanId = decodeURIComponent(productId).trim();
    const productCheck = await harvestJourneyService.checkProductIsPreorder(cleanId);
    const targetId = productCheck.productId || cleanId;
    const journey =
      (await harvestJourneyService.getJourneyByProductId(cleanId)) ||
      (targetId !== cleanId ? await harvestJourneyService.getJourneyByProductId(targetId) : null);

    // Only render if a journey exists with at least one stage
    if (!journey || !journey.stages || journey.stages.length === 0) {
      return NextResponse.json(
        {
          success: true,
          is_preorder: true,
          journey: null,
          message: "No stages configured for this harvest journey yet",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      is_preorder: true,
      product_name: productCheck.productName,
      slug: productCheck.slug,
      journey,
    });
  } catch (err: any) {
    console.error("[GET /api/products/:productId/harvest-journey] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch harvest journey" }, { status: 500 });
  }
}
