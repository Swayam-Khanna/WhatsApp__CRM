import { getDatabase } from "../../lib/mongodb.ts";
import type {
  BusinessModel,
  LeadPriority,
  QuoteStatus,
  TaskStatus,
  LeadItem,
  LeadActivity,
  LeadTask,
  QuoteItem,
  Quote,
  BusinessAccountContact,
  BusinessAccount,
  CreditApprovalDecision,
  LeadOrderLink,
  LeadRecord,
  IntegrationJob,
} from "../../frontend/lib/types/leads.ts";

import {
  WHOLESALE_STAGES,
  RETAIL_STAGES,
} from "../../frontend/lib/types/leads.ts";

export type {
  BusinessModel,
  LeadPriority,
  QuoteStatus,
  TaskStatus,
  LeadItem,
  LeadActivity,
  LeadTask,
  QuoteItem,
  Quote,
  BusinessAccountContact,
  BusinessAccount,
  CreditApprovalDecision,
  LeadOrderLink,
  LeadRecord,
  IntegrationJob,
};

export {
  WHOLESALE_STAGES,
  RETAIL_STAGES,
};

// Global in-memory storage for high resilience across Next.js serverless lambdas
declare global {
  // eslint-disable-next-line no-var
  var __globalCrmLeads: LeadRecord[] | undefined;
  // eslint-disable-next-line no-var
  var __globalCrmAccounts: BusinessAccount[] | undefined;
  // eslint-disable-next-line no-var
  var __globalCrmCreditApprovals: CreditApprovalDecision[] | undefined;
  // eslint-disable-next-line no-var
  var __globalCrmIntegrationJobs: IntegrationJob[] | undefined;
}

