
import { LeadsService } from "../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * GET /api/leads/metrics
 * Returns pipeline metrics, separate Wholesale & Retail metrics, exposure, and sync info.
 */
export async function GET(req: Request) {
  try {
    const metrics = await LeadsService.getMetrics();
    return Response.json({
      success: true,
      metrics,
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to retrieve metrics" },
      { status: 500 }
    );
  }
}
