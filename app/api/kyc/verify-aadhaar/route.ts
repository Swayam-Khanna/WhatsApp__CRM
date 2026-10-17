import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../backend/db.ts";
import { farmerProfiles, farmerDocuments } from "../../../../backend/schema/index.ts";
import { eq, and } from "drizzle-orm";
import { validateAadhaar, maskAadhaar } from "@/lib/kyc-validation";
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
    let aadhaar = "";
    let consent = false;
    let farmerId = "";
    let fileBuffer: Buffer | null = null;
    let fileName = "aadhaar_card.jpg";
    let fileMime = "image/jpeg";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      aadhaar = (formData.get("aadhaar") as string) || "";
      consent = formData.get("consent") === "true" || formData.get("consent") === "1";
      farmerId = ((formData.get("farmerId") || formData.get("farmer_id")) as string) || "";

      const file = formData.get("document") as File | null;
      if (file && typeof file.arrayBuffer === "function") {
        const arrayBuf = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
        fileName = file.name || "aadhaar_document.jpg";
        fileMime = file.type || "image/jpeg";
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      aadhaar = body.aadhaar || "";
      consent = Boolean(body.consent);
      farmerId = body.farmerId || body.farmer_id || "";

      const doc = body.document || body.file_url || "";
      if (doc && typeof doc === "string" && doc.startsWith("data:")) {
        const matches = doc.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          fileMime = matches[1];
          fileBuffer = Buffer.from(matches[2], "base64");
          fileName = fileMime.includes("pdf") ? "aadhaar_card.pdf" : "aadhaar_card.jpg";
        }
      }
    }

    const cleanAadhaar = aadhaar.replace(/[\s-]/g, "");
    const masked = maskAadhaar(cleanAadhaar);

    // 1. Consent Verification (Mandatory for Aadhaar Compliance)
    if (!consent) {
      return NextResponse.json(
        {
          status: "invalid",
          details: {
            message:
              "User consent is required for Aadhaar verification. Please tick the consent checkbox to continue.",
          },
        },
        { status: 400 },
      );
    }

    // 2. Client/Server format & Verhoeff validation
    const aadhaarCheck = validateAadhaar(cleanAadhaar);
    if (!aadhaarCheck.valid) {
      return NextResponse.json(
        {
          status: "invalid",
          details: { message: aadhaarCheck.error || "Invalid Aadhaar number format." },
        },
        { status: 400 },
      );
    }

    // 3. Document proof validation
    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        {
          status: "invalid",
          details: { message: "A valid Aadhaar document image or PDF is required for verification." },
        },
        { status: 400 },
      );
    }

    if (fileBuffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          status: "invalid",
          details: { message: "Uploaded Aadhaar document exceeds the maximum limit of 5 MB." },
        },
        { status: 400 },
      );
    }

    // 4. Fetch Cashfree Configuration & Credentials from Single Shared Source of Truth
    const { clientId, clientSecret, apiVersion, verificationBaseUrl } = getCashfreeConfig();

    const endpoints = [
      `${verificationBaseUrl}/ocr/aadhaar`,
      `${verificationBaseUrl}/document/aadhaar`,
    ];

    const verificationId = `aadh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    let lastError = "Unable to connect to Cashfree Smart OCR service";
    let verificationSuccess = false;
    let verifiedData: any = null;

    for (const endpoint of endpoints) {
      try {
        const formDataPayload = new FormData();
        formDataPayload.append("verification_id", verificationId);

        // Append file blob with name and type
        const blob = new Blob([new Uint8Array(fileBuffer)], { type: fileMime });
        formDataPayload.append("front_image", blob, fileName);

        const cfRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "x-client-id": clientId,
            "x-client-secret": clientSecret,
            "x-api-version": apiVersion,
          },
          body: formDataPayload,
          cache: "no-store",
        });

        const resJson = await cfRes.json().catch(() => null);

        if (cfRes.ok && resJson) {
          const ocrResult = resJson.ocr_result || resJson.data || resJson.details || resJson;
          const extractedNumber = (
            ocrResult.aadhaar_number ||
            ocrResult.uid ||
            ocrResult.document_number ||
            ""
          ).replace(/[\s-]/g, "");

          const extractedName = ocrResult.name || ocrResult.holder_name || "";
          const extractedDob = ocrResult.dob || ocrResult.yob || "";
          const extractedGender = ocrResult.gender || "";

          // Check if extracted number matches or last 4 digits match
          const enteredLast4 = cleanAadhaar.slice(-4);
          const extractedLast4 = extractedNumber ? extractedNumber.slice(-4) : "";

          const isMatch =
            (extractedNumber && (extractedNumber === cleanAadhaar || extractedLast4 === enteredLast4)) ||
            resJson.status === "SUCCESS" ||
            resJson.status === "COMPLETED" ||
            resJson.valid === true;

          if (isMatch) {
            verificationSuccess = true;
            verifiedData = {
              maskedAadhaar: masked,
              aadhaarLast4: enteredLast4,
              extractedName: extractedName || "Aadhaar Holder",
              extractedDob: extractedDob || null,
              extractedGender: extractedGender || null,
              referenceId: resJson.reference_id || resJson.verification_id || verificationId,
              message: "Aadhaar card successfully verified via Cashfree Smart OCR",
            };
            break;
          } else if (extractedNumber && extractedLast4 !== enteredLast4) {
            return NextResponse.json({
              status: "mismatch",
              details: {
                maskedAadhaar: masked,
                message:
                  "The entered Aadhaar number does not match the number extracted from the uploaded document.",
              },
            });
          }
        } else if (resJson) {
          lastError =
            resJson.message ||
            resJson.error ||
            "Unable to read Aadhaar document. Please ensure the scan is clear and well lit.";
        }
      } catch (err: any) {
        lastError = err?.message || "Network connection error during Aadhaar OCR verification";
      }
    }

    if (verificationSuccess && verifiedData) {
      // Update database if farmerId is provided
      if (farmerId) {
        try {
          await db
            .update(farmerProfiles)
            .set({
              aadhaarLast4: verifiedData.aadhaarLast4,
              updatedAt: new Date(),
            })
            .where(eq(farmerProfiles.id, farmerId));

          await db
            .update(farmerDocuments)
            .set({
              status: "verified",
              verifiedAt: new Date(),
              notes: `Verified via Cashfree Smart OCR (Ref: ${verifiedData.referenceId})`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(farmerDocuments.farmerId, farmerId),
                eq(farmerDocuments.docType, "aadhaar")
              )
            );
        } catch (dbErr) {
          console.warn("[Aadhaar Verification] Database update error:", dbErr);
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
        maskedAadhaar: masked,
        message:
          lastError ||
          "Could not verify Aadhaar document. Please ensure the photo is clear, unblurred, and completely visible.",
      },
    });
  } catch (error: any) {
    console.error("[Aadhaar Verification Error]:", error);
    return NextResponse.json(
      {
        status: "error",
        details: {
          message: error?.message || "An unexpected error occurred during Aadhaar verification.",
        },
      },
      { status: 500 },
    );
  }
}
