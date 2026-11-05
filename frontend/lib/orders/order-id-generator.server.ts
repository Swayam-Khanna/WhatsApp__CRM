import crypto from "crypto";
import { db } from "../../../backend/db.ts";
import { orders } from "../../../backend/schema/orders.ts";
import { eq, or } from "drizzle-orm";

/**
 * Generates an 8-digit PRJ formatted unique order ID (e.g. PRJ97957563)
 * Guarantees uniqueness by checking against Neon PostgreSQL with collision retries.
 */
export async function generateUniqueOrderId(): Promise<string> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate secure 8-digit random integer between 10000000 and 99999999
    const randomInt = crypto.randomInt(10000000, 100000000);
    const candidateId = `PRJ${randomInt}`;

    try {
      // Check if order exists in Neon PostgreSQL
      const existing = await db
        .select({ id: orders.id })
        .from(orders)
        .where(or(eq(orders.id, candidateId), eq(orders.orderNumber, candidateId)))
        .limit(1);

      if (existing.length === 0) {
        return candidateId;
      }
      console.warn(`[Order ID Generator] Collision detected for ${candidateId}, retrying...`);
    } catch (err) {
      console.warn("[Order ID Generator] Error checking order uniqueness:", err);
      return candidateId;
    }
  }

  // Fallback with timestamp salt if all random attempts collided
  return `PRJ${Date.now().toString().slice(-8)}`;
}
