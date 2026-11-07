
import { LeadsService } from "../../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/:id/transitions
 * Validates and executes pipeline stage transition.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body || !body.stageKey) {
      return Response.json(
        { success: false, error: "Missing required 'stageKey'" },
        { status: 400 }
      );
    }

    const updated = await LeadsService.transitionStage(id, body.stageKey, {
      actorId: body.actorId,
      actorName: body.actorName || "Operator",
      actorRole: body.actorRole,
      lostReason: body.lostReason,
      notes: body.notes,
      orderTotalPaise: body.orderTotalPaise,
      paymentVerified: body.paymentVerified,
      approvedCredit: body.approvedCredit,
    });

    return Response.json({
      success: true,
      lead: updated,
      message: `Lead transitioned to '${body.stageKey}' successfully`,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Stage transition failed" },
      { status: 400 }
    );
  }
}
