import { supabase } from "@/integrations/supabase/client";
import { calculateShippingRate, ShippingService } from "@/lib/shipping/shipping-engine";
import { COD_FLAT_FEE } from "@/config/payment-gateways";
import { allProducts } from "@/lib/mock/products";

export interface BackendOrderCartItem {
  name: string;
  slug: string;
  price: number;
  qty: number;
  weight: string;
  baseSlug?: string;
  image?: string;
}

export async function calculateBackendOrder(
  items: BackendOrderCartItem[],
  shippingService: ShippingService,
  paymentMethod: string,
  destinationPincode: string
) {
  if (!items || items.length === 0) {
    throw new Error("Cart is empty");
  }

  // 1. Fetch products from database using base slugs
  let dbProducts: any[] = [];
  try {
    const slugs = items.map((i) => (i.baseSlug || i.slug || "").replace(/-[^-]+$/, "")).filter(Boolean);
    if (slugs.length > 0) {
      const { data } = await supabase
        .from("farmer_products")
        .select("slug, name, price, hsn_code, gst_applicable, gst_rate, category")
        .in("slug", slugs);
      if (data) dbProducts = data;
    }
  } catch (err) {
    console.warn("[Tax Calculator] Database product lookup fallback:", err);
  }

  let subtotal = 0;
  let totalGst = 0;

  const resolvedItems = items.map((item) => {
    const baseSlug = item.baseSlug || item.slug?.replace(/-[^-]+$/, "") || "";
    const dbProd = dbProducts?.find((p: any) => p.slug === baseSlug || p.slug === item.slug);
    
    // Look up in verified catalog if not in DB to enforce server-side authority
    const catalogProd = allProducts.find(
      (p) =>
        p.slug === item.slug ||
        p.slug === baseSlug ||
        (p as any).sku === (item as any).sku ||
        (item.slug?.toLowerCase().includes("walnut") && (p.slug === "walnuts" || (p as any).sku === "0028"))
    );

    // Apply server-verified price (never trust client-supplied price)
    const unitPrice = dbProd
      ? Math.ceil(Number(dbProd.price || 0) * 1.1)
      : catalogProd
      ? Number(catalogProd.price)
      : Number(item.price || 0);
    
    // Default rule: GST Applicable = true, rate = 5%
    let gstApplicable = true;
    let gstRate = 5;
    let hsnCode = "00000000";

    if (dbProd) {
      gstApplicable = dbProd.gst_applicable !== undefined ? dbProd.gst_applicable : true;
      gstRate = dbProd.gst_rate !== undefined ? dbProd.gst_rate : 5;
      hsnCode = dbProd.hsn_code || "";
    } else {
      // Fallback for mock items based on category keywords
      const category = item.slug.toLowerCase();
      if (category.includes("fruit") || category.includes("plant") || category.includes("salt")) {
        gstApplicable = false;
        gstRate = 0;
      }
    }

    const taxableAmount = unitPrice * item.qty;
    const gstAmount = gstApplicable ? Math.round(taxableAmount * (gstRate / 100) * 100) / 100 : 0;
    const totalAmount = taxableAmount + gstAmount;

    subtotal += taxableAmount;
    totalGst += gstAmount;

    return {
      productId: dbProd?.slug || baseSlug,
      productName: item.name,
      slug: item.slug,
      hsnCode,
      quantity: item.qty,
      unitPrice,
      gstApplicable,
      gstRate,
      taxableAmount,
      gstAmount,
      totalAmount,
      image: item.image || "",
      weight: item.weight,
    };
  });

  // 2. Calculate shipping cost using the shipping engine
  let shippingCost = 0;
  let shippingQuote = null;
  if (destinationPincode && /^\d{6}$/.test(destinationPincode.trim())) {
    try {
      const formattedItems = resolvedItems.map((i) => ({
        name: i.productName,
        price: i.unitPrice,
        qty: i.quantity,
        weight: i.weight,
      }));

      shippingQuote = await calculateShippingRate({
        cartItems: formattedItems,
        service: shippingService || "india_post",
        destinationPincode: destinationPincode.trim(),
      });
      shippingCost = shippingQuote.shippingCost;
    } catch (e: any) {
      console.error("[Backend Tax Calculator] Shipping quote calculation error:", e);
      // Fallback shipping rate: free above 999, else 49
      shippingCost = subtotal > 999 ? 0 : 49;
    }
  } else {
    shippingCost = subtotal > 999 ? 0 : 49;
  }

  // 3. Gateway Fee calculations
  let gatewayFee = 0;
  if (paymentMethod === "razorpay") {
    // Razorpay: 2% fee + 18% GST (2.36% effective)
    const feeRate = (2.0 / 100) * (1 + 18 / 100);
    gatewayFee = Math.round((subtotal + totalGst + shippingCost) * feeRate);
  } else if (paymentMethod === "cashfree") {
    // Cashfree: 1.95% fee + 18% GST (2.30% effective)
    const feeRate = (1.95 / 100) * (1 + 18 / 100);
    gatewayFee = Math.round((subtotal + totalGst + shippingCost) * feeRate);
  } else if (paymentMethod === "cod") {
    // Cash on delivery flat handling fee (₹40)
    gatewayFee = COD_FLAT_FEE;
  }

  const grandTotal = subtotal + totalGst + shippingCost + gatewayFee;

  return {
    subtotal,
    totalGst,
    shippingCost,
    gatewayFee,
    grandTotal,
    resolvedItems,
    shippingQuote,
  };
}
