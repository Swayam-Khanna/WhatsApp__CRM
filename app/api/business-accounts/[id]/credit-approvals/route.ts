
import { LeadsService } from "../../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * POST /api/business-accounts/:id/credit-approvals
 * Records authorized wholesale credit decision (Store Admin or Sales Manager only).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.authorizedRole || !["Store Admin", "Sales Manager"].includes(body.authorizedRole)) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized: Credit approval requires Store Admin or Sales Manager role",
        },
        { status: 403 }
      );
    }

    if (!body.status || !["approved", "rejected", "revoked"].includes(body.status)) {
      return Response.json(
        { success: false, error: "Valid status ('approved', 'rejected', 'revoked') is required" },
        { status: 400 }
      );
    }

    const decision = await LeadsService.recordCreditApproval(id, {
      leadId: body.leadId,
      approvedCreditLimitPaise: body.approvedCreditLimitPaise || 0,
      approvedPeriodDays: body.approvedPeriodDays || 0,
      status: body.status,
      decisionNotes: body.decisionNotes,
      authorizedById: body.authorizedById || "admin_auth",
      authorizedByName: body.authorizedByName || "Store Admin",
      authorizedRole: body.authorizedRole,
    });

    return Response.json({
      success: true,
      decision,
      message: `Credit decision '${body.status}' recorded successfully`,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to record credit approval" },
      { status: 400 }
    );
  }
}
