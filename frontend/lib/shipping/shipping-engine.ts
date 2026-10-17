import {
  INDIA_POST_SLABS,
  SPEED_POST_SLABS,
  DEFAULT_CONFIG,
} from "./seed-data";
import { parseWeightToGrams } from "@/lib/weight-utils";

export type ShippingZone = "local" | "within_state" | "zone_metro" | "other_states";
export type ShippingService = "india_post" | "speed_post";

export interface CalculateShippingParams {
  cartItems: Array<{
    name: string;
    price: number;
    qty: number;
    weight?: string | number;
    weight_gm?: number;
  }>;
  service: ShippingService;
  destinationPincode: string;
}

export interface ShippingCalculationResult {
  totalWeightGm: number;
  roundedSlabGm: number;
  zone: ShippingZone;
  service: ShippingService;
  shippingCost: number;
  originPincode: string;
  shippingPostageCost: number;
  shippingPackagingCost: number;
  shippingTotal: number;
}

/**
 * Classifies destination pincode into a shipping zone relative to origin pincode
 */
export async function resolveShippingZone(
  originPincode: string,
  destinationPincode: string
): Promise<ShippingZone> {
  const destClean = (destinationPincode || "").trim();
  const originClean = (originPincode || "").trim();

  if (!/^\d{6}$/.test(destClean)) {
    throw new Error("Invalid destination pincode format. Must be a 6-digit integer.");
  }

  // 1. Check local city match
  if (destClean.slice(0, 3) === originClean.slice(0, 3)) {
    return "local";
  }

  // 2. Heuristic based on pincode zone digit
  const firstDigitOrigin = originClean[0];
  const firstDigitDest = destClean[0];
  const prefix3Dest = destClean.slice(0, 3);

  // Common metros
  const metroPrefixes = ["110", "400", "560", "600", "700", "500", "120", "121", "122", "201"];
  if (metroPrefixes.includes(prefix3Dest)) {
    return "zone_metro";
  }

  // Same postal region / state zone
  if (firstDigitDest === firstDigitOrigin) {
    return "within_state";
  }

  return "other_states";
}

/**
 * Calculates total shipping rate based on cart items, service, and destination pincode.
 */
export async function calculateShippingRate({
  cartItems,
  service,
  destinationPincode,
}: CalculateShippingParams): Promise<ShippingCalculationResult> {
  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cart is empty. Cannot calculate shipping rate.");
  }

  if (service !== "india_post" && service !== "speed_post") {
    throw new Error("Invalid shipping service selected.");
  }

  // 1. Calculate total weight in grams
  let totalWeightGm = 0;
  for (const item of cartItems) {
    const itemWeightGm = item.weight_gm ?? parseWeightToGrams(item.weight);
    if (isNaN(itemWeightGm) || itemWeightGm <= 0) {
      throw new Error(`Invalid item weight for "${item.name}". Weight must be a positive integer.`);
    }
    totalWeightGm += itemWeightGm * item.qty;
  }

  if (totalWeightGm > 35000) {
    throw new Error(
      `Total shipment weight (${(totalWeightGm / 1000).toFixed(1)} kg) exceeds the maximum allowed tariff limit of 35 kg (35,000g). Please split your order.`
    );
  }

  // 2. Origin pincode and flat surcharge
  const originPincode = DEFAULT_CONFIG.origin_pincode;
  const flatSurcharge = 0;

  // 3. Resolve Zone
  const zone = await resolveShippingZone(originPincode, destinationPincode);

  // 4. Carrier slabs
  const slabs = service === "india_post" ? INDIA_POST_SLABS : SPEED_POST_SLABS;

  // Sort slabs by weight ascending
  const sortedSlabs = [...slabs].sort((a, b) => a.weight_upto_gm - b.weight_upto_gm);

  // Find smallest slab where slab.weight_upto_gm >= totalWeightGm
  const matchedSlab = sortedSlabs.find((s) => s.weight_upto_gm >= totalWeightGm);

  if (!matchedSlab) {
    throw new Error(`Weight slab for ${totalWeightGm}g not found in tariff table.`);
  }

  const postageRate = matchedSlab[zone];
  if (typeof postageRate !== "number") {
    throw new Error(`Tariff rate missing for zone "${zone}" in matched slab.`);
  }

  // Look up packaging cost directly from the same matched carrier slab
  const packagingCost = (matchedSlab as any).packaging_cost ?? 0;

  // Add flat surcharge on top of the calculated shipping postage and packaging values
  const shippingTotal = postageRate + packagingCost + flatSurcharge;

  return {
    totalWeightGm,
    roundedSlabGm: matchedSlab.weight_upto_gm,
    zone,
    service,
    shippingCost: shippingTotal,
    shippingPostageCost: postageRate,
    shippingPackagingCost: packagingCost,
    shippingTotal: shippingTotal,
    originPincode,
  };
}
