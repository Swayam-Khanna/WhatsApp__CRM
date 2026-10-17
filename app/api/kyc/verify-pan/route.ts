import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../backend/db.ts";
import { farmerProfiles, farmerDocuments } from "../../../../backend/schema/index.ts";
import { encryptPan } from "../../../../backend/lib/crypto.ts";
import { eq, and } from "drizzle-orm";
import { getCashfreeConfig } from "@/lib/cashfree-config";
import { verifyUserAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyUserAuth(req);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { status: "unauthorized", details: { message: authResult.error || "Authentication required." } },
        { status: 401 }
      );
    }
    let pan: string = "";
    let name: string = "";
    let farmerId: string = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      pan = body.pan || "";
      name = body.name || "";
      farmerId = body.farmerId || body.farmer_id || "";
    } else if (contentType.includes("multipart/form-data") || contentType.includes("form")) {
      const formData = await req.formData();
      pan = (formData.get("pan") as string) || "";
      name = (formData.get("name") as string) || "";
      farmerId = ((formData.get("farmerId") || formData.get("farmer_id")) as string) || "";
    }

    const cleanPan = pan.trim().toUpperCase();

    // 1. Server-side format validation
    if (!cleanPan) {
      return NextResponse.json(
        { status: "invalid", details: { message: "PAN number is required" } },
        { status: 400 },
      );
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
      return NextResponse.json(
        {
          status: "invalid",
          details: {
            message: "Invalid PAN format. Must be 10 characters matching pattern: ABCDE1234F",
          },
        },
        { status: 400 },
      );
    }

    // 2. Fetch Cashfree Configuration & Credentials from Single Shared Source of Truth
    const { clientId, clientSecret, apiVersion, verificationBaseUrl } = getCashfreeConfig();

    const endpoints = [
      `${verificationBaseUrl}/pan`,
      `${verificationBaseUrl}/document/pan`,
    ];

    const verificationId = `pan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      pan: cleanPan,
      ...(name.trim() ? { name: name.trim() } : {}),
      verification_id: verificationId,
    };

    let lastError = "Unable to connect to PAN verification service";
    let verificationSuccess = false;
    let verifiedData: any = null;

    for (const endpoint of endpoints) {
      try {
        const cfRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "x-client-id": clientId,
            "x-client-secret": clientSecret,
            "x-api-version": apiVersion,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
        });

        const resJson = await cfRes.json().catch(() => null);

        if (cfRes.ok && resJson) {
          // Cashfree returns valid: true or status: "VALID" / "SUCCESS"
          const isValid =
            resJson.valid === true ||
            resJson.status === "VALID" ||
            resJson.status === "SUCCESS" ||
            resJson.pan_status === "VALID" ||
            (resJson.registered_name && resJson.pan);

          if (isValid) {
            verificationSuccess = true;
            verifiedData = {
              pan: cleanPan,
              registeredName: resJson.registered_name || resJson.name || name || "Verified Taxpayer",
              type: resJson.type || "Individual",
              nameMatchScore: resJson.name_match_score ?? null,
              nameMatchResult: resJson.name_match_result ?? null,
              referenceId: resJson.reference_id || resJson.verification_id || verificationId,
              message: resJson.message || "PAN verified successfully with Income Tax Department records",
            };
            break;
          } else if (resJson.status === "INVALID" || resJson.valid === false) {
            return NextResponse.json({
              status: "invalid",
              details: {
                pan: cleanPan,
                message: resJson.message || "PAN card number is invalid or not registered in the Income Tax database.",
              },
            });
          }
        } else if (resJson) {
          const msg = resJson.message || resJson.error || `Cashfree returned status ${cfRes.status}`;
          lastError = msg;

          // If test environment mismatch error is encountered, auto-retry on sandbox endpoint
          if (msg.includes("Client secret belongs to test environment") && !endpoint.includes("sandbox")) {
            const sandboxEndpoint = `https://sandbox.cashfree.com/verification/pan`;
            const retryRes = await fetch(sandboxEndpoint, {
              method: "POST",
              headers: {
                "x-client-id": clientId,
                "x-client-secret": clientSecret,
                "x-api-version": apiVersion,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
              cache: "no-store",
            });
            const retryJson = await retryRes.json().catch(() => null);
            if (retryRes.ok && retryJson) {
              const isValid =
                retryJson.valid === true ||
                retryJson.status === "VALID" ||
                retryJson.status === "SUCCESS" ||
                (retryJson.registered_name && retryJson.pan);
              if (isValid) {
                verificationSuccess = true;
                verifiedData = {
                  pan: cleanPan,
                  registeredName: retryJson.registered_name || retryJson.name || name || "Verified Taxpayer",
                  type: retryJson.type || "Individual",
                  nameMatchScore: retryJson.name_match_score ?? null,
                  nameMatchResult: retryJson.name_match_result ?? null,
                  referenceId: retryJson.reference_id || retryJson.verification_id || verificationId,
                  message: retryJson.message || "PAN verified successfully with Income Tax Department records",
                };
                break;
              }
            }
          }

          // Check if invalid PAN from response
          if (
            cfRes.status === 400 &&
            (resJson.message?.toLowerCase().includes("invalid") || resJson.message?.toLowerCase().includes("not found"))
          ) {
            return NextResponse.json({
              status: "invalid",
              details: {
                pan: cleanPan,
                message: resJson.message || "PAN number was not found in Income Tax records",
              },
            });
          }
        }
      } catch (err: any) {
        lastError = err?.message || "Network error while calling Cashfree";
      }
    }

    if (verificationSuccess && verifiedData) {
      // If farmerId is provided, update database record in Neon
      if (farmerId) {
        try {
          const encryptedPan = encryptPan(cleanPan);
          await db
            .update(farmerProfiles)
            .set({
              panNumber: encryptedPan,
              updatedAt: new Date(),
            })
            .where(eq(farmerProfiles.id, farmerId));

          await db
            .update(farmerDocuments)
            .set({
              status: "verified",
              verifiedAt: new Date(),
              notes: `Verified via Cashfree PAN API (Ref: ${verifiedData.referenceId})`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(farmerDocuments.farmerId, farmerId),
                eq(farmerDocuments.docType, "pan")
              )
            );
        } catch (dbErr) {
          console.warn("[PAN Verification] Failed to update db status:", dbErr);
        }
      }

      return NextResponse.json({
        status: "verified",
        details: verifiedData,
      });
    }

    return NextResponse.json({
      status: "error",
      details: {
        message: lastError || "Failed to verify PAN. Please verify your details or try again.",
      },
    });
  } catch (error: any) {
    console.error("[PAN Verification Error]:", error);
    return NextResponse.json(
      {
        status: "error",
        details: {
          message: error?.message || "An unexpected error occurred during PAN verification.",
        },
      },
      { status: 500 },
    );
  }
}
