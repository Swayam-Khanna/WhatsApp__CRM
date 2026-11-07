import { NextResponse } from "next/server";
import { client } from "../../../backend/db.ts";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secretKey = searchParams.get("key");
  const expectedKey = process.env.MIGRATION_SECRET || "prajnaa_migrate_secret";

  if (secretKey !== expectedKey) {
    return NextResponse.json(
      {
        error: "Unauthorized. Pass ?key=prajnaa_migrate_secret (or value of MIGRATION_SECRET env variable).",
      },
      { status: 401 }
    );
  }

  try {
    const drizzleDir = path.resolve(process.cwd(), "drizzle");
    if (!fs.existsSync(drizzleDir)) {
      return NextResponse.json(
        { error: `Drizzle migrations directory not found at: ${drizzleDir}` },
        { status: 404 }
      );
    }

    const files = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const results: Array<{ file: string; status: "success" | "skipped_or_error"; message?: string }> = [];

    for (const file of files) {
      const filePath = path.join(drizzleDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      try {
        await client.unsafe(sqlContent);
        results.push({ file, status: "success" });
      } catch (err: any) {
        results.push({
          file,
          status: "skipped_or_error",
          message: err?.message || String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database migration completed.",
      timestamp: new Date().toISOString(),
      applied: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}
