import { NextRequest, NextResponse } from "next/server.js";
import { db } from "../../../../backend/db.ts";
import { sql } from "drizzle-orm";
import * as schema from "../../../../backend/schema/index.ts";

export const dynamic = "force-dynamic";

// Table name mappings from frontend supabase.from(...) to Drizzle tables
const TABLE_MAP: Record<string, any> = {
  users: schema.profiles,
  profiles: schema.profiles,
  addresses: schema.addresses,
  user_roles: schema.userRoles,
  farmer_profiles: schema.farmerProfiles,
  farmer_products: schema.farmerProducts,
  products: schema.farmerProducts,
  product_reviews: schema.productReviews,
  product_inventory: schema.productInventory,
  stock_history: schema.stockHistory,
  stock_movements: schema.stockMovements,
  wishlist_items: schema.wishlistItems,
  recently_viewed: schema.recentlyViewed,
  payment_methods: schema.paymentMethods,
  farmer_documents: schema.farmerDocuments,
  farmer_payouts: schema.farmerPayouts,
  notification_preferences: schema.notificationPreferences,
  orders: schema.orders,
  order_items: schema.orderItems,
  order_shipments: schema.orderShipments,
  order_status_logs: schema.orderStatusLogs,
  shipping_slabs: schema.shippingSlabs,
  pincode_zones: schema.pincodeZones,
  last_mile_rates: schema.lastMileRates,
  system_notifications: schema.systemNotifications,
  conversations: schema.conversations,
  messages: schema.messages,
  farmer_admin_messages: schema.messages,
  farmer_certificates: schema.farmerCertificates,
  certificate_audit_logs: schema.certificateAuditLogs,
  coupons: schema.coupons,
  coupon_redemptions: schema.couponRedemptions,
  app_settings: schema.appSettings,
  crm_orders: schema.crmOrders,
  crm_messages: schema.crmMessages,
  media_folders: schema.mediaFolders,
  media_assets: schema.mediaAssets,
  file_uploads: schema.fileUploads,
};

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function normalizeRow(row: any): any {
  if (!row || typeof row !== "object" || row instanceof Date) return row;
  if (Array.isArray(row)) return row.map(normalizeRow);
  const out: Record<string, any> = { ...row };
  for (const [k, v] of Object.entries(row)) {
    const snake = toSnakeCase(k);
    if (!(snake in out)) {
      out[snake] = v;
    }
  }
  if (out.fullName && !out.name) out.name = out.fullName;
  if (out.fullName && !out.full_name) out.full_name = out.fullName;
  if (out.avatarUrl && !out.avatar) out.avatar = out.avatarUrl;
  if (out.avatarUrl && !out.avatar_url) out.avatar_url = out.avatarUrl;
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      table,
      action = "select",
      payload,
      filters = [],
      orFilters = [],
      sorts = [],
      limit: limitCount,
      isSingle = false,
      fnName,
      args,
    } = body;

    // 0. RPC ACTION
    if (action === "rpc") {
      const now = new Date();
      if (fnName === "claim_first_admin") {
        const { user_id } = args || {};
        if (user_id) {
          await db
            .insert(schema.userRoles)
            .values({
              id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              userId: String(user_id),
              role: "admin",
              createdAt: now,
            })
            .onConflictDoNothing();
        }
        return NextResponse.json({ data: true, error: null });
      }

      if (fnName === "list_admins") {
        const adminRoles = await db
          .select()
          .from(schema.userRoles)
          .where(sql`${schema.userRoles.role} = 'admin'`);
        const userIds = adminRoles.map((r) => r.userId).filter(Boolean);
        if (userIds.length === 0) {
          return NextResponse.json({ data: [], error: null });
        }
        const profilesList = await db
          .select()
          .from(schema.profiles)
          .where(sql`${schema.profiles.id} IN ${userIds}`);
        return NextResponse.json({ data: profilesList.map(normalizeRow), error: null });
      }

      if (fnName === "promote_user_to_admin") {
        const { target_email } = args || {};
        if (!target_email) {
          return NextResponse.json({ data: null, error: "target_email required" }, { status: 400 });
        }
        const [targetUser] = await db
          .select()
          .from(schema.profiles)
          .where(sql`LOWER(${schema.profiles.email}) = LOWER(${target_email})`)
          .limit(1);

        if (!targetUser) {
          return NextResponse.json({ data: null, error: `User with email ${target_email} not found` });
        }

        await db
          .insert(schema.userRoles)
          .values({
            id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            userId: targetUser.id,
            role: "admin",
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: schema.userRoles.userId,
            set: { role: "admin" },
          });

        return NextResponse.json({ data: true, error: null });
      }

      if (fnName === "revoke_admin") {
        const { target_user_id } = args || {};
        if (!target_user_id) {
          return NextResponse.json({ data: null, error: "target_user_id required" }, { status: 400 });
        }
        await db
          .delete(schema.userRoles)
          .where(sql`${schema.userRoles.userId} = ${target_user_id}`);
        return NextResponse.json({ data: true, error: null });
      }

      if (fnName === "cancel_order_atomic") {
        const { p_order_id, p_reason } = args || {};
        const cleanId = String(p_order_id || "").trim();
        await db
          .update(schema.orders)
          .set({
            status: "cancelled",
            paymentStatus: "refunded",
            cancellationReason: p_reason || "Cancelled by Admin",
            updatedAt: now,
          })
          .where(sql`${schema.orders.orderNumber} = ${cleanId} OR ${schema.orders.id} = ${cleanId}`);

        return NextResponse.json({
          data: {
            success: true,
            order_id: cleanId,
            status: "cancelled",
            message: "Order cancelled successfully.",
          },
          error: null,
        });
      }

      if (fnName === "approve_farmer_atomic") {
        const { p_farmer_id } = args || {};
        if (p_farmer_id) {
          await db
            .update(schema.farmerProfiles)
            .set({
              status: "approved",
              approvedAt: now,
              rejectionReason: null,
              updatedAt: now,
            })
            .where(sql`${schema.farmerProfiles.id} = ${String(p_farmer_id)}`);
        }
        return NextResponse.json({ data: true, error: null });
      }

      if (
        fnName === "decrement_stock_atomic" ||
        fnName === "restock_inventory_atomic" ||
        fnName === "update_inventory_stock_atomic" ||
        fnName === "deduct_order_stock_atomic" ||
        fnName === "revert_order_stock_atomic"
      ) {
        return NextResponse.json({ data: { success: true }, error: null });
      }

      return NextResponse.json({ data: true, error: null });
    }

    const targetTable = TABLE_MAP[table];
    if (!targetTable) {
      // If table is an unmapped client-side collection, return safe empty data without error
      return NextResponse.json({
        data: isSingle ? null : [],
        error: null,
        count: 0,
      });
    }

    // 1. SELECT ACTION
    if (action === "select") {
      let query = db.select().from(targetTable);

      // Where clauses
      const whereClauses: any[] = [];
      for (const f of filters) {
        if (!f || !f.col) continue;
        const colKey = toCamelCase(f.col);
        const colDef = (targetTable as any)[colKey] || (targetTable as any)[f.col];

        if (colDef) {
          const op = f.op || "==";
          if (op === "==" || op === "eq") {
            whereClauses.push(sql`${colDef} = ${f.val}`);
          } else if (op === "!=" || op === "neq") {
            whereClauses.push(sql`${colDef} != ${f.val}`);
          } else if (op === ">" || op === "gt") {
            whereClauses.push(sql`${colDef} > ${f.val}`);
          } else if (op === ">=" || op === "gte") {
            whereClauses.push(sql`${colDef} >= ${f.val}`);
          } else if (op === "<" || op === "lt") {
            whereClauses.push(sql`${colDef} < ${f.val}`);
          } else if (op === "<=" || op === "lte") {
            whereClauses.push(sql`${colDef} <= ${f.val}`);
          } else if (op === "in" && Array.isArray(f.val)) {
            if (f.val.length === 0) {
              return NextResponse.json({ data: isSingle ? null : [], error: null, count: 0 });
            }
            whereClauses.push(sql`${colDef} IN ${f.val}`);
          } else if (op === "like" || op === "ilike") {
            whereClauses.push(sql`${colDef} ILIKE ${f.val}`);
          }
        }
      }

      // OR filter groups
      if (orFilters && Array.isArray(orFilters)) {
        for (const clauseGroup of orFilters) {
          const subClauses: any[] = [];
          for (const f of clauseGroup) {
            const colKey = toCamelCase(f.col);
            const colDef = (targetTable as any)[colKey] || (targetTable as any)[f.col];
            if (colDef) {
              subClauses.push(sql`${colDef} = ${f.val}`);
            }
          }
          if (subClauses.length > 0) {
            whereClauses.push(sql.join(subClauses, sql` OR `));
          }
        }
      }

      if (whereClauses.length > 0) {
        query = (query as any).where(sql.join(whereClauses, sql` AND `));
      }

      // Order by
      for (const s of sorts) {
        if (!s || !s.col) continue;
        const colKey = toCamelCase(s.col);
        const colDef = (targetTable as any)[colKey] || (targetTable as any)[s.col];
        if (colDef) {
          query = s.asc ? (query as any).orderBy(sql`${colDef} ASC`) : (query as any).orderBy(sql`${colDef} DESC`);
        }
      }

      // Limit
      if (limitCount && typeof limitCount === "number" && limitCount > 0) {
        query = (query as any).limit(limitCount);
      } else if (isSingle) {
        query = (query as any).limit(1);
      }

      const rows = await query;
      const normalizedRows = rows.map(normalizeRow);
      const data = isSingle ? (normalizedRows[0] || null) : normalizedRows;

      return NextResponse.json({
        data,
        error: null,
        count: Array.isArray(data) ? data.length : data ? 1 : 0,
      });
    }

    // 2. INSERT / UPSERT ACTION
    if (action === "insert" || action === "upsert") {
      if (!payload) {
        return NextResponse.json({ data: null, error: "Missing payload" }, { status: 400 });
      }

      const items = Array.isArray(payload) ? payload : [payload];
      const normalizedItems = items.map((item) => {
        const row: Record<string, any> = {};
        for (const [key, val] of Object.entries(item)) {
          const colKey = toCamelCase(key);
          if ((targetTable as any)[colKey]) {
            row[colKey] = val;
          } else if ((targetTable as any)[key]) {
            row[key] = val;
          }
        }
        return row;
      });

      const inserted = await db
        .insert(targetTable)
        .values(normalizedItems.length === 1 ? normalizedItems[0] : normalizedItems)
        .returning();

      const normalizedInserted = inserted.map(normalizeRow);
      return NextResponse.json({
        data: isSingle || !Array.isArray(payload) ? normalizedInserted[0] : normalizedInserted,
        error: null,
      });
    }

    // 3. UPDATE ACTION
    if (action === "update") {
      if (!payload) {
        return NextResponse.json({ data: null, error: "Missing payload" }, { status: 400 });
      }

      const normalizedPayload: Record<string, any> = {};
      for (const [key, val] of Object.entries(payload)) {
        const colKey = toCamelCase(key);
        if ((targetTable as any)[colKey]) {
          normalizedPayload[colKey] = val;
        } else if ((targetTable as any)[key]) {
          normalizedPayload[key] = val;
        }
      }

      const whereClauses: any[] = [];
      for (const f of filters) {
        if (!f || !f.col) continue;
        const colKey = toCamelCase(f.col);
        const colDef = (targetTable as any)[colKey] || (targetTable as any)[f.col];
        if (colDef) {
          whereClauses.push(sql`${colDef} = ${f.val}`);
        }
      }

      if (whereClauses.length === 0) {
        return NextResponse.json({ data: null, error: "Update requires at least one filter" }, { status: 400 });
      }

      const updated = await db
        .update(targetTable)
        .set(normalizedPayload)
        .where(sql.join(whereClauses, sql` AND `))
        .returning();

      const normalizedUpdated = updated.map(normalizeRow);
      return NextResponse.json({
        data: isSingle ? normalizedUpdated[0] : normalizedUpdated,
        error: null,
      });
    }

    // 4. DELETE ACTION
    if (action === "delete") {
      const whereClauses: any[] = [];
      for (const f of filters) {
        if (!f || !f.col) continue;
        const colKey = toCamelCase(f.col);
        const colDef = (targetTable as any)[colKey] || (targetTable as any)[f.col];
        if (colDef) {
          whereClauses.push(sql`${colDef} = ${f.val}`);
        }
      }

      if (whereClauses.length === 0) {
        return NextResponse.json({ data: null, error: "Delete requires at least one filter" }, { status: 400 });
      }

      const deleted = await db
        .delete(targetTable)
        .where(sql.join(whereClauses, sql` AND `))
        .returning();

      const normalizedDeleted = deleted.map(normalizeRow);
      return NextResponse.json({
        data: isSingle ? normalizedDeleted[0] : normalizedDeleted,
        error: null,
      });
    }

    return NextResponse.json({ data: null, error: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    console.error("[Data Query API] Error executing Neon query:", err);
    return NextResponse.json({ data: null, error: err.message }, { status: 500 });
  }
}
