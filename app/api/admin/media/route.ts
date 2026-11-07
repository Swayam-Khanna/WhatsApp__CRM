import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth, verifyAdminRequest } from "@/lib/api/admin-auth.server";
import { db } from "../../../../backend/db.ts";
import { mediaAssets, mediaFolders } from "../../../../backend/schema/uploads.ts";
import { STORAGE_FOLDERS, validateStorageFolder, ensureStorageFoldersExist } from "../../../../backend/lib/storage/folders.ts";
import { eq, desc, sql, count } from "drizzle-orm";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  ensureStorageFoldersExist();

  const { searchParams } = new URL(req.url);
  const selectedFolder = searchParams.get("folder");

  try {
    // 1. Calculate folder statistics from Neon
    const folderStatsQuery = await db
      .select({
        folder: mediaAssets.folder,
        count: count(),
        totalBytes: sql<number>`COALESCE(SUM(${mediaAssets.sizeBytes}), 0)`,
      })
      .from(mediaAssets)
      .groupBy(mediaAssets.folder);

    const statsMap: Record<string, { count: number; totalBytes: number }> = {};
    for (const row of folderStatsQuery) {
      statsMap[row.folder] = {
        count: Number(row.count),
        totalBytes: Number(row.totalBytes),
      };
    }

    // 2. Prepare folder list with icons and stats
    const folders = Object.entries(STORAGE_FOLDERS).map(([key, config]) => {
      const stats = statsMap[key] || { count: 0, totalBytes: 0 };
      return {
        ...config,
        fileCount: stats.count,
        totalBytes: stats.totalBytes,
      };
    });

    // 3. Fetch assets for the selected folder (or all recent if none selected)
    let assetsQuery = db
      .select()
      .from(mediaAssets)
      .orderBy(desc(mediaAssets.createdAt))
      .limit(100);

    let assets = [];
    if (selectedFolder) {
      const cleanFolder = validateStorageFolder(selectedFolder);
      assets = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.folder, cleanFolder))
        .orderBy(desc(mediaAssets.createdAt))
        .limit(100);
    } else {
      assets = await assetsQuery;
    }

    return NextResponse.json({
      success: true,
      folders,
      assets,
      selectedFolder: selectedFolder || null,
    });
  } catch (error: any) {
    console.error("[Admin Media API GET Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load media assets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const authUser = await verifyAdminRequest(req);
  const adminEmail = authUser.user?.email || "admin@prajnaamarket.com";

  ensureStorageFoldersExist();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = formData.get("folder") as string | null;
    const entityType = (formData.get("entityType") as string) || "general";
    const entityId = (formData.get("entityId") as string) || null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const folder = validateStorageFolder(rawFolder || undefined);
    const folderConfig = STORAGE_FOLDERS[folder];

    // Validate size
    const maxBytes = (folderConfig?.maxSizeMb || 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, error: `File exceeds maximum allowed size of ${folderConfig.maxSizeMb} MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).toLowerCase() || ".webp";
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${Date.now()}_${sanitizedName}`;

    const { getStorageProvider } = await import("../../../../backend/lib/storage");
    const storage = getStorageProvider();
    const uploadRes = await storage.upload({
      buffer,
      fileName: uniqueFileName,
      contentType: file.type || "application/octet-stream",
      folder: `prajnaa/${folder}`,
    });

    const fileUrl = uploadRes.url;
    const assetId = `ast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;


    // Record in Neon PostgreSQL
    const [newAsset] = await db
      .insert(mediaAssets)
      .values({
        id: assetId,
        folder,
        fileName: uniqueFileName,
        originalName: file.name,
        fileUrl,
        storageKey: `${folder}/${uniqueFileName}`,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        entityType,
        entityId,
        uploadedBy: adminEmail,
        metadata: {
          originalSize: file.size,
          extension: ext,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      asset: newAsset,
    });
  } catch (error: any) {
    console.error("[Admin Media API POST Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Asset ID is required" }, { status: 400 });
    }

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);

    if (!asset) {
      return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
    }

    // Remove from disk if local
    try {
      const diskPath = path.join(process.cwd(), "public", "uploads", asset.folder, asset.fileName);
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    } catch (e) {
      console.warn("[Media Delete Warning]: Could not unlink file:", e);
    }

    // Delete record from Neon
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));

    return NextResponse.json({ success: true, message: "Asset deleted successfully" });
  } catch (error: any) {
    console.error("[Admin Media API DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete file" },
      { status: 500 }
    );
  }
}
