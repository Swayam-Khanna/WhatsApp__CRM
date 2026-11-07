import { NextRequest, NextResponse } from "next/server";
import { harvestJourneyService } from "@/lib/services/harvestJourneyService";
import type { IconType } from "@/lib/types/harvest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/stage-types
 * Retrieves all presets and custom harvest stage types
 */
export async function GET() {
  try {
    const stageTypes = await harvestJourneyService.getStageTypes();
    return NextResponse.json({
      success: true,
      stageTypes,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/stage-types] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch stage types" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/stage-types
 * Creates a new custom harvest stage type
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, icon_type, icon_value, is_custom, created_by } = body;

    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Stage type name is required" },
        { status: 400 }
      );
    }

    if (trimmedName.length > 40) {
      return NextResponse.json(
        { error: "Stage type name cannot exceed 40 characters" },
        { status: 400 }
      );
    }

    const iconType: IconType = icon_type || "library";
    const iconVal = String(icon_value || "").trim();

    if (!iconVal) {
      return NextResponse.json(
        { error: "Stage icon selection or upload is required" },
        { status: 400 }
      );
    }

    // Upload size check for base64 / data URIs (~500KB limit = ~680KB base64 length)
    if (iconType === "upload" && iconVal.startsWith("data:")) {
      const base64Content = iconVal.split(",")[1] || "";
      const estimatedBytes = Math.ceil((base64Content.length * 3) / 4);
      if (estimatedBytes > 500 * 1024) {
        return NextResponse.json(
          { error: "Custom icon file size exceeds the 500KB limit" },
          { status: 400 }
        );
      }
    }

    const createdType = await harvestJourneyService.createStageType({
      name: trimmedName,
      icon_type: iconType,
      icon_value: iconVal,
      is_custom: is_custom !== false,
      created_by: created_by || "admin",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Stage type created successfully",
        stageType: createdType,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/admin/stage-types] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create stage type" },
      { status: 400 }
    );
  }
}
