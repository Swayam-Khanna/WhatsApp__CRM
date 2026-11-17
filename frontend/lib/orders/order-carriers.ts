/**
 * Supported Shipping Carriers Configuration
 * 
 * Central registry of approved shipping carriers for Prajnaa Market.
 * As per hard production rules:
 * - Templates are left empty unless officially confirmed.
 * - "Other" allows custom tracking URL entry.
 */

export interface CarrierConfig {
  id: string;
  name: string;
  urlTemplate: string; // Left empty unless officially confirmed
  allowsCustomUrl?: boolean;
}

export const SUPPORTED_CARRIERS: CarrierConfig[] = [
  { id: "delhivery", name: "Delhivery", urlTemplate: "" },
  { id: "india_post", name: "Shipping", urlTemplate: "" },
  { id: "blue_dart", name: "Blue Dart", urlTemplate: "" },
  { id: "dtdc", name: "DTDC", urlTemplate: "" },
  { id: "xpressbees", name: "Xpressbees", urlTemplate: "" },
  { id: "ecom_express", name: "Ecom Express", urlTemplate: "" },
  { id: "shadowfax", name: "Shadowfax", urlTemplate: "" },
  { id: "other", name: "Other", urlTemplate: "", allowsCustomUrl: true },
];

/**
 * Returns formatted tracking URL if a template exists or if a custom URL is provided
 */
export function getCarrierTrackingUrl(carrierName?: string | null, trackingNumber?: string | null, customUrl?: string | null): string | null {
  if (customUrl && customUrl.trim()) {
    return customUrl.trim();
  }

  if (!carrierName || !trackingNumber) return null;

  const normalized = carrierName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const carrier = SUPPORTED_CARRIERS.find(
    (c) => c.id === normalized || c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
  );

  if (carrier && carrier.urlTemplate) {
    return carrier.urlTemplate.replace("{tracking}", encodeURIComponent(trackingNumber.trim()));
  }

  return null;
}

/**
 * Validate tracking number format (6-30 letters, numbers, spaces, or hyphens)
 */
export function validateTrackingNumber(num?: string | null): { valid: boolean; error?: string } {
  if (!num || !num.trim()) {
    return { valid: false, error: "Tracking number is required." };
  }
  const clean = num.trim();
  if (clean.length < 6 || clean.length > 30) {
    return { valid: false, error: "Tracking number must be between 6 and 30 characters." };
  }
  if (!/^[A-Za-z0-9\s-]+$/.test(clean)) {
    return { valid: false, error: "Tracking number can only contain letters, numbers, spaces, or hyphens." };
  }
  return { valid: true };
}
