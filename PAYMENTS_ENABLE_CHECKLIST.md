# Online Payments Enablement Checklist (Razorpay & Cashfree)

> **Current Status:** `ONLINE_PAYMENTS_ENABLED=false` (Default Disabled).  
> All schema structures (`order_payment_method` enum with 4 values, `razorpay_*` and `cashfree_*` columns in `orders`, and `payment_webhook_events` table) are preserved in Postgres/Neon.  
> Gateway routes, webhook routes, and order creation endpoints strictly reject or ignore online payments at runtime.

Before flipping `ONLINE_PAYMENTS_ENABLED=true` (and `NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED=true`) in production or staging, **all** items on this checklist must be fully implemented, reviewed, and tested.

---

## 1. Migration of Payment Gateway Routes to Neon / Postgres
The current gateway routes still reference legacy Firebase or Supabase client helpers. Before re-enabling:
- [ ] **Migrate `app/api/payments/razorpay/create-order/route.ts`**:
  - Remove all legacy `firebase/firestore` and `supabase` imports.
  - Calculate totals strictly using `calculateOrderServerTotals` from `backend/lib/orders.server.ts` (prices in integer paise from `farmer_products` in Neon).
  - Use server-side `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
- [ ] **Migrate `app/api/payments/razorpay/verify-payment/route.ts`**:
  - Remove all legacy `supabaseAdmin` and `adminDb` calls.
  - Query and update the `orders` table in Neon Postgres via Drizzle (`db.update(orders).set({ paymentStatus: 'collected', status: 'confirmed', razorpayPaymentId, razorpaySignature }).where(...)`).
  - Write an audit record in `order_status_logs`.
- [ ] **Migrate `app/api/payments/cashfree/create-order/route.ts`**:
  - Calculate totals strictly from Postgres items and shipping slabs.
  - Use `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET`.
- [ ] **Migrate `app/api/payments/cashfree/verify-order/route.ts`**:
  - Update `orders` in Neon with `cashfree_order_id` and verified status.

---

## 2. Stock Reservation and Timeout Release Architecture
COD and WhatsApp orders decrement stock immediately upon confirmation. Online payments require a temporary reservation window while the customer is completing payment on Razorpay or Cashfree:
- [ ] **Implement Reservation TTL (e.g., 15 minutes)**:
  - Add an order status `pending_payment` or reservation state tracking.
  - Use `reserveStockAtomicTx(tx, items, orderId, 15)` to lock and reserve item quantity.
- [ ] **Automated Release on Expiry / Failure**:
  - Implement a scheduled background job or Cron (`*/5 * * * *`) querying:
    ```sql
    SELECT id FROM orders 
    WHERE status = 'pending_payment' 
      AND created_at < NOW() - INTERVAL '15 minutes';
    ```
  - For each expired order, invoke `releaseStockReservationAtomic(orderId, "Payment session timed out")` to restore `stock_grams` in `farmer_products` and `product_inventory` and record `refund` in `stock_history`.
- [ ] **Cancel / Abandon Callback**:
  - When a user cancels on the Razorpay modal or closes the window, send a beacon / cancel request to release the reservation immediately.

---

## 3. Cryptographic Signature Verification on Raw Bodies
- [ ] **Raw Body Ingestion**:
  - Webhook handlers MUST read `await req.text()` before any parsing.
  - NEVER verify signatures against a re-serialized `JSON.stringify(body)`.
- [ ] **Constant-Time Verification**:
  - Razorpay:
    ```ts
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature, "utf-8");
    const expBuf = Buffer.from(expected, "utf-8");
    const isValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    ```
  - Cashfree:
    - Verify `x-webhook-signature` using Cashfree SDK or HMAC SHA-256 with timestamp verification.

---

## 4. Idempotent Webhook Processing & Sanitized Auditing
Payment providers guarantee *at-least-once* delivery, meaning webhooks can be delivered multiple times:
- [ ] **Deduplication via `payment_webhook_events`**:
  - Store incoming event ID:
    ```ts
    const eventId = req.headers.get("x-razorpay-event-id") || body.event_id;
    ```
  - Attempt insert into `payment_webhook_events`:
    ```ts
    await db.insert(paymentWebhookEvents).values({
      eventId,
      gateway: "razorpay",
      eventType: body.event,
      orderId,
      status: "processing",
      payload: sanitizePayload(body),
    });
    ```
  - If a unique violation occurs on `event_id`:
    - Check if previous status is `'processed'`. If so, return HTTP 200 immediately without modifying orders or inventory.
- [ ] **Payload Sanitization (Zero PII / Card Details)**:
  - Extract only reconciliation fields:
    ```ts
    function sanitizePayload(raw: any) {
      return {
        event: raw.event,
        payment_id: raw.payload?.payment?.entity?.id,
        order_id: raw.payload?.order?.entity?.id || raw.payload?.payment?.entity?.notes?.order_id,
        amount: raw.payload?.payment?.entity?.amount,
        status: raw.payload?.payment?.entity?.status,
        error_code: raw.payload?.payment?.entity?.error_code,
        error_description: raw.payload?.payment?.entity?.error_description,
      };
    }
    ```
  - NEVER store credit card numbers, CVVs, customer email, or customer phone inside webhook payloads.

---

## 5. Gateway Test Mode Verification
- [ ] Configure `RAZORPAY_KEY_ID=rzp_test_...` and `RAZORPAY_KEY_SECRET=...` in `.env.local`.
- [ ] Configure `CASHFREE_CLIENT_ID=...` and `CASHFREE_CLIENT_SECRET=...` with `CASHFREE_ENV=sandbox`.
- [ ] Run full simulated payment workflows:
  - Test successful UPI payment -> verify order moves to `collected` / `confirmed`.
  - Test failed payment -> verify stock is released and order marked `cancelled` / `payment_failed`.
  - Test webhook delivery with Ngrok / test endpoint.

---

## 6. Rate Limiting and Anti-Fraud Protection
- [ ] **Rate Limit Payment Creation**:
  - Max 5 order creation attempts per IP/user per 10 minutes to prevent card testing / bot attacks.
- [ ] **Order Amount Bounds**:
  - Enforce minimum transaction amount (₹1.00 / 100 paise) and maximum transaction amount (e.g., ₹50,000 / 5,000,000 paise).

---

## 7. Enabling the Feature Flag
Only when steps 1 through 6 are signed off:
1. Set `ONLINE_PAYMENTS_ENABLED=true` in server environment (e.g. Vercel / Neon environment).
2. Set `NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED=true` for client builds.
3. Deploy to preview environment, execute live test transaction with real test cards/UPI.
4. Promote to production.
