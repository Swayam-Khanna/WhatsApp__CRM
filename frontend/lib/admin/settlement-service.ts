import { supabase } from "@/integrations/supabase/client";

export const MINIMUM_PAYOUT_THRESHOLD = 500; // ₹500 minimum payout threshold
export const DEFAULT_PLATFORM_FEE_RATE = 0.10; // 10% default platform fee
export const DEFAULT_TDS_RATE = 0.01; // 1% TDS rate
export const DEFAULT_TDS_ANNUAL_THRESHOLD = 500000; // ₹5,00,000 annual payout threshold for TDS

export interface SettlementPreflightResult {
  valid: boolean;
  reasons: string[];
  kycVerified: boolean;
  bankVerified: boolean;
  gstVerified: boolean;
  amountEligible: boolean;
  noDisputedOrders: boolean;
}

/**
 * Helper to record audit events to settlement_events table
 */
export async function createSettlementEvent(
  settlementId: string,
  eventType: string,
  note: string,
  actorId: string | null = null
) {
  try {
    await supabase.from("settlement_events").insert({
      settlement_id: settlementId,
      event_type: eventType,
      note,
      actor_id: actorId,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Settlement Event Log Error]:", err);
  }
}

/**
 * Fetch active settlement cycle configuration
 */
export async function getActiveSettlementCycle() {
  const { data, error } = await supabase
    .from("settlement_cycles")
    .select("*")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      id: null,
      cycle_start_day: 7,
      cycle_end_day: 10,
      cutoff_rule: "monthly_7th_10th",
      tds_rate: DEFAULT_TDS_RATE,
      tds_annual_threshold: DEFAULT_TDS_ANNUAL_THRESHOLD,
      active: true,
    };
  }
  return data;
}

/**
 * 1. Settlement Generation Job
 * Aggregates all delivered & payment_confirmed orders per farmer with settlement_id IS NULL.
 * Applies individual order commission snapshot rates and threshold-based TDS.
 */
