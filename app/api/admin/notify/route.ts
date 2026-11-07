import { NextRequest, NextResponse } from "next/server";
import { sendAdminEmailNotification } from "@/lib/api/notifications.server";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {

    // 2. Validate payload
    const body = await req.json();
    const { subject, body: emailBody } = body;

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "Bad Request: 'subject' and 'body' are required" },
        { status: 400 }
      );
    }

    // 3. Dispatch notification via server-side action
    const result = await sendAdminEmailNotification({
      data: {
        subject,
        body: emailBody,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Admin Notify API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send admin notification" },
      { status: 500 }
    );
  }
}
