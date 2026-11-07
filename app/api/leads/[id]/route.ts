
import { LeadsService } from "../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/leads/:id
 * Retrieves full lead details, activities, tasks, quotes, and order links.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await LeadsService.getLeadById(id);

    if (!lead) {
      return Response.json(
        { success: false, error: `Lead '${id}' not found` },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      lead,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to retrieve lead" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/leads/:id
 * Updates permitted lead fields (notes, nextAction, nextFollowUpAt, priority, estimatedValuePaise).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await LeadsService.getLeadById(id);

    if (!lead) {
      return Response.json(
        { success: false, error: `Lead '${id}' not found` },
        { status: 404 }
      );
    }

    const body = await req.json();
    const allowed = [
      "notes",
      "nextAction",
      "nextFollowUpAt",
      "priority",
      "estimatedValuePaise",
      "expectedQuantity",
      "expectedFrequency",
      "requestedPriceTier",
      "requestedPaymentTerms",
      "deliveryPostalCode",
      "pendingReason",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        (lead as any)[key] = body[key];
      }
    }

    lead.updatedAt = new Date().toISOString();

    return Response.json({
      success: true,
      lead,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to update lead" },
      { status: 400 }
    );
  }
}