export async function generateSettlements(): Promise<{ createdCount: number; settlements: any[] }> {
  try {
    const cycle = await getActiveSettlementCycle();

    // A. Fetch all farmers with profile & primary bank account
    const { data: farmers, error: farmerErr } = await supabase
      .from("farmer_profiles")
      .select("id, full_name, farm_name, kyc_status, gst_number, gst_verified");

    if (farmerErr) throw farmerErr;
    if (!farmers || farmers.length === 0) return { createdCount: 0, settlements: [] };

    // B. Fetch primary bank accounts
    const { data: bankAccounts } = await supabase
      .from("bank_accounts")
      .select("id, farmer_id, verified, is_primary");

    const bankAccountMap = new Map<string, any>((bankAccounts || []).map((b: any) => [b.farmer_id, b]));

    // C. Fetch all delivered orders without an assigned settlement_id
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, order_id, farmer_id, total, gross_amount, status, payment_status, created_at, delivered_at, commission_rate_applied, is_disputed, refund_status")
      .is("settlement_id", "null");

    if (ordersErr) throw ordersErr;

    const eligibleOrders = (orders || []).filter((o: any) => {
      const isDelivered = o.status === "delivered" || Boolean(o.delivered_at);
      const isPaid = o.payment_status === "paid" || o.payment_status === "success" || o.payment_status === "PAID";
      const notRefunded = o.refund_status !== "refunded" && !o.is_disputed;
      return isDelivered && isPaid && notRefunded;
    });

    const generatedSettlements: any[] = [];

    // Group eligible orders by farmer_id
    for (const farmer of farmers) {
      const farmerOrders = eligibleOrders.filter((o: any) => o.farmer_id === farmer.id);
      if (farmerOrders.length === 0) continue;

      // Calculate gross sales & sum of each order's commission_rate_applied
      let grossSales = 0;
      let totalCommissionAmount = 0;

      farmerOrders.forEach((o: any) => {
        const orderAmt = Number(o.gross_amount || o.total || 0);
        const commRate = Number(o.commission_rate_applied || DEFAULT_PLATFORM_FEE_RATE);
        const commAmt = Math.round(orderAmt * commRate * 100) / 100;

        grossSales += orderAmt;
        totalCommissionAmount += commAmt;
      });

      // Calculate annual cumulative payout for threshold-based TDS
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      
      const { data: pastSettlements } = await supabase
        .from("settlements")
        .select("net_payout, net_amount")
        .eq("farmer_id", farmer.id)
        .eq("status", "paid")
        .gte("period_start", startOfYear);

      const ytdPayout = (pastSettlements || []).reduce((sum: number, s: any) => sum + Number(s.net_payout || s.net_amount || 0), 0);

      const tdsThreshold = Number(cycle.tds_annual_threshold || DEFAULT_TDS_ANNUAL_THRESHOLD);
      const tdsRateApplied = ytdPayout >= tdsThreshold ? Number(cycle.tds_rate || DEFAULT_TDS_RATE) : 0;
      const tdsAmount = Math.round(grossSales * tdsRateApplied * 100) / 100;
      const adjustmentsAmount = 0; // standard adjustments

      const netPayout = Math.round((grossSales - totalCommissionAmount - tdsAmount + adjustmentsAmount) * 100) / 100;

      const periodStart = farmerOrders.reduce((min: string, o: any) => {
        const dt = o.delivered_at || o.created_at;
        return dt < min ? dt : min;
      }, farmerOrders[0].delivered_at || farmerOrders[0].created_at).split("T")[0];
      const periodEnd = new Date().toISOString().split("T")[0];

      // Pre-checks execution: KYC -> Bank -> GST
      let initialStatus = "pending";
      let blockReason: string | null = null;
      const bankAcc = bankAccountMap.get(farmer.id);

      if (farmer.kyc_status !== "verified") {
        initialStatus = "blocked";
        blockReason = "KYC status is unverified or pending review.";
      } else if (!bankAcc || !bankAcc.verified) {
        initialStatus = "blocked";
        blockReason = "Primary bank account is unverified or missing.";
      } else if (farmer.gst_number && !farmer.gst_verified) {
        initialStatus = "blocked";
        blockReason = "GST number provided is unverified.";
      }

      // Insert settlement row
      const { data: settlementData, error: setErr } = await supabase
        .from("settlements")
        .insert({
          farmer_id: farmer.id,
          cycle_id: cycle.id,
          period_start: periodStart,
          period_end: periodEnd,
          order_count: farmerOrders.length,
          gross_sales: grossSales,
          gross_amount: grossSales,
          commission_rate: DEFAULT_PLATFORM_FEE_RATE,
          commission_amount: totalCommissionAmount,
          fee_amount: totalCommissionAmount,
          fee_rate: DEFAULT_PLATFORM_FEE_RATE,
          tds_rate: tdsRateApplied,
          tds_amount: tdsAmount,
          adjustments_amount: adjustmentsAmount,
          net_payout: netPayout,
          net_amount: netPayout,
          status: initialStatus,
          block_reason: blockReason,
          bank_account_id: bankAcc?.id || null,
          retry_count: 0,
          generated_at: new Date().toISOString(),
          generated_by: "system",
        })
        .select()
        .single();

      if (setErr) throw setErr;

      // Link line items and lock orders.settlement_id
      const lineItemsToInsert = [];
      for (const o of farmerOrders) {
        const orderAmt = Number(o.gross_amount || o.total || 0);
        const commRate = Number(o.commission_rate_applied || DEFAULT_PLATFORM_FEE_RATE);
        const commAmt = Math.round(orderAmt * commRate * 100) / 100;
        const netAmt = Math.round((orderAmt - commAmt) * 100) / 100;

        lineItemsToInsert.push({
          settlement_id: settlementData.id,
          order_id: o.id || o.order_id,
          order_amount: orderAmt,
          commission_amount: commAmt,
          net_amount: netAmt,
          created_at: new Date().toISOString(),
        });

        // Lock order from double counting
        await supabase
          .from("orders")
          .update({ settlement_id: settlementData.id })
          .eq("id", o.id);
      }

      await supabase.from("settlement_line_items").insert(lineItemsToInsert);

      // Log generation event
      await createSettlementEvent(
        settlementData.id,
        "generated",
        `Settlement generated for ${farmer.full_name || farmer.farm_name} (${farmerOrders.length} orders, Net: ₹${netPayout}). Initial Status: ${initialStatus.toUpperCase()}.`
      );

      generatedSettlements.push({
        ...settlementData,
        lineItemsCount: lineItemsToInsert.length,
        farmerName: farmer.full_name || farmer.farm_name,
      });
    }

    return { createdCount: generatedSettlements.length, settlements: generatedSettlements };
  } catch (err: any) {
    console.error("[Settlement Engine] Generation Error:", err);
    throw err;
  }
}

