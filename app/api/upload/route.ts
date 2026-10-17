import { NextRequest, NextResponse } from "next/server";
import { saveImage, ALLOWED_MIME_TYPES, MAX_RAW_UPLOAD_BYTES } from "@backend/lib/image-service";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let fileName = "upload.jpg";
    let declaredMimeType: string | undefined = undefined;
    let folder = "prajnaa/general";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const folderParam = formData.get("folder") as string | null;
      if (folderParam) folder = folderParam;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided in form data" },
          { status: 400 }
        );
      }

      if (file.size > MAX_RAW_UPLOAD_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: `File exceeds maximum allowed upload size of ${MAX_RAW_UPLOAD_BYTES / (1024 * 1024)} MB`,
          },
          { status: 400 }
        );
      }

      fileName = file.name || "upload.jpg";
      declaredMimeType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON payload: { file: "data:image/...", name?: string, folder?: string }
      const body = await req.json().catch(() => ({}));
      if (!body.file || typeof body.file !== "string") {
        return NextResponse.json(
          { success: false, error: "No valid image data provided in request body" },
          { status: 400 }
        );
      }

      if (body.folder) folder = body.folder;
      if (body.name) fileName = body.name;

      if (body.file.startsWith("data:")) {
        const matches = body.file.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
        if (matches) {
          declaredMimeType = matches[1];
          fileBuffer = Buffer.from(matches[2], "base64");
        } else {
          const parts = body.file.split(",");
          fileBuffer = Buffer.from(parts[1] || "", "base64");
        }
      } else {
        fileBuffer = Buffer.from(body.file, "base64");
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "Uploaded file content is empty" },
        { status: 400 }
      );
    }

    if (fileBuffer.length > MAX_RAW_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Raw image size (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds 10 MB limit`,
        },
        { status: 400 }
      );
    }

    // Process through centralized saveImage (EXIF rotation, WebP conversion, <=300KB compression)
    const result = await saveImage(fileBuffer, fileName, {
      mimeType: declaredMimeType,
      folder,
    });

    // Record into Neon database media_assets table
    try {
      const { db } = await import("@backend/db");
      const { mediaAssets } = await import("@backend/schema/uploads");
      const assetId = `ast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await db
        .insert(mediaAssets)
        .values({
          id: assetId,
          folder: folder.replace(/^prajnaa\//, ""),
          fileName: fileName,
          originalName: fileName,
          fileUrl: result.url,
          storageKey: result.key,
          mimeType: declaredMimeType || "image/webp",
          sizeBytes: result.size,
          entityType: "product",
          metadata: {
            width: result.width,
            height: result.height,
            format: result.format,
            provider: result.provider,
          },
        })
        .onConflictDoNothing();
    } catch (dbErr) {
      console.warn("[Upload API] Non-fatal: Failed to log asset in media_assets:", dbErr);
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      size: result.size,
      width: result.width,
      height: result.height,
      format: result.format,
      provider: result.provider,
    });
  } catch (err: any) {
    console.error("[Upload API Error]:", err.message || err);
    const isValidationError =
      err.message?.includes("Invalid or corrupt") ||
      err.message?.includes("Unsupported image format") ||
      err.message?.includes("Declared MIME type") ||
      err.message?.includes("exceeds maximum allowed");

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to process and store image",
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
