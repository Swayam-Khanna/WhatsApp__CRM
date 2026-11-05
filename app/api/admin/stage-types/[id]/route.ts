import { NextRequest, NextResponse } from "next/server";
import { harvestJourneyService } from "@/lib/services/harvestJourneyService";
import type { IconType } from "@/lib/types/harvest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PATCH /api/admin/stage-types/[id]
 * Updates a custom harvest stage type
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Stage type ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, icon_type, icon_value } = body;

    const payload: Partial<{ name: string; icon_type: IconType; icon_value: string }> = {};

    if (name !== undefined) {
      const trimmedName = String(name || "").trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Stage type name cannot be empty" }, { status: 400 });
      }
      if (trimmedName.length > 40) {
        return NextResponse.json(
          { error: "Stage type name cannot exceed 40 characters" },
          { status: 400 }
        );
      }
      payload.name = trimmedName;
    }

    if (icon_type !== undefined) {
      payload.icon_type = icon_type;
    }

    if (icon_value !== undefined) {
      const iconVal = String(icon_value || "").trim();
      if (!iconVal) {
        return NextResponse.json({ error: "Stage icon cannot be empty" }, { status: 400 });
      }

      if (payload.icon_type === "upload" && iconVal.startsWith("data:")) {
        const base64Content = iconVal.split(",")[1] || "";
        const estimatedBytes = Math.ceil((base64Content.length * 3) / 4);
        if (estimatedBytes > 500 * 1024) {
          return NextResponse.json(
            { error: "Custom icon file size exceeds the 500KB limit" },
            { status: 400 }
          );
        }
      }
      payload.icon_value = iconVal;
    }

    const updated = await harvestJourneyService.updateStageType(id, payload);

    return NextResponse.json({
      success: true,
      message: "Stage type updated successfully",
      stageType: updated,
    });
  } catch (err: any) {
    console.error("[PATCH /api/admin/stage-types/:id] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update stage type" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/admin/stage-types/[id]
 * Deletes a custom stage type with safety guard for in-use stages
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Stage type ID is required" }, { status: 400 });
    }

    const result = await harvestJourneyService.deleteStageType(id);

    return NextResponse.json({
      success: true,
      inUseCount: result.inUseCount,
      message: result.message,
    });
  } catch (err: any) {
    console.error("[DELETE /api/admin/stage-types/:id] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete stage type" },
      { status: 400 }
    );
  }
}
