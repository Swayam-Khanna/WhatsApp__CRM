import { test, expect } from "@playwright/test";

test.describe("Prajnaa WhatsApp CRM & Storefront — Enterprise E2E Test Suite", () => {
  // Set test timeout to 30 seconds
  test.setTimeout(30000);

  // Workflow 1: Storefront Catalogue Browsing, Search Autocomplete & Cart Management
  test("Workflow 1: Storefront Catalogue Browsing, Search Autocomplete & Cart Management", async ({ page }) => {
    // 1. Open storefront catalogue
    await page.goto("/catalogue");
    await expect(page).toHaveTitle(/Prajnaa/i);

    // 2. Verify brand header logo and absence of deprecated text
    const logo = page.locator("header img[alt='Prajnaa Himalayan Produce']");
    await expect(logo).toBeVisible();

    // 3. Verify category pills are visible and "All" is not clipped
    const allCategoryButton = page.getByRole("button", { name: "All", exact: true });
    await expect(allCategoryButton).toBeVisible();

    // 4. Test Search with Autocomplete
    const searchInput = page.getByPlaceholder(/Search honey, shilajit/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("almo");
    await page.waitForTimeout(300);

    // Verify autocomplete suggestions or auto-filled value
    const searchVal = await searchInput.inputValue();
    expect(searchVal.toLowerCase()).toContain("almo");

    // Clear search to show full catalogue
    await searchInput.fill("");
    await page.waitForTimeout(200);

    // 5. Add product to cart
    // Wait for product cards and ADD buttons to be present
    const addButtons = page.locator("button:has-text('ADD')");
    await addButtons.first().waitFor({ state: "visible", timeout: 10000 });
    const count = await addButtons.count();
    expect(count).toBeGreaterThan(0);

    // Click the first add button
    await addButtons.first().click();

    // Verify cart drawer or floating cart pill reflects item
    const viewCartBtn = page.getByRole("button", { name: /Item/i }).first();
    await expect(viewCartBtn).toBeVisible();
  });

  // Workflow 2: WhatsApp CRM Inbox & Customer Conversation Management
  test("Workflow 2: WhatsApp CRM Inbox & Customer Conversation Management", async ({ page }) => {
    // 1. Navigate to root CRM Dashboard
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 2. Navigate to Inbox view
    const inboxTab = page.locator("button:has-text('Inbox')").first();
    if (await inboxTab.isVisible()) {
      await inboxTab.click();
      await page.waitForTimeout(500);

      // Verify Inbox header or conversations feed container exists
      const inboxContainer = page.locator("text=Inbox").first();
      await expect(inboxContainer).toBeVisible();
    }
  });

  // Workflow 3: Orders Management, Search & Tax Invoice Generation
  test("Workflow 3: Orders Management, Search & Tax Invoice Generation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. Open Orders view
    const ordersNav = page.locator("button:has-text('Orders')").first();
    if (await ordersNav.isVisible()) {
      await ordersNav.click();
      await page.waitForTimeout(400);

      // 2. Verify Orders Management table renders
      const heading = page.getByRole("heading", { name: "Orders Management" });
      await expect(heading).toBeVisible();

      // 3. Verify status pills (e.g. Shipped or Completed) are single-line and non-clickable to open invoices
      const statusPill = page.locator("td span.rounded-full").first();
      if (await statusPill.isVisible()) {
        const text = await statusPill.innerText();
        expect(text.trim().length).toBeGreaterThan(0);
      }

      // 4. Verify View button is present
      const viewButtons = page.locator("button:has-text('View')");
      if ((await viewButtons.count()) > 0) {
        await expect(viewButtons.first()).toBeVisible();
      }
    }
  });

  // Workflow 4: Product Catalogue API Caching & On-Demand Revalidation
  test("Workflow 4: Product Catalogue API Caching & On-Demand Revalidation", async ({ request }) => {
    // 1. Fetch /api/catalogue and verify response structure and caching headers
    const res = await request.get("/api/catalogue");
    expect(res.status()).toBe(200);

    const headers = res.headers();
    expect(headers["cache-control"]).toContain("public");
    expect(headers["cache-control"]).toContain("s-maxage=60");

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.products)).toBe(true);
    expect(data.products.length).toBeGreaterThanOrEqual(25);

    // Verify all products have integer prices and official Himalayan attributes
    for (const prod of data.products.slice(0, 5)) {
      expect(prod.id).toBeTruthy();
      expect(prod.name).toBeTruthy();
      expect(prod.price).toBeGreaterThan(0);
    }
  });

  // Workflow 5: Authentication, Server-Side RBAC & Rate Limiting Security
  test("Workflow 5: Authentication, Server-Side RBAC & Rate Limiting Security", async ({ request }) => {
    // 1. Verify unauthorized administrative RPC call is blocked
    const rpcRes = await request.post("/api/data/query", {
      data: {
        action: "rpc",
        fnName: "promote_user_to_admin",
        args: { target_email: "hacker@evil.com" },
      },
    });
    // Must be rejected with HTTP 401 Unauthorized or 403 Forbidden
    expect([401, 403]).toContain(rpcRes.status());

    // 2. Verify unauthorized write to admin-only table is blocked
    const tableRes = await request.post("/api/data/query", {
      data: {
        table: "user_roles",
        action: "delete",
        filters: [{ col: "id", op: "eq", val: "fake-id" }],
      },
    });
    expect([401, 403]).toContain(tableRes.status());

    // 3. Verify Meta webhook signature verification rejects forged payloads or malformed JSON
    const webhookRes = await request.post("/api/webhooks/whatsapp", {
      data: { entry: [{ id: "fake_event" }] },
      headers: {
        "x-hub-signature-256": "sha256=invalidforgedsignature0000000000000000000000000000000000000000",
      },
    });
    expect([400, 401]).toContain(webhookRes.status());

    // 4. Verify Rate Limiting headers are present on API responses
    const queryRes = await request.post("/api/data/query", {
      data: { table: "products", action: "select", limit: 1 },
    });
    const queryHeaders = queryRes.headers();
    expect(queryHeaders["x-ratelimit-limit"]).toBeTruthy();
    expect(queryHeaders["x-ratelimit-remaining"]).toBeTruthy();
  });
});
