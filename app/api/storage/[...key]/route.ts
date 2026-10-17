import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
};

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;

  const endpoint =
    process.env.OBJECT_STORAGE_ENDPOINT ||
    process.env.AWS_ENDPOINT_URL_S3 ||
    process.env.NEON_OBJECT_STORAGE_ENDPOINT;
  const accessKeyId =
    process.env.OBJECT_STORAGE_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    s3Client = new S3Client({
      region: process.env.OBJECT_STORAGE_REGION || process.env.AWS_REGION || "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
    return s3Client;
  }
  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const rawParams = await context.params;
    const keyArray = rawParams?.key || [];
    const key = keyArray.join("/").replace(/^\/+|\/+$/g, "");

    if (!key) {
      return NextResponse.json({ error: "Storage key required" }, { status: 400 });
    }

    const bucket =
      process.env.OBJECT_STORAGE_BUCKET ||
      process.env.AWS_BUCKET ||
      process.env.NEON_OBJECT_STORAGE_BUCKET ||
      "pm-assets";

    const client = getS3Client();

    // 1. Try fetching from Neon Object Storage (S3-compatible)
    if (client) {
      try {
        const s3Response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );

        if (s3Response.Body) {
          const contentType =
            s3Response.ContentType || getMimeType(key);
          const bytes = await s3Response.Body.transformToByteArray();
          const buffer = Buffer.from(bytes);

          return new NextResponse(buffer as any, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Length": String(buffer.length),
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        }
      } catch (s3Err: any) {
        // If not found in S3, fall through to check local filesystem
      }
    }

    // 2. Fallback: check local public/uploads directory
    const localPath = path.join(process.cwd(), "public", "uploads", key);
    if (fs.existsSync(localPath)) {
      const stat = fs.statSync(localPath);
      if (stat.isFile()) {
        const fileBuffer = fs.readFileSync(localPath);
        return new NextResponse(fileBuffer as any, {
          status: 200,
          headers: {
            "Content-Type": getMimeType(key),
            "Content-Length": String(fileBuffer.length),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (err: any) {
    console.error("[Storage Serve Route Error]:", err);
    return NextResponse.json({ error: "Failed to retrieve storage file" }, { status: 500 });
  }
}
