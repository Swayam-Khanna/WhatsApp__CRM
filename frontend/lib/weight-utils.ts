/**
 * Display stock as "9 kg 500 g", "10 kg", "500 g", or "0 kg".
 * Omit zero parts, and formatStock(0) returns "0 kg".
 * One single helper used everywhere: inventory table, product cards, modal, cart, orders, history.
 */
export function formatStock(grams: number | string | null | undefined): string {
  const gTotal = Math.max(0, Math.round(Number(grams) || 0));
  if (gTotal === 0) return "0 kg";
  const kg = Math.floor(gTotal / 1000);
  const remG = gTotal % 1000;
  if (kg > 0 && remG > 0) {
    return `${kg} kg ${remG} g`;
  }
  if (kg > 0) {
    return `${kg} kg`;
  }
  return `${remG} g`;
}

/**
 * Calculate total price for a given weight in grams at a price per kg.
 * Line total = pricePerKg * grams / 1000.
 */
export function calculateLineTotal(pricePerKg: number, grams: number): number {
  if (!pricePerKg || !grams || grams <= 0) return 0;
  return Math.round(((pricePerKg * grams) / 1000) * 100) / 100;
}

/**
 * Convert kg and grams inputs to integer total grams.
 */
export function toGrams(kg: number | string | null | undefined, g: number | string | null | undefined): number {
  const kgNum = Math.max(0, parseInt(String(kg || 0), 10) || 0);
  const gNum = Math.max(0, Math.min(999, parseInt(String(g || 0), 10) || 0));
  return kgNum * 1000 + gNum;
}

/**
 * Split integer grams into separate kg and remainder g.
 */
export function fromGrams(grams: number | string | null | undefined): { kg: number; g: number } {
  const total = Math.max(0, Math.round(Number(grams) || 0));
  return {
    kg: Math.floor(total / 1000),
    g: total % 1000,
  };
}

/**
 * Format weight in grams into human friendly display string.
 * Under 1000g: "400 g"
 * At or above 1000g: "2.6 kg" (up to 2 decimals)
 */
export function formatWeight(grams: number): string {
  if (!grams || isNaN(grams) || grams <= 0) return "0 g";
  if (grams < 1000) {
    return `${Math.round(grams)} g`;
  }
  const kg = grams / 1000;
  const formattedKg = Number(kg.toFixed(2));
  return `${formattedKg} kg`;
}

/**
 * Parse arbitrary weight representation or string (e.g. "500g", "1.5 kg", "500 ml") into integer grams.
 */
export function parseWeightToGrams(weight: string | number | undefined | null): number {
  if (typeof weight === "number") {
    return Math.max(1, Math.round(weight));
  }
  if (!weight) return 500; // default safe 500g fallback

  const str = String(weight).trim().toLowerCase();

  // 1. Check for explicit weight suffixes
  const kgMatch = str.match(/([\d.]+)\s*kg/);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1]);
    if (!isNaN(val) && val > 0) return Math.round(val * 1000);
  }

  const gMatch = str.match(/([\d.]+)\s*(?:g\b|gm\b|grams\b)/);
  if (gMatch) {
    const val = parseFloat(gMatch[1]);
    if (!isNaN(val) && val > 0) return Math.round(val);
  }

  const lMatch = str.match(/([\d.]+)\s*(?:l\b|litre|liter)/);
  if (lMatch && !str.includes("ml")) {
    const val = parseFloat(lMatch[1]);
    if (!isNaN(val) && val > 0) return Math.round(val * 1000);
  }

  const mlMatch = str.match(/([\d.]+)\s*ml/);
  if (mlMatch) {
    const val = parseFloat(mlMatch[1]);
    if (!isNaN(val) && val > 0) return Math.round(val);
  }

  // 2. Generic numeric fallback
  const numMatch = str.match(/([\d.]+)/);
  if (!numMatch) return 500;

  const val = parseFloat(numMatch[1]);
  if (isNaN(val) || val <= 0) return 500;

  if (str.includes("kg")) {
    return Math.round(val * 1000);
  }
  return Math.round(val);
}

