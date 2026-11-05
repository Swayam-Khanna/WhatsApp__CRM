import { supabase } from "@/integrations/supabase/client";

export interface AuditEventParams {
  type:
    | "order_status_change"
    | "order_cancelled"
    | "farmer_approved"
    | "farmer_rejected"
    | "product_edit"
    | "order_refund"
    | "coupon_edit"
    | "admin_login"
    | "general_audit";
  title: string;
  message: string;
  actor?: string;
  metadata?: Record<string, any>;
}

export async function logAuditEvent({ type, title, message, actor = "Admin", metadata }: AuditEventParams) {
  try {
    if (!supabase) return;
    await supabase.from("system_notifications").insert({
      type,
      title,
      message,
      read: false,
      metadata: {
        actor,
        ...metadata,
      },
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[Audit Logger] Event log error:", err);
  }
}
