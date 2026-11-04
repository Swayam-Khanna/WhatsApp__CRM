import type {
  LeadRecord,
  BusinessModel,
  LeadPriority,
  Quote,
  LeadTask,
  LeadActivity,
} from "../types/leads";

import {
  WHOLESALE_STAGES,
  RETAIL_STAGES,
} from "../types/leads";

export type {
  LeadRecord,
  BusinessModel,
  LeadPriority,
  Quote,
  LeadTask,
  LeadActivity,
};

export { WHOLESALE_STAGES, RETAIL_STAGES };

export interface PipelineMetrics {
  wholesale: {
    total: number;
    newLeads: number;
    unassigned: number;
    dueToday: number;
    overdue: number;
    openOpportunityValuePaise: number;
    wonCount: number;
    wonValuePaise: number;
    approvedCreditExposurePaise: number;
    overdueAccountingBalancePaise: number;
    accountingProvider: string;
    lastSyncTimestamp: string;
    avgFirstResponseTimeMinutes: number;
    conversionBySource: Record<string, { total: number; won: number }>;
  };
  retail: {
    total: number;
    newLeads: number;
    unassigned: number;
    dueToday: number;
    overdue: number;
    openOpportunityValuePaise: number;
    wonCount: number;
    wonValuePaise: number;
    avgFirstResponseTimeMinutes: number;
    conversionBySource: Record<string, { total: number; won: number }>;
  };
  totalLeads: number;
}

class LeadsClientService {
  async fetchLeads(params: {
    businessModel?: string;
    ownerId?: string;
    source?: string;
    stageKey?: string;
    search?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<{ leads: LeadRecord[]; total: number }> {
    const query = new URLSearchParams();
    if (params.businessModel) query.set("businessModel", params.businessModel);
    if (params.ownerId) query.set("ownerId", params.ownerId);
    if (params.source) query.set("source", params.source);
    if (params.stageKey) query.set("stageKey", params.stageKey);
    if (params.search) query.set("search", params.search);
    if (params.priority) query.set("priority", params.priority);
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());

    try {
      const res = await fetch(`/api/leads?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to load leads");
      const data = await res.json();
      return { leads: data.leads || [], total: data.total || 0 };
    } catch {
      return { leads: [], total: 0 };
    }
  }

  async fetchLead(id: string): Promise<LeadRecord | null> {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.lead || null;
    } catch {
      return null;
    }
  }

  async createLead(payload: any): Promise<{ success: boolean; lead?: LeadRecord; error?: string }> {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to create lead" };
      }
      return { success: true, lead: data.lead };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async transitionStage(
    leadId: string,
    stageKey: string,
    metadata?: any
  ): Promise<{ success: boolean; lead?: LeadRecord; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${leadId}/transitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageKey, ...metadata }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to update stage" };
      }
      return { success: true, lead: data.lead };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async assignLead(
    leadId: string,
    ownerId: string | null,
    ownerName: string | null,
    actorName?: string
  ): Promise<{ success: boolean; lead?: LeadRecord; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${leadId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId, ownerName, actorName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Assignment failed" };
      }
      return { success: true, lead: data.lead };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async addActivity(
    leadId: string,
    summary: string,
    details?: string,
    actorName?: string
  ): Promise<{ success: boolean; activity?: LeadActivity; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, details, actorName: actorName || "Operator" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to add activity" };
      }
      return { success: true, activity: data.activity };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async scheduleTask(
    leadId: string,
    task: { title: string; dueAt: string; description?: string; taskType?: string }
  ): Promise<{ success: boolean; task?: LeadTask; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${leadId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to schedule task" };
      }
      return { success: true, task: data.task };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async updateTask(
    leadId: string,
    taskId: string,
    updates: {
      status?: "pending" | "completed" | "cancelled";
      dueAt?: string;
      title?: string;
      actorName?: string;
    }
  ): Promise<{ success: boolean; task?: LeadTask; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${leadId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, ...updates }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to update task" };
      }
      return { success: true, task: data.task };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async createQuote(
    leadId: string,
    quoteData: any
  ): Promise<{ success: boolean; quote?: Quote; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${leadId}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quoteData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to generate quote" };
      }
      return { success: true, quote: data.quote };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async updateQuote(
    leadId: string,
    quoteId: string,
    quoteData: any
  ): Promise<{ success: boolean; quote?: Quote; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${leadId}/quotes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, ...quoteData }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to update quote" };
      }
      return { success: true, quote: data.quote };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async convertToOrder(
    leadId: string,
    payload: any
  ): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      const res = await fetch(`/api/leads/${leadId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Order conversion failed" };
      }
      return { success: true, order: data.order };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async recordCreditApproval(
    businessAccountId: string,
    payload: any
  ): Promise<{ success: boolean; decision?: any; error?: string }> {
    try {
      const res = await fetch(`/api/business-accounts/${businessAccountId}/credit-approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Credit decision failed" };
      }
      return { success: true, decision: data.decision };
    } catch (e: any) {
      return { success: false, error: e.message || "Network error" };
    }
  }

  async fetchMetrics(): Promise<PipelineMetrics | null> {
    try {
      const res = await fetch("/api/leads/metrics");
      if (!res.ok) return null;
      const data = await res.json();
      return data.metrics || null;
    } catch {
      return null;
    }
  }

  async importLeads(records: any[]): Promise<{ imported: number; duplicatesSkipped: number; errors: string[] }> {
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();
      return {
        imported: data.imported || 0,
        duplicatesSkipped: data.duplicatesSkipped || 0,
        errors: data.errors || [],
      };
    } catch {
      return { imported: 0, duplicatesSkipped: 0, errors: ["Network error"] };
    }
  }

  async fetchAccountingConfig(): Promise<any> {
    try {
      const res = await fetch("/api/crm/accounting");
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async retryAccountingJob(jobId: string): Promise<any> {
    try {
      const res = await fetch("/api/crm/accounting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_job", jobId }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const leadsService = new LeadsClientService();
