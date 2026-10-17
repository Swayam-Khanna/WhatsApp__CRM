import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/admin/audit-logger";
import { sendSettlementNotification } from "@/lib/admin/settlement-notifier";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || 
                      req.headers.get("x-cashfree-signature") || 
                      req.headers.get("x-razorpay-signature");

    const webhookSecret = process.env.PAYOUT_WEBHOOK_SECRET || process.env.CASHFREE_CLIENT_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

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

    // Verify webhook payload
    const eventType = body.event || body.type || "PAYOUT_SUCCESS";
    const ref = body.transferId || body.referenceId || body.payout_ref || body.data?.transferId;
    const status = body.status || body.data?.status || "SUCCESS";
    const failureReason = body.reason || body.data?.failureReason || "Bank account rejected by clearing house";

    if (!ref) {
      return NextResponse.json({ error: "Missing payout transaction reference" }, { status: 400 });
    }

    // Find settlement matching payout_provider_ref
    const { data: settlement, error: findErr } = await supabase
      .from("settlements")
      .select("*, farmer:farmer_profiles(id, full_name)")
      .eq("payout_provider_ref", ref)
      .maybeSingle();

    if (!settlement) {
      return NextResponse.json({ error: `Settlement for reference ${ref} not found` }, { status: 404 });
    }

    if (status === "SUCCESS" || status === "PAID" || eventType.includes("SUCCESS")) {
      await supabase
        .from("settlements")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", settlement.id);

      logAuditEvent({
        type: "general_audit",
        title: "Payout Confirmed via Webhook",
        message: `Webhook confirmed payout #${settlement.id.substring(0, 8)} paid (Ref: ${ref}).`,
        actor: "Payout Provider Webhook",
      });

      sendSettlementNotification({
        farmerId: settlement.farmer_id,
        amount: Number(settlement.net_amount),
        status: "paid",
        period: `${settlement.period_start} to ${settlement.period_end}`,
      });

      return NextResponse.json({ success: true, status: "paid" });
    } else {
      // Payout Failed
      await supabase
        .from("settlements")
        .update({
          status: "failed",
          failure_reason: failureReason,
        })
        .eq("id", settlement.id);

      logAuditEvent({
        type: "general_audit",
        title: "Payout Failed via Webhook",
        message: `Webhook reported failed payout #${settlement.id.substring(0, 8)}. Reason: ${failureReason}`,
        actor: "Payout Provider Webhook",
      });

      sendSettlementNotification({
        farmerId: settlement.farmer_id,
        amount: Number(settlement.net_amount),
        status: "failed",
        failureReason,
      });

      return NextResponse.json({ success: true, status: "failed", reason: failureReason });
    }
  } catch (error: any) {
    console.error("[Webhook Payout Handler Error]:", error);
    return NextResponse.json({ error: error.message || "Webhook processing failed" }, { status: 500 });
  }
}
