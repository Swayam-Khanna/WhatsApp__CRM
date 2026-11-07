import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, verifyAdminRequest } from "@/lib/api/admin-auth.server";
import { db } from "../../../../../backend/db.ts";
import { appSettings } from "../../../../../backend/schema/system.ts";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const authRes = await verifyAdminRequest(req);
    const userId = authRes.user?.uid || "default_admin";
    const settingsKey = `admin_saved_views_${userId}`;

    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, settingsKey))
      .limit(1);

    const views = Array.isArray((row?.value as any)?.views) ? (row?.value as any).views : [];
    return NextResponse.json({ success: true, views });
  } catch (err: any) {
    return NextResponse.json({ success: true, views: [] });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const authRes = await verifyAdminRequest(req);
    const userId = authRes.user?.uid || "default_admin";
    const settingsKey = `admin_saved_views_${userId}`;

    const body = await req.json();
    const { name, filters, columns } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "View name is required" }, { status: 400 });
    }

    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, settingsKey))
      .limit(1);

    const existingViews: any[] = Array.isArray((row?.value as any)?.views) ? (row?.value as any).views : [];

    const newView = {
      id: `view_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      userId,
      filters: filters || {},
      columns: columns || [],
      created_at: new Date().toISOString(),
    };

    const updatedViews = [...existingViews, newView];

    await db
      .insert(appSettings)
      .values({
        key: settingsKey,
        value: { views: updatedViews },
        description: `Saved views for admin user ${userId}`,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: { views: updatedViews },
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      view: newView,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const authRes = await verifyAdminRequest(req);
    const userId = authRes.user?.uid || "default_admin";
    const settingsKey = `admin_saved_views_${userId}`;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "View ID is required" }, { status: 400 });
    }

    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, settingsKey))
      .limit(1);

    const existingViews: any[] = Array.isArray((row?.value as any)?.views) ? (row?.value as any).views : [];
    const updatedViews = existingViews.filter((v: any) => v.id !== id);

    await db
      .insert(appSettings)
      .values({
        key: settingsKey,
        value: { views: updatedViews },
        description: `Saved views for admin user ${userId}`,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: {
          value: { views: updatedViews },
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true, message: "View deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
