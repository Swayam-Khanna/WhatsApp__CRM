import { NextRequest, NextResponse } from "next/server";
import { getAllCoupons, getCouponByCode, createCoupon } from "@/lib/coupon/coupon-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const code = searchParams.get("code") || undefined;

    // Check specific code uniqueness query
    if (code) {
      const existing = await getCouponByCode(code);
      return NextResponse.json({
        success: true,
        exists: !!existing,
        coupon: existing,
      });
    }

    const coupons = await getAllCoupons(search);

    return NextResponse.json({
      success: true,
      data: coupons,
      count: coupons.length,
    });
  } catch (err: any) {
    console.error("[API Admin Coupons GET Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();

    const {
      code,
      name,
      type,
      value,
      buyQty,
      getQty,
      applyTo,
      categoryId,
      itemIds,
      applyOncePerOrder,
      includeSubscriptions,
      startDate,
      endDate,
      totalUseLimit,
      perCustomerLimit,
      tags,
    } = body;

    if (!code || !name || !type) {
      return NextResponse.json(
        { success: false, error: "Code, Name, and Type are required." },
        { status: 400 }
      );
    }

    const coupon = await createCoupon({
      code,
      name,
      type,
      value: value !== undefined ? (value === "" || value === null ? null : Number(value)) : null,
      buyQty: buyQty !== undefined ? (buyQty === "" || buyQty === null ? null : Number(buyQty)) : null,
      getQty: getQty !== undefined ? (getQty === "" || getQty === null ? null : Number(getQty)) : null,
      applyTo,
      categoryId,
      itemIds,
      applyOncePerOrder: !!applyOncePerOrder,
      includeSubscriptions: includeSubscriptions !== false,
      startDate,
      endDate: endDate || null,
      totalUseLimit: totalUseLimit ? Number(totalUseLimit) : null,
      perCustomerLimit: perCustomerLimit ? Number(perCustomerLimit) : null,
      tags: Array.isArray(tags) ? tags : [],
    });

    return NextResponse.json({
      success: true,
      data: coupon,
      message: `Coupon "${coupon.code}" created successfully.`,
    });
  } catch (err: any) {
    console.error("[API Admin Coupons POST Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create coupon." },
      { status: 400 }
    );
  }
}