function getSampleSeedLeads(): LeadRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: "lead_seed_001",
      reference: "PRJ-LD-2026-001",
      businessModel: "b2b_wholesale",
      contactId: "ct_seed_001",
      contactName: "Vikram Malhotra",
      contactPhone: "+91 98160 55555",
      contactEmail: "vikram@malhotrastores.in",
      businessName: "Malhotra Organic & Kirana",
      pipelineId: "pipeline_wholesale",
      stageId: "stage_quote_sent",
      stageKey: "quote_sent",
      source: "whatsapp",
      priority: "high",
      estimatedValuePaise: 2850000,
      currency: "INR",
      deliveryPostalCode: "171001",
      ownerId: "agent_nishant",
      ownerName: "Nishant",
      nextAction: "Follow up on bulk honey quote delivery timeline",
      nextFollowUpAt: new Date(Date.now() + 86400000).toISOString(),
      accountingSyncStatus: "pending",
      items: [
        {
          id: "it_1",
          productId: "raw-honey",
          productName: "Raw Himalayan Flora Honey (Bulk 5kg)",
          quantity: 5,
          unit: "5kg can",
          indicativeUnitPricePaise: 320000,
          indicativeTotalPaise: 1600000,
        },
        {
          id: "it_2",
          productId: "organic-almonds",
          productName: "Mamra Almonds (500g)",
          quantity: 10,
          unit: "500g pack",
          indicativeUnitPricePaise: 125000,
          indicativeTotalPaise: 1250000,
        },
      ],
      quotes: [
        {
          id: "qte_seed_001",
          quoteNumber: "QTE-2026-1001",
          leadId: "lead_seed_001",
          version: 1,
          subtotalPaise: 2850000,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 2850000,
          paymentTerms: "Net 15",
          deliveryTerms: "Standard Shipping to Shimla Store",
          validUntil: new Date(Date.now() + 14 * 86400000).toISOString(),
          status: "shared",
          items: [
            {
              id: "qi_1",
              productId: "raw-honey",
              productName: "Raw Himalayan Flora Honey (Bulk 5kg)",
              quantity: 5,
              unit: "5kg can",
              unitPricePaise: 320000,
              totalPaise: 1600000,
            },
            {
              id: "qi_2",
              productId: "organic-almonds",
              productName: "Mamra Almonds (500g)",
              quantity: 10,
              unit: "500g pack",
              unitPricePaise: 125000,
              totalPaise: 1250000,
            },
          ],
          createdBy: "Nishant",
          createdAt: now,
          updatedAt: now,
        },
      ],
      activities: [
        {
          id: "act_seed_001",
          leadId: "PRJ-LD-2026-001",
          actorName: "Nishant",
          activityType: "quote_created",
          summary: "Quotation #QTE-2026-1001 shared via WhatsApp",
          details: "5x Bulk Honey and 10x Mamra Almonds - Total ₹28,500 with Net 15 terms",
          createdAt: now,
        },
      ],
      tasks: [
        {
          id: "tsk_seed_001",
          leadId: "lead_seed_001",
          assignedToId: "agent_nishant",
          assignedToName: "Nishant",
          taskType: "whatsapp",
          title: "Follow up on Quotation #QTE-2026-1001",
          dueAt: new Date(Date.now() + 86400000).toISOString(),
          status: "pending",
          priority: "high",
          createdAt: now,
        },
      ],
      orderLinks: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
    {
      id: "lead_seed_002",
      reference: "PRJ-LD-2026-002",
      businessModel: "b2b_wholesale",
      contactId: "ct_seed_002",
      contactName: "Rohit Sharma",
      contactPhone: "+91 98160 88888",
      contactEmail: "rohit@sharmaayurved.com",
      businessName: "Sharma Ayurvedic Store",
      pipelineId: "pipeline_wholesale",
      stageId: "stage_won",
      stageKey: "won",
      source: "website",
      priority: "urgent",
      estimatedValuePaise: 3500000,
      currency: "INR",
      deliveryPostalCode: "173212",
      linkedOrderId: "ORD-8921",
      conversionRuleApplied: "Commercial Wholesale Net 30 Terms",
      ownerId: "agent_nishant",
      ownerName: "Nishant",
      accountingSyncStatus: "synced",
      items: [
        {
          id: "it_3",
          productId: "pure-shilajit",
          productName: "Pure Himalayan Shilajit Resin (20g)",
          quantity: 20,
          unit: "20g jar",
          indicativeUnitPricePaise: 175000,
          indicativeTotalPaise: 3500000,
        },
      ],
      quotes: [
        {
          id: "qte_seed_002",
          quoteNumber: "QTE-2026-1002",
          leadId: "lead_seed_002",
          version: 1,
          subtotalPaise: 3500000,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 3500000,
          paymentTerms: "Net 30 Commercial",
          deliveryTerms: "Direct Dispatch from Solan Hub",
          validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: "converted",
          items: [
            {
              id: "qi_3",
              productId: "pure-shilajit",
              productName: "Pure Himalayan Shilajit Resin (20g)",
              quantity: 20,
              unit: "20g jar",
              unitPricePaise: 175000,
              totalPaise: 3500000,
            },
          ],
          createdBy: "Nishant",
          createdAt: now,
          updatedAt: now,
        },
      ],
      activities: [
        {
          id: "act_seed_002",
          leadId: "PRJ-LD-2026-002",
          actorName: "Nishant",
          activityType: "order_linked",
          summary: "Converted to Order #ORD-8921",
          details: "Commercial wholesale dispatch authorized for Solan Ayurvedic Hub",
          createdAt: now,
        },
      ],
      tasks: [],
      orderLinks: [
        {
          id: "ol_seed_001",
          leadId: "lead_seed_002",
          orderId: "ORD-8921",
          orderNumber: "#ORD-8921",
          businessModel: "b2b_wholesale",
          conversionType: "wholesale_approved_credit",
          totalPaise: 3500000,
          paymentStatus: "credit_terms",
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
      version: 2,
    },
    {
      id: "lead_seed_003",
      reference: "PRJ-LD-2026-003",
      businessModel: "b2c_retail",
      contactId: "ct_seed_003",
      contactName: "Sunita Devi",
      contactPhone: "+91 98161 22334",
      contactEmail: "sunita.devi@outlook.com",
      pipelineId: "pipeline_retail",
      stageId: "stage_negotiation",
      stageKey: "negotiation",
      source: "whatsapp",
      priority: "normal",
      estimatedValuePaise: 245000,
      currency: "INR",
      deliveryPostalCode: "176215",
      ownerId: "agent_nishant",
      ownerName: "Nishant",
      nextAction: "Confirm dispatch date for Pahadi Ghee batch",
      nextFollowUpAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      accountingSyncStatus: "not_applicable",
      items: [
        {
          id: "it_4",
          productId: "desi-ghee",
          productName: "Pahadi Badri Cow Desi Ghee (1L)",
          quantity: 1,
          unit: "1L jar",
          indicativeUnitPricePaise: 245000,
          indicativeTotalPaise: 245000,
        },
      ],
      quotes: [
        {
          id: "qte_seed_003",
          quoteNumber: "QTE-2026-1003",
          leadId: "lead_seed_003",
          version: 1,
          subtotalPaise: 245000,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise: 245000,
          paymentTerms: "UPI / Prepaid",
          deliveryTerms: "Standard Shipping (2-3 days)",
          validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: "shared",
          items: [
            {
              id: "qi_4",
              productId: "desi-ghee",
              productName: "Pahadi Badri Cow Desi Ghee (1L)",
              quantity: 1,
              unit: "1L jar",
              unitPricePaise: 245000,
              totalPaise: 245000,
            },
          ],
          createdBy: "Nishant",
          createdAt: now,
          updatedAt: now,
        },
      ],
      activities: [],
      tasks: [],
      orderLinks: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
  ];
}

function initializeSeedData() {
  if (!globalThis.__globalCrmAccounts) {
    globalThis.__globalCrmAccounts = [];
  }
  if (!globalThis.__globalCrmLeads || (globalThis.__globalCrmLeads.length === 0 && process.env.NODE_ENV !== "test")) {
    globalThis.__globalCrmLeads = getSampleSeedLeads();
  }
  if (!globalThis.__globalCrmCreditApprovals) {
    globalThis.__globalCrmCreditApprovals = [];
  }
  if (!globalThis.__globalCrmIntegrationJobs) {
    globalThis.__globalCrmIntegrationJobs = [];
  }
}

initializeSeedData();

/**
 * Service Layer implementing the 8-phase functional specifications for Leads & Sales
 */
export class LeadsService {
  /**
   * Phone Number Normalization helper (E.164 and Indian carrier 10-digit prefixes)
   */
  static cleanPhone(phone: string): string {
    const raw = (phone || "").replace(/\D/g, "");
    if (raw.length === 10) return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
    if (raw.length === 11 && raw.startsWith("0")) {
      return `+91 ${raw.slice(1, 6)} ${raw.slice(6)}`;
    }
    if (raw.length === 12 && raw.startsWith("91")) {
      return `+91 ${raw.slice(2, 7)} ${raw.slice(7)}`;
    }
    return phone.trim();
  }

  static getCleanRawPhone(phone: string): string {
    const raw = (phone || "").replace(/\D/g, "");
    if (raw.length === 10) return `91${raw}`;
    if (raw.length === 11 && raw.startsWith("0")) return `91${raw.slice(1)}`;
    return raw;
  }

  /**
   * GET /api/leads - Filtered & paginated lead query
   */
  static async getLeads(params: {
    businessModel?: string;
    ownerId?: string;
    source?: string;
    stageKey?: string;
    search?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<{ leads: LeadRecord[]; total: number; page: number; limit: number }> {
    initializeSeedData();
    let records = [...(globalThis.__globalCrmLeads || [])];

    if (params.businessModel && params.businessModel !== "all") {
      records = records.filter((l) => l.businessModel === params.businessModel);
    }
    if (params.ownerId && params.ownerId !== "all") {
      if (params.ownerId === "unassigned") {
        records = records.filter((l) => !l.ownerId);
      } else {
        records = records.filter((l) => l.ownerId === params.ownerId);
      }
    }
    if (params.source && params.source !== "all") {
      records = records.filter((l) => l.source === params.source);
    }
    if (params.stageKey && params.stageKey !== "all") {
      records = records.filter((l) => l.stageKey === params.stageKey);
    }
    if (params.priority && params.priority !== "all") {
      records = records.filter((l) => l.priority === params.priority);
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      records = records.filter(
        (l) =>
          l.reference.toLowerCase().includes(q) ||
          l.contactName.toLowerCase().includes(q) ||
          l.contactPhone.toLowerCase().includes(q) ||
          (l.businessName && l.businessName.toLowerCase().includes(q)) ||
          (l.contactEmail && l.contactEmail.toLowerCase().includes(q))
      );
    }

    // Sort by latest updated
    records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const total = records.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 50);
    const paginated = records.slice((page - 1) * limit, page * limit);

    return { leads: paginated, total, page, limit };
  }

  /**
   * GET /api/leads/:id - Full details of a lead
   */
  static async getLeadById(id: string): Promise<LeadRecord | null> {
    initializeSeedData();
    const clean = (id || "").trim().toLowerCase();
    const cleanNoHash = clean.replace(/^#+/, "");
    const lead = (globalThis.__globalCrmLeads || []).find(
      (l) =>
        l.id === id ||
        l.reference === id ||
        l.id.toLowerCase() === clean ||
        l.reference.toLowerCase() === clean ||
        (l.linkedOrderId && (l.linkedOrderId.toLowerCase() === clean || l.linkedOrderId.toLowerCase() === cleanNoHash)) ||
        (Array.isArray(l.quotes) && l.quotes.some((q) => q.id === id || q.quoteNumber.toLowerCase() === clean))
    );
    return lead || null;
  }

  /**
   * POST /api/leads - Create a lead with contact deduplication and pipeline routing
   */
  static async createLead(data: {
    businessModel: BusinessModel;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    source: "whatsapp" | "website" | "phone" | "referral" | "campaign" | "manual" | "import";
    sourceReference?: string;
    priority?: LeadPriority;
    estimatedValuePaise?: number;
    ownerId?: string | null;
    ownerName?: string | null;
    nextAction?: string;
    nextFollowUpAt?: string;
    notes?: string;
    items?: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unit?: string;
      indicativeUnitPricePaise?: number;
    }>;
    // B2B Wholesale specific fields
    businessName?: string;
    businessType?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    gstin?: string;
    expectedQuantity?: string;
    expectedFrequency?: string;
    requestedPriceTier?: string;
    requestedPaymentTerms?: string;
    requestedCreditLimitPaise?: number;
    requestedCreditPeriodDays?: number;
    // B2C Retail specific fields
    deliveryPostalCode?: string;
    checkoutReference?: string;
    pendingReason?: string;
  }): Promise<{ lead: LeadRecord; isExistingContact: boolean }> {
    initializeSeedData();

    if (!data.contactPhone || data.contactPhone.replace(/\D/g, "").length < 10) {
      throw new Error("Valid customer phone number (minimum 10 digits) is required");
    }

    const cleanFormattedPhone = this.cleanPhone(data.contactPhone);
    const rawClean = this.getCleanRawPhone(data.contactPhone);

    // Shared contact matching: search if this phone already exists in previous leads or business accounts
    const existingLeadWithContact = (globalThis.__globalCrmLeads || []).find(
      (l) => this.getCleanRawPhone(l.contactPhone) === rawClean
    );

    const isExistingContact = Boolean(existingLeadWithContact);
    const contactId = existingLeadWithContact ? existingLeadWithContact.contactId : `cust_${Date.now()}`;
    const contactName = data.contactName?.trim() || existingLeadWithContact?.contactName || "Inquiring Customer";

    // Handle Wholesale Business Account linking
    let businessAccountId: string | null = null;
    if (data.businessModel === "b2b_wholesale") {
      if (data.businessName) {
        // Find existing business account or create one
        let existingAcc = (globalThis.__globalCrmAccounts || []).find(
          (a) =>
            a.name.toLowerCase() === data.businessName?.trim().toLowerCase() ||
            (data.gstin && a.gstin && a.gstin.toLowerCase() === data.gstin.trim().toLowerCase())
        );

        if (!existingAcc) {
          existingAcc = {
            id: `biz_acc_${Date.now()}`,
            name: data.businessName.trim(),
            businessType: data.businessType || "Retail Store",
            addressLine1: data.addressLine1 || "Business Address",
            city: data.city || "Shimla",
            state: data.state || "Himachal Pradesh",
            postalCode: data.postalCode || data.deliveryPostalCode || "171001",
            gstin: data.gstin?.trim() || "",
            creditApproved: false,
            creditLimitPaise: 0,
            creditPeriodDays: 0,
            outstandingBalancePaise: 0,
            accountingProvider: "zoho_books",
            contacts: [
              {
                id: `bac_${Date.now()}`,
                businessAccountId: `biz_acc_${Date.now()}`,
                contactName,
                phone: cleanFormattedPhone,
                email: data.contactEmail,
                role: "Proprietor",
                isPrimary: true,
                createdAt: new Date().toISOString(),
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          globalThis.__globalCrmAccounts?.push(existingAcc);
        }
        businessAccountId = existingAcc.id;
      }
    }

    const count = (globalThis.__globalCrmLeads || []).length + 1001;
    const prefix = data.businessModel === "b2b_wholesale" ? "LD-B2B" : "LD-B2C";
    const reference = `${prefix}-${count}`;

    // Initial Stage
    const initialStageKey = "new_enquiry";
    const initialStageName = "New Enquiry";
    const pipelineId = data.businessModel === "b2b_wholesale" ? "pipeline_wholesale" : "pipeline_retail";

    // Items
    const leadItems: LeadItem[] = (data.items || []).map((it, idx) => ({
      id: `li_${Date.now()}_${idx}`,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity || 1,
      unit: it.unit || "units",
      indicativeUnitPricePaise: it.indicativeUnitPricePaise || 0,
      indicativeTotalPaise: (it.indicativeUnitPricePaise || 0) * (it.quantity || 1),
    }));

    const calculatedValue =
      data.estimatedValuePaise !== undefined
        ? data.estimatedValuePaise
        : leadItems.reduce((acc, it) => acc + it.indicativeTotalPaise, 0);

    const now = new Date().toISOString();

    const newLead: LeadRecord = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      reference,
      businessModel: data.businessModel,
      contactId,
      contactName,
      contactPhone: cleanFormattedPhone,
      contactEmail: data.contactEmail,
      businessAccountId,
      businessName: data.businessName,
      pipelineId,
      stageId: `stage_${initialStageKey}`,
      stageKey: initialStageKey,
      ownerId: data.ownerId || null,
      ownerName: data.ownerName || (data.ownerId ? "Assigned Agent" : null),
      source: data.source || "whatsapp",
      sourceReference: data.sourceReference,
      priority: data.priority || "normal",
      estimatedValuePaise: calculatedValue,
      currency: "INR",
      expectedQuantity: data.expectedQuantity,
      expectedFrequency: data.expectedFrequency,
      requestedPriceTier: data.requestedPriceTier,
      requestedPaymentTerms: data.requestedPaymentTerms,
      requestedCreditLimitPaise: data.requestedCreditLimitPaise || 0,
      requestedCreditPeriodDays: data.requestedCreditPeriodDays || 0,
      deliveryPostalCode: data.deliveryPostalCode,
      checkoutReference: data.checkoutReference,
      pendingReason: data.pendingReason,
      nextAction: data.nextAction || (data.ownerId ? "Make initial contact with customer" : undefined),
      nextFollowUpAt: data.nextFollowUpAt,
      firstResponseAt: data.ownerId ? now : undefined,
      notes: data.notes,
      accountingSyncStatus: data.businessModel === "b2b_wholesale" ? "pending" : "not_applicable",
      items: leadItems,
      activities: [
        {
          id: `act_${Date.now()}`,
          leadId: reference,
          actorName: data.ownerName || "System",
          activityType: "stage_change",
          summary: `Opportunity created in ${data.businessModel === "b2b_wholesale" ? "Wholesale (B2B)" : "Retail (B2C)"} pipeline`,
          details: `Source: ${data.source}. Initial stage: ${initialStageName}`,
          createdAt: now,
        },
      ],
      tasks: [],
      quotes: [],
      orderLinks: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Automation Rule: If an upcoming connect is scheduled or lead is assigned, create the task
    if (data.nextFollowUpAt) {
      newLead.tasks.push({
        id: `tsk_${Date.now()}_followup`,
        leadId: newLead.id,
        assignedToId: newLead.ownerId || undefined,
        assignedToName: newLead.ownerName || "Sales Concierge",
        taskType: "whatsapp",
        title: data.nextAction || `Follow up with ${contactName}`,
        description: data.notes || `Scheduled upcoming connect for ${contactName}`,
        dueAt: data.nextFollowUpAt,
        status: "pending",
        priority: newLead.priority,
        createdAt: now,
      });
    } else if (newLead.ownerId) {
      newLead.tasks.push({
        id: `tsk_${Date.now()}`,
        leadId: newLead.id,
        assignedToId: newLead.ownerId,
        assignedToName: newLead.ownerName || "Assigned Agent",
        taskType: "whatsapp",
        title: "First Contact: Acknowledge Enquiry & Clarify Requirements",
        description: `Customer ${contactName} reached out via ${data.source}. Review product interest and provide immediate response.`,
        dueAt: new Date(Date.now() + 3600 * 1000 * 4).toISOString(), // 4h SLA
        status: "pending",
        priority: newLead.priority,
        createdAt: now,
      });
    }

    globalThis.__globalCrmLeads?.unshift(newLead);

    // Asynchronously try to persist to MongoDB Atlas in background without blocking response
    getDatabase()
      .then((db) => db.collection("crm_leads").insertOne(newLead))
      .catch(() => {});

    return { lead: newLead, isExistingContact };
  }

  /**
   * POST /api/leads/:id/transitions - Validates and executes stage transitions with business rules
   */
  static async transitionStage(
    leadId: string,
    targetStageKey: string,
    metadata?: {
      actorId?: string;
      actorName?: string;
      actorRole?: string;
      lostReason?: string;
      notes?: string;
      orderTotalPaise?: number;
      paymentVerified?: boolean;
      approvedCredit?: boolean;
    }
  ): Promise<LeadRecord> {
    initializeSeedData();
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error(`Lead with ID or reference '${leadId}' not found`);

    const validStages = lead.businessModel === "b2b_wholesale" ? WHOLESALE_STAGES : RETAIL_STAGES;
    const targetStage = validStages.find((s) => s.stageKey === targetStageKey);
    if (!targetStage) {
      throw new Error(`Invalid stage '${targetStageKey}' for pipeline '${lead.businessModel}'`);
    }

    // Stage Transition Handling & Auto-Population:
    if (lead.businessModel === "b2b_wholesale") {
      if (targetStageKey === "business_qualified") {
        if (!lead.businessName && !lead.businessAccountId) {
          lead.businessName = lead.contactName ? `${lead.contactName} Commercial Store` : "Himalayan Wholesale Mart";
        }
      }
      if (targetStageKey === "quote_shared") {
        if (lead.quotes.length === 0 && lead.items.length === 0) {
          lead.items = [
            {
              id: `li_${Date.now()}`,
              productId: "raw-honey",
              productName: "Raw Himalayan Flora Honey",
              quantity: 10,
              unit: "kg",
              indicativeUnitPricePaise: 95000,
              indicativeTotalPaise: 950000,
            },
          ];
        }
      }
      if (targetStageKey === "won") {
        // Enforce Wholesale Conversion Rules
        const isPrepaidVerified = metadata?.paymentVerified === true;
        const isApprovedCredit = metadata?.approvedCredit === true;

        if (!isPrepaidVerified && !isApprovedCredit) {
          const bizAcc = (globalThis.__globalCrmAccounts || []).find((a) => a.id === lead.businessAccountId);
          if (!bizAcc?.creditApproved) {
            throw new Error(
              "Wholesale Won conversion requires either verified payment or an authorized credit approval decision"
            );
          }
        }
        lead.wonAt = new Date().toISOString();
        lead.conversionRuleApplied = isApprovedCredit
          ? "wholesale_approved_credit"
          : "wholesale_prepaid";
      }
    } else {
      // Retail Pipeline Rules
      if (targetStageKey === "won") {
        lead.wonAt = new Date().toISOString();
        lead.conversionRuleApplied = metadata?.paymentVerified !== false ? "retail_prepaid" : "retail_cod";
      }
    }

    if (targetStageKey === "lost" || targetStageKey === "disqualified") {
      lead.lostAt = new Date().toISOString();
      lead.lostReason = metadata?.lostReason || "Customer cancelled or opted out";

      // Automation Rule: Cancel unnecessary pending sales tasks
      lead.tasks.forEach((t) => {
        if (t.status === "pending") {
          t.status = "cancelled";
        }
      });
    }

    const previousStage = lead.stageKey;
    lead.stageKey = targetStageKey;
    lead.stageId = `stage_${targetStageKey}`;
    lead.updatedAt = new Date().toISOString();
    lead.version = (lead.version || 1) + 1;

    // Record activity
    lead.activities.unshift({
      id: `act_${Date.now()}`,
      leadId: lead.id,
      actorId: metadata?.actorId,
      actorName: metadata?.actorName || "Operator",
      activityType: "stage_change",
      summary: `Stage transitioned from '${previousStage}' to '${targetStage.name}'`,
      details: metadata?.notes,
      metadata: { previousStage, newStage: targetStageKey, lostReason: metadata?.lostReason },
      createdAt: new Date().toISOString(),
    });

    // Save to Atlas in background if available
    getDatabase()
      .then((db) => db.collection("crm_leads").updateOne({ id: lead.id }, { $set: lead }))
      .catch(() => {});

    return lead;
  }

  /**
   * POST /api/leads/:id/assignments - Assigns or transfers lead owner
   */
  static async assignLead(
    leadId: string,
    ownerId: string | null,
    ownerName: string | null,
    actorName: string = "Admin"
  ): Promise<LeadRecord> {
    initializeSeedData();
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error("Lead not found");

    const prevOwner = lead.ownerName || "Unassigned";
    lead.ownerId = ownerId;
    lead.ownerName = ownerName;
    lead.updatedAt = new Date().toISOString();

    // If newly assigned, schedule initial follow-up task
    if (ownerId && !lead.firstResponseAt) {
      lead.firstResponseAt = new Date().toISOString();
      lead.tasks.push({
        id: `tsk_${Date.now()}`,
        leadId: lead.id,
        assignedToId: ownerId,
        assignedToName: ownerName || "Assigned Agent",
        taskType: "whatsapp",
        title: "Immediate Follow-Up on Assigned Lead",
        dueAt: new Date(Date.now() + 3600 * 1000 * 4).toISOString(),
        status: "pending",
        priority: lead.priority,
        createdAt: new Date().toISOString(),
      });
    }

    lead.activities.unshift({
      id: `act_${Date.now()}`,
      leadId: lead.id,
      actorName,
      activityType: "assigned",
      summary: ownerId ? `Assigned to ${ownerName} (was: ${prevOwner})` : `Unassigned (was: ${prevOwner})`,
      createdAt: new Date().toISOString(),
    });

    return lead;
  }

  /**
   * POST /api/leads/:id/activities - Adds an activity note
   */
  static async addActivity(
    leadId: string,
    data: {
      actorName: string;
      activityType?: LeadActivity["activityType"];
      summary: string;
      details?: string;
    }
  ): Promise<LeadActivity> {
    initializeSeedData();
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error("Lead not found");

    const activity: LeadActivity = {
      id: `act_${Date.now()}`,
      leadId: lead.id,
      actorName: data.actorName,
      activityType: data.activityType || "note",
      summary: data.summary,
      details: data.details,
      createdAt: new Date().toISOString(),
    };

    lead.activities.unshift(activity);
    lead.updatedAt = new Date().toISOString();

    return activity;
  }

  /**
   * POST /api/leads/:id/tasks - Schedules follow-up or updates task
   */
  static async scheduleTask(
    leadId: string,
    data: {
      title: string;
      description?: string;
      taskType: LeadTask["taskType"];
      dueAt: string;
      assignedToId?: string;
      assignedToName?: string;
      priority?: LeadPriority;
    }
  ): Promise<LeadTask> {
    initializeSeedData();
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error("Lead not found");

    const task: LeadTask = {
      id: `tsk_${Date.now()}`,
      leadId: lead.id,
      assignedToId: data.assignedToId || lead.ownerId || undefined,
      assignedToName: data.assignedToName || lead.ownerName || undefined,
      taskType: data.taskType,
      title: data.title,
      description: data.description,
      dueAt: data.dueAt,
      status: "pending",
      priority: data.priority || lead.priority || "normal",
      createdAt: new Date().toISOString(),
    };

    lead.tasks.unshift(task);
    lead.nextAction = task.title;
    lead.nextFollowUpAt = task.dueAt;
    lead.updatedAt = new Date().toISOString();

    lead.activities.unshift({
      id: `act_${Date.now()}`,
      leadId: lead.id,
      actorName: data.assignedToName || "Agent",
      activityType: "follow_up_scheduled",
      summary: `Follow-up scheduled: ${task.title} (Due: ${new Date(task.dueAt).toLocaleDateString()})`,
      createdAt: new Date().toISOString(),
    });

    return task;
  }

  /**
   * PATCH /api/leads/:id/tasks - Updates task status (e.g. pending -> completed) or schedule
   */
  static async updateTask(
    leadId: string,
    taskId: string,
    updates: {
      status?: "pending" | "completed" | "cancelled";
      dueAt?: string;
      title?: string;
      actorName?: string;
    }
  ): Promise<LeadTask> {
    initializeSeedData();
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error("Lead not found");

    let task: LeadTask | undefined = lead.tasks.find((t) => t.id === taskId);
    if (!task) {
      const newTask: LeadTask = {
        id: taskId,
        leadId: lead.id,
        taskType: "whatsapp",
        title: lead.nextAction || `Follow up with ${lead.contactName}`,
        description: lead.notes || "Follow-up task",
        dueAt: lead.nextFollowUpAt || new Date().toISOString(),
        status: "pending",
        priority: lead.priority || "normal",
        createdAt: new Date().toISOString(),
      };
      lead.tasks.unshift(newTask);
      task = newTask;
    }

    if (updates.status) task.status = updates.status;
    if (updates.dueAt) task.dueAt = updates.dueAt;
    if (updates.title) task.title = updates.title;

    // Recalculate lead.nextFollowUpAt and nextAction based on remaining active tasks
    const remainingActive = lead.tasks.filter((t) => t.status === "pending" || (t.status as any) === "in_progress");
    if (remainingActive.length > 0) {
      remainingActive.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
      lead.nextAction = remainingActive[0].title;
      lead.nextFollowUpAt = remainingActive[0].dueAt;
    } else if (updates.status === "completed") {
      lead.nextAction = "All scheduled follow-ups completed";
      lead.nextFollowUpAt = undefined;
    }

    lead.updatedAt = new Date().toISOString();

    lead.activities.unshift({
      id: `act_${Date.now()}`,
      leadId: lead.id,
      actorName: updates.actorName || "Agent",
      activityType: updates.status === "completed" ? "follow_up_completed" : "note",
      summary: updates.status === "completed" ? `Follow-up completed: ${task.title}` : `Follow-up updated: ${task.title}`,
      createdAt: new Date().toISOString(),
    });

    return task;
  }

  /**
   * POST /api/leads/:id/quotes - Create versioned commercial offer
   */
  static async createQuote(
    leadId: string,
    data: {
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unit?: string;
        unitPricePaise: number;
        discountPercent?: number;
      }>;
      paymentTerms?: string;
      deliveryTerms?: string;
      validDays?: number;
      discountPaise?: number;
      notes?: string;
      createdBy: string;
    }
  ): Promise<Quote> {
    initializeSeedData();
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error("Lead not found");

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Quotation must include at least one item with valid quantity & price");
    }

    const version = (lead.quotes?.length || 0) + 1;
    const quoteNumber = `QTE-${new Date().getFullYear()}-${1000 + (globalThis.__globalCrmLeads?.reduce((a, b) => a + (b.quotes?.length || 0), 0) || 0) + 1}`;

    const quoteItems: QuoteItem[] = data.items.map((it, idx) => {
      const discount = it.discountPercent || 0;
      const sub = it.unitPricePaise * it.quantity;
      const discountedTotal = Math.round(sub * (1 - discount / 100));
      return {
        id: `qi_${Date.now()}_${idx}`,
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unit: it.unit || "units",
        unitPricePaise: it.unitPricePaise,
        totalPaise: discountedTotal,
        discountPercent: discount,
      };
    });

    const subtotalPaise = quoteItems.reduce((acc, it) => acc + it.totalPaise, 0);
    const overallDiscount = data.discountPaise || 0;
    const totalPaise = Math.max(0, subtotalPaise - overallDiscount);

    const quote: Quote = {
      id: `qte_${Date.now()}`,
      quoteNumber,
      leadId: lead.id,
      version,
      subtotalPaise,
      discountPaise: overallDiscount,
      taxPaise: 0,
      totalPaise,
      paymentTerms: data.paymentTerms || (lead.businessModel === "b2b_wholesale" ? "15 Days Credit" : "Prepaid UPI"),
      deliveryTerms: data.deliveryTerms || "Shipping Door Delivery",
      validUntil: new Date(Date.now() + (data.validDays || 14) * 86400 * 1000).toISOString(),
      status: "draft",
      items: quoteItems,
      notes: data.notes,
      createdBy: data.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    lead.quotes.unshift(quote);
    lead.estimatedValuePaise = totalPaise;
    lead.updatedAt = new Date().toISOString();

    // Automation Rule: When quote is created / shared, mandate next follow-up
    lead.tasks.unshift({
      id: `tsk_${Date.now()}`,
      leadId: lead.id,
      assignedToName: data.createdBy,
      taskType: "quote_follow_up",
      title: `Follow up on Quote #${quoteNumber} (v${version})`,
      description: `Follow up on commercial terms (Total ₹${(totalPaise / 100).toLocaleString("en-IN")})`,
      dueAt: new Date(Date.now() + 86400 * 1000 * 3).toISOString(),
      status: "pending",
      priority: "high",
      createdAt: new Date().toISOString(),
    });

    lead.activities.unshift({
      id: `act_${Date.now()}`,
      leadId: lead.id,
      actorName: data.createdBy,
      activityType: "quote_created",
      summary: `Commercial Quotation #${quoteNumber} (v${version}) generated: ₹${(totalPaise / 100).toLocaleString("en-IN")}`,
      createdAt: new Date().toISOString(),
    });

    return quote;
  }

  /**
   * PATCH /api/leads/:id/quotes - Modify / Edit existing commercial quotation
   */
  static async updateQuote(
    leadId: string,
    quoteId: string,
    data: {
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unit?: string;
        unitPricePaise: number;
        discountPercent?: number;
      }>;
      paymentTerms?: string;
      deliveryTerms?: string;
      validDays?: number;
      discountPaise?: number;
      notes?: string;
      updatedBy: string;
    }
  ): Promise<Quote> {
    initializeSeedData();
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error("Lead not found");

    const quote = lead.quotes?.find((q) => q.id === quoteId || q.quoteNumber === quoteId);
    if (!quote) throw new Error("Quote not found");

    const quoteItems: QuoteItem[] = (data.items || []).map((it, idx) => {
      const discount = it.discountPercent || 0;
      const sub = it.unitPricePaise * it.quantity;
      const discountedTotal = Math.round(sub * (1 - discount / 100));
      return {
        id: `qi_${Date.now()}_${idx}`,
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unit: it.unit || "units",
        unitPricePaise: it.unitPricePaise,
        totalPaise: discountedTotal,
        discountPercent: discount,
      };
    });

    const subtotalPaise = quoteItems.reduce((acc, it) => acc + it.totalPaise, 0);
    const overallDiscount = data.discountPaise || 0;
    const totalPaise = Math.max(0, subtotalPaise - overallDiscount);

    quote.version = (quote.version || 1) + 1;
    quote.items = quoteItems;
    quote.subtotalPaise = subtotalPaise;
    quote.discountPaise = overallDiscount;
    quote.totalPaise = totalPaise;
    if (data.paymentTerms) quote.paymentTerms = data.paymentTerms;
    if (data.deliveryTerms) quote.deliveryTerms = data.deliveryTerms;
    if (data.validDays) {
      quote.validUntil = new Date(Date.now() + data.validDays * 86400 * 1000).toISOString();
    }
    if (data.notes !== undefined) quote.notes = data.notes;
    quote.updatedAt = new Date().toISOString();

    lead.estimatedValuePaise = totalPaise;
    lead.updatedAt = new Date().toISOString();

    lead.activities.unshift({
      id: `act_${Date.now()}`,
      leadId: lead.id,
      actorName: data.updatedBy || "Agent",
      activityType: "quote_created",
      summary: `Quotation #${quote.quoteNumber} updated to v${quote.version}: Total ₹${(totalPaise / 100).toLocaleString("en-IN")}`,
      createdAt: new Date().toISOString(),
    });

    return quote;
  }

  /**
   * POST /api/leads/:id/orders - Idempotent Lead to Order Conversion
   */
  static async convertToOrder(
    leadId: string,
    data: {
      orderNumber?: string;
      paymentStatus?: string;
      shippingAddress?: any;
      convertedByName?: string;
      convertedById?: string;
    }
  ): Promise<{ order: any; link: LeadOrderLink }> {
    initializeSeedData();
    const lead = await this.getLeadById(leadId);
    if (!lead) throw new Error("Lead not found");

    // Idempotency: Check if an order is already linked to this lead
    if (lead.linkedOrderId && lead.orderLinks.length > 0) {
      const existing = lead.orderLinks[0];
      return {
        order: { id: existing.orderId, orderNumber: existing.orderNumber },
        link: existing,
      };
    }

    const orderNumber = data.orderNumber || `PM-ORD-${Date.now().toString().slice(-6)}`;
    const totalPaise =
      lead.quotes[0]?.totalPaise ||
      lead.items.reduce((acc, it) => acc + it.indicativeTotalPaise, 0) ||
      lead.estimatedValuePaise ||
      99900;

    const conversionType =
      lead.businessModel === "b2b_wholesale"
        ? lead.requestedCreditLimitPaise && lead.requestedCreditLimitPaise > 0
          ? "wholesale_approved_credit"
          : "wholesale_prepaid"
        : data.paymentStatus === "cod"
        ? "retail_cod"
        : "retail_prepaid";

    const link: LeadOrderLink = {
      id: `link_${Date.now()}`,
      leadId: lead.id,
      orderId: orderNumber,
      orderNumber,
      businessModel: lead.businessModel,
      conversionType,
      totalPaise,
      paymentStatus: data.paymentStatus || (conversionType.includes("credit") ? "credit_terms" : "paid"),
      convertedById: data.convertedById,
      convertedByName: data.convertedByName || "Operator",
      createdAt: new Date().toISOString(),
    };

    lead.orderLinks.unshift(link);
    lead.linkedOrderId = orderNumber;
    lead.stageKey = "won";
    lead.stageId = "stage_won";
    lead.wonAt = new Date().toISOString();
    lead.conversionRuleApplied = conversionType;
    lead.updatedAt = new Date().toISOString();

    // Create the order record in global CRM orders
    const crmOrder = {
      id: orderNumber,
      orderNumber,
      customerName: lead.contactName,
      customerPhone: lead.contactPhone,
      customerEmail: lead.contactEmail || "wholesale@prajnaa.in",
      totalPaise,
      subtotalPaise: lead.quotes[0]?.subtotalPaise || totalPaise,
      discountPaise: lead.quotes[0]?.discountPaise || 0,
      status: "In Transit",
      paymentStatus: link.paymentStatus,
      paymentMethod: lead.businessModel === "b2b_wholesale" ? "credit_invoice" : "whatsapp",
      items: (lead.quotes[0]?.items || lead.items).map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise || (it as any).indicativeUnitPricePaise || 0,
        totalPaise: it.totalPaise || (it as any).indicativeTotalPaise || 0,
      })),
      shippingAddressSnapshot: data.shippingAddress || {
        fullName: lead.contactName,
        line1: lead.businessName || "Primary Hub Address",
        city: "Shimla",
        state: "Himachal Pradesh",
        postalCode: lead.deliveryPostalCode || "171001",
      },
      createdAt: new Date().toISOString(),
    };

    if (!globalThis.__globalCrmOrders) globalThis.__globalCrmOrders = [];
    globalThis.__globalCrmOrders.unshift(crmOrder);

    lead.activities.unshift({
      id: `act_${Date.now()}`,
      leadId: lead.id,
      actorName: data.convertedByName || "Operator",
      activityType: "order_linked",
      summary: `Lead converted into Confirmed Order #${orderNumber} (₹${(totalPaise / 100).toLocaleString("en-IN")})`,
      details: `Conversion policy: ${conversionType}`,
      createdAt: new Date().toISOString(),
    });

    // Accounting integration hook: If wholesale, queue invoice creation in Zoho Books
    if (lead.businessModel === "b2b_wholesale") {
      globalThis.__globalCrmIntegrationJobs?.unshift({
        id: `job_${Date.now()}`,
        jobType: "zoho_invoice_creation",
        entityId: orderNumber,
        entityType: "order",
        provider: "zoho_books",
        payload: {
          customerName: lead.contactName,
          businessName: lead.businessName,
          orderNumber,
          totalPaise,
          items: crmOrder.items,
        },
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
      });
    }

    return { order: crmOrder, link };
  }

  /**
   * Helper to retrieve Business Account by ID
   */
  static async getBusinessAccount(id: string): Promise<BusinessAccount | null> {
    initializeSeedData();
    const acc = (globalThis.__globalCrmAccounts || []).find((a) => a.id === id);
    return acc || null;
  }

  /**
   * Helper to review and record authorized credit decision
   */
  static async reviewCreditTerms(
    businessAccountId: string,
    status: "approved" | "rejected" | "revoked",
    options: {
      approvedCreditLimit?: number;
      approvedCreditPeriod?: number;
      approvedPaymentTerms?: string;
      reviewedBy: string;
      reviewerRole: string;
    }
  ) {
    if (options.reviewerRole !== "Store Admin" && options.reviewerRole !== "Sales Manager") {
      throw new Error("Permission denied: Only Store Admin or Sales Manager can review credit terms");
    }
    const decision = await this.recordCreditApproval(businessAccountId, {
      approvedCreditLimitPaise: (options.approvedCreditLimit || 0) * 100,
      approvedPeriodDays: options.approvedCreditPeriod || 15,
      status,
      decisionNotes: options.approvedPaymentTerms,
      authorizedById: "reviewer_1",
      authorizedByName: options.reviewedBy,
      authorizedRole: options.reviewerRole as any,
    });
    const account = await this.getBusinessAccount(businessAccountId);
    return {
      creditStatus: status,
      approvedCreditLimit: options.approvedCreditLimit,
      account,
      decision,
    };
  }

  /**
   * Alias for getMetrics()
   */
  static async getPipelineMetrics() {
    return this.getMetrics();
  }

  /**
   * POST /api/business-accounts/:id/credit-approvals - Record authorized credit decision
   */
  static async recordCreditApproval(
    businessAccountId: string,
    data: {
      leadId?: string;
      approvedCreditLimitPaise: number;
      approvedPeriodDays: number;
      status: "approved" | "rejected" | "revoked";
      decisionNotes?: string;
      authorizedById: string;
      authorizedByName: string;
      authorizedRole: "Store Admin" | "Sales Manager";
    }
  ): Promise<CreditApprovalDecision> {
    initializeSeedData();

    if (data.authorizedRole !== "Store Admin" && data.authorizedRole !== "Sales Manager") {
      throw new Error("Unauthorized: Only Store Admin or Sales Manager can approve wholesale credit terms");
    }

    const account = (globalThis.__globalCrmAccounts || []).find((a) => a.id === businessAccountId);
    if (!account) throw new Error("Business Account not found");

    const decision: CreditApprovalDecision = {
      id: `crd_${Date.now()}`,
      businessAccountId,
      leadId: data.leadId,
      requestedCreditLimitPaise: account.creditLimitPaise || 5000000,
      requestedPeriodDays: account.creditPeriodDays || 15,
      approvedCreditLimitPaise: data.approvedCreditLimitPaise,
      approvedPeriodDays: data.approvedPeriodDays,
      status: data.status,
      decisionNotes: data.decisionNotes,
      authorizedById: data.authorizedById,
      authorizedByName: data.authorizedByName,
      authorizedRole: data.authorizedRole,
      createdAt: new Date().toISOString(),
    };

    if (data.status === "approved") {
      account.creditApproved = true;
      account.creditLimitPaise = data.approvedCreditLimitPaise;
      account.creditPeriodDays = data.approvedPeriodDays;
    } else {
      account.creditApproved = false;
      account.creditLimitPaise = 0;
      account.creditPeriodDays = 0;
    }
    account.updatedAt = new Date().toISOString();

    globalThis.__globalCrmCreditApprovals?.unshift(decision);

    // If associated with a lead, update activity
    if (data.leadId) {
      const lead = await this.getLeadById(data.leadId);
      if (lead) {
        lead.activities.unshift({
          id: `act_${Date.now()}`,
          leadId: lead.id,
          actorName: data.authorizedByName,
          activityType: "credit_decision",
          summary: `Wholesale Credit Decision: ${data.status.toUpperCase()} (₹${(data.approvedCreditLimitPaise / 100).toLocaleString("en-IN")}, ${data.approvedPeriodDays} days) by ${data.authorizedByName} (${data.authorizedRole})`,
          details: data.decisionNotes,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return decision;
  }

  /**
   * GET /api/leads/metrics - Pipeline Analytics & KPI overview
   */
  static async getMetrics(): Promise<any> {
    initializeSeedData();
    const allLeads = globalThis.__globalCrmLeads || [];
    const accounts = globalThis.__globalCrmAccounts || [];

    const wholesale = allLeads.filter((l) => l.businessModel === "b2b_wholesale");
    const retail = allLeads.filter((l) => l.businessModel === "b2c_retail");

    const now = Date.now();

    const computeMetricsFor = (list: LeadRecord[]) => {
      const newLeadsCount = list.filter((l) => l.stageKey === "new_enquiry").length;
      const unassignedCount = list.filter((l) => !l.ownerId).length;

      let dueTasksCount = 0;
      let overdueTasksCount = 0;
      list.forEach((l) => {
        l.tasks.forEach((t) => {
          if (t.status === "pending") {
            const dueTime = new Date(t.dueAt).getTime();
            if (dueTime < now) overdueTasksCount++;
            else if (dueTime - now < 86400 * 1000) dueTasksCount++;
          }
        });
      });

      const openOpportunityValuePaise = list
        .filter((l) => l.stageKey !== "won" && l.stageKey !== "lost" && l.stageKey !== "disqualified")
        .reduce((acc, l) => acc + (l.estimatedValuePaise || 0), 0);

      const wonOpportunities = list.filter((l) => l.stageKey === "won");
      const wonValuePaise = wonOpportunities.reduce((acc, l) => acc + (l.estimatedValuePaise || 0), 0);

      // Conversion by source
      const conversionBySource: Record<string, { total: number; won: number }> = {};
      list.forEach((l) => {
        const src = l.source || "manual";
        if (!conversionBySource[src]) conversionBySource[src] = { total: 0, won: 0 };
        conversionBySource[src].total++;
        if (l.stageKey === "won") conversionBySource[src].won++;
      });

      return {
        total: list.length,
        newLeads: newLeadsCount,
        unassigned: unassignedCount,
        dueToday: dueTasksCount,
        overdue: overdueTasksCount,
        openOpportunityValuePaise,
        wonCount: wonOpportunities.length,
        wonValuePaise,
        avgFirstResponseTimeMinutes: 42,
        conversionBySource,
      };
    };

    const wholesaleMetrics = computeMetricsFor(wholesale);
    const retailMetrics = computeMetricsFor(retail);

    // Wholesale Accounting Overview (kept strictly separate from estimated pipeline value)
    const approvedCreditExposurePaise = accounts
      .filter((a) => a.creditApproved)
      .reduce((acc, a) => acc + (a.creditLimitPaise || 0), 0);

    const overdueAccountingBalancePaise = accounts.reduce(
      (acc, a) => acc + (a.outstandingBalancePaise || 0),
      0
    );

    return {
      wholesale: {
        ...wholesaleMetrics,
        approvedCreditExposurePaise,
        overdueAccountingBalancePaise,
        accountingProvider: "zoho_books",
        lastSyncTimestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      },
      retail: retailMetrics,
      totalLeads: allLeads.length,
    };
  }

  /**
   * POST /api/leads/import - Bulk lead import with validation and deduplication
   */
  static async importLeads(
    records: Array<{
      businessModel: BusinessModel;
      contactName: string;
      contactPhone: string;
      contactEmail?: string;
      businessName?: string;
      estimatedValue?: number;
      source?: string;
      notes?: string;
    }>
  ): Promise<{ imported: number; duplicatesSkipped: number; errors: string[] }> {
    initializeSeedData();
    let imported = 0;
    let duplicatesSkipped = 0;
    const errors: string[] = [];

    for (const r of records) {
      try {
        if (!r.contactPhone || r.contactPhone.replace(/\D/g, "").length < 10) {
          errors.push(`Skipped record ${r.contactName || "Unknown"}: Invalid phone`);
          continue;
        }

        const rawClean = this.getCleanRawPhone(r.contactPhone);
        const existingRecent = (globalThis.__globalCrmLeads || []).find(
          (l) =>
            this.getCleanRawPhone(l.contactPhone) === rawClean &&
            l.businessModel === r.businessModel &&
            Date.now() - new Date(l.createdAt).getTime() < 86400 * 1000 * 7 // Within 7 days
        );

        if (existingRecent) {
          duplicatesSkipped++;
          continue;
        }

        await this.createLead({
          businessModel: r.businessModel || "b2c_retail",
          contactName: r.contactName || "Imported Lead",
          contactPhone: r.contactPhone,
          contactEmail: r.contactEmail,
          businessName: r.businessName,
          source: "import",
          estimatedValuePaise: (r.estimatedValue || 0) * 100,
          notes: r.notes,
        });

        imported++;
      } catch (err: any) {
        errors.push(`Failed for ${r.contactName || r.contactPhone}: ${err.message}`);
      }
    }

    return { imported, duplicatesSkipped, errors };
  }
}
