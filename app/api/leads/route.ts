
import { LeadsService } from "../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/leads
 * Returns paginated & filtered leads list.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const businessModel = searchParams.get("businessModel") || undefined;
    const ownerId = searchParams.get("ownerId") || undefined;
    const source = searchParams.get("source") || undefined;
    const stageKey = searchParams.get("stageKey") || undefined;
    const search = searchParams.get("search") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await LeadsService.getLeads({
      businessModel,
      ownerId,
      source,
      stageKey,
      search,
      priority,
      page,
      limit,
    });

    return Response.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to retrieve leads" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads
 * Creates a new lead with shared contact deduplication and pipeline routing.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return Response.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }

    if (!body.businessModel || !["b2b_wholesale", "b2c_retail"].includes(body.businessModel)) {
      return Response.json(
        { success: false, error: "Valid businessModel ('b2b_wholesale' or 'b2c_retail') is required" },
        { status: 400 }
      );
    }

    if (!body.contactPhone || body.contactPhone.replace(/\D/g, "").length < 10) {
      return Response.json(
        { success: false, error: "Valid 10-digit customer mobile number is required" },
        { status: 400 }
      );
    }

    const { lead, isExistingContact } = await LeadsService.createLead(body);

    return Response.json(
      {
        success: true,
        lead,
        isExistingContact,
        message: `Lead created successfully in ${body.businessModel === "b2b_wholesale" ? "Wholesale (B2B)" : "Retail (B2C)"} pipeline`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to create lead" },
      { status: 400 }
    );
  }
}
