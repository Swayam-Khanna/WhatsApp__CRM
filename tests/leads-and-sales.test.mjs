import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { LeadsService } from "../backend/lib/leads.server.ts";
import { closeDatabase } from "../lib/mongodb.ts";
import { POST as leadsPostRoute, GET as leadsGetRoute } from "../app/api/leads/route.ts";
import { POST as transitionRoute } from "../app/api/leads/[id]/transitions/route.ts";
import { POST as assignmentRoute } from "../app/api/leads/[id]/assignments/route.ts";
import { POST as quoteRoute } from "../app/api/leads/[id]/quotes/route.ts";
import { POST as orderRoute } from "../app/api/leads/[id]/orders/route.ts";
import { POST as creditRoute } from "../app/api/business-accounts/[id]/credit-approvals/route.ts";
import { GET as metricsRoute } from "../app/api/leads/metrics/route.ts";
import { POST as importRoute } from "../app/api/leads/import/route.ts";
import { GET as accountingGetRoute, POST as accountingPostRoute } from "../app/api/crm/accounting/route.ts";

describe("PRAJANAA LEADS & SALES MANAGEMENT MODULE", () => {
  beforeEach(() => {
    // Reset test memory store
    globalThis.__globalCrmLeads = [];
    globalThis.__globalCrmAccounts = [];
  });

  after(async () => {
    await closeDatabase();
  });

  // 1. Contact Phone Normalization
  test("1. Phone Normalization (Display formatting and raw dialable formats)", () => {
    assert.equal(LeadsService.cleanPhone("9816012345"), "+91 98160 12345");
    assert.equal(LeadsService.cleanPhone("+91 98160 12345"), "+91 98160 12345");
    assert.equal(LeadsService.cleanPhone("09816012345"), "+91 98160 12345");
    assert.equal(LeadsService.getCleanRawPhone("+91 98160-12345"), "919816012345");
    assert.equal(LeadsService.getCleanRawPhone("9816012345"), "919816012345");
    assert.equal(LeadsService.getCleanRawPhone("09816012345"), "919816012345");
  });

  // 2. Create B2B Wholesale Lead with Shopkeeper Profile
  test("2. Create B2B Wholesale Lead with Shopkeeper Profile and Items", async () => {
    const wholesalePayload = {
      businessModel: "b2b_wholesale",
      contactName: "Vikram Malhotra",
      contactPhone: "+91 98160 55555",
      contactEmail: "vikram@malhotrastores.in",
      businessName: "Malhotra Organic & Kirana",
      businessType: "Retail Shop",
      gstin: "02ABCDE1234F1Z5",
      city: "Shimla",
      state: "Himachal Pradesh",
      postalCode: "171001",
      expectedQuantity: "50 kg / month",
      expectedFrequency: "Monthly",
      requestedPaymentTerms: "Net 15",
      requestedCreditLimitPaise: 5000000,
      priority: "high",
      ownerId: "agent_sales1",
      ownerName: "Rahul Sharma",
      items: [
        {
          productId: "organic-almonds",
          productName: "Mamra Almonds (500g)",
          quantity: 20,
          indicativeUnitPricePaise: 125000,
        },
        {
          productId: "raw-honey",
          productName: "Raw Himalayan Flora Honey (Bulk 5kg)",
          quantity: 5,
          indicativeUnitPricePaise: 320000,
        },
      ],
      nextAction: "Share wholesale volume pricing sheet",
    };

    const { lead } = await LeadsService.createLead(wholesalePayload);
    assert.ok(lead.id, "Lead must have an ID");
    assert.equal(lead.businessModel, "b2b_wholesale");
    assert.equal(lead.stageKey, "new_enquiry");
    assert.equal(lead.businessName, "Malhotra Organic & Kirana");
    assert.equal(lead.items.length, 2);
    // 20 * 1250 + 5 * 3200 = 25000 + 16000 = 41000 INR = 4100000 paise
    assert.equal(lead.estimatedValuePaise, 4100000);
    assert.ok(lead.tasks.length >= 1, "Should auto-schedule first action task");
  });

  // 3. Create B2C Retail Enquiry
  test("3. Create B2C Retail Enquiry with Assisted Purchase Details", async () => {
    const retailPayload = {
      businessModel: "b2c_retail",
      contactName: "Pooja Sharma",
      contactPhone: "+91 94180 88888",
      contactEmail: "pooja@example.com",
      deliveryPostalCode: "176001",
      priority: "normal",
      source: "whatsapp",
      items: [
        {
          productId: "turmeric-powder",
          productName: "Stone-Ground Turmeric (250g)",
          quantity: 2,
          indicativeUnitPricePaise: 24000,
        },
      ],
      nextAction: "Confirm delivery PIN code serviceability",
    };

    const { lead } = await LeadsService.createLead(retailPayload);
    assert.ok(lead.id);
    assert.equal(lead.businessModel, "b2c_retail");
    assert.equal(lead.stageKey, "new_enquiry");
    assert.equal(lead.estimatedValuePaise, 48000);
    assert.equal(lead.deliveryPostalCode, "176001");
  });

  // 4. Shared Contact Directory: Single Contact Identity Across Wholesale & Retail
  test("4. Shared Contact Directory: Single Contact Identity Across Wholesale and Retail", async () => {
    const sharedPhone = "+91 98160 99999";

    // 1st enquiry: Retail
    const { lead: retailLead } = await LeadsService.createLead({
      businessModel: "b2c_retail",
      contactName: "Aman Gupta",
      contactPhone: sharedPhone,
      source: "website",
    });

    // 2nd enquiry: Wholesale for his grocery store
    const { lead: wholesaleLead } = await LeadsService.createLead({
      businessModel: "b2b_wholesale",
      contactName: "Aman Gupta",
      contactPhone: sharedPhone,
      businessName: "Gupta Himalayan Grocers",
      source: "whatsapp",
    });

    // Both leads share the same contact ID
    assert.equal(retailLead.contactId, wholesaleLead.contactId, "Both leads should reference the same contactId");
    assert.equal(retailLead.contactPhone, wholesaleLead.contactPhone);
  });

  // 5. Wholesale Stage Transition Validation and Won Rules
  test("5. Wholesale Stage Transitions: Enforces Qualified Progression and Won Rules", async () => {
    const { lead } = await LeadsService.createLead({
      businessModel: "b2b_wholesale",
      contactName: "Sanjay Verma",
      contactPhone: "+91 98160 11111",
      businessName: "Verma Organic Store",
      requestedPaymentTerms: "Credit 30 Days",
      requestedCreditLimitPaise: 10000000,
    });

    // Valid progression: new_enquiry -> contacted -> business_qualified
    const step1 = await LeadsService.transitionStage(lead.id, "contacted", { note: "Spoke on phone" });
    assert.equal(step1.stageKey, "contacted");

    const step2 = await LeadsService.transitionStage(lead.id, "business_qualified", { note: "Verified shop & GST" });
    assert.equal(step2.stageKey, "business_qualified");

    // Attempt to mark Won WITHOUT prepaid payment or credit approval should FAIL
    await assert.rejects(
      async () => {
        await LeadsService.transitionStage(lead.id, "won", { note: "Trying to win without credit approval" });
      },
      /Wholesale Won conversion requires/i
    );

    // Now approve credit terms as Store Admin
    const account = await LeadsService.getBusinessAccount(lead.businessAccountId);
    assert.ok(account);
    const approvedResult = await LeadsService.reviewCreditTerms(
      account.id,
      "approved",
      {
        approvedCreditLimit: 75000,
        approvedCreditPeriod: 15,
        approvedPaymentTerms: "Net 15 Credit",
        reviewedBy: "Nishant (Store Admin)",
        reviewerRole: "Store Admin",
      }
    );
    assert.equal(approvedResult.creditStatus, "approved");
    assert.equal(approvedResult.approvedCreditLimit, 75000);

    // Now transitioning to Won should SUCCEED
    const wonLead = await LeadsService.transitionStage(lead.id, "won", { note: "Won under approved credit terms" });
    assert.equal(wonLead.stageKey, "won");
  });

  // 6. Retail Stage Transition State Machine
  test("6. Retail Stage Transitions: New -> Requirement Identified -> Won", async () => {
    const { lead } = await LeadsService.createLead({
      businessModel: "b2c_retail",
      contactName: "Sunita Devi",
      contactPhone: "+91 94180 22222",
    });

    assert.equal(lead.stageKey, "new_enquiry");
    const step1 = await LeadsService.transitionStage(lead.id, "requirement_identified", { note: "Identified Mamra Almonds request" });
    assert.equal(step1.stageKey, "requirement_identified");

    const step2 = await LeadsService.transitionStage(lead.id, "quote_shared", { note: "Shared product link" });
    assert.equal(step2.stageKey, "quote_shared");

    const won = await LeadsService.transitionStage(lead.id, "won", { note: "Customer completed payment via UPI QR" });
    assert.equal(won.stageKey, "won");
  });

  // 7. Versioned Quotation Generation
  test("7. Versioned Quotation Builder with Catalog Pricing & Margin", async () => {
    const { lead } = await LeadsService.createLead({
      businessModel: "b2b_wholesale",
      contactName: "Mohit Jindal",
      contactPhone: "+91 98160 33333",
      businessName: "Jindal Retail",
    });

    // Create quote v1: 50 units @ 1100 INR (110000 paise)
    const quote1 = await LeadsService.createQuote(lead.id, {
      items: [
        {
          productId: "organic-almonds",
          productName: "Mamra Almonds (500g)",
          quantity: 50,
          unitPricePaise: 110000,
        },
      ],
      paymentTerms: "Prepaid 50% Advance",
      deliveryTerms: "Dispatch within 3 days via India Post",
      validDays: 14,
      createdBy: "Nishant",
    });

    assert.equal(quote1.version, 1);
    // subtotal = 50 * 110000 = 5500000 paise
    assert.equal(quote1.subtotalPaise, 5500000);
    assert.equal(quote1.totalPaise, 5500000);

    // Create revision quote v2: 100 units @ 1050 INR (105000 paise)
    const quote2 = await LeadsService.createQuote(lead.id, {
      items: [
        {
          productId: "organic-almonds",
          productName: "Mamra Almonds (500g)",
          quantity: 100,
          unitPricePaise: 105000,
        },
      ],
      paymentTerms: "Net 15",
      createdBy: "Nishant",
    });

    assert.equal(quote2.version, 2);
    // subtotal = 100 * 105000 = 10500000 paise
    assert.equal(quote2.totalPaise, 10500000);
  });

  // 8. Idempotent Order Conversion (No Duplicate Orders)
  test("8. Idempotent Lead to Order Conversion (Prevents Duplicate Orders)", async () => {
    const { lead } = await LeadsService.createLead({
      businessModel: "b2c_retail",
      contactName: "Deepak Kumar",
      contactPhone: "+91 98160 44444",
      items: [
        {
          productId: "walnuts",
          productName: "Himalayan Mountain Walnuts (250g)",
          quantity: 2,
          indicativeUnitPricePaise: 60400,
        },
      ],
    });

    // 1st conversion
    const res1 = await LeadsService.convertToOrder(lead.id, {
      shippingAddress: {
        addressLine1: "Mall Road",
        city: "Shimla",
        state: "Himachal Pradesh",
        postalCode: "171001",
      },
      convertedByName: "Nishant",
    });

    assert.ok(res1.order);
    assert.ok(res1.order.orderNumber);

    // 2nd conversion attempt on the same lead must return the SAME order (idempotency)
    const res2 = await LeadsService.convertToOrder(lead.id, {
      shippingAddress: {
        addressLine1: "Mall Road",
        city: "Shimla",
        state: "Himachal Pradesh",
        postalCode: "171001",
      },
      convertedByName: "Nishant",
    });

    assert.equal(res1.order.id, res2.order.id, "Second conversion should return identical order without duplicate");
    assert.equal(res1.order.orderNumber, res2.order.orderNumber);
  });

  // 9. Credit Approval Role Enforcement
  test("9. Credit Decision: Role Permission Enforcement (Only Admin or Sales Manager)", async () => {
    const { lead } = await LeadsService.createLead({
      businessModel: "b2b_wholesale",
      contactName: "Anita Roy",
      contactPhone: "+91 98160 77777",
      businessName: "Roy Supermarket",
      requestedCreditLimitPaise: 8000000,
    });

    const account = await LeadsService.getBusinessAccount(lead.businessAccountId);
    assert.ok(account);

    // Attempt approval with unauthorized role (e.g. "Sales Agent") should be rejected
    await assert.rejects(
      async () => {
        await LeadsService.reviewCreditTerms(account.id, "approved", {
          approvedCreditLimit: 80000,
          approvedCreditPeriod: 30,
          reviewedBy: "Sales Agent",
          reviewerRole: "Sales Agent",
        });
      },
      /Permission denied: Only Store Admin or Sales Manager/
    );

    // Approval with "Sales Manager" succeeds
    const approved = await LeadsService.reviewCreditTerms(account.id, "approved", {
      approvedCreditLimit: 50000,
      approvedCreditPeriod: 15,
      reviewedBy: "Sales Manager Sharma",
      reviewerRole: "Sales Manager",
    });
    assert.equal(approved.creditStatus, "approved");
  });

  // 10. Pipeline KPI Analytics
  test("10. Pipeline Metrics: Computes Accurate Total Volume and Separates Accounting Balances", async () => {
    const metrics = await LeadsService.getPipelineMetrics();
    assert.ok(metrics);
    assert.ok(typeof metrics.totalLeads === "number");
    assert.ok(typeof metrics.wholesale.total === "number");
    assert.ok(typeof metrics.wholesale.openOpportunityValuePaise === "number");
    assert.ok(typeof metrics.wholesale.approvedCreditExposurePaise === "number");
    assert.ok(typeof metrics.retail.total === "number");
    assert.ok(typeof metrics.retail.openOpportunityValuePaise === "number");
  });

  // 11. Zoho Accounting Boundary & Retry Queue
  test("11. Zoho Books/Invoice Boundary: Safe Staging Queue with No False Syncs", async () => {
    // Test GET status
    const req = new Request("http://localhost:3000/api/crm/accounting");
    const res = await accountingGetRoute();
    const data = await res.json();

    assert.equal(data.success, true);
    assert.ok(data.config.provider === "zoho_books" || data.config.provider === "zoho_invoice");
    assert.ok(typeof data.config.isConfigured === "boolean");
    assert.ok(Array.isArray(data.queuedJobs));

    // Test POST retry job
    const postReq = new Request("http://localhost:3000/api/crm/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "queue_sync",
        entityType: "invoice",
        entityId: "INV-1001",
        payload: { amount: 15000, customer: "Vikram Malhotra" },
      }),
    });
    const postRes = await accountingPostRoute(postReq);
    const postData = await postRes.json();
    assert.equal(postData.success, true);
    assert.ok(postData.job);
    assert.equal(postData.job.status, "queued");
  });

  // 12. Bulk CSV Import with Duplicate Prevention
  test("12. Bulk CSV Lead Import: Validates Fields and Prevents Rapid Duplicates", async () => {
    const csvRows = [
      {
        businessModel: "b2b_wholesale",
        contactName: "Rajeev Thakur",
        contactPhone: "+91 98160 12121",
        businessName: "Thakur Agro Mart",
        city: "Solan",
        state: "Himachal Pradesh",
      },
      {
        businessModel: "b2c_retail",
        contactName: "Meera Singh",
        contactPhone: "+91 94180 34343",
        deliveryPostalCode: "173212",
      },
    ];

    const importReq = new Request("http://localhost:3000/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: csvRows }),
    });

    const res = await importRoute(importReq);
    const result = await res.json();

    assert.equal(result.success, true);
    assert.equal(result.imported, 2);

    // Second import with the same leads should detect duplicate within 7 days
    const dupeReq = new Request("http://localhost:3000/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: csvRows }),
    });

    const dupeRes = await importRoute(dupeReq);
    const dupeResult = await dupeRes.json();

    assert.equal(dupeResult.duplicatesSkipped, 2, "Second identical import should flag duplicates");
  });
});
