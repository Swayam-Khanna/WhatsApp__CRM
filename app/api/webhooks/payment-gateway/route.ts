import crypto from "crypto";
import { NextResponse } from "next/server.js";
import { isOnlinePaymentsEnabled } from "../../../../frontend/lib/features.ts";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!isOnlinePaymentsEnabled()) {
      return Response.json(
        {
          received: true,
          ignored: true,
          message: "Online payments disabled. Webhook acknowledged without mutations.",
        },
        { status: 200 }
      );
    }
    const { supabase } = await import("../../../../frontend/integrations/supabase/client.ts");
    const { createSettlementEvent } = await import("../../../../frontend/lib/admin/settlement-service.ts");
    const { broadcastSettlementUpdate } = await import("../../../../frontend/lib/admin/websocket-server.ts");
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || 
                      req.headers.get("x-cashfree-signature") || 
                      req.headers.get("x-webhook-signature");

    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || process.env.CASHFREE_CLIENT_SECRET;

    if (process.env.NODE_ENV === "production" || webhookSecret) {
      if (!signature || !webhookSecret) {
        return NextResponse.json({ error: "Unauthorized. Missing signature or webhook secret configuration." }, { status: 401 });
      }

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      const sigBuffer = Buffer.from(signature, "utf-8");
      const expBuffer = Buffer.from(expectedSignature, "utf-8");

      const isValid = sigBuffer.length === expBuffer.length &&
        crypto.timingSafeEqual(sigBuffer, expBuffer);

      if (!isValid) {
        return NextResponse.json({ error: "Invalid webhook cryptographic signature" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    const { event, payload } = body;
    const payoutData = payload?.payout?.entity || body.data?.payout || body;

    const gatewayTxId = payoutData.id || payoutData.transfer_id || payoutData.gateway_transaction_id;
    const status = payoutData.status || (event?.includes("success") ? "SUCCESS" : "FAILED");
    const utrReference = payoutData.utr || payoutData.reference_id || `UTR_${Date.now()}`;
    const failureCode = payoutData.error_code || payoutData.failure_reason;
    const failureMessage = payoutData.error_description || payoutData.failure_message || "Transfer rejected by beneficiary bank.";

    if (!gatewayTxId) {
      return NextResponse.json({ error: "Missing gateway_transaction_id in webhook payload" }, { status: 400 });
    }

    // Look up payout transaction row
    const { data: tx, error: txErr } = await supabase
      .from("payout_transactions")
      .select("*, settlement:settlements(*)")
      .eq("gateway_transaction_id", gatewayTxId)
      .maybeSingle();

    if (txErr || !tx) {
      console.warn(`[Webhook] Payout transaction ${gatewayTxId} not found in DB`);
      return NextResponse.json({ message: "Transaction record not found, webhook acknowledged" }, { status: 200 });
    }

    const settlementId = tx.settlement_id;

    if (status === "PROCESSED" || status === "SUCCESS" || status === "success" || event?.endsWith(".processed")) {
      // 1. Success case
      await supabase
        .from("payout_transactions")
        .update({
          status: "success",
          utr_reference: utrReference,
          completed_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      await supabase
        .from("settlements")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          utr_reference: utrReference,
        })
        .eq("id", settlementId);

      await createSettlementEvent(
        settlementId,
        "payment_confirmed",
        `Bank payout confirmed success by gateway. UTR Reference: ${utrReference}`
      );
      await createSettlementEvent(settlementId, "marked_paid", `Status automatically updated to PAID via Webhook.`);

      // Broadcast WebSocket update to connected admins
      broadcastSettlementUpdate({
        type: "settlement_updated",
        settlementId,
        farmerId: tx.settlement?.farmer_id,
        status: "paid",
        utr_reference: utrReference,
        updated_at: new Date().toISOString(),
      });
    } else if (status === "FAILED" || status === "REJECTED" || status === "failed" || event?.endsWith(".failed")) {
      // 2. Failure case
      await supabase
        .from("payout_transactions")
        .update({
          status: "failed",
          failure_code: failureCode,
          failure_message: failureMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      await supabase
        .from("settlements")
        .update({
          status: "failed",
          failure_reason: failureMessage,
        })
        .eq("id", settlementId);

      await createSettlementEvent(
        settlementId,
        "payment_failed",
        `Gateway payout failed [Code: ${failureCode || "N/A"}]. Reason: ${failureMessage}`
      );

      // Broadcast WebSocket update
      broadcastSettlementUpdate({
        type: "settlement_updated",
        settlementId,
        farmerId: tx.settlement?.farmer_id,
        status: "failed",
        failure_reason: failureMessage,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (err: any) {
    console.error("[API Gateway Webhook Error]:", err);
    return NextResponse.json({ error: err.message || "Webhook processing failed" }, { status: 500 });
  }
}
