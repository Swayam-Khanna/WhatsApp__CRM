import { NextRequest, NextResponse } from "next/server.js";
import { isGatewayEnabled, getGatewayConfig } from "../../../../../frontend/config/payment-gateways.ts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 0. Enforce Central Gateway Status Check
    if (!isGatewayEnabled("cashfree")) {
      const config = getGatewayConfig("cashfree");
      return NextResponse.json(
        {
          error: config?.disabledReason || "This payment method is temporarily unavailable. Please choose another option.",
          code: "GATEWAY_DISABLED",
          gateway: "cashfree",
        },
        { status: 403 }
      );
    }


    const { getCashfreeConfig } = await import("../../../../../frontend/lib/cashfree-config.ts");

    const body = await req.json();
    const { amount, customer, orderId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid order amount" }, { status: 400 });
    }

    const cfConfig = getCashfreeConfig();
    if (!cfConfig.clientId || !cfConfig.clientSecret) {
      return NextResponse.json(
        { error: "Cashfree payment gateway is not properly configured." },
        { status: 500 }
      );
    }

    const credentialCandidates = [
      {
        appId: cfConfig.clientId,
        secretKey: cfConfig.clientSecret,
      },
    ];

    const apiVersion = cfConfig.apiVersion || "2023-08-01";
    const cfEnv = cfConfig.env;

    const cfOrderId = orderId || `cf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const customerId =
      customer?.phone ||
      customer?.email?.replace(/[^a-zA-Z0-9]/g, "") ||
      `cust_${Date.now()}`;

    let paymentSessionId: string | null = null;
    let cftoken: string | null = null;
    let cfResponseData: any = null;
    let lastErrorMessage: string | null = null;
    let activeAppId = credentialCandidates[0].appId;

    const origin = req.nextUrl ? req.nextUrl.origin : "http://localhost:3000";
    const returnUrl = `${origin}/orders/${orderId || cfOrderId}?cf_id={order_id}`;

    // Loop through credentials
    for (const creds of credentialCandidates) {
      activeAppId = creds.appId;

      // 1. Try Cashfree PG v3 API endpoints
      const v3Endpoints = cfEnv === "production"
        ? ["https://api.cashfree.com/pg/orders", "https://sandbox.cashfree.com/pg/orders"]
        : ["https://sandbox.cashfree.com/pg/orders", "https://api.cashfree.com/pg/orders"];

      const v3Payload = {
        order_id: cfOrderId,
        order_amount: Math.round(amount * 100) / 100,
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_name: customer?.name || "Customer",
          customer_email: customer?.email || "customer@example.com",
          customer_phone: customer?.phone || "9876543210",
        },
        order_meta: {
          return_url: returnUrl,
        },
      };

      for (const url of v3Endpoints) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "x-client-id": creds.appId,
              "x-client-secret": creds.secretKey,
              "x-api-version": apiVersion,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(v3Payload),
          });

          const data = await response.json();
          if (response.ok && data?.payment_session_id) {
            paymentSessionId = data.payment_session_id;
            cfResponseData = data;
            break;
          } else {
            lastErrorMessage = data?.message || data?.error;
          }
        } catch (e: any) {
          lastErrorMessage = e.message;
        }
      }

      if (paymentSessionId) break;

      // 2. If v3 does not return payment_session_id, try Cashfree v2 Token API
      const v2Endpoints = cfEnv === "production"
        ? ["https://api.cashfree.com/api/v2/cftoken/order", "https://test.cashfree.com/api/v2/cftoken/order"]
        : ["https://test.cashfree.com/api/v2/cftoken/order", "https://api.cashfree.com/api/v2/cftoken/order"];

      const v2Payload = {
        orderId: cfOrderId,
        orderAmount: Math.round(amount * 100) / 100,
        orderCurrency: "INR",
      };

      for (const url of v2Endpoints) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "x-client-id": creds.appId,
              "x-client-secret": creds.secretKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(v2Payload),
          });

          const data = await response.json();
          if (response.ok && data?.status === "OK" && data?.cftoken) {
            cftoken = data.cftoken;
            cfResponseData = data;
            break;
          } else {
            lastErrorMessage = data?.message || data?.error || lastErrorMessage;
          }
        } catch (e: any) {
          lastErrorMessage = e.message;
        }
      }

      if (cftoken) break;
    }

    if (!paymentSessionId && !cftoken) {
      return NextResponse.json(
        {
          success: false,
          error: lastErrorMessage || "Failed to initialize Cashfree payment token.",
          data: cfResponseData,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      cfOrderId,
      paymentSessionId,
      cftoken,
      amount,
      currency: "INR",
      appId: activeAppId,
      env: cfEnv === "production" ? "production" : "sandbox",
      returnUrl,
      data: cfResponseData,
    });
  } catch (err: any) {
    console.error("[Cashfree Create Order Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create Cashfree order" },
      { status: 500 }
    );
  }
}
