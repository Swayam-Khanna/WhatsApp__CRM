import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { profiles } from "./index.ts";
import { orders } from "./orders.ts";

// Enums for Leads & Sales Management
export const businessModelEnum = pgEnum("business_model", [
  "b2b_wholesale",
  "b2c_retail",
]);

export const leadPriorityEnum = pgEnum("lead_priority", [
  "normal",
  "high",
  "urgent",
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "shared",
  "accepted",
  "rejected",
  "expired",
  "converted",
]);

export const creditApprovalStatusEnum = pgEnum("credit_approval_status", [
  "pending",
  "approved",
  "rejected",
  "revoked",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "completed",
  "cancelled",
  "rescheduled",
]);

export const integrationProviderEnum = pgEnum("integration_provider", [
  "zoho_books",
  "zoho_invoice",
  "custom",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "synced",
  "failed",
  "retry_scheduled",
]);

// 1. Business Accounts (Wholesale Shops / B2B Accounts)
export const businessAccounts = pgTable("business_accounts", {
  id: text("id").primaryKey(), // e.g. "biz_acc_101"
  name: text("name").notNull(), // e.g. "Himalayan Organic Mart"
  businessType: text("business_type").notNull(), // "Retail Shop", "Supermarket", "Ayurvedic Pharmacy", "Distributor", "Hotel"
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  gstin: text("gstin"),
  pan: text("pan"),
  website: text("website"),
  creditApproved: boolean("credit_approved").default(false).notNull(),
  creditLimitPaise: integer("credit_limit_paise").default(0).notNull(),
  creditPeriodDays: integer("credit_period_days").default(0).notNull(),
  outstandingBalancePaise: integer("outstanding_balance_paise").default(0).notNull(),
  accountingCustomerId: text("accounting_customer_id"), // Zoho customer reference
  accountingProvider: text("accounting_provider").default("zoho_books"),
  accountingLastSyncedAt: timestamp("accounting_last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Business Account Contacts (Multiple contacts for a wholesale business)
export const businessAccountContacts = pgTable("business_account_contacts", {
  id: text("id").primaryKey(),
  businessAccountId: text("business_account_id")
    .notNull()
    .references(() => businessAccounts.id, { onDelete: "cascade" }),
  contactName: text("contact_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  role: text("role").notNull(), // "Proprietor", "Purchasing Manager", "Store Manager", "Accountant"
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Sales Pipelines
export const salesPipelines = pgTable("sales_pipelines", {
  id: text("id").primaryKey(), // "pipeline_wholesale", "pipeline_retail"
  name: text("name").notNull(),
  businessModel: text("business_model").notNull(), // "b2b_wholesale" | "b2c_retail"
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Sales Stages
export const salesStages = pgTable("sales_stages", {
  id: text("id").primaryKey(),
  pipelineId: text("pipeline_id")
    .notNull()
    .references(() => salesPipelines.id, { onDelete: "cascade" }),
  stageKey: text("stage_key").notNull(), // e.g. "new_enquiry", "business_qualified", "won"
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull(),
  isTerminal: boolean("is_terminal").default(false).notNull(),
  isSuccess: boolean("is_success").default(false).notNull(),
  requiredFields: jsonb("required_fields"), // list of validation requirements
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Leads (Core Identifiable Sales Opportunity)
export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(), // e.g. "lead_202610_001"
    reference: text("reference").notNull().unique(), // e.g. "LD-B2B-1001"
    businessModel: text("business_model").notNull(), // "b2b_wholesale" | "b2c_retail"
    contactId: text("contact_id").notNull(), // Shared contact reference
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    contactEmail: text("contact_email"),
    businessAccountId: text("business_account_id").references(() => businessAccounts.id, {
      onDelete: "set null",
    }),
    businessName: text("business_name"),
    pipelineId: text("pipeline_id").notNull(),
    stageId: text("stage_id").notNull(),
    stageKey: text("stage_key").notNull(),
    ownerId: text("owner_id"), // Agent identifier or null for unassigned
    ownerName: text("owner_name"),
    source: text("source").notNull(), // "whatsapp", "website", "phone", "referral", "campaign", "manual", "import"
    sourceReference: text("source_reference"),
    priority: text("priority").default("normal").notNull(), // "normal", "high", "urgent"
    estimatedValuePaise: integer("estimated_value_paise").default(0).notNull(),
    currency: text("currency").default("INR").notNull(),
    expectedQuantity: text("expected_quantity"),
    expectedFrequency: text("expected_frequency"),
    requestedPriceTier: text("requested_price_tier"),
    requestedPaymentTerms: text("requested_payment_terms"), // "Prepaid", "Net 15", "Net 30"
    requestedCreditLimitPaise: integer("requested_credit_limit_paise").default(0),
    requestedCreditPeriodDays: integer("requested_credit_period_days").default(0),
    deliveryPostalCode: text("delivery_postal_code"),
    checkoutReference: text("checkout_reference"),
    pendingReason: text("pending_reason"),
    nextAction: text("next_action"),
    nextFollowUpAt: timestamp("next_follow_up_at"),
    firstResponseAt: timestamp("first_response_at"),
    notes: text("notes"),
    wonAt: timestamp("won_at"),
    lostAt: timestamp("lost_at"),
    lostReason: text("lost_reason"),
    conversionRuleApplied: text("conversion_rule_applied"),
    linkedOrderId: text("linked_order_id"),
    accountingSyncStatus: text("accounting_sync_status").default("pending"),
    accountingLastSyncedAt: timestamp("accounting_last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    version: integer("version").default(1).notNull(),
  },
  (table) => ({
    contactPhoneIdx: index("leads_contact_phone_idx").on(table.contactPhone),
    stageKeyIdx: index("leads_stage_key_idx").on(table.stageKey),
    ownerIdIdx: index("leads_owner_id_idx").on(table.ownerId),
    businessModelIdx: index("leads_business_model_idx").on(table.businessModel),
  })
);

// 6. Lead Items (Product interests, quantities & indicative pricing)
export const leadItems = pgTable("lead_items", {
  id: text("id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  productId: text("productId").notNull(),
  productName: text("product_name").notNull(),
  productSlug: text("product_slug"),
  quantity: integer("quantity").notNull(),
  unit: text("unit").default("units").notNull(), // "kg", "grams", "cases", "units"
  indicativeUnitPricePaise: integer("indicative_unit_price_paise").notNull(),
  indicativeTotalPaise: integer("indicative_total_paise").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Lead Activities (Notes, status changes, timeline events)
export const leadActivities = pgTable("lead_activities", {
  id: text("id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull(),
  activityType: text("activity_type").notNull(), // "note", "stage_change", "quote_created", "follow_up_scheduled", "order_linked", "whatsapp_message", "credit_decision", "assigned"
  summary: text("summary").notNull(),
  details: text("details"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Lead Tasks (Follow-ups and reminders)
export const leadTasks = pgTable("lead_tasks", {
  id: text("id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  assignedToId: text("assigned_to_id"),
  assignedToName: text("assigned_to_name"),
  taskType: text("task_type").notNull(), // "call", "whatsapp", "quote_follow_up", "payment_verification", "meeting", "dispatch_follow_up"
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at").notNull(),
  status: text("status").default("pending").notNull(), // "pending", "completed", "cancelled", "rescheduled"
  priority: text("priority").default("normal").notNull(),
  completedAt: timestamp("completed_at"),
  completedNotes: text("completed_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Quotes (Versioned commercial offers)
export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  quoteNumber: text("quote_number").notNull().unique(), // e.g. "QTE-2026-1001"
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  version: integer("version").default(1).notNull(),
  subtotalPaise: integer("subtotal_paise").notNull(),
  discountPaise: integer("discount_paise").default(0).notNull(),
  taxPaise: integer("tax_paise").default(0).notNull(),
  totalPaise: integer("total_paise").notNull(),
  paymentTerms: text("payment_terms").notNull(), // "Prepaid UPI / Bank Transfer", "15 Days Credit", "30 Days Credit"
  deliveryTerms: text("delivery_terms").default("Door delivery via Shipping"),
  validUntil: timestamp("valid_until").notNull(),
  status: text("status").default("draft").notNull(), // "draft", "shared", "accepted", "rejected", "expired", "converted"
  sharedViaWhatsAppAt: timestamp("shared_via_whatsapp_at"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 10. Quote Items
export const quoteItems = pgTable("quote_items", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").default("units").notNull(),
  unitPricePaise: integer("unit_price_paise").notNull(),
  totalPaise: integer("total_paise").notNull(),
  discountPercent: integer("discount_percent").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 11. Lead Order Links (Trace opportunities to resulting orders with idempotency)
export const leadOrderLinks = pgTable("lead_order_links", {
  id: text("id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull(),
  orderNumber: text("order_number").notNull(),
  businessModel: text("business_model").notNull(),
  conversionType: text("conversion_type").notNull(), // "wholesale_prepaid", "wholesale_approved_credit", "retail_prepaid", "retail_cod"
  totalPaise: integer("total_paise").notNull(),
  paymentStatus: text("payment_status").notNull(),
  convertedById: text("converted_by_id"),
  convertedByName: text("converted_by_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 12. Credit Approvals (Authorized wholesale credit decisions)
export const creditApprovals = pgTable("credit_approvals", {
  id: text("id").primaryKey(),
  businessAccountId: text("business_account_id")
    .notNull()
    .references(() => businessAccounts.id, { onDelete: "cascade" }),
  leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  requestedCreditLimitPaise: integer("requested_credit_limit_paise").notNull(),
  requestedPeriodDays: integer("requested_period_days").notNull(),
  approvedCreditLimitPaise: integer("approved_credit_limit_paise").notNull(),
  approvedPeriodDays: integer("approved_period_days").notNull(),
  status: text("status").notNull(), // "approved", "rejected", "revoked"
  decisionNotes: text("decision_notes"),
  authorizedById: text("authorized_by_id").notNull(),
  authorizedByName: text("authorized_by_name").notNull(),
  authorizedRole: text("authorized_role").notNull(), // "Store Admin" | "Sales Manager"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 13. Integration Links (External accounting references: Zoho Books / Invoice)
export const integrationLinks = pgTable("integration_links", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(), // "business_account", "order", "invoice"
  internalId: text("internal_id").notNull(),
  provider: text("provider").default("zoho_books").notNull(),
  externalCustomerId: text("external_customer_id"),
  externalInvoiceId: text("external_invoice_id"),
  externalInvoiceNumber: text("external_invoice_number"),
  invoiceStatus: text("invoice_status"), // "draft", "sent", "paid", "partially_paid", "overdue", "void"
  outstandingBalancePaise: integer("outstanding_balance_paise").default(0),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. Integration Jobs (Synchronization attempts, retries, and failures)
export const integrationJobs = pgTable("integration_jobs", {
  id: text("id").primaryKey(),
  jobType: text("job_type").notNull(), // "zoho_customer_sync", "zoho_invoice_creation", "balance_sync"
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  provider: text("provider").default("zoho_books").notNull(),
  payload: jsonb("payload"),
  status: text("status").default("pending").notNull(), // "pending", "processing", "completed", "failed", "retry_scheduled"
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  lastError: text("last_error"),
  nextRetryAt: timestamp("next_retry_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
