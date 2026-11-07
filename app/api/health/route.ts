import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "Prajnaa Market & WhatsApp CRM",
    },
    { status: 200 }
  );
}
