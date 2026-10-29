export type BusinessModel = "b2b_wholesale" | "b2c_retail";
export type LeadPriority = "normal" | "high" | "urgent";
export type QuoteStatus = "draft" | "shared" | "accepted" | "rejected" | "expired" | "converted";
export type TaskStatus = "pending" | "completed" | "cancelled" | "rescheduled";

export interface LeadItem {
  id: string;
  productId: string;
  productName: string;
  productSlug?: string;
  quantity: number;
  unit: string;
  indicativeUnitPricePaise: number;
  indicativeTotalPaise: number;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  actorId?: string;
  actorName: string;
  activityType:
    | "note"
    | "stage_change"
    | "quote_created"
    | "follow_up_scheduled"
    | "order_linked"
    | "whatsapp_message"
    | "credit_decision"
    | "assigned";
  summary: string;
  details?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface LeadTask {
  id: string;
  leadId: string;
  assignedToId?: string;
  assignedToName?: string;
  taskType: "call" | "whatsapp" | "quote_follow_up" | "payment_verification" | "meeting" | "dispatch_follow_up";
  title: string;
  description?: string;
  dueAt: string;
  status: TaskStatus;
  priority: LeadPriority;
  completedAt?: string;
  completedNotes?: string;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPricePaise: number;
  totalPaise: number;
  discountPercent?: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  leadId: string;
  version: number;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  paymentTerms: string;
  deliveryTerms: string;
  validUntil: string;
  status: QuoteStatus;
  items: QuoteItem[];
  notes?: string;
  sharedViaWhatsAppAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessAccountContact {
  id: string;
  businessAccountId: string;
  contactName: string;
  phone: string;
  email?: string;
  role: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface BusinessAccount {
  id: string;
  name: string;
  businessType: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  gstin?: string;
  pan?: string;
  website?: string;
  creditApproved: boolean;
  creditLimitPaise: number;
  creditPeriodDays: number;
  outstandingBalancePaise: number;
  accountingCustomerId?: string;
  accountingProvider?: "zoho_books" | "zoho_invoice" | "custom";
  accountingLastSyncedAt?: string;
  contacts: BusinessAccountContact[];
  createdAt: string;
  updatedAt: string;
}

export interface CreditApprovalDecision {
  id: string;
  businessAccountId: string;
  leadId?: string;
  requestedCreditLimitPaise: number;
  requestedPeriodDays: number;
  approvedCreditLimitPaise: number;
  approvedPeriodDays: number;
  status: "approved" | "rejected" | "revoked";
  decisionNotes?: string;
  authorizedById: string;
  authorizedByName: string;
  authorizedRole: "Store Admin" | "Sales Manager";
  createdAt: string;
}

export interface LeadOrderLink {
  id: string;
  leadId: string;
  orderId: string;
  orderNumber: string;
  businessModel: BusinessModel;
  conversionType: "wholesale_prepaid" | "wholesale_approved_credit" | "retail_prepaid" | "retail_cod";
  totalPaise: number;
  paymentStatus: string;
  convertedById?: string;
  convertedByName?: string;
  createdAt: string;
}

export interface LeadRecord {
  id: string;
  reference: string;
  businessModel: BusinessModel;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  businessAccountId?: string | null;
  businessName?: string;
  pipelineId: string;
  stageId: string;
  stageKey: string;
  ownerId?: string | null;
  ownerName?: string | null;
  source: "whatsapp" | "website" | "phone" | "referral" | "campaign" | "manual" | "import";
  sourceReference?: string;
  priority: LeadPriority;
  estimatedValuePaise: number;
  currency: string;
  expectedQuantity?: string;
  expectedFrequency?: string;
  requestedPriceTier?: string;
  requestedPaymentTerms?: string;
  requestedCreditLimitPaise?: number;
  requestedCreditPeriodDays?: number;
  deliveryPostalCode?: string;
  checkoutReference?: string;
  pendingReason?: string;
  nextAction?: string;
  nextFollowUpAt?: string;
  firstResponseAt?: string;
  notes?: string;
  wonAt?: string;
  lostAt?: string;
  lostReason?: string;
  conversionRuleApplied?: string;
  linkedOrderId?: string;
  accountingSyncStatus?: "pending" | "synced" | "failed" | "not_applicable";
  accountingLastSyncedAt?: string;
  items: LeadItem[];
  activities: LeadActivity[];
  tasks: LeadTask[];
  quotes: Quote[];
  orderLinks: LeadOrderLink[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface IntegrationJob {
  id: string;
  jobType: "zoho_customer_sync" | "zoho_invoice_creation" | "balance_sync";
  entityId: string;
  entityType: "business_account" | "order" | "invoice";
  provider: "zoho_books" | "zoho_invoice";
  payload?: any;
  status: "pending" | "processing" | "completed" | "failed" | "retry_scheduled";
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt?: string;
  completedAt?: string;
  createdAt: string;
}

// Stage definitions for both pipelines
export const WHOLESALE_STAGES = [
  { stageKey: "new_enquiry", name: "New Enquiry", orderIndex: 1 },
  { stageKey: "contacted", name: "Contacted", orderIndex: 2 },
  { stageKey: "business_qualified", name: "Business Qualified", orderIndex: 3 },
  { stageKey: "quote_shared", name: "Catalogue / Quote Shared", orderIndex: 4 },
  { stageKey: "negotiation", name: "Negotiation", orderIndex: 5 },
  { stageKey: "order_confirmed", name: "Order Confirmed", orderIndex: 6 },
  { stageKey: "won", name: "Won", orderIndex: 7, isTerminal: true, isSuccess: true },
  { stageKey: "lost", name: "Lost", orderIndex: 8, isTerminal: true, isSuccess: false },
  { stageKey: "disqualified", name: "Disqualified", orderIndex: 9, isTerminal: true, isSuccess: false },
];

export const RETAIL_STAGES = [
  { stageKey: "new_enquiry", name: "New Enquiry", orderIndex: 1 },
  { stageKey: "requirement_identified", name: "Requirement Identified", orderIndex: 2 },
  { stageKey: "quote_shared", name: "Product / Price Shared", orderIndex: 3 },
  { stageKey: "awaiting_checkout", name: "Awaiting Checkout / Order", orderIndex: 4 },
  { stageKey: "awaiting_payment", name: "Awaiting Payment", orderIndex: 5 },
  { stageKey: "won", name: "Won", orderIndex: 6, isTerminal: true, isSuccess: true },
  { stageKey: "lost", name: "Lost", orderIndex: 7, isTerminal: true, isSuccess: false },
  { stageKey: "disqualified", name: "Disqualified", orderIndex: 8, isTerminal: true, isSuccess: false },
];
