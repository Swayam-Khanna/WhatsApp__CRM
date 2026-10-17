import { NextRequest, NextResponse } from "next/server";
import { calculateShippingRate, ShippingService } from "@/lib/shipping/shipping-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartItems, service, destinationPincode } = body;

    if (!destinationPincode || !/^\d{6}$/.test(String(destinationPincode).trim())) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit destination pincode." },
        { status: 400 }
      );
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: "Cart items are required for shipping calculation." },
        { status: 400 }
      );
    }

    const result = await calculateShippingRate({
      cartItems,
      service: (service as ShippingService) || "india_post",
      destinationPincode: String(destinationPincode).trim(),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to calculate shipping rate." },
      { status: 400 }
    );
  }
}
