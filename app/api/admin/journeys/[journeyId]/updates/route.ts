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

    const body = await req.json();
    const { text, author } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Update text is required" }, { status: 400 });
    }

    const update = await harvestJourneyService.createUpdate(journeyId, {
      text,
      author,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Farm update posted successfully",
        update,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/admin/journeys/:journeyId/updates] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to post update" }, { status: 400 });
  }
}
