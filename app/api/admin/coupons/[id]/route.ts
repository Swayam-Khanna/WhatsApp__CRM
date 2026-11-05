import { NextRequest, NextResponse } from "next/server";
import { updateCoupon, deleteCoupon, getCouponById } from "@/lib/coupon/coupon-service";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const coupon = await getCouponById(id);
    if (!coupon) {
      return NextResponse.json({ success: false, error: "Coupon not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: coupon });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to fetch coupon" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await updateCoupon(id, {
      ...body,
      value: body.value !== undefined ? (body.value === "" || body.value === null ? null : Number(body.value)) : undefined,
      buyQty: body.buyQty !== undefined ? (body.buyQty === "" || body.buyQty === null ? null : Number(body.buyQty)) : undefined,
      getQty: body.getQty !== undefined ? (body.getQty === "" || body.getQty === null ? null : Number(body.getQty)) : undefined,
      totalUseLimit: body.totalUseLimit !== undefined ? (body.totalUseLimit === "" || body.totalUseLimit === null ? null : Number(body.totalUseLimit)) : undefined,
      perCustomerLimit: body.perCustomerLimit !== undefined ? (body.perCustomerLimit === "" || body.perCustomerLimit === null ? null : Number(body.perCustomerLimit)) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Coupon "${updated.code}" updated successfully.`,
    });
  } catch (err: any) {
    console.error("[API Admin Coupon PUT Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update coupon." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await deleteCoupon(id);

    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully.",
    });
  } catch (err: any) {
    console.error("[API Admin Coupon DELETE Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete coupon." },
      { status: 500 }
    );
  }
}
