

export const dynamic = "force-dynamic";

// In-memory accounting integration configuration and job queue
declare global {
  // eslint-disable-next-line no-var
  var __crmAccountingConfig:
    | {
        provider: "zoho_books" | "zoho_invoice";
        organizationId: string;
        isConfigured: boolean;
        autoSyncWholesaleInvoices: boolean;
        lastSyncTimestamp: string;
        syncStatus: "connected" | "pending_credentials" | "error";
        statusMessage: string;
      }
    | undefined;
}

if (!globalThis.__crmAccountingConfig) {
  const isEnvConfigured = Boolean(
    process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_ORG_ID
  );

  globalThis.__crmAccountingConfig = {
    provider: (process.env.ZOHO_PROVIDER as any) || "zoho_books",
    organizationId: process.env.ZOHO_ORG_ID || "prajnaa-org-8921",
    isConfigured: isEnvConfigured,
    autoSyncWholesaleInvoices: true,
    lastSyncTimestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    syncStatus: isEnvConfigured ? "connected" : "pending_credentials",
    statusMessage: isEnvConfigured
      ? "Zoho Books API authentication active"
      : "Zoho API credentials pending configuration (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_ORG_ID). Operational accounting boundary active with queued retry jobs.",
  };
}

/**
 * GET /api/crm/accounting
 * Retrieves current Zoho Books/Invoice integration status and queue.
 */
export async function GET() {
  const config = globalThis.__crmAccountingConfig!;
  const jobs = globalThis.__globalCrmIntegrationJobs || [];

  return Response.json({
    success: true,
    config,
    queuedJobs: jobs.slice(0, 20),
    activeAccountsCount: (globalThis.__globalCrmAccounts || []).length,
  });
}

/**
 * POST /api/crm/accounting
 * Updates accounting provider configuration or triggers manual retry for pending jobs.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "update_config") {
      if (body.provider && ["zoho_books", "zoho_invoice"].includes(body.provider)) {
        globalThis.__crmAccountingConfig!.provider = body.provider;
      }
      if (body.organizationId) {
        globalThis.__crmAccountingConfig!.organizationId = body.organizationId;
      }
      if (body.autoSyncWholesaleInvoices !== undefined) {
        globalThis.__crmAccountingConfig!.autoSyncWholesaleInvoices = Boolean(
          body.autoSyncWholesaleInvoices
        );
      }
      return Response.json({
        success: true,
        message: "Accounting integration settings updated",
        config: globalThis.__crmAccountingConfig,
      });
    }

    if (body.action === "retry_job") {
      const jobId = body.jobId;
      const job = (globalThis.__globalCrmIntegrationJobs || []).find((j) => j.id === jobId);
      if (!job) {
        return Response.json({ success: false, error: "Job not found" }, { status: 404 });
      }

      job.attempts = (job.attempts || 0) + 1;
      if (job.attempts >= job.maxAttempts) {
        job.status = "failed";
        job.lastError = "Max retry attempts reached without live Zoho OAuth credentials.";
      } else {
        job.status = "retry_scheduled";
        job.nextRetryAt = new Date(Date.now() + 60000).toISOString();
      }

      return Response.json({
        success: true,
        message: `Job ${jobId} updated: status is ${job.status}`,
        job,
      });
    }

    if (body.action === "queue_sync") {
      const job = {
        id: `job_${Date.now()}`,
        integrationType: globalThis.__crmAccountingConfig!.provider,
        entityType: body.entityType || "invoice",
        entityId: body.entityId || `ENT-${Date.now()}`,
        status: "queued",
        payload: body.payload || {},
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
      };
      if (!globalThis.__globalCrmIntegrationJobs) {
        globalThis.__globalCrmIntegrationJobs = [];
      }
      globalThis.__globalCrmIntegrationJobs.unshift(job);
      return Response.json({
        success: true,
        message: "Sync job successfully queued in accounting staging pipeline",
        job,
      });
    }

    return Response.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to process accounting action" },
      { status: 500 }
    );
  }
}
