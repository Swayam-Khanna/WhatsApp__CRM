"use server";

import { z } from "zod";
import crypto from "crypto";
import Razorpay from "razorpay";
import { applyRateLimit } from "./rate-limiter.server";
import { calculateBackendOrder } from "./tax-calculator";
import { isGatewayEnabled, getGatewayConfig } from "@/config/payment-gateways";

// Server Action to generate a secure Razorpay Order ID
export async function createRazorpayOrder({ data }: any) {
  // 0. Enforce Central Gateway Status Check
  if (!isGatewayEnabled("razorpay")) {
    const config = getGatewayConfig("razorpay");
    throw new Error(
      config?.disabledReason ||
        "This payment method is temporarily unavailable. Please choose another option."
    );
  }

  // Apply sensible rate limits: max 15 checkout attempts per minute per IP
  await applyRateLimit(null, 15, 60000);

  const schema = z
    .object({
      items: z.array(z.any()),
      shippingService: z.string().optional(),
      paymentMethod: z.string().optional(),
      destinationPincode: z.string().optional(),
    });

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid checkout parameters");
  }

  const { items, shippingService, paymentMethod, destinationPincode } = parsed.data;

  // Securely calculate grand total on backend from DB values
  const calculation = await calculateBackendOrder(
    items as any[],
    (shippingService as any) || "india_post",
    paymentMethod || "razorpay",
    destinationPincode || ""
  );
  const secureAmount = calculation.grandTotal;

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
    console.error("[Razorpay Server] Missing credentials in environment variables.");
    throw new Error(
      "Razorpay API Keys are not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment.",
    );
  }

  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Amount in paise (INR * 100)
    const options = {
      amount: Math.round(secureAmount * 100),
      currency: "INR",
      receipt: `rcpt_${crypto.randomBytes(6).toString("hex")}`, // Secure random generation
    };

    const order = await razorpay.orders.create(options);

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId, // Return keyId so frontend knows which key to initialize Checkout with
    };
  } catch (err: any) {
    console.error("[Razorpay Server] Error creating order:", err);
    throw new Error(err.message || "Failed to create Razorpay payment order.");
  }
}

// Server Action to verify the payment signature using HMAC SHA256
export async function verifyRazorpayPayment({ data }: any) {
  // Apply sensible rate limits: max 30 verification checks per minute per IP
  await applyRateLimit(null, 30, 60000);

  const schema = z
    .object({
      razorpay_order_id: z.string().min(1).max(100),
      razorpay_payment_id: z.string().min(1).max(100),
      razorpay_signature: z.string().min(1).max(256),
    })
    .strict();

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid verification signature");
  }

  const keySecret =
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.VITE_RAZORPAY_KEY_SECRET ||
    "";

  if (!keySecret) {
    console.error("[Razorpay Server] Missing RAZORPAY_KEY_SECRET for signature verification.");
    throw new Error("Razorpay secret key is not configured on the server.");
  }

  try {
    const payload = `${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");

    // Constant-time comparison to prevent timing attacks
    const success = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(parsed.data.razorpay_signature, "utf-8"),
    );

    if (!success) {
      console.warn("[Razorpay Server] Signature verification failed.");
    }

    return { success };
  } catch (err: any) {
    console.error("[Razorpay Server] Error verifying signature:", err);
    return { success: false, error: err.message };
  }
}
