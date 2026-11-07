import { supabase } from "@/integrations/supabase/client";

export interface SettlementNotificationParams {
  farmerId: string;
  amount: number;
  status: "paid" | "failed" | "blocked";
  period?: string;
  failureReason?: string;
}

export async function sendSettlementNotification({
  farmerId,
  amount,
  status,
  period,
  failureReason,
}: SettlementNotificationParams) {
  try {
    const { data: farmer } = await supabase
      .from("farmer_profiles")
      .select("full_name, phone, user_id")
      .eq("id", farmerId)
      .single();

    const farmerName = farmer?.full_name || "Farmer Partner";

    let title = "";
    let message = "";

    if (status === "paid") {
      title = "Payout Settled Successfully";
      message = `Dear ${farmerName}, your payout of ₹${amount.toLocaleString("en-IN")} for period ${period || "current cycle"} has been credited to your bank account.`;
    } else if (status === "failed") {
      title = "Payout Execution Failed";
      message = `Payout of ₹${amount.toLocaleString("en-IN")} failed. Reason: ${failureReason || "Transaction rejected by bank"}. Admin review initiated.`;
    } else if (status === "blocked") {
      title = "Payout Blocked — Bank Verification Needed";
      message = `Dear ${farmerName}, your pending settlement of ₹${amount.toLocaleString("en-IN")} requires bank account verification before funds can be transferred.`;
    }

    // Insert system notification for farmer / admin dashboard widget
    await supabase.from("system_notifications").insert({
      type: "general_audit",
      title,
      message,
      read: false,
      metadata: {
        farmer_id: farmerId,
        amount,
        status,
        failure_reason: failureReason,
      },
      created_at: new Date().toISOString(),
    });

    console.log(`[Settlement Notifier] Dispatched ${status} notification to ${farmerName} (${farmer?.phone || "SMS/WhatsApp"})`);
  } catch (err) {
    console.warn("[Settlement Notifier] Error dispatching notification:", err);
  }
}
