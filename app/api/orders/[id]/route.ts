import { NextRequest, NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "../../../../backend/db.ts";
import { orders, orderItems, orderShipments } from "../../../../backend/schema/orders.ts";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const emailQuery = searchParams.get("email")?.trim().toLowerCase();

    if (!id || id.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Order ID is required." },
        { status: 400 }
      );
    }

    const cleanId = decodeURIComponent(id).trim().replace(/^#/, "");

    const [order] = await db
      .select()
      .from(orders)
      .where(or(eq(orders.id, cleanId), eq(orders.orderNumber, cleanId)))
      .limit(1);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error:
            "We couldn't find an order matching the provided details. Please check your Order ID and email address and try again.",
        },
        { status: 404 }
      );
    }

    // Email verification if provided (order tracking page)
    if (emailQuery) {
      const orderEmail = (order.customerEmail || "").trim().toLowerCase();
      if (orderEmail && orderEmail !== emailQuery) {
        return NextResponse.json(
          {
            success: false,
            error:
              "We couldn't find an order matching the provided details. Please check your Order ID and email address and try again.",
          },
          { status: 404 }
        );
      }
    }

    // Fetch line items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    // Fetch shipments
    const shipments = await db
      .select()
      .from(orderShipments)
      .where(eq(orderShipments.orderId, order.id));

    // Format items for customer-facing tracking page
    const formattedItems = items.map((item) => ({
      id: item.id,
      name: item.productName,
      quantity: item.quantity,
      price: item.unitPricePaise / 100,
      totalAmount: item.totalPaise / 100,
      weight: item.weightGrams ? `${item.weightGrams}g` : null,
      image: item.productImage || null,
      farmer_name: null,
      farmer_location: null,
      farmer_slug: null,
    }));

    // Format shipments for customer tracking
    const formattedShipments = shipments.map((shp) => ({
      id: shp.id,
      carrier: shp.carrier,
      tracking_number: shp.trackingNumber,
      tracking_url: shp.trackingUrl || null,
      status: shp.status,
      shipped_at: shp.shippedAt,
      estimated_delivery: shp.estimatedDelivery || null,
      delivery_route: shp.deliveryRoute || null,
    }));

    const primaryShipment = formattedShipments[0] || null;

    const snap = (order.shippingAddressSnapshot as any) || {};
    const shippingAddress = [
      snap.line1,
      snap.line2,
      snap.city,
      snap.state,
      snap.postalCode || snap.postal_code,
    ]
      .filter(Boolean)
      .join(", ");

    const trackingData = {
      id: order.id,
      order_id: order.orderNumber,
      created_at: order.createdAt,
      status: order.status,
      payment_status: order.paymentStatus,
      payment_method: order.paymentMethod,
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      customer_phone: order.customerPhone,
      shipping_name: snap.fullName || snap.full_name || order.customerName,
      shipping_phone: snap.phone || order.customerPhone,
      shipping_address: shippingAddress,
      shipping_pincode: snap.postalCode || snap.postal_code || null,
      carrier_name: primaryShipment?.carrier || null,
      tracking_number: primaryShipment?.tracking_number || null,
      delivery_route: primaryShipment?.delivery_route || null,
      tracking_history: [],
      shipments: formattedShipments,
      items: formattedItems,
      subtotal: order.subtotalPaise / 100,
      shipping_cost: order.shippingPaise / 100,
      discount_amount: order.discountPaise / 100,
      total_amount: order.totalPaise / 100,
      total: order.totalPaise / 100,
    };

    return NextResponse.json({ success: true, order: trackingData });
  } catch (error: any) {
    console.error("[Orders API] Error fetching order:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while fetching order details.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const cleanId = decodeURIComponent(id).trim().replace(/^#/, "");

    const [order] = await db
      .select()
      .from(orders)
      .where(or(eq(orders.id, cleanId), eq(orders.orderNumber, cleanId)))
      .limit(1);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const updates: Partial<typeof orders.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.shipping_name || body.shipping_address || body.shipping_phone) {
      const existingSnap = (order.shippingAddressSnapshot as any) || {};
      const newSnap = {
        ...existingSnap,
        ...(body.shipping_name ? { fullName: body.shipping_name } : {}),
        ...(body.shipping_phone ? { phone: body.shipping_phone } : {}),
        ...(body.shipping_address ? { line1: body.shipping_address } : {}),
      };
      updates.shippingAddressSnapshot = newSnap;
      if (body.shipping_name) updates.customerName = body.shipping_name;
      if (body.shipping_phone) updates.customerPhone = body.shipping_phone;
    }

    if (body.total !== undefined) {
      updates.totalPaise = Math.round(Number(body.total) * 100);
    }
    if (body.subtotal !== undefined) {
      updates.subtotalPaise = Math.round(Number(body.subtotal) * 100);
    }
    if (body.shipping_fee !== undefined) {
      updates.shippingPaise = Math.round(Number(body.shipping_fee) * 100);
    }

    await db.update(orders).set(updates).where(eq(orders.id, order.id));

    return NextResponse.json({ success: true, message: "Order updated successfully." });
  } catch (err: any) {
    console.error("[Orders API] PATCH error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
