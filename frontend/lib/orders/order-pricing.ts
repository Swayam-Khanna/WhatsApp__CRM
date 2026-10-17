/**
 * Order Pricing & Server-side Totals Calculation Engine
 * 
 * Ensures all monetary totals are strictly calculated server-side from snapshot or live catalog items.
 * Never trust client totals.
 */

export interface PricingLineItem {
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  qty: number;
  weight?: string | null;
  weight_gm?: number | null;
  image?: string | null;
  hsnCode?: string | null;
  gstApplicable?: boolean;
  gstRate?: number;
  farmer_id?: string | null;
  farmer_slug?: string | null;
  farmer_base_price?: number | null;
}

export interface CalculatedPricingResult {
  items: Array<PricingLineItem & {
    taxableAmount: number;
    gstAmount: number;
    totalAmount: number;
  }>;
  subtotal: number;
  totalGst: number;
  shippingCost: number;
  discountAmount: number;
  gatewayFee: number;
  total: number;
}

export function calculateOrderTotals(params: {
  items: PricingLineItem[];
  shippingCost?: number;
  discountAmount?: number;
  paymentMethod?: "cod" | "whatsapp" | string;
  gatewayFee?: number;
}): CalculatedPricingResult {
  const {
    items,
    shippingCost = 0,
    discountAmount = 0,
    paymentMethod = "cod",
    gatewayFee = paymentMethod === "cod" ? 0 : 0, // No extra fee unless configured
  } = params;

  let calculatedSubtotal = 0;
  let calculatedGst = 0;

  const processedItems = items.map((item) => {
    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const lineBase = unitPrice * qty;

    const gstRate = item.gstApplicable !== false ? Number(item.gstRate ?? 5) : 0;
    // Calculate GST based on tax rate
    const lineGst = Math.round(((lineBase * gstRate) / 100) * 100) / 100;
    const lineTotal = lineBase + lineGst;

    calculatedSubtotal += lineBase;
    calculatedGst += lineGst;

    return {
      ...item,
      qty,
      unitPrice,
      taxableAmount: lineBase,
      gstAmount: lineGst,
      totalAmount: lineTotal,
    };
  });

  const validShipping = Math.max(0, Math.round((Number(shippingCost) || 0) * 100) / 100);
  const rawDiscount = Math.max(0, Math.round((Number(discountAmount) || 0) * 100) / 100);
  // Discount cannot exceed subtotal
  const validDiscount = Math.min(calculatedSubtotal, rawDiscount);
  const validFee = Math.max(0, Math.round((Number(gatewayFee) || 0) * 100) / 100);

  const grandTotal = Math.max(
    0,
    Math.round((calculatedSubtotal + calculatedGst + validShipping + validFee - validDiscount) * 100) / 100
  );

  return {
    items: processedItems,
    subtotal: Math.round(calculatedSubtotal * 100) / 100,
    totalGst: Math.round(calculatedGst * 100) / 100,
    shippingCost: validShipping,
    discountAmount: validDiscount,
    gatewayFee: validFee,
    total: grandTotal,
  };
}
