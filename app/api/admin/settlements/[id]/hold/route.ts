import { NextRequest, NextResponse } from "next/server";
import { holdSettlement } from "@/lib/admin/settlement-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: "Block reason is required to hold settlement" }, { status: 400 });
    }

    await holdSettlement(id, reason);

    return NextResponse.json({
      success: true,
      message: `Settlement #${id.substring(0, 8)} blocked successfully.`,
    });
  } catch (err: any) {
    console.error("[API Hold Settlement Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to hold settlement" }, { status: 500 });
  }
}
