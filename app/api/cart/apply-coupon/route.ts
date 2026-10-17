import { NextRequest, NextResponse } from "next/server";
import { getCouponByCode, applyCoupon, getCouponRedemptions } from "@/lib/coupon/coupon-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, cart, customerId } = body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid coupon code." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await getCouponByCode(cleanCode);

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Coupon code does not exist. Please check your spelling." },
        { status: 404 }
      );
    }

    const redemptions = await getCouponRedemptions(coupon.id, customerId);
    const result = applyCoupon(coupon, cart || { items: [] }, customerId, redemptions);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error, coupon: result.coupon },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon: result.coupon,
      discount: result.discount,
      message: `Coupon "${coupon.code}" applied! ${result.discount?.breakdown || ""}`,
    });
  } catch (err: any) {
    console.error("[API Cart Apply Coupon Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to apply coupon." },
      { status: 500 }
    );
  }
}
