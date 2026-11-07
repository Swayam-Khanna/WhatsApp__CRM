
import { LeadsService } from "../../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/:id/orders
 * Converts lead to confirmed order with idempotency protection.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const result = await LeadsService.convertToOrder(id, {
      orderNumber: body.orderNumber,
      paymentStatus: body.paymentStatus,
      shippingAddress: body.shippingAddress,
      convertedById: body.convertedById,
      convertedByName: body.convertedByName || "Operator",
    });

    return Response.json(
      {
        success: true,
        order: result.order,
        link: result.link,
        message: `Order #${result.order.orderNumber} successfully confirmed and linked`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to convert lead to order" },
      { status: 400 }
    );
  }
}
