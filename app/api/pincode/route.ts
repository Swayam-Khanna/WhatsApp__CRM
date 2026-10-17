import { NextRequest, NextResponse } from "next/server";
import { GET as getByParam } from "./[pincode]/route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pincode = searchParams.get("pincode") || searchParams.get("pin") || "";

  if (!pincode) {
    return NextResponse.json(
      {
        success: false,
        message: "Pincode query parameter is required (e.g. /api/pincode?pincode=160001).",
      },
      { status: 400 }
    );
  }

  return getByParam(req, { params: Promise.resolve({ pincode }) });
}
