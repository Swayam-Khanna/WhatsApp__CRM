
import { LeadsService } from "../../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/:id/activities
 * Adds a note or activity to the lead's timeline.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body || !body.summary) {
      return Response.json(
        { success: false, error: "Activity summary is required" },
        { status: 400 }
      );
    }

    const activity = await LeadsService.addActivity(id, {
      actorName: body.actorName || "Operator",
      activityType: body.activityType || "note",
      summary: body.summary,
      details: body.details,
    });

    return Response.json({
      success: true,
      activity,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to record activity" },
      { status: 400 }
    );
  }
}
