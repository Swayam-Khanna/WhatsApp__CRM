import fs from "fs";
import path from "path";
import postgres from "postgres";
import dotenv from "dotenv";
import { compressImage, DEFAULT_MAX_BYTES } from "../backend/lib/image-service.ts";
import { getStorageProvider } from "../backend/lib/storage/index.ts";

dotenv.config();

const isDryRun = !process.argv.includes("--apply") && !process.argv.includes("--execute");

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function processStaticAssets() {
  console.log("\n=======================================================");
  console.log(`[1] Scanning Static Assets in public/ (${isDryRun ? "DRY-RUN MODE" : "APPLY MODE"})`);
  console.log("=======================================================\n");

  const publicDir = path.join(process.cwd(), "public");
  const assetsDir = path.join(publicDir, "assets");

  if (!fs.existsSync(assetsDir)) {
    console.log("No public/assets directory found.");
    return;
  }

  function getFiles(dir: string): string[] {
    let files: string[] = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files = files.concat(getFiles(fullPath));
      } else if (/\.(jpg|jpeg|png|webp)$/i.test(item.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allImages = getFiles(assetsDir);
  console.log(`Found ${allImages.length} image assets in public/assets.`);

  const tableRows: Array<{
    file: string;
    original: number;
    compressed: number;
    savings: string;
    exceeded: boolean;
  }> = [];

  let totalOriginal = 0;
  let totalCompressed = 0;
  let compressedCount = 0;

  for (const filePath of allImages) {
    const relPath = path.relative(publicDir, filePath).replace(/\\/g, "/");
    const stat = fs.statSync(filePath);
    const originalSize = stat.size;
    totalOriginal += originalSize;

    // Read buffer and compress
    const buffer = fs.readFileSync(filePath);
    const compressed = await compressImage(buffer);
    const compressedSize = compressed.length;
    totalCompressed += compressedSize;

    const savingsPercent = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);
    const wasOverLimit = originalSize > DEFAULT_MAX_BYTES;

    tableRows.push({
      file: relPath,
      original: originalSize,
      compressed: compressedSize,
      savings: `${savingsPercent}%`,
      exceeded: wasOverLimit,
    });

    if (wasOverLimit) {
      compressedCount++;
    }

    if (!isDryRun && wasOverLimit) {
      // In apply mode, write compressed WebP version alongside original
      const webpPath = filePath.replace(/\.[^.]+$/, ".webp");
      fs.writeFileSync(webpPath, compressed);
    }
  }

  // Display top oversized files
  console.log("\nAssets Exceeding 300 KB limit:");
  console.log("--------------------------------------------------------------------------------------");
  console.log(
    "Status".padEnd(8) +
    "File".padEnd(40) +
    "Original Size".padEnd(16) +
    "Compressed Size".padEnd(18) +
    "Savings"
  );
  console.log("--------------------------------------------------------------------------------------");

  tableRows
    .filter((r) => r.exceeded)
    .sort((a, b) => b.original - a.original)
    .forEach((r) => {
      console.log(
        "[>300KB]".padEnd(8) +
        r.file.padEnd(40) +
        formatBytes(r.original).padEnd(16) +
        formatBytes(r.compressed).padEnd(18) +
        r.savings
      );
    });

  console.log("--------------------------------------------------------------------------------------");
  console.log(`Total images scanned: ${allImages.length}`);
  console.log(`Images over 300 KB: ${compressedCount}`);
  console.log(`Original total size: ${formatBytes(totalOriginal)}`);
  console.log(`Compressed total size: ${formatBytes(totalCompressed)}`);
  console.log(
    `Total space savings: ${formatBytes(totalOriginal - totalCompressed)} (${(((totalOriginal - totalCompressed) / totalOriginal) * 100).toFixed(1)}% reduction)`
  );
}

async function processDatabaseImages() {
  console.log("\n=======================================================");
  console.log(`[2] Scanning Database Image Columns (${isDryRun ? "DRY-RUN MODE" : "APPLY MODE"})`);
  console.log("=======================================================\n");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("No DATABASE_URL configured in .env. Skipping database image scan.");
    return;
  }

  let sql: postgres.Sql;
  try {
    sql = postgres(dbUrl, { ssl: "require", max: 1 });
    await sql`SELECT 1`;
  } catch (err: any) {
    console.log(`Could not connect to database: ${err.message}. Skipping DB image scan.`);
    return;
  }

  const storage = getStorageProvider();

  try {
    // 1. Check farmer_profiles portrait_url and cover_image_url
    const farmerTables = await sql`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'farmer_profiles';
    `;

    if (farmerTables.length > 0) {
      const farmers = await sql`
        SELECT id, full_name, portrait_url, cover_image_url FROM farmer_profiles;
      `;
      console.log(`Found ${farmers.length} farmer profiles in database.`);

      let base64Portraits = 0;
      let base64Covers = 0;

      for (const f of farmers) {
        if (f.portrait_url && f.portrait_url.startsWith("data:image/")) {
          base64Portraits++;
          const approxBytes = Math.round((f.portrait_url.length * 3) / 4);
          console.log(`  - Farmer [${f.full_name} (${f.id})] has base64 portrait (~${formatBytes(approxBytes)})`);

          if (!isDryRun) {
            const matches = f.portrait_url.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
            const buf = Buffer.from(matches ? matches[2] : f.portrait_url.split(",")[1], "base64");
            const compressed = await compressImage(buf);
            const upload = await storage.upload({
              buffer: compressed,
              fileName: `portrait_${f.id}_${Date.now()}.webp`,
              contentType: "image/webp",
              folder: "prajnaa/farmers",
            });
            await sql`
              UPDATE farmer_profiles SET portrait_url = ${upload.url} WHERE id = ${f.id};
            `;
            console.log(`    -> Uploaded to ${upload.url} (${formatBytes(compressed.length)}) and updated DB.`);
          }
        }

        if (f.cover_image_url && f.cover_image_url.startsWith("data:image/")) {
          base64Covers++;
          const approxBytes = Math.round((f.cover_image_url.length * 3) / 4);
          console.log(`  - Farmer [${f.full_name} (${f.id})] has base64 cover (~${formatBytes(approxBytes)})`);

          if (!isDryRun) {
            const matches = f.cover_image_url.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
            const buf = Buffer.from(matches ? matches[2] : f.cover_image_url.split(",")[1], "base64");
            const compressed = await compressImage(buf);
            const upload = await storage.upload({
              buffer: compressed,
              fileName: `cover_${f.id}_${Date.now()}.webp`,
              contentType: "image/webp",
              folder: "prajnaa/farmers",
            });
            await sql`
              UPDATE farmer_profiles SET cover_image_url = ${upload.url} WHERE id = ${f.id};
            `;
            console.log(`    -> Uploaded to ${upload.url} (${formatBytes(compressed.length)}) and updated DB.`);
          }
        }
      }

      console.log(`Farmer profiles: ${base64Portraits} base64 portraits, ${base64Covers} base64 cover images.`);
    } else {
      console.log("farmer_profiles table does not exist in target database yet.");
    }
  } catch (err: any) {
    console.error("Database scan error:", err.message);
  } finally {
    await sql.end();
  }
}

async function main() {
  console.log("=======================================================");
  console.log("           PRAJNAA IMAGE MIGRATION UTILITY             ");
  console.log(`Mode: ${isDryRun ? "DRY RUN (pass --apply to execute changes)" : "APPLY (writing changes)"}`);
  console.log(`Target Limit: ${formatBytes(DEFAULT_MAX_BYTES)} (<= 300 KB WebP)`);
  console.log("=======================================================");

  await processStaticAssets();
  await processDatabaseImages();

  console.log("\n=======================================================");
  console.log(`Migration script finished ${isDryRun ? "[DRY-RUN COMPLETE]" : "[APPLY COMPLETE]"}`);
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
