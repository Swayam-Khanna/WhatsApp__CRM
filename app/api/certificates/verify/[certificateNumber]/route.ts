import { NextRequest, NextResponse } from "next/server";
import { verifyCertificate } from "@/lib/certificate/certificate-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ certificateNumber: string }> }
) {
  try {
    const { certificateNumber } = await params;

    if (!certificateNumber) {
      return NextResponse.json(
        { success: false, error: "Certificate number is required." },
        { status: 400 }
      );
    }

    const result = await verifyCertificate(certificateNumber);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("[Public Verify Certificate API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to verify certificate." },
      { status: 500 }
    );
  }
}
