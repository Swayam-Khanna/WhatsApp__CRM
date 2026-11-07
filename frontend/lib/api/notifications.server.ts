import { z } from "zod";
import { applyRateLimit } from "./rate-limiter.server";

// Helper to escape basic HTML elements and prevent script injection in logs/notifications
function sanitizeString(val: string): string {
  return val
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Admin Notification Server Action
export async function sendAdminEmailNotification({ data }: any) {
  // Apply sensible rate limits: max 10 notifications per minute per IP/user
  await applyRateLimit(null, 10, 60000);

  const schema = z
    .object({
      subject: z
        .string()
        .min(1, "Subject cannot be empty")
        .max(200, "Subject is too long")
        .transform(sanitizeString),
      body: z
        .string()
        .min(1, "Body cannot be empty")
        .max(5000, "Body is too long")
        .transform(sanitizeString),
    })
    .strict();

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid notification payload");
  }

  // Log on the server terminal (simulating an email delivery payload)
  console.log(`\n📧 ========================================`);
  console.log(`[EMAIL NOTIFICATION SENT TO ADMIN]`);
  console.log(`Subject: ${parsed.data.subject}`);
  console.log(`Body:\n${parsed.data.body}`);
  console.log(`===========================================\n`);

  return { success: true, message: "Email logged successfully to server terminal" };
}
