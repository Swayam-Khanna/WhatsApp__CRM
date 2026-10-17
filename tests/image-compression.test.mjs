import { test, describe } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  compressImage,
  validateImage,
  saveImage,
  DEFAULT_MAX_BYTES,
  MAX_RAW_UPLOAD_BYTES,
} from "../backend/lib/image-service.ts";

describe("Image Compression & Storage Service", () => {
  // Helper to create a test image with high visual entropy (hard to compress)
  async function generateTestImage(width, height) {
    // Generate random raw pixel buffer for maximum entropy
    const channels = 3;
    const pixelCount = width * height * channels;
    const randomPixels = Buffer.alloc(pixelCount);
    for (let i = 0; i < pixelCount; i++) {
      randomPixels[i] = (i * 37 + (i % 256)) % 256;
    }

    return sharp(randomPixels, {
      raw: { width, height, channels },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
  }

  test("compressImage output is strictly <= 300 KB for large inputs and converted to WebP", async () => {
    // Generate a large 2400x1800 image that naturally would be well over 1 MB
    const largeImage = await generateTestImage(2400, 1800);
    assert.ok(largeImage.length > 500 * 1024, `Original image should be large (>500KB), got ${largeImage.length}`);

    const compressed = await compressImage(largeImage);

    assert.ok(
      compressed.length <= DEFAULT_MAX_BYTES,
      `Compressed image size (${compressed.length} bytes) exceeds limit (${DEFAULT_MAX_BYTES} bytes)`
    );

    const meta = await sharp(compressed).metadata();
    assert.equal(meta.format, "webp", "Output format must be webp");
    assert.ok(meta.width <= 1600, `Width should be constrained to at most 1600, got ${meta.width}`);
  });

  test("compressImage handles EXIF orientation auto-rotation", async () => {
    // Create an image with width > height and set EXIF orientation 6 (90 degrees rotated)
    const base = await sharp({
      create: {
        width: 800,
        height: 400,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    // Attach EXIF orientation tag 6 (rotate 90 deg clockwise)
    const withExif = await sharp(base)
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const compressed = await compressImage(withExif);
    const meta = await sharp(compressed).metadata();

    // After auto-rotation, 800x400 with orientation 6 rotates into height > width (400x800)
    assert.equal(meta.format, "webp");
    assert.ok(
      meta.height >= meta.width,
      `Image should be auto-rotated based on EXIF (expected height >= width, got ${meta.width}x${meta.height})`
    );
  });

  test("validateImage rejects non-image / corrupt buffers", async () => {
    const corruptBuffer = Buffer.from("Not a real image file content header");
    await assert.rejects(
      async () => {
        await validateImage(corruptBuffer);
      },
      (err) => {
        return err instanceof Error && err.message.includes("Invalid or corrupt image");
      }
    );
  });

  test("validateImage rejects raw uploads exceeding 10 MB limit", async () => {
    // 10 MB + 1 byte
    const oversizedBuffer = Buffer.alloc(MAX_RAW_UPLOAD_BYTES + 1024);
    await assert.rejects(
      async () => {
        await validateImage(oversizedBuffer);
      },
      (err) => {
        return err instanceof Error && err.message.includes("exceeds maximum allowed upload limit");
      }
    );
  });

  test("validateImage rejects unauthorized MIME types", async () => {
    const validPng = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    await assert.rejects(
      async () => {
        await validateImage(validPng, "application/pdf");
      },
      (err) => {
        return err instanceof Error && err.message.includes("is not allowed");
      }
    );
  });

  test("saveImage pipeline end-to-end compresses, uploads, and returns WebP <= 300 KB", async () => {
    const image = await generateTestImage(1200, 800);
    const result = await saveImage(image, "banner-photo.png", {
      folder: "prajnaa/test",
      mimeType: "image/png",
    });

    assert.ok(result.url, "Should return a URL");
    assert.ok(result.key.endsWith(".webp"), "Key should have .webp extension");
    assert.equal(result.format, "webp", "Format must be webp");
    assert.ok(
      result.size <= DEFAULT_MAX_BYTES,
      `Saved size (${result.size} bytes) must be <= ${DEFAULT_MAX_BYTES} bytes`
    );
  });
});
