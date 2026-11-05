import { isGatewayEnabled, getGatewayConfig } from "../../../../../frontend/config/payment-gateways.ts";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 0. Enforce Central Gateway Status Check
    if (!isGatewayEnabled("razorpay")) {
      const config = getGatewayConfig("razorpay");
      return Response.json(
        {
          error: config?.disabledReason || "This payment method is temporarily unavailable. Please choose another option.",
          code: "GATEWAY_DISABLED",
          gateway: "razorpay",
        },
        { status: 403 }
      );
    }


    const { calculateBackendOrder } = await import("../../../../../frontend/lib/api/tax-calculator.ts");
    const body = await req.json();
    const { items, shippingService, paymentMethod, destinationPincode, orderId, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Invalid or empty order items" }, { status: 400 });
    }

    // Securely calculate grand total on backend from DB values
    const calculation = await calculateBackendOrder(
      items,
      shippingService || "india_post",
      paymentMethod || "razorpay",
      destinationPincode || ""
    );
    const amount = calculation.grandTotal;

    if (!amount || amount <= 0) {
      return Response.json({ error: "Invalid calculated order amount" }, { status: 400 });
    }

    // Fetch Razorpay credentials from environment
    const keyId =
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      process.env.VITE_RAZORPAY_KEY_ID ||
      "";
    const keySecret =
      process.env.RAZORPAY_KEY_SECRET ||
      process.env.VITE_RAZORPAY_KEY_SECRET ||
      "";

    if (!keyId || !keySecret) {
      return Response.json(
        { error: "Razorpay payment gateway is not configured." },
        { status: 500 }
      );
    }

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const razorpayPayload = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: orderId || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: {
        ...(notes || {}),
        order_id: orderId || "",
      },
    };

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(razorpayPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Razorpay API Error]:", data);
      return Response.json(
        { error: data.error?.description || "Failed to create order with Razorpay" },
        { status: response.status }
      );
    }

    return Response.json(data);
  } catch (error: any) {
    console.error("[Razorpay Route Error]:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
