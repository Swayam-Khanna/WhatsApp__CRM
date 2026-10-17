import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { cart } = body;

    const items = cart?.items || [];
    const subtotal = items.reduce((s: number, i: any) => s + Number(i.price || 0) * Number(i.qty || 1), 0);
    const shipping = cart?.shippingCost !== undefined ? cart.shippingCost : (subtotal > 999 || subtotal === 0 ? 0 : 49);

    return NextResponse.json({
      success: true,
      message: "Coupon removed.",
      discount: {
        discountAmount: 0,
        freeShipping: false,
        breakdown: "",
        eligibleItemCount: items.length,
        newSubtotal: subtotal,
        newShipping: shipping,
        newTotal: subtotal + shipping,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to remove coupon." },
      { status: 500 }
    );
  }
}
