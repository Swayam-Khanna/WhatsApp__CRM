
import { LeadsService } from "../../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/:id/assignments
 * Assigns or reassigns lead owner.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const ownerId = body.ownerId || null;
    const ownerName = body.ownerName || (ownerId ? "Sales Agent" : null);
    const actorName = body.actorName || "Admin";

    const updated = await LeadsService.assignLead(id, ownerId, ownerName, actorName);

    return Response.json({
      success: true,
      lead: updated,
      message: ownerId ? `Assigned to ${ownerName}` : "Lead moved to unassigned queue",
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to update assignment" },
      { status: 400 }
    );
  }
}
