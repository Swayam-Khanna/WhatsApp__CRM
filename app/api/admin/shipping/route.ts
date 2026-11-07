import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, verifyAdminRequest } from "@/lib/api/admin-auth.server";
import { db } from "../../../../backend/db.ts";
import { appSettings, shippingSlabs } from "../../../../backend/schema/system.ts";
import { eq } from "drizzle-orm";
import { INDIA_POST_SLABS, SPEED_POST_SLABS, DEFAULT_CONFIG } from "@/lib/shipping/seed-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    // 1. Fetch checkout/shipping config
    const [configRow] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "shipping_config"))
      .limit(1);

    const config = configRow?.value || {
      ...DEFAULT_CONFIG,
      flat_surcharge_amount: 0,
    };

    // 2. Fetch India Post rates
    const [indiaPostRow] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "shipping_rates_india_post"))
      .limit(1);

    let indiaPostData = indiaPostRow?.value as any;
    if (!indiaPostData || !Array.isArray(indiaPostData.rate_slabs)) {
      indiaPostData = {
        rate_slabs: INDIA_POST_SLABS.map((s) => ({ ...s, packaging_cost: 0 })),
        last_updated: null,
        updated_by: "system",
        effective_from: "immediately",
      };
    }

    // 3. Fetch Speed Post rates
    const [speedPostRow] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "shipping_rates_speed_post"))
      .limit(1);

    let speedPostData = speedPostRow?.value as any;
    if (!speedPostData || !Array.isArray(speedPostData.rate_slabs)) {
      speedPostData = {
        rate_slabs: SPEED_POST_SLABS.map((s) => ({ ...s, packaging_cost: 0 })),
        last_updated: null,
        updated_by: "system",
        effective_from: "immediately",
      };
    }

    // 4. Fetch Rate Change Logs
    const [logsRow] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "rate_change_logs"))
      .limit(1);

    const changeLogs = Array.isArray((logsRow?.value as any)?.logs)
      ? (logsRow?.value as any).logs
      : [];

    return NextResponse.json({
      success: true,
      config,
      indiaPost: indiaPostData,
      speedPost: speedPostData,
      changeLogs,
    });
  } catch (error: any) {
    console.error("[API Shipping GET Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load shipping data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const authUser = await verifyAdminRequest(req);
  const adminEmail = authUser.user?.email || "admin@prajnaamarket.com";

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "save_config") {
      const { config } = body;
      await db
        .insert(appSettings)
        .values({
          key: "shipping_config",
          value: config,
          description: "Shipping checkout configuration",
          updatedBy: adminEmail,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: config,
            updatedBy: adminEmail,
            updatedAt: new Date(),
          },
        });

      return NextResponse.json({ success: true, message: "Shipping configurations saved" });
    }

    if (action === "save_slabs") {
      const { service, slabs, effective_from } = body;
      if (!service || !Array.isArray(slabs)) {
        return NextResponse.json({ success: false, error: "Invalid slabs payload" }, { status: 400 });
      }

      const now = new Date().toISOString();
      const payload = {
        rate_slabs: slabs,
        last_updated: now,
        updated_by: adminEmail,
        effective_from: effective_from || "immediately",
      };

      const settingsKey = `shipping_rates_${service}`;
      await db
        .insert(appSettings)
        .values({
          key: settingsKey,
          value: payload,
          description: `${service} tariff sheet`,
          updatedBy: adminEmail,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: payload,
            updatedBy: adminEmail,
            updatedAt: new Date(),
          },
        });

      // Synchronize with relational shipping_slabs table
      for (const slab of slabs) {
        const weightUptoGm = Number(slab.weight_upto_gm || 500);
        const slabId = `slab_${service}_${weightUptoGm}g`;
        await db
          .insert(shippingSlabs)
          .values({
            id: slabId,
            service,
            weightUptoGm,
            localPaise: Math.round(Number(slab.local || 0) * 100),
            withinStatePaise: Math.round(Number(slab.within_state || 0) * 100),
            zoneMetroPaise: Math.round(Number(slab.zone_metro || 0) * 100),
            otherStatesPaise: Math.round(Number(slab.other_states || 0) * 100),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: shippingSlabs.id,
            set: {
              localPaise: Math.round(Number(slab.local || 0) * 100),
              withinStatePaise: Math.round(Number(slab.within_state || 0) * 100),
              zoneMetroPaise: Math.round(Number(slab.zone_metro || 0) * 100),
              otherStatesPaise: Math.round(Number(slab.other_states || 0) * 100),
              updatedAt: new Date(),
            },
          });
      }

      return NextResponse.json({ success: true, payload });
    }

    if (action === "log_change") {
      const { target, description, previousValue, newValue } = body;
      const [logsRow] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, "rate_change_logs"))
        .limit(1);

      const existingLogs: any[] = Array.isArray((logsRow?.value as any)?.logs)
        ? (logsRow?.value as any).logs
        : [];

      const newLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        adminEmail,
        target,
        description,
        previousValue,
        newValue,
      };

      // Keep up to 100 recent audit logs
      const updatedLogs = [newLog, ...existingLogs].slice(0, 100);

      await db
        .insert(appSettings)
        .values({
          key: "rate_change_logs",
          value: { logs: updatedLogs },
          description: "Rate change audit logs",
          updatedBy: adminEmail,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: { logs: updatedLogs },
            updatedBy: adminEmail,
            updatedAt: new Date(),
          },
        });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[API Shipping POST Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update shipping" },
      { status: 500 }
    );
  }
}
