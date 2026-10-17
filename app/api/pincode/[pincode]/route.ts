import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-Memory Cache with 24-hour TTL
interface CachedPincode {
  data: {
    pincode: string;
    state: string;
    district: string;
    postOffices: Array<{
      name: string;
      officeType: string;
      deliveryStatus: string;
    }>;
  };
  expiresAt: number;
}

const pincodeCache = new Map<string, CachedPincode>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

// Helper to format string into clean Title Case (e.g., "HIMACHAL PRADESH" -> "Himachal Pradesh")
function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ pincode: string }> }
) {
  try {
    const resolvedParams = await context.params;
    const pincode = (resolvedParams?.pincode || "").trim();

    // 1. Strict 6-digit Validation
    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Indian pincode. Pincode must contain exactly 6 digits.",
        },
        { status: 400 }
      );
    }

    // 2. Check Cache
    const cached = pincodeCache.get(pincode);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({
        success: true,
        data: cached.data,
      });
    }

    // 3. Read OGD Credentials from Environment
    const envApiKey = (process.env.OGD_PINCODE_API_KEY || "").trim();
    const apiKey =
      envApiKey && !envApiKey.includes("[SENSITIVE]") && envApiKey.length > 10
        ? envApiKey
        : "579b464db66ec23bdd00000119351f9d3df1403f4b87261979b50614";

    const resourceId =
      (process.env.OGD_PINCODE_RESOURCE_ID || "").trim() ||
      "5c2f62fe-5afa-4119-a499-fec9d604d5bd";

    let state = "";
    let district = "";
    const postOffices: Array<{ name: string; officeType: string; deliveryStatus: string }> = [];

    // 4. Primary Provider: Government of India OGD API (api.data.gov.in)
    try {
      const ogdUrl = `https://api.data.gov.in/resource/${resourceId}?api-key=${encodeURIComponent(
        apiKey
      )}&format=json&filters[pincode]=${pincode}&limit=50`;

      const response = await fetch(ogdUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (response.ok) {
        const ogdData = await response.json();
        const records = Array.isArray(ogdData?.records) ? ogdData.records : [];

        if (records.length > 0) {
          state = toTitleCase(records[0].statename || records[0].state || "");
          district = toTitleCase(records[0].district || records[0].districtname || "");

          records.forEach((r: any) => {
            const name = toTitleCase(r.officename || r.office_name || r.post_office_name || "");
            if (name) {
              postOffices.push({
                name,
                officeType: r.officetype || r.office_type || "PO",
                deliveryStatus: r.delivery || r.delivery_status || "Delivery",
              });
            }
          });
        }
      }
    } catch (ogdErr: any) {
      console.warn("[OGD Pincode API Error]:", ogdErr.message);
    }

    // 5. Failover / High-Availability Backup (India Post PostalPincode API)
    if (!state || postOffices.length === 0) {
      try {
        const fallbackRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData) && fallbackData[0]?.Status === "Success") {
            const poList = fallbackData[0]?.PostOffice || [];
            if (poList.length > 0) {
              state = toTitleCase(poList[0].State || "");
              district = toTitleCase(poList[0].District || "");

              poList.forEach((po: any) => {
                const name = toTitleCase(po.Name || "");
                if (name) {
                  postOffices.push({
                    name,
                    officeType: po.BranchType || "PO",
                    deliveryStatus: po.DeliveryStatus || "Delivery",
                  });
                }
              });
            }
          }
        }
      } catch (fallbackErr: any) {
        console.warn("[PostalPincode Fallback Error]:", fallbackErr.message);
      }
    }

    // 6. Handle Pincode Not Found
    if (!state && postOffices.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Pincode not found",
        },
        { status: 404 }
      );
    }

    // Deduplicate post offices by name
    const uniquePostOffices = postOffices.filter(
      (po, idx, arr) => arr.findIndex((p) => p.name.toLowerCase() === po.name.toLowerCase()) === idx
    );

    const resultData = {
      pincode,
      state,
      district,
      postOffices: uniquePostOffices,
    };

    // 7. Store in 24-hour cache
    pincodeCache.set(pincode, {
      data: resultData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({
      success: true,
      data: resultData,
    });
  } catch (error: any) {
    console.error("[Pincode API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "We couldn't verify the pincode right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
