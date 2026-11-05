import sharp, { type Metadata } from "sharp";
import { getStorageProvider, type UploadResult } from "./storage/index.ts";

export const DEFAULT_MAX_BYTES = 300 * 1024; // 300 KB
export const DEFAULT_START_WIDTH = 1600;
export const DEFAULT_START_QUALITY = 80;
export const DEFAULT_MIN_QUALITY = 40;
export const DEFAULT_QUALITY_STEP = 10;
export const DEFAULT_WIDTH_SHRINK_FACTOR = 0.8; // 20% reduction per step
export const DEFAULT_MIN_WIDTH = 400;

export const MAX_RAW_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export interface CompressOptions {
  maxBytes?: number;
  startWidth?: number;
  startQuality?: number;
  minQuality?: number;
  qualityStep?: number;
  minWidth?: number;
  widthShrinkFactor?: number;
}

export interface SaveImageResult extends UploadResult {
  size: number;
  width?: number;
  height?: number;
  format: string;
}

/**
 * Validates that an image buffer matches allowed mime types and size limits.
 */
export async function validateImage(
  buffer: Buffer,
  declaredMimeType?: string
): Promise<{ format: string; width?: number; height?: number }> {
  if (buffer.length > MAX_RAW_UPLOAD_BYTES) {
    throw new Error(
      `Image size exceeds maximum allowed upload limit of ${MAX_RAW_UPLOAD_BYTES / (1024 * 1024)} MB (received ${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`
    );
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (err: any) {
    throw new Error(`Invalid or corrupt image file: ${err.message}`);
  }

  const format = metadata.format?.toLowerCase();
  const validFormats = ["jpeg", "jpg", "png", "webp", "gif"];
  if (!format || !validFormats.includes(format)) {
    throw new Error(
      `Unsupported image format '${format}'. Allowed formats are: jpeg, png, webp, gif.`
    );
  }

  if (declaredMimeType) {
    const normDeclared = declaredMimeType.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(normDeclared)) {
      throw new Error(
        `Declared MIME type '${declaredMimeType}' is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
      );
    }
  }

  return { format, width: metadata.width, height: metadata.height };
}

/**
 * Compresses an image buffer ensuring output is strictly at most maxBytes (default 300 KB).
 * - Auto-rotates based on EXIF.
 * - Converts to WebP.
 * - Starts at max width 1600px and quality 80.
 * - Lowers quality in steps of 10 down to 40.
 * - If still over maxBytes, shrinks width by 20% per step down to a floor of 400px.
 * - Returns the smallest result obtained; logs a warning if still exceeding maxBytes at floor.
 */
export async function compressImage(
  buffer: Buffer,
  options?: CompressOptions
): Promise<Buffer> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const startWidth = options?.startWidth ?? DEFAULT_START_WIDTH;
  const startQuality = options?.startQuality ?? DEFAULT_START_QUALITY;
  const minQuality = options?.minQuality ?? DEFAULT_MIN_QUALITY;
  const qualityStep = options?.qualityStep ?? DEFAULT_QUALITY_STEP;
  const minWidth = options?.minWidth ?? DEFAULT_MIN_WIDTH;
  const shrinkFactor = options?.widthShrinkFactor ?? DEFAULT_WIDTH_SHRINK_FACTOR;

  let currentWidth = startWidth;
  let currentQuality = startQuality;

  let smallestBuffer: Buffer | null = null;
  let smallestSize = Infinity;

  // Outer loop: dimensions
  while (true) {
    // Inner loop: quality stepping
    for (
      let q = currentQuality;
      q >= minQuality;
      q -= qualityStep
    ) {
      const candidate = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize({
          width: currentWidth,
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: q, effort: 4 })
        .toBuffer();

      if (candidate.length < smallestSize) {
        smallestSize = candidate.length;
        smallestBuffer = candidate;
      }

      if (candidate.length <= maxBytes) {
        return candidate;
      }
    }

    // If still over maxBytes at minQuality, reduce width by 20%
    if (currentWidth <= minWidth) {
      break;
    }

    const nextWidth = Math.max(minWidth, Math.round(currentWidth * shrinkFactor));
    if (nextWidth === currentWidth) {
      break;
    }
    currentWidth = nextWidth;
    currentQuality = minQuality; // maintain min quality while reducing dimensions
  }

  if (smallestBuffer && smallestBuffer.length > maxBytes) {
    console.warn(
      `[ImageService] Warning: Image could not be compressed under ${maxBytes} bytes (floor ${minWidth}px reached). Final size: ${smallestBuffer.length} bytes.`
    );
  }

  return smallestBuffer || buffer;
}

/**
 * Validates, compresses to WebP (<= 300 KB), and uploads to object storage.
 */
export async function saveImage(
  fileBuffer: Buffer,
  fileName: string,
  options?: {
    mimeType?: string;
    folder?: string;
    compressOptions?: CompressOptions;
  }
): Promise<SaveImageResult> {
  // 1. Validate image type and size
  await validateImage(fileBuffer, options?.mimeType);

  // 2. Compress image using sharp
  const compressedBuffer = await compressImage(
    fileBuffer,
    options?.compressOptions
  );

  // 3. Compute safe filename with .webp extension
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 50);
  const finalFileName = `${baseName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webp`;

  // 4. Upload to storage provider
  const storage = getStorageProvider();
  const folder = options?.folder || "prajnaa/general";

  const uploadResult = await storage.upload({
    buffer: compressedBuffer,
    fileName: finalFileName,
    contentType: "image/webp",
    folder,
  });

  const metadata = await sharp(compressedBuffer).metadata();

  return {
    ...uploadResult,
    size: compressedBuffer.length,
    width: metadata.width,
    height: metadata.height,
    format: "webp",
  };
}
