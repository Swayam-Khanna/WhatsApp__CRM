import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ session: null, user: null }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ session: null, user: null }, { status: 200 });
}
