# Coolify Deployment Guide — Prajnaa Market & WhatsApp CRM

This project is configured and optimized for zero-downtime containerized deployment on **Coolify** (self-hosted PaaS).

---

## 1. Quick Deploy via Coolify UI

1. **Create New Resource in Coolify**:
   - Go to your Coolify Dashboard → **Projects** → Select your Project & Environment.
   - Click **+ New** → **Application** → Select **Public/Private Git Repository** (or **Docker Compose**).
   - Paste your Git repository URL and select branch `main`.

2. **Build Pack Configuration**:
   - **Build Pack**: Select **Dockerfile** *(Recommended)* or **Docker Compose** or **Nixpacks**.
   - **Port**: `3000`
   - **Healthcheck Path**: `/api/health`

3. **Paste Environment Variables**:
   In Coolify application settings → **Environment Variables**, paste the following block:

```env
# Domain & Server
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_APP_URL=https://your-coolify-domain.com
BETTER_AUTH_URL=https://your-coolify-domain.com
BETTER_AUTH_SECRET=2eb0a945a0353191885350ee6c6f25b3fe18b3ca7580085ea519a2970a3eba27
PAN_ENCRYPTION_KEY=d0c23e1b8bf6cc16725f678147a70c589c5600e7edbe5e45ef76f7e811ae3d74

# Database (PostgreSQL - Neon / Cloud / Coolify PostgreSQL service)
DATABASE_URL=postgresql://neondb_owner:your_neon_password@ep-your-endpoint-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DATA_PROVIDER=neon

# MongoDB Connection
MONGODB_URI=mongodb+srv://rajat70184_db_user:K9z3dDPFALKiaQlq@cluster0.qtq2jmz.mongodb.net/prajnaa_crm?retryWrites=true&w=majority

# Prajnaa Official WhatsApp Business Platform & Cloud API
ADMIN_WHATSAPP_NUMBER=918091265690
WHATSAPP_APP_ID=2330244134467884
WHATSAPP_ACCESS_TOKEN=EAAZArJrR05CMBS4LS8auB9a6oXZBmRr10v9kOKzggxRkwYZAf1SsU2W6omBEWdCYKePI7HPKb2XnZBWZACvB1fIZCEUSexBQjX9TEkOMRUGkFXExZAi2n2nju7tHlUbZAdS5bmQThjCDHGdoaFhSwsaBvSlGHeYog5AwJ5KRYidINpeo5YZBZC5eF1laz0u5eBnQZDZD
WHATSAPP_PHONE_NUMBER_ID=1395630476965721
WHATSAPP_SYSTEM_USER_ID=61595670688105
WHATSAPP_BUSINESS_ACCOUNT_ID=1116143707469110
WHATSAPP_WEBHOOK_VERIFY_TOKEN=prajnaa_whatsapp_verify_token

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

In the [Meta for Developers Portal](https://developers.facebook.com/apps/2330244134467884/whatsapp-business/wa-dev-console/):
1. Navigate to **WhatsApp** → **Configuration**.
2. **Callback URL**: `https://your-coolify-domain.com/api/webhooks/whatsapp`
3. **Verify Token**: `prajnaa_whatsapp_verify_token`
4. Click **Verify and Save**.
5. Under **Webhook fields**, subscribe to **`messages`**.

---

## 3. Applying Database Migrations

Once your PostgreSQL database (`DATABASE_URL`) is connected, run:

```bash
npm run db:migrate
```
*(or run `npm run db:push` to push schema directly)*
