import { NextRequest, NextResponse } from "next/server";
import { markSettlementPaid } from "@/lib/admin/settlement-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const { utrReference, note } = body;

    if (!utrReference || !note) {
      return NextResponse.json({ error: "utrReference and admin note are required for manual override" }, { status: 400 });
    }

    await markSettlementPaid(id, utrReference, note);

    return NextResponse.json({
      success: true,
      message: `Settlement #${id.substring(0, 8)} manually marked as paid.`,
    });
  } catch (err: any) {
    console.error("[API Mark Paid Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to mark settlement as paid" }, { status: 500 });
  }
}