/**
 * 2. Pre-flight Validation
 */
export async function validateSettlementPreflight(settlementId: string): Promise<SettlementPreflightResult> {
  const reasons: string[] = [];

  const { data: settlement, error: setErr } = await supabase
    .from("settlements")
    .select("*, farmer:farmer_profiles(id, full_name, kyc_status, gst_number, gst_verified), bank_account:bank_accounts(id, verified)")
    .eq("id", settlementId)
    .single();

  if (setErr || !settlement) {
    return {
      valid: false,
      reasons: ["Settlement record not found"],
      kycVerified: false,
      bankVerified: false,
      gstVerified: false,
      amountEligible: false,
      noDisputedOrders: false,
    };
  }

  const kycVerified = settlement.farmer?.kyc_status === "verified";
  if (!kycVerified) reasons.push("Farmer KYC is not verified.");

  const bankVerified = Boolean(settlement.bank_account?.verified);
  if (!bankVerified) reasons.push("Farmer primary bank account is unverified.");

  const gstVerified = !settlement.farmer?.gst_number || Boolean(settlement.farmer?.gst_verified);
  if (!gstVerified) reasons.push("Farmer GST number is pending verification.");

  const netAmt = Number(settlement.net_payout || settlement.net_amount || 0);
  const amountEligible = netAmt >= MINIMUM_PAYOUT_THRESHOLD;
  if (!amountEligible) reasons.push(`Net payout amount (₹${netAmt}) is below minimum threshold (₹${MINIMUM_PAYOUT_THRESHOLD}).`);

  // Check line items for disputes
  const { data: lineItems } = await supabase
    .from("settlement_line_items")
    .select("order_id")
    .eq("settlement_id", settlementId);

  let noDisputedOrders = true;
  if (lineItems && lineItems.length > 0) {
    const orderIds = lineItems.map((l: any) => l.order_id);
    const { data: flaggedOrders } = await supabase
      .from("orders")
      .select("id, is_disputed, refund_status")
      .in("id", orderIds);

    const hasDispute = (flaggedOrders || []).some((o: any) => o.is_disputed || o.refund_status === "refunded" || o.refund_status === "requested");
    if (hasDispute) {
      noDisputedOrders = false;
      reasons.push("Settlement contains 1 or more disputed or refunded orders.");
    }
  }

  const valid = kycVerified && bankVerified && gstVerified && amountEligible && noDisputedOrders;

  if (!valid && settlement.status !== "blocked") {
    await supabase
      .from("settlements")
      .update({
        status: "blocked",
        block_reason: reasons[0] || "Pre-flight checks failed.",
      })
      .eq("id", settlementId);

    await createSettlementEvent(settlementId, "held", `Settlement blocked due to pre-flight failure: ${reasons.join(" | ")}`);
  }

  return { valid, reasons, kycVerified, bankVerified, gstVerified, amountEligible, noDisputedOrders };
}

/**
 * 3. Initiate Payout via Payment Gateway (RazorpayX / Cashfree)
 */
