import { NextResponse } from "next/server";
import { fetchFarmerLandLedger } from "@/../backend/models/farmer";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rawParams = await context.params;
    const farmerId = rawParams?.id ? decodeURIComponent(rawParams.id).trim() : "";

    if (!farmerId) {
      return NextResponse.json(
        { error: "Farmer ID is required" },
        { status: 400 }
      );
    }

    const data = await fetchFarmerLandLedger(farmerId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[LandLedger API] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve land ledger data" },
      { status: 500 }
    );
  }
}
