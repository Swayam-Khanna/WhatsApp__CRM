import { NextRequest, NextResponse } from "next/server";
import { submitFarmerCertificate } from "@/../backend/models/farmer";
import { verifyUserAuth } from "@/lib/api/admin-auth.server";


const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Farmer User
    const authResult = await verifyUserAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to submit certificates." },
        { status: 401 }
      );
    }

    const farmerId = authResult.user.uid || "me";

    // 2. Parse payload (supports multipart/form-data or json)
    const contentType = req.headers.get("content-type") || "";
    let name = "";
    let issuedBy = "";
    let certNumber = "";
    let validTill = "";
    let fileBuffer: Buffer | null = null;
    let fileMime = "";
    let fileName = "certificate";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      name = (formData.get("name") as string || "").trim();
      issuedBy = (formData.get("issuedBy") as string || "").trim();
      certNumber = (formData.get("certNumber") as string || "").trim();
      validTill = (formData.get("validTill") as string || "").trim();

      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: "Document file is required." },
          { status: 400 }
        );
      }

      fileMime = file.type || "";
      fileName = file.name || "certificate";

      // File size validation
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: `File size exceeds the 5MB maximum limit (${(file.size / (1024 * 1024)).toFixed(1)}MB uploaded).`,
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      const body = await req.json().catch(() => ({}));
      name = (body.name || "").trim();
      issuedBy = (body.issuedBy || "").trim();
      certNumber = (body.certNumber || "").trim();
      validTill = (body.validTill || "").trim();

      if (!body.file) {
        return NextResponse.json(
          { success: false, error: "Document file is required." },
          { status: 400 }
        );
      }

      // If data URI or base64 string
      if (typeof body.file === "string") {
        const matches = body.file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          fileMime = matches[1];
          fileBuffer = Buffer.from(matches[2], "base64");
        } else {
          fileBuffer = Buffer.from(body.file, "base64");
          fileMime = "application/pdf";
        }

        if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            { success: false, error: "File size exceeds the 5MB maximum limit." },
            { status: 400 }
          );
        }
      }
    }

    // 3. Validate Inputs
    if (!name || !issuedBy || !certNumber || !validTill) {
      return NextResponse.json(
        {
          success: false,
          error: "All fields are required: Certificate Name, Issuing Authority, Certificate Number, and Valid Till Date.",
        },
        { status: 400 }
      );
    }

    // Validate MIME type or file extension
    const ext = fileName.split(".").pop()?.toLowerCase();
    const isAllowedExt = ext === "pdf" || ext === "jpg" || ext === "jpeg" || ext === "png";
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(fileMime);

    if (!isAllowedExt && !isAllowedMime) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file format. Only JPG, PNG, and PDF documents are accepted.",
        },
        { status: 400 }
      );
    }

    if (!fileBuffer) {
      return NextResponse.json(
        { success: false, error: "Document file content is missing or empty." },
        { status: 400 }
      );
    }

    // 4. Upload to Neon Storage in folder prajnaa/certificates
    const { getStorageProvider } = await import("@backend/lib/storage");
    const storage = getStorageProvider();
    const safeExt = ext || (fileMime.includes("pdf") ? "pdf" : "jpg");
    const uniqueFileName = `cert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExt}`;

    const uploadResult = await storage.upload({
      buffer: fileBuffer,
      fileName: uniqueFileName,
      contentType: fileMime || (safeExt === "pdf" ? "application/pdf" : "image/jpeg"),
      folder: "prajnaa/certificates",
    });


    const uploadUrl = uploadResult.url;
    const publicId = uploadResult.key;


    // 5. Save with status "pending" and set applicationStatus to "in_review"
    const savedCert = await submitFarmerCertificate(farmerId, {
      name,
      issuedBy,
      certNumber,
      validTill,
      document: {
        url: uploadUrl,
        public_id: publicId,
      },
    });

    return NextResponse.json({
      success: true,
      data: savedCert,
      message: "Certificate submitted successfully. Status is now pending admin review.",
    });
  } catch (err: any) {
    console.error("[Submit Certificate API Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to process certificate submission.",
      },
      { status: 500 }
    );
  }
}
