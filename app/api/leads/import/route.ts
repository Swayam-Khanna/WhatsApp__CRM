
import { LeadsService } from "../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/import
 * Imports leads in bulk with validation and duplicate detection.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.records)) {
      return Response.json(
        { success: false, error: "Invalid payload: 'records' must be an array" },
        { status: 400 }
      );
    }

    const result = await LeadsService.importLeads(body.records);

    return Response.json({
      success: true,
      ...result,
      message: `Imported ${result.imported} leads (${result.duplicatesSkipped} duplicates skipped)`,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Import failed" },
      { status: 400 }
    );
  }
}
