# Prajnaa Market & WhatsApp CRM — Production Operational Handover

**Brand:** Prajnaa Market / Prajnaa Farm  
**Official WhatsApp Business Number:** `+91 76500 65690`  
**Store Admin:** Nishant (Master Control)  
**Carrier & Dispatch Center:** India Post Speed Post (Dehradun MDG, Uttarakhand)  
**Live Storefront URL:** `https://prajnaa-farm-8zam.vercel.app/`  

---

## 1. System Architecture Overview

The system bridges the **Prajnaa Market Himalayan Produce Storefront** with an **in-house WhatsApp CRM** designed exclusively for Prajnaa Market's business operations.

```mermaid
flowchart LR
    A[Customer on Storefront] -->|Checkout / Direct Payment| B[/api/orders/create]
    B -->|Atomic Calculation & Fallback| C[(Database / Event Store)]
    C -->|Real-Time Webhook / Polling| D[CRM Orders Pipeline]
    D -->|Order Details| E[WhatsApp CRM Inbox]
    E -->|Meta Cloud API v21.0| F[Official WhatsApp +91 76500 65690]
    E -->|Speed Post Dispatch| G[India Post Tracking Portal]
    E -->|Seasonal Harvest Alerts| H[Broadcast Campaign Engine]
```

---

## 2. Environment Variables & Credentials (`.env`)

| Variable | Description | Example / Required Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon Postgres Pooled connection | `postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Cloud API Phone ID | Formatted ID from Meta App Dashboard |
| `WHATSAPP_ACCESS_TOKEN` | Meta System User Permanent Access Token | `EAAB...` (Bearer token with `whatsapp_business_messaging`) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Custom token for Meta Webhook Handshake | `your_webhook_verify_token` |
| `WHATSAPP_APP_SECRET` | Meta App Secret for HMAC SHA-256 verification | 32-character hexadecimal secret from Meta App Settings |
| `ADMIN_WHATSAPP_NUMBER` | Official business phone (digits only) | `917650065690` |
| `NEXT_PUBLIC_APP_URL` | Canonical Storefront URL | `https://prajnaa-farm-8zam.vercel.app/` |

---

## 3. Meta WhatsApp Cloud API Webhook Setup

1. **Webhook Callback URL:** `https://your-domain.com/api/webhooks/whatsapp`
2. **Verify Token:** Set to the exact value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your environment.
3. **Verification Command (Automated Smoke Test):**
   ```powershell
   Invoke-RestMethod -Uri "https://your-domain.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=prajnaa_ok&hub.verify_token=your_webhook_verify_token" -Method GET
   # Returns: prajnaa_ok (HTTP 200)
   ```
4. **Subscribed Webhook Fields:**
   - `messages` (Inbound customer messages)
   - `message_deliveries` (Delivery status: sent, delivered, read, failed)

---

## 4. Operational Workflows for CRM Staff

### A. Order Confirmation & Direct Payment (Phase 3 & 6)
1. Customer places order selecting **WhatsApp Order & Direct Payment**.
2. Order immediately registers in the CRM with status `Awaiting Payment Confirmation`.
3. Support Agent or Admin opens the chat and clicks **💰 Send UPI QR**.
   - Verified UPI ID: `7650065690@okbizaxis`.
   - Exact order amount is bound to the QR code.
4. Once the customer shares the transaction screenshot and payment is reconciled, click **Update Payment Status ➔ Paid**.
   > *Security Rule:* Sending QR is not proof of payment. Payment status must only be updated after verified bank/UPI credit.

### B. Artisan Packaging & 2–3 Days SLA (Phase 8)
- Prajnaa Market produce is harvested and packed with eco-friendly mountain materials in Tehri Garhwal.
- Standard processing SLA is **2–3 working days**.
- Operators can update order status: `Processing ➔ Packed ➔ Ready for Dispatch`.

### C. India Post Speed Post Dispatch (Phase 9)
1. Consignment is handed over to **Dehradun MDG (Uttarakhand)**.
2. In the CRM Customer Drawer or Shipments tab, enter the consignment number (e.g. `ET765006569IN`).
3. Click **🚚 Send Speed Post ID** or select template `India Post Speed Post Dispatch`.
4. The customer receives the tracking ID with the official tracking link: `https://www.indiapost.gov.in`.

### D. WhatsApp Broadcast Campaigns (Phase 11)
1. Go to the **Broadcast** tab (Admin Nishant only).
2. Choose a pre-configured harvest preset (e.g., *Badri Cow Ghee Batch*, *Ladakh Apricots Pre-Order*, *Multiflora Honey*, *Festive Discount*) or enter a custom announcement.
3. Select the customer tier (*All Customers*, *VIP Customers*, *Honey Lovers*, *Dry Fruits Buyers*).
4. Click **Dispatch Broadcast Campaign** &mdash; sent via Meta Cloud API batch mode.
5. Review real-time delivery and read metrics in the **Campaign History & Performance** table below.

---

## 5. Security & Access Control (RBAC)

The system enforces strict role-based access control:

- **Store Admin (Nishant):** Full master control across all 12 modules including Revenue Analytics, Team Roster, Broadcast Campaigns, and Store Settings.
- **Operations:** Access to Orders, Catalogue, Shipments, and Customer directory.
- **Support Agent:** Access to Shared Inbox, Customer drawer, and pre-approved Templates.
- **Packaging Staff:** Access to Shipments and Order Details only.

---

## 6. Verification & Automated Test Commands

Run the comprehensive master test suite:
```powershell
node --test tests/whatsapp-crm-master.test.mjs
# Results: 8/8 tests pass (100% pass rate)
```

Run TypeScript compilation check:
```powershell
npx tsc --noEmit
# Results: 0 errors (Exit code 0)
```

Production build command:
```powershell
npm run build
```
