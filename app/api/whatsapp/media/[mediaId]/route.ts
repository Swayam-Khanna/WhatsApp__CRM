import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/media/[mediaId]
 * Streams WhatsApp media (images, videos, audio, documents) securely from Meta Cloud API
 * using the configured WHATSAPP_ACCESS_TOKEN.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    if (!mediaId) {
      return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "WhatsApp access token not configured" }, { status: 500 });
    }

    // 1. Fetch media URL and mime type from Meta Graph API
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!metaRes.ok) {
      const errData = await metaRes.json().catch(() => ({}));
      console.error("[WhatsApp Media Proxy] Error fetching media metadata:", errData);
      return NextResponse.json(
        { error: errData.error?.message || "Failed to locate media on WhatsApp Cloud API" },
        { status: metaRes.status }
      );
    }

    const metaData = await metaRes.json();
    const mediaDownloadUrl = metaData.url;
    const mimeType = metaData.mime_type || "application/octet-stream";

    if (!mediaDownloadUrl) {
      return NextResponse.json({ error: "No download URL returned by Meta" }, { status: 404 });
    }

    // 2. Download the binary media buffer from Meta's secure CDN
    const mediaFileRes = await fetch(mediaDownloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!mediaFileRes.ok) {
      console.error("[WhatsApp Media Proxy] Error downloading media file:", mediaFileRes.statusText);
      return NextResponse.json(
        { error: "Failed to download media content from Meta CDN" },
        { status: mediaFileRes.status }
      );
    }

    const arrayBuffer = await mediaFileRes.arrayBuffer();

    // 3. Return binary stream with proper MIME type and caching headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": arrayBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Disposition": `inline; filename="wa-media-${mediaId}"`,
      },
    });
  } catch (error: any) {
    console.error("[WhatsApp Media Proxy] Exception:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error fetching media" },
      { status: 500 }
    );
  }
}
