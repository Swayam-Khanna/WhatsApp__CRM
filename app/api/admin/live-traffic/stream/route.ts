import { NextRequest, NextResponse } from "next/server";
import { visitorEventsEmitter, VisitorEventPayload } from "@/lib/admin/visitor-event-emitter";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial SSE connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`)
      );

      // Event listener callback
      const onVisitorEvent = (payload: VisitorEventPayload) => {
        try {
          const sseData = `data: ${JSON.stringify({ type: "visitor_event", payload })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        } catch (e) {
          console.error("[SSE Enqueue Error]:", e);
        }
      };

      visitorEventsEmitter.on("visitor_event", onVisitorEvent);

      // Keepalive heartbeat ping every 15s
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Cleanup listener on connection close
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        visitorEventsEmitter.off("visitor_event", onVisitorEvent);
        try {
          controller.close();
        } catch (e) {}
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Encoding": "none",
    },
  });
}
