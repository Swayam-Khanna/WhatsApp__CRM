import { NextRequest, NextResponse } from "next/server";
import { recordCouponRedemption, getCouponById, getCouponByCode } from "@/lib/coupon/coupon-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { couponId, couponCode, customerId, orderId } = body;

    if ((!couponId && !couponCode) || !customerId) {
      return NextResponse.json(
        { success: false, error: "Coupon identifier and Customer ID are required." },
        { status: 400 }
      );
    }

    let targetCouponId = couponId;
    if (!targetCouponId && couponCode) {
      const found = await getCouponByCode(couponCode);
      if (found) targetCouponId = found.id;
    }

    if (!targetCouponId) {
      return NextResponse.json({ success: false, error: "Coupon not found." }, { status: 404 });
    }

    const redemption = await recordCouponRedemption({
      couponId: targetCouponId,
      customerId,
      orderId,
    });

    return NextResponse.json({
      success: true,
      data: redemption,
      message: "Coupon redemption recorded successfully.",
    });
  } catch (err: any) {
    console.error("[API Cart Redeem Coupon Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to record redemption." },
      { status: 500 }
    );
  }
}
