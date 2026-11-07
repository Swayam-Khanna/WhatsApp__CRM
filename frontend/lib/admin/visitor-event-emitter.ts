import { EventEmitter } from "events";

export interface VisitorEventPayload {
  id: string;
  session_id: string;
  visitor_type: "guest" | "registered";
  visitor_name?: string;
  user_id?: string | null;
  ip_address: string;
  city: string;
  region: string;
  country: string;
  country_code: string;
  isp: string;
  route: string;
  device_type: "desktop" | "mobile" | "tablet";
  browser: string;
  created_at: string;
}

class VisitorEventEmitter extends EventEmitter {}

export const visitorEventsEmitter = new VisitorEventEmitter();
visitorEventsEmitter.setMaxListeners(100);

// Global in-memory visitor events cache across request handlers
export const recentEventsStore: VisitorEventPayload[] = [];

export function pushRecentVisitorEvent(event: VisitorEventPayload) {
  recentEventsStore.unshift(event);
  if (recentEventsStore.length > 500) {
    recentEventsStore.pop();
  }
}

// In-memory cache for IP Geolocation lookups
const geoIpCache = new Map<string, { city: string; region: string; country: string; country_code: string; isp: string }>();

export async function resolveIpGeoLocation(ip: string) {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.")) {
    return {
      city: "Shimla",
      region: "Himachal Pradesh",
      country: "India",
      country_code: "IN",
      isp: "Bharti Airtel Ltd. AS for GPRS Ser",
    };
  }

  if (geoIpCache.has(ip)) {
    return geoIpCache.get(ip)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp`, {
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        const geo = {
          city: data.city || "Shimla",
          region: data.regionName || "Himachal Pradesh",
          country: data.country || "India",
          country_code: data.countryCode || "IN",
          isp: data.isp || "Bharti Airtel Ltd.",
        };
        geoIpCache.set(ip, geo);
        return geo;
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }

  const fallback = {
    city: "Shimla",
    region: "Himachal Pradesh",
    country: "India",
    country_code: "IN",
    isp: "Bharti Airtel Ltd.",
  };
  geoIpCache.set(ip, fallback);
  return fallback;
}
