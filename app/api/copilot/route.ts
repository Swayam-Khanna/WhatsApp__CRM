import { NextResponse } from "next/server";
import { askPrajnaaCopilot } from "@/lib/api/copilot-service";
import { askFarmerFarmAssist } from "@/lib/api/farmer-copilot-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { message, userId, history, type } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let responseText = "";

    if (type === "farmer") {
      responseText = await askFarmerFarmAssist(message, userId, history);
    } else {
      responseText = await askPrajnaaCopilot(message, userId, history);
    }

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("Copilot API error:", error);
    return NextResponse.json(
      { error: "Failed to process the copilot request" },
      { status: 500 }
    );
  }
}
