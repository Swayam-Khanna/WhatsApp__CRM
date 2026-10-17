# Database & Media Storage Migration Guide

This document outlines the migration procedure from Supabase PostgreSQL to **Neon PostgreSQL** and the new **<= 300 KB WebP Object Storage** architecture for Prajnaa Market.

---

## 1. Executive Summary

| Component | Previous State | New State |
| :--- | :--- | :--- |
| **Database Engine** | Supabase Postgres (with `auth.users` references & RLS) | **Neon Postgres** (Singapore `ap-southeast-1`, pooled connection) |
| **Authentication** | Firebase Auth (frontend) with legacy Supabase FKs | **Firebase Auth** (retained, unblocked, decoupled from Supabase) |
| **Database Size Limit** | Unmonitored / Bloated by base64 images | Fits comfortably in Neon free tier (**0.5 GB / 500 MB**) |
| **Image Compression** | Ad-hoc client canvas compression | **Centralized `sharp` service**: Auto-EXIF rotate, WebP, strictly **<= 300 KB** |
| **Image Storage** | Cloudinary / Supabase Storage / Base64 in Postgres | **S3-Compatible Object Storage** (Neon Object Storage / R2 / AWS S3) |

---

## 2. Pre-Migration Analysis: Foreign Keys & RLS

### What Breaks When Dumping `--schema=public` from Supabase:
1. **Foreign Keys to `auth.users`:**
   Supabase tables (`profiles`, `farmer_profiles`, `addresses`, `user_roles`, `orders`, etc.) have `REFERENCES auth.users(id)`. When restoring only `public`, this will fail with `relation "auth.users" does not exist`.
2. **Row Level Security Policies:**
   Over 25 policies reference `auth.uid()` or `public.has_role(auth.uid(), ...)`. Without the `auth` schema, `pg_restore` throws `function auth.uid() does not exist`.

### Solution Applied to Neon Before Restore:
Before restoring into Neon, execute the following stub script on the target Neon branch:
```sql
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;
```

---

## 3. Database Migration Execution (Child Branch First)

### Step 1: Create Child Branch on Neon
Never test on `production` directly.
```bash
# Using Neon CLI:
neon branches create --name migration-test --project-id rapid-grass-19966971
```

### Step 2: Check Old Database Size
Confirm the database size fits inside Neon's 0.5 GB (500 MB) free limit:
```sql
SELECT pg_size_pretty(pg_database_size(current_database())) AS total_size,
       pg_size_pretty(sum(pg_total_relation_size(c.oid))) AS public_schema_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public';
```

### Step 3: Dump Only Public Schema from Supabase
```bash
pg_dump -Fc --no-owner --no-acl --schema=public "<OLD_DATABASE_URL>" -f prajnaa.dump
```

### Step 4: Apply Auth Stub & Restore into Neon Child Branch
```bash
# 1. Apply auth stub
psql "<NEON_TEST_BRANCH_URL>" -c "CREATE SCHEMA IF NOT EXISTS auth; CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb, created_at timestamptz DEFAULT now()); CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS \$\$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid; \$\$; CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS \$\$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon'); \$\$;"

# 2. Restore schema and data
pg_restore --no-owner --no-acl -d "<NEON_TEST_BRANCH_URL>" prajnaa.dump
```

### Step 5: Verification & Row Count Comparison
Run the verification query on both databases:
```sql
SELECT schemaname, relname, n_live_tup 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
ORDER BY relname;
```
Compare every table name and row count to guarantee 100% parity.

---

## 4. Image Compression & Storage System

### Architecture
- **Service:** `backend/lib/image-service.ts`
  - Reusable `compressImage(buffer, options)` function:
    - Auto-rotates via EXIF (`sharp(buffer).rotate()`).
    - Converts to WebP.
    - Starts at max width 1600px and quality 80.
    - Lowers quality in steps of 10 down to 40.
    - Shrinks width by 20% per step down to 400px until `<= 300 KB`.
  - `saveImage(buffer, fileName, options)`:
    - Enforces 10 MB raw upload limit.
    - Validates MIME types (`jpeg`, `png`, `webp`, `gif`).
    - Compresses and stores to S3-compatible Object Storage.
- **Unified Upload Route:** `app/api/upload/route.ts` routes all uploads through `saveImage`.
- **Database Safety:** Eliminates base64 blobs in Postgres tables to keep database footprint minimal.

### Running Image Migration
To process existing static assets and database image columns:
```bash
# 1. Dry run (previews changes and space savings)
node scripts/migrate-images.ts

# 2. Apply mode (compresses assets and uploads to storage)
node scripts/migrate-images.ts --apply
```

### Running Unit Tests
```bash
npm test
```

---

## 5. Rollback Plan

If any issue arises during or after migration:
1. **Database Rollback:**
   - The old Supabase database was **never modified, dropped, or altered**.
   - Simply revert `DATABASE_URL` in your hosting provider (e.g., Vercel) back to the Supabase connection string.
   - Delete the `migration-test` branch in Neon:
     ```bash
     neon branches delete migration-test --project-id rapid-grass-19966971
     ```
2. **Application Code Rollback:**
   - Code changes remain backward compatible (if Object Storage environment variables are not set, it gracefully defaults to local/fallback storage).

---

## 6. Hosting Provider (Vercel) Environment Variables Checklist

Configure these environment variables in your production hosting provider dashboard:

### Database (Neon Postgres)
- `DATABASE_URL`: `postgresql://neondb_owner:***@ep-snowy-fog-b3wop5vp-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` *(Always use the `-pooler` endpoint for serverless environments)*

### Object Storage (Neon Object Storage / AWS S3 / Cloudflare R2)
- `OBJECT_STORAGE_ENDPOINT`: S3-compatible API endpoint URL
- `OBJECT_STORAGE_BUCKET`: Bucket name (e.g. `prajnaa-market-media`)
- `OBJECT_STORAGE_ACCESS_KEY_ID`: S3 Access Key ID
- `OBJECT_STORAGE_SECRET_ACCESS_KEY`: S3 Secret Access Key
- `OBJECT_STORAGE_REGION`: `ap-southeast-1` (or your chosen region)
- `OBJECT_STORAGE_PUBLIC_URL_PREFIX`: (Optional) Public CDN URL or custom domain
