# Coolify Deployment Guide — Prajnaa Market & WhatsApp CRM

This project is configured and optimized for zero-downtime containerized deployment on **Coolify** (self-hosted PaaS).

---

## 1. Quick Deploy via Coolify UI

1. **Create New Resource in Coolify**:
   - Go to your Coolify Dashboard → **Projects** → Select your Project & Environment.
   - Click **+ New** → **Application** → Select **Public/Private Git Repository** (or **GitHub App**).
   - Paste your Git repository URL and select branch `main`.

2. **Build Pack Configuration**:
   - **Build Pack**: Select **Dockerfile**
   - **Port**: `3000`
   - **Healthcheck Path**: `/api/health`

3. **Paste Environment Variables**:
   In Coolify application settings → **Environment Variables**, paste your environment variables:

```env
# Domain & Server
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_APP_URL=https://your-coolify-domain.com
BETTER_AUTH_URL=https://your-coolify-domain.com
BETTER_AUTH_SECRET=your_better_auth_secret_min_32_characters
PAN_ENCRYPTION_KEY=your_pan_encryption_secret_min_32_characters
MIGRATION_SECRET=your_migration_secret

# Database (Coolify Internal PostgreSQL service)
DATABASE_URL=postgres://postgres:your_postgres_password@postgres-host:5432/postgres
DATA_PROVIDER=neon

# Prajnaa Official WhatsApp Business Platform & Cloud API
ADMIN_WHATSAPP_NUMBER=your_admin_number
WHATSAPP_APP_ID=your_whatsapp_app_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_SYSTEM_USER_ID=your_system_user_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token

# Connected to Prajnaa Market Backend & WhatsApp CRM Engine
VITE_API_BASE_URL=https://your-coolify-domain.com/api
VITE_WS_URL=wss://your-coolify-domain.com/ws

# Feature Flags
ONLINE_PAYMENTS_ENABLED=false
NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED=false
```

4. **Click Deploy**:
   - Coolify will build the multi-stage Docker container with Next.js standalone optimization.
   - Once deployment completes, your instance will be live and monitored via `/api/health`.

---

## 2. Meta WhatsApp Cloud API Webhook Setup

In the [Meta for Developers Portal](https://developers.facebook.com/):
1. Navigate to **WhatsApp** → **Configuration**.
2. **Callback URL**: `https://your-coolify-domain.com/api/webhooks/whatsapp`
3. **Verify Token**: `your_webhook_verify_token`
4. Click **Verify and Save**.
5. Under **Webhook fields**, subscribe to **`messages`**.

---

## 3. Applying Database Migrations

Run database migrations against PostgreSQL:
```
https://<your-coolify-domain>/api/migrate?key=your_migration_secret
```