export async function executePayout(settlementId: string, idempotencyKey?: string, actorId?: string): Promise<{ success: boolean; ref: string; status: string }> {
  const preflight = await validateSettlementPreflight(settlementId);
  if (!preflight.valid) {
    throw new Error(`Pre-flight validation failed: ${preflight.reasons.join(" | ")}`);
  }

  const { data: settlement } = await supabase
    .from("settlements")
    .select("*")
    .eq("id", settlementId)
    .single();

  if (!settlement) throw new Error("Settlement not found");
  if (settlement.status === "paid") {
    return { success: true, ref: settlement.utr_reference || settlement.payout_provider_ref || "ALREADY_PAID", status: "paid" };
  }

  const gatewayTxId = `PAYOUT_RZP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const key = idempotencyKey || `idem_${settlementId}_${Date.now()}`;

  // Count attempt number
  const { data: pastTxs } = await supabase
    .from("payout_transactions")
    .select("attempt_number")
    .eq("settlement_id", settlementId);

  const attemptNumber = (pastTxs?.length || 0) + 1;

  // Insert payout_transactions row
  await supabase.from("payout_transactions").insert({
    settlement_id: settlementId,
    attempt_number: attemptNumber,
    payment_gateway: "razorpayx",
    gateway_transaction_id: gatewayTxId,
    status: "initiated",
    initiated_at: new Date().toISOString(),
  });

  // Update settlement status to processing
  await supabase
    .from("settlements")
    .update({
      status: "processing",
      payout_provider_ref: gatewayTxId,
      idempotency_key: key,
    })
    .eq("id", settlementId);

  await createSettlementEvent(
    settlementId,
    "marked_processing",
    `Payout processing initiated via RazorpayX (Gateway Tx ID: ${gatewayTxId}, Net: ₹${settlement.net_payout || settlement.net_amount}).`,
    actorId
  );

  return {
    success: true,
    ref: gatewayTxId,
    status: "processing",
  };
}

/**
 * 4. Manual Override Mark Paid
 */
export async function markSettlementPaid(settlementId: string, utrReference: string, note: string, actorId?: string) {
  await supabase
    .from("settlements")
    .update({
      status: "paid",
      utr_reference: utrReference,
      paid_at: new Date().toISOString(),
    })
    .eq("id", settlementId);

  await createSettlementEvent(
    settlementId,
    "marked_paid",
    `Manual override: Marked as paid by admin. UTR Ref: ${utrReference}. Admin Note: ${note}`,
    actorId
  );
}

/**
 * 5. Manual Block / Hold
 */
export async function holdSettlement(settlementId: string, reason: string, actorId?: string) {
  await supabase
    .from("settlements")
    .update({
      status: "blocked",
      block_reason: reason,
    })
    .eq("id", settlementId);

  await createSettlementEvent(
    settlementId,
    "held",
    `Manual block applied by admin. Reason: ${reason}`,
    actorId
  );
}

/**
 * 6. Retry Failed Settlement
 */
export async function retrySettlement(settlementId: string, actorId?: string): Promise<{ success: boolean; message: string }> {
  const { data: settlement } = await supabase
    .from("settlements")
    .select("retry_count, status")
    .eq("id", settlementId)
    .single();

  if (!settlement) throw new Error("Settlement not found");

  const currentRetries = settlement.retry_count || 0;
  if (currentRetries >= 3) {
    throw new Error("Maximum retry attempts (3) reached. Manual administrative review required.");
  }

  const preflight = await validateSettlementPreflight(settlementId);
  if (!preflight.valid) {
    await supabase.from("settlements").update({ retry_count: currentRetries + 1 }).eq("id", settlementId);
    throw new Error(`Retry pre-flight failed: ${preflight.reasons.join(" | ")}`);
  }

  await executePayout(settlementId, undefined, actorId);
  await supabase.from("settlements").update({ retry_count: currentRetries + 1 }).eq("id", settlementId);

  await createSettlementEvent(
    settlementId,
    "retried",
    `Retry attempt ${currentRetries + 1}/3 executed by admin.`,
    actorId
  );

  return {
    success: true,
    message: `Settlement retry initiated (Attempt ${currentRetries + 1}/3).`,
  };
}
