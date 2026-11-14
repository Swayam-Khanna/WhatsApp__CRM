import { NextRequest, NextResponse } from "next/server.js";
import crypto from "crypto";
import { eq, or, and, ilike, desc } from "drizzle-orm";
import { adminDb } from "../../../../../frontend/lib/firebase-admin.ts";
import { requireAdminAuth, verifyAdminRequest } from "../../../../../frontend/lib/api/admin-auth.server.ts";
import { validateStatusTransition, canAddTracking, deriveOrderStatusFromItems } from "../../../../../frontend/lib/orders/order-state-machine.ts";
import { validateTrackingNumber, getCarrierTrackingUrl } from "../../../../../frontend/lib/orders/order-carriers.ts";
import type { OrderShipment } from "../../../../../frontend/lib/orders/order-constants.ts";
import { sendShippingConfirmationEmail } from "../../../../../frontend/lib/orders/order-email-sender.ts";
import { parseWeightToGrams } from "../../../../../frontend/lib/weight-utils.ts";
import { db } from "../../../../../backend/db.ts";
import { orders, orderItems, orderShipments, orderStatusLogs } from "../../../../../backend/schema/orders.ts";
import { restoreOrderStockAtomic } from "../../../../../backend/lib/orders.server.ts";
import { isNeonDataProvider } from "../../../../../backend/lib/data-provider.ts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Checks if (carrier, tracking_number) is already assigned to another order in Firestore
 */
async function checkDuplicateTrackingFirestore(currentDocId: string, carrier: string, trackingNumber: string): Promise<string | null> {
  if (!adminDb) return null;
  const normCarrier = carrier.trim().toLowerCase();
  const normTracking = trackingNumber.trim().toLowerCase();

  try {
    const allOrdersSnap = await adminDb.collection("orders").get();
    for (const doc of allOrdersSnap.docs) {
      if (doc.id === currentDocId) continue;
      const oData = doc.data();

      if (Array.isArray(oData.shipments)) {
        for (const shp of oData.shipments) {
          if (
            String(shp.carrier || "").trim().toLowerCase() === normCarrier &&
            String(shp.tracking_number || "").trim().toLowerCase() === normTracking
          ) {
            return oData.order_id || doc.id;
          }
        }
      }

      if (
        String(oData.carrier_name || "").trim().toLowerCase() === normCarrier &&
        String(oData.tracking_number || "").trim().toLowerCase() === normTracking
      ) {
        return oData.order_id || doc.id;
      }
    }
  } catch (err) {
    console.warn("[Tracking Check Duplicate Warning]:", err);
  }
  return null;
}

/**
 * Checks if (carrier, tracking_number) is already assigned to another order in Postgres
 */
async function checkDuplicateTrackingNeon(currentOrderId: string, carrier: string, trackingNumber: string): Promise<string | null> {
  try {
    const [dup] = await db
      .select({ orderId: orderShipments.orderId })
      .from(orderShipments)
      .where(
        and(
          ilike(orderShipments.carrier, carrier.trim()),
          ilike(orderShipments.trackingNumber, trackingNumber.trim())
        )
      )
      .limit(1);

    if (dup && dup.orderId !== currentOrderId) {
      const [ord] = await db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .where(eq(orders.id, dup.orderId))
        .limit(1);
      return ord?.orderNumber || dup.orderId;
    }
  } catch (err) {
    console.warn("[Tracking Check Duplicate Neon Warning]:", err);
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim().replace(/^#/, "");

    // 1. NEON DATA PROVIDER (Postgres via Drizzle)
    if (isNeonDataProvider()) {
      const [order] = await db
        .select()
        .from(orders)
        .where(or(eq(orders.id, cleanId), eq(orders.orderNumber, cleanId)))
        .limit(1);

      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const dbShipments = await db
        .select()
        .from(orderShipments)
        .where(eq(orderShipments.orderId, order.id));

      const dbLogs = await db
        .select()
        .from(orderStatusLogs)
        .where(eq(orderStatusLogs.orderId, order.id))
        .orderBy(desc(orderStatusLogs.createdAt));

      const shipments: OrderShipment[] = dbShipments.map((s) => ({
        id: s.id,
        order_id: s.orderId,
        carrier: s.carrier,
        tracking_number: s.trackingNumber,
        tracking_url: s.trackingUrl || null,
        shipped_at: s.shippedAt instanceof Date ? s.shippedAt.toISOString() : String(s.shippedAt),
        delivery_route: s.deliveryRoute || null,
        created_by: "Admin",
        notified_email: false,
        notified_whatsapp: false,
        item_ids: s.allocatedItemIds || [],
        estimated_delivery: s.estimatedDelivery instanceof Date ? s.estimatedDelivery.toISOString() : null,
      }));

      const addr = order.shippingAddressSnapshot as any;

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          order_id: order.orderNumber,
          order_number: order.orderNumber,
          customer_name: order.customerName,
          customer_email: order.customerEmail,
          customer_phone: order.customerPhone,
          status: order.status,
          payment_status: order.paymentStatus === "collected" ? "paid" : order.paymentStatus,
          payment_method: order.paymentMethod,
          subtotal: order.subtotalPaise / 100,
          total: order.totalPaise / 100,
          total_amount: order.totalPaise / 100,
          tax: order.taxPaise / 100,
          shipping_cost: order.shippingPaise / 100,
          discount_amount: order.discountPaise / 100,
          shipping_address: addr
            ? [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")
            : "",
          shipping_pincode: addr?.postalCode || "",
          billing_address: order.billingAddressSnapshot,
          customer_notes: order.customerNotes || null,
          admin_notes: order.adminNotes || null,
          cancellation_reason: order.cancellationReason || null,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
          items: items.map((it) => ({
            id: it.id,
            productId: it.productId,
            productName: it.productName,
            productSlug: it.productSlug,
            productImage: it.productImage || null,
            variantId: it.variantId || null,
            variantName: it.variantName || null,
            farmerId: it.farmerId,
            quantity: it.quantity,
            unitPricePaise: it.unitPricePaise,
            totalPaise: it.totalPaise,
            price: it.unitPricePaise / 100,
            totalAmount: it.totalPaise / 100,
            weightGrams: it.weightGrams,
            gstRate: it.gstRate,
            status: it.status,
          })),
          shipments,
          carrier_name: shipments[0]?.carrier || null,
          tracking_number: shipments[0]?.tracking_number || null,
          tracking_url: shipments[0]?.tracking_url || null,
          tracking_history: dbLogs.map((l) => ({
            status: l.toStatus,
            title: l.notes || `Status: ${l.toStatus}`,
            description: l.notes,
            updated_by: l.actorRole === "admin" ? "Admin" : l.actorId,
            timestamp: l.createdAt,
          })),
          _source: "neon",
        },
      });
    }

    // 2. FIRESTORE DATA PROVIDER (Default)
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    let orderDoc = await adminDb.collection("orders").doc(cleanId).get();
    if (!orderDoc.exists) {
      const hashDoc = await adminDb.collection("orders").doc(`#${cleanId}`).get();
      if (hashDoc.exists) {
        orderDoc = hashDoc;
      }
    }

    if (!orderDoc.exists) {
      const querySnap = await adminDb
        .collection("orders")
        .where("order_id", "in", [cleanId, `#${cleanId}`])
        .limit(1)
        .get();

      if (!querySnap.empty) {
        orderDoc = querySnap.docs[0];
      }
    }

    if (orderDoc.exists) {
      const data = orderDoc.data() || {};
      let firestoreShipments: OrderShipment[] = Array.isArray(data.shipments) ? data.shipments : [];

      if (firestoreShipments.length === 0 && data.tracking_number) {
        const itemsList = Array.isArray(data.items) ? data.items : [];
        firestoreShipments = [{
          id: `shp_legacy_${orderDoc.id}`,
          order_id: data.order_id || orderDoc.id,
          carrier: data.carrier_name || "Standard Courier",
          tracking_number: data.tracking_number,
          tracking_url: data.tracking_url || null,
          shipped_at: data.shipped_at || data.created_at || new Date().toISOString(),
          created_by: "System (Migrated)",
          notified_email: false,
          notified_whatsapp: false,
          item_ids: itemsList.map((it: any, idx: number) => String(it.id || idx)),
        }];
      }
      return NextResponse.json({
        success: true,
        order: { id: orderDoc.id, ...data, shipments: firestoreShipments, _source: "firestore" },
      });
    }

    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[Admin Order Detail GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim().replace(/^#/, "");
    const body = await req.json();
    const now = new Date().toISOString();
    const adminCheck = await verifyAdminRequest(req);
    const adminUser = adminCheck.user?.email || "Admin";

    // ==========================================
    // PATH 1: NEON DATA PROVIDER (Postgres / Drizzle)
    // ==========================================
    if (isNeonDataProvider()) {
      const [order] = await db
        .select()
        .from(orders)
        .where(or(eq(orders.id, cleanId), eq(orders.orderNumber, cleanId)))
        .limit(1);

      if (!order) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      const currentItems = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const currentShipments = await db.select().from(orderShipments).where(eq(orderShipments.orderId, order.id));

      // 1. ADD SHIPMENT
      if (body.shipment_action === "add_shipment") {
        const carrier = (body.carrier || "").trim();
        const trackingNumber = (body.tracking_number || "").trim();
        const trackingUrl = (body.tracking_url || "").trim() || null;
        const deliveryDate = body.delivery_date ? new Date(body.delivery_date) : null;
        const deliveryRoute = (body.delivery_route || "").trim() || null;
        const shipAnyway = body.ship_anyway === true;
        const overrideReason = (body.override_reason || "").trim();

        const elig = canAddTracking(order, { shipAnyway, overrideReason });
        if (!elig.allowed) {
          return NextResponse.json({ success: false, error: elig.reason }, { status: 400 });
        }

        if (!carrier) {
          return NextResponse.json({ success: false, error: "Shipping carrier is required." }, { status: 400 });
        }

        const trkValidation = validateTrackingNumber(trackingNumber);
        if (!trkValidation.valid) {
          return NextResponse.json({ success: false, error: trkValidation.error }, { status: 400 });
        }

        const duplicateOrderId = await checkDuplicateTrackingNeon(order.id, carrier, trackingNumber);
        if (duplicateOrderId) {
          return NextResponse.json(
            {
              success: false,
              error: `Tracking number "${trackingNumber}" with carrier "${carrier}" is already assigned to Order #${duplicateOrderId}.`,
            },
            { status: 400 }
          );
        }

        const shipmentId = `shp_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
        const resolvedUrl = getCarrierTrackingUrl(carrier, trackingNumber, trackingUrl);

        let selectedItemIds: string[] = [];
        if (Array.isArray(body.item_ids) && body.item_ids.length > 0) {
          selectedItemIds = body.item_ids.map(String);
        } else {
          selectedItemIds = currentItems
            .filter((it) => it.status !== "shipped")
            .map((it) => it.id);
          if (selectedItemIds.length === 0 && currentItems.length > 0) {
            selectedItemIds = currentItems.map((it) => it.id);
          }
        }

        const newShipmentRecord: OrderShipment = {
          id: shipmentId,
          order_id: order.orderNumber,
          carrier,
          tracking_number: trackingNumber,
          tracking_url: resolvedUrl,
          shipped_at: now,
          created_by: adminUser,
          notified_email: false,
          notified_whatsapp: false,
          item_ids: selectedItemIds,
        };

        if (body.notified_email === true) {
          try {
            const emailRes = await sendShippingConfirmationEmail({
              order: {
                id: order.id,
                order_id: order.orderNumber,
                customer_name: order.customerName,
                customer_email: order.customerEmail,
                shipping_address: typeof order.shippingAddressSnapshot === "object" ? JSON.stringify(order.shippingAddressSnapshot) : "",
              },
              shipment: newShipmentRecord,
              items: currentItems.map((it) => ({
                id: it.id,
                productName: it.productName,
                quantity: it.quantity,
                price: it.unitPricePaise / 100,
                weight: it.weightGrams ? `${it.weightGrams}g` : undefined,
              })),
            });
            if (emailRes.success) {
              newShipmentRecord.notified_email = true;
              newShipmentRecord.email_sent_at = now;
            }
          } catch (e: any) {
            newShipmentRecord.notified_email = false;
            newShipmentRecord.email_error = e?.message;
          }
        }

        await db.insert(orderShipments).values({
          id: shipmentId,
          orderId: order.id,
          carrier,
          trackingNumber,
          trackingUrl: resolvedUrl,
          status: "manifested",
          deliveryRoute,
          overrideReason: overrideReason || null,
          allocatedItemIds: selectedItemIds,
          estimatedDelivery: deliveryDate,
          shippedAt: new Date(now),
        });

        // Mark allocated items as shipped
        for (const itId of selectedItemIds) {
          await db.update(orderItems).set({ status: "shipped" }).where(and(eq(orderItems.orderId, order.id), eq(orderItems.id, itId)));
        }

        const derivedStatus = deriveOrderStatusFromItems(
          currentItems.map((it) => ({
            ...it,
            shipment_id: selectedItemIds.includes(it.id) || it.status === "shipped" ? shipmentId : undefined,
          })),
          order.status
        );

        await db
          .update(orders)
          .set({
            status: derivedStatus as any,
            updatedAt: new Date(now),
          })
          .where(eq(orders.id, order.id));

        await db.insert(orderStatusLogs).values({
          id: `osl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          orderId: order.id,
          fromStatus: order.status,
          toStatus: derivedStatus,
          actorId: adminUser,
          actorRole: "admin",
          notes: `Tracking added: ${carrier} ${trackingNumber} (${selectedItemIds.length} items). Status: ${derivedStatus}.`,
          createdAt: new Date(now),
        });
      }

      // 2. EDIT SHIPMENT
      else if (body.shipment_action === "edit_shipment") {
        const shipmentId = String(body.shipment_id || "").trim();
        const carrier = (body.carrier || "").trim();
        const trackingNumber = (body.tracking_number || "").trim();
        const trackingUrl = (body.tracking_url || "").trim() || null;
        const deliveryDate = body.delivery_date ? new Date(body.delivery_date) : undefined;
        const deliveryRoute = body.delivery_route !== undefined ? body.delivery_route?.trim() || null : undefined;

        if (order.status === "delivered" || order.status === "cancelled") {
          return NextResponse.json({ success: false, error: "Tracking cannot be edited on delivered or cancelled orders." }, { status: 400 });
        }

        const targetShipment = currentShipments.find((s) => s.id === shipmentId);
        if (!targetShipment) {
          return NextResponse.json({ success: false, error: "Shipment not found." }, { status: 404 });
        }

        if (trackingNumber) {
          const trkValidation = validateTrackingNumber(trackingNumber);
          if (!trkValidation.valid) {
            return NextResponse.json({ success: false, error: trkValidation.error }, { status: 400 });
          }
        }

        if ((carrier && carrier !== targetShipment.carrier) || (trackingNumber && trackingNumber !== targetShipment.trackingNumber)) {
          const checkCarrier = carrier || targetShipment.carrier;
          const checkTracking = trackingNumber || targetShipment.trackingNumber;
          const duplicateOrderId = await checkDuplicateTrackingNeon(order.id, checkCarrier, checkTracking);
          if (duplicateOrderId) {
            return NextResponse.json(
              {
                success: false,
                error: `Tracking number "${checkTracking}" with carrier "${checkCarrier}" is already assigned to Order #${duplicateOrderId}.`,
              },
              { status: 400 }
            );
          }
        }

        await db
          .update(orderShipments)
          .set({
            carrier: carrier || targetShipment.carrier,
            trackingNumber: trackingNumber || targetShipment.trackingNumber,
            trackingUrl: trackingUrl !== undefined ? getCarrierTrackingUrl(carrier || targetShipment.carrier, trackingNumber || targetShipment.trackingNumber, trackingUrl) : targetShipment.trackingUrl,
            deliveryRoute: deliveryRoute !== undefined ? deliveryRoute : targetShipment.deliveryRoute,
            estimatedDelivery: deliveryDate !== undefined ? deliveryDate : targetShipment.estimatedDelivery,
            updatedAt: new Date(now),
          })
          .where(eq(orderShipments.id, shipmentId));

        await db.insert(orderStatusLogs).values({
          id: `osl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          actorId: adminUser,
          actorRole: "admin",
          notes: `Tracking updated for shipment ${shipmentId}: ${carrier || targetShipment.carrier} ${trackingNumber || targetShipment.trackingNumber}`,
          createdAt: new Date(now),
        });
      }

      // 3. REMOVE SHIPMENT
      else if (body.shipment_action === "remove_shipment") {
        const shipmentId = String(body.shipment_id || "").trim();
        if (order.status === "delivered" || order.status === "cancelled") {
          return NextResponse.json({ success: false, error: "Tracking cannot be removed from delivered or cancelled orders." }, { status: 400 });
        }

        const targetShipment = currentShipments.find((s) => s.id === shipmentId);
        if (!targetShipment) {
          return NextResponse.json({ success: false, error: "Shipment not found." }, { status: 404 });
        }

        await db.delete(orderShipments).where(eq(orderShipments.id, shipmentId));

        const unlinkedItemIds = targetShipment.allocatedItemIds || [];
        for (const itId of unlinkedItemIds) {
          await db.update(orderItems).set({ status: "pending" }).where(and(eq(orderItems.orderId, order.id), eq(orderItems.id, itId)));
        }

        const remainingShipments = currentShipments.filter((s) => s.id !== shipmentId);
        const derivedStatus = remainingShipments.length > 0 ? "partially_shipped" : "packed";

        await db
          .update(orders)
          .set({
            status: derivedStatus as any,
            updatedAt: new Date(now),
          })
          .where(eq(orders.id, order.id));

        await db.insert(orderStatusLogs).values({
          id: `osl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          orderId: order.id,
          fromStatus: order.status,
          toStatus: derivedStatus,
          actorId: adminUser,
          actorRole: "admin",
          notes: `Shipment removed: ${targetShipment.carrier} ${targetShipment.trackingNumber}. Status rolled back to ${derivedStatus}.`,
          createdAt: new Date(now),
        });
      }

      // 4. RESEND SHIPPING EMAIL
      else if (body.shipment_action === "resend_shipping_email") {
        const shipmentId = String(body.shipment_id || "").trim();
        const targetShipment = currentShipments.find((s) => s.id === shipmentId);
        if (!targetShipment) {
          return NextResponse.json({ success: false, error: "Shipment not found." }, { status: 404 });
        }

        const emailRes = await sendShippingConfirmationEmail({
          order: {
            id: order.id,
            order_id: order.orderNumber,
            customer_name: order.customerName,
            customer_email: order.customerEmail,
            shipping_address: typeof order.shippingAddressSnapshot === "object" ? JSON.stringify(order.shippingAddressSnapshot) : "",
          },
          shipment: {
            id: targetShipment.id,
            order_id: order.orderNumber,
            carrier: targetShipment.carrier,
            tracking_number: targetShipment.trackingNumber,
            tracking_url: targetShipment.trackingUrl,
            shipped_at: targetShipment.shippedAt instanceof Date ? targetShipment.shippedAt.toISOString() : String(targetShipment.shippedAt),
            created_by: adminUser,
            notified_email: true,
            notified_whatsapp: false,
          },
          items: currentItems.map((it) => ({
            id: it.id,
            productName: it.productName,
            quantity: it.quantity,
            price: it.unitPricePaise / 100,
            weight: it.weightGrams ? `${it.weightGrams}g` : undefined,
          })),
        });

        await db.insert(orderStatusLogs).values({
          id: `osl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          orderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          actorId: adminUser,
          actorRole: "admin",
          notes: `Resend shipping email attempt. Result: ${emailRes.success ? "Success" : emailRes.error}`,
          createdAt: new Date(now),
        });
      }

      // 5. STATUS TRANSITION (Standard State Machine)
      else if (body.status !== undefined) {
        if (body.status === order.status) {
          return NextResponse.json({
            success: true,
            message: `Order is already in status: ${body.status}`,
          });
        }

        const validation = validateStatusTransition(order, body.status, {
          trackingNumber: body.tracking_number || currentShipments[0]?.trackingNumber,
          allowWithoutTracking: body.allowWithoutTracking === true,
          cancellationReason: body.cancellation_reason,
          shipAnyway: body.ship_anyway === true,
          overrideReason: body.override_reason,
        });

        if (!validation.valid) {
          return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
        }

        const nextStatus = validation.normalizedNextStatus!;

        if (nextStatus === "cancelled") {
          const reason = body.cancellation_reason?.trim() || "Cancelled by Administrator";
          // Atomically restore stock inside database transaction with row locks
          await restoreOrderStockAtomic(order.id, adminUser, reason);

          const nextPaymentStatus = order.paymentStatus === "collected" ? "refunded" : "pending";

          await db
            .update(orders)
            .set({
              paymentStatus: nextPaymentStatus,
              updatedAt: new Date(now),
            })
            .where(eq(orders.id, order.id));

          if (order.customerPhone) {
            try {
              const { sendOrderStatusNotificationToCustomer } = await import("../../../../../backend/lib/whatsapp.server.ts");
              await sendOrderStatusNotificationToCustomer({
                orderNumber: order.orderNumber,
                customerPhone: order.customerPhone,
                customerName: order.customerName || "Customer",
                status: "cancelled",
                reason: reason,
              });
            } catch (waErr) {
              console.warn("[Admin Order Cancelled] WhatsApp notification dispatch warning:", waErr);
            }
          }
        } else {
          const updateData: Record<string, any> = {
            status: nextStatus as any,
            updatedAt: new Date(now),
          };

          if (nextStatus === "delivered") {
            updateData.deliveredAt = new Date(now);
            if (body.markCashCollected === true) {
              updateData.paymentStatus = "collected";
            }
          }

          await db.update(orders).set(updateData).where(eq(orders.id, order.id));

          await db.insert(orderStatusLogs).values({
            id: `osl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
            orderId: order.id,
            fromStatus: order.status,
            toStatus: nextStatus,
            actorId: adminUser,
            actorRole: "admin",
            notes: body.status_note || `Status updated from ${order.status} to ${nextStatus}`,
            createdAt: new Date(now),
          });

          if (order.customerPhone) {
            try {
              const { sendOrderStatusNotificationToCustomer } = await import("../../../../../backend/lib/whatsapp.server.ts");
              await sendOrderStatusNotificationToCustomer({
                orderNumber: order.orderNumber,
                customerPhone: order.customerPhone,
                customerName: order.customerName || "Customer",
                status: nextStatus,
                trackingId: currentShipments[0]?.trackingNumber,
                carrier: currentShipments[0]?.carrier,
              });
            } catch (waErr) {
              console.warn("[Admin Order Status] WhatsApp notification dispatch warning:", waErr);
            }
          }
        }
      }

      // 6. PAYMENT ACTIONS
      else if (body.payment_action === "mark_cod_paid" || body.payment_action === "confirm_whatsapp_payment") {
        if (body.payment_action === "confirm_whatsapp_payment" && !body.payment_reference?.trim()) {
          return NextResponse.json(
            { success: false, error: "A payment reference, UTR, or verification note is required to confirm WhatsApp payment." },
            { status: 400 }
          );
        }

        await db
          .update(orders)
          .set({
            paymentStatus: "collected",
            updatedAt: new Date(now),
          })
          .where(eq(orders.id, order.id));

        await db.insert(orderStatusLogs).values({
          id: `osl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          orderId: order.id,
          fromStatus: order.paymentStatus,
          toStatus: "collected",
          actorId: adminUser,
          actorRole: "admin",
          notes: `Payment marked collected. Ref: ${body.payment_reference || "COD Delivery"}`,
          createdAt: new Date(now),
        });
      } else if (body.payment_action === "reject_whatsapp_payment" || body.payment_action === "mark_unpaid") {
        await db
          .update(orders)
          .set({
            paymentStatus: "pending",
            updatedAt: new Date(now),
          })
          .where(eq(orders.id, order.id));

        await db.insert(orderStatusLogs).values({
          id: `osl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          orderId: order.id,
          fromStatus: order.paymentStatus,
          toStatus: "pending",
          actorId: adminUser,
          actorRole: "admin",
          notes: `Payment marked pending / rejected. Reason: ${body.rejection_reason || body.reason || "Unverified"}`,
          createdAt: new Date(now),
        });
      } else if (body.payment_action === "record_refund") {
        const refundAmount = Number(body.refund_amount);
        if (!refundAmount || refundAmount <= 0) {
          return NextResponse.json({ success: false, error: "Please enter a valid refund amount" }, { status: 400 });
        }

        await db
          .update(orders)
          .set({
            paymentStatus: "refunded",
            updatedAt: new Date(now),
          })
          .where(eq(orders.id, order.id));

        await db.insert(orderStatusLogs).values({
          id: `osl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          orderId: order.id,
          fromStatus: order.paymentStatus,
          toStatus: "refunded",
          actorId: adminUser,
          actorRole: "admin",
          notes: `Refund recorded: ₹${refundAmount}. Reason: ${body.refund_reason || "Admin refund"}`,
          createdAt: new Date(now),
        });
      }

      // 7. DIRECT ADDRESS / NOTES UPDATES
      if (body.new_internal_note?.trim()) {
        const noteText = body.new_internal_note.trim();
        const existingAdminNotes = order.adminNotes ? `${order.adminNotes}\n[${now}] ${noteText}` : `[${now}] ${noteText}`;
        await db.update(orders).set({ adminNotes: existingAdminNotes, updatedAt: new Date(now) }).where(eq(orders.id, order.id));
      }

      if (body.shipping_address !== undefined) {
        const existingSnapshot = (order.shippingAddressSnapshot as any) || {};
        existingSnapshot.line1 = body.shipping_address.trim();
        if (body.shipping_pincode && /^\d{6}$/.test(String(body.shipping_pincode).trim())) {
          existingSnapshot.postalCode = String(body.shipping_pincode).trim();
        }
        await db.update(orders).set({ shippingAddressSnapshot: existingSnapshot, updatedAt: new Date(now) }).where(eq(orders.id, order.id));
      }

      // Re-fetch updated order and return
      const [updatedOrder] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
      const updatedShipments = await db.select().from(orderShipments).where(eq(orderShipments.orderId, order.id));

      return NextResponse.json({
        success: true,
        message: "Order updated successfully",
        order: {
          id: updatedOrder.id,
          order_id: updatedOrder.orderNumber,
          status: updatedOrder.status,
          payment_status: updatedOrder.paymentStatus === "collected" ? "paid" : updatedOrder.paymentStatus,
          payment_method: updatedOrder.paymentMethod,
          total: updatedOrder.totalPaise / 100,
          shipments: updatedShipments.map((s) => ({
            id: s.id,
            order_id: s.orderId,
            carrier: s.carrier,
            tracking_number: s.trackingNumber,
            tracking_url: s.trackingUrl,
            shipped_at: s.shippedAt instanceof Date ? s.shippedAt.toISOString() : String(s.shippedAt),
          })),
          _source: "neon",
        },
      });
    }

    // ==========================================
    // PATH 2: FIRESTORE DATA PROVIDER (Default)
    // ==========================================
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    let docRef = adminDb.collection("orders").doc(cleanId);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      const hashDocRef = adminDb.collection("orders").doc(`#${cleanId}`);
      const hashDocSnap = await hashDocRef.get();
      if (hashDocSnap.exists) {
        docRef = hashDocRef;
        docSnap = hashDocSnap;
      }
    }

    if (!docSnap.exists) {
      const qSnap = await adminDb
        .collection("orders")
        .where("order_id", "in", [cleanId, `#${cleanId}`])
        .limit(1)
        .get();

      if (!qSnap.empty) {
        docRef = qSnap.docs[0].ref;
        docSnap = qSnap.docs[0];
      }
    }

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const currentOrder = docSnap.data()!;
    const patch: Record<string, any> = {
      updated_at: now,
    };
    const newLogs: any[] = [];

    // SHIPMENTS CRUD ACTIONS
    if (body.shipment_action === "add_shipment") {
      const carrier = (body.carrier || "").trim();
      const trackingNumber = (body.tracking_number || "").trim();
      const trackingUrl = (body.tracking_url || "").trim() || null;
      const deliveryDate = body.delivery_date ? new Date(body.delivery_date).toISOString() : null;
      const deliveryRoute = (body.delivery_route || "").trim() || null;
      const shipAnyway = body.ship_anyway === true;
      const overrideReason = (body.override_reason || "").trim();

      const elig = canAddTracking(currentOrder, { shipAnyway, overrideReason });
      if (!elig.allowed) {
        return NextResponse.json({ success: false, error: elig.reason }, { status: 400 });
      }

      if (!carrier) {
        return NextResponse.json({ success: false, error: "Shipping carrier is required." }, { status: 400 });
      }

      const trkValidation = validateTrackingNumber(trackingNumber);
      if (!trkValidation.valid) {
        return NextResponse.json({ success: false, error: trkValidation.error }, { status: 400 });
      }

      const duplicateOrderId = await checkDuplicateTrackingFirestore(docRef.id, carrier, trackingNumber);
      if (duplicateOrderId) {
        return NextResponse.json(
          {
            success: false,
            error: `Tracking number "${trackingNumber}" with carrier "${carrier}" is already assigned to Order #${duplicateOrderId}.`,
          },
          { status: 400 }
        );
      }

      const shipmentId = `shp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const resolvedUrl = getCarrierTrackingUrl(carrier, trackingNumber, trackingUrl);
      const currentItems = Array.isArray(currentOrder.items) ? [...currentOrder.items] : [];
      let selectedItemIds: string[] = [];

      if (Array.isArray(body.item_ids) && body.item_ids.length > 0) {
        selectedItemIds = body.item_ids.map(String);
      } else {
        selectedItemIds = currentItems
          .map((it, idx) => ({ id: String(it.id || idx), shipped: Boolean(it.shipment_id) }))
          .filter((it) => !it.shipped)
          .map((it) => it.id);

        if (selectedItemIds.length === 0 && currentItems.length > 0) {
          selectedItemIds = currentItems.map((it, idx) => String(it.id || idx));
        }
      }

      const updatedItems = currentItems.map((it, idx) => {
        const idKey = String(it.id || idx);
        if (selectedItemIds.includes(idKey)) {
          return { ...it, shipment_id: shipmentId };
        }
        return it;
      });

      const newShipment: OrderShipment = {
        id: shipmentId,
        order_id: currentOrder.order_id || docRef.id,
        carrier,
        tracking_number: trackingNumber,
        tracking_url: resolvedUrl,
        shipped_at: now,
        created_by: adminUser,
        notified_email: false,
        notified_whatsapp: false,
        item_ids: selectedItemIds,
      };

      if (body.notified_email === true) {
        try {
          const emailRes = await sendShippingConfirmationEmail({
            order: currentOrder,
            shipment: newShipment,
            items: updatedItems,
          });
          if (emailRes.success) {
            newShipment.notified_email = true;
            newShipment.email_sent_at = now;
            newShipment.email_error = null;
          } else {
            newShipment.notified_email = false;
            newShipment.email_error = emailRes.error || "Email failed to send";
          }
        } catch (emailErr: any) {
          newShipment.notified_email = false;
          newShipment.email_error = emailErr?.message || "Failed to trigger email notification";
        }
      }

      let existingShipments: OrderShipment[] = Array.isArray(currentOrder.shipments)
        ? [...currentOrder.shipments]
        : [];
      if (existingShipments.length === 0 && currentOrder.tracking_number) {
        existingShipments.push({
          id: `shp_legacy_${docRef.id}`,
          order_id: currentOrder.order_id || docRef.id,
          carrier: currentOrder.carrier_name || "Standard Courier",
          tracking_number: currentOrder.tracking_number,
          tracking_url: currentOrder.tracking_url || null,
          shipped_at: currentOrder.shipped_at || now,
          created_by: "System (Migrated)",
          notified_email: false,
          notified_whatsapp: false,
          item_ids: [],
        });
      }
      existingShipments.push(newShipment);

      patch.shipments = existingShipments;
      patch.items = updatedItems;

      const derivedStatus = deriveOrderStatusFromItems(updatedItems, currentOrder.status);
      patch.status = derivedStatus;
      if (derivedStatus === "shipped") {
        patch.shipped_at = now;
      }

      patch.carrier_name = newShipment.carrier;
      patch.tracking_number = newShipment.tracking_number;
      patch.tracking_url = newShipment.tracking_url;
      if (deliveryDate) patch.delivery_date = deliveryDate;
      if (deliveryRoute) patch.delivery_route = deliveryRoute;

      newLogs.push({
        status: derivedStatus,
        title: `Tracking added: ${carrier} ${trackingNumber} (${selectedItemIds.length} item${selectedItemIds.length > 1 ? "s" : ""})`,
        description: `Shipment created by ${adminUser}. Status transitioned to ${derivedStatus}.`,
        updated_by: adminUser,
        timestamp: now,
        field: "tracking",
        old_value: currentOrder.tracking_number || null,
        new_value: `${carrier} ${trackingNumber}`,
      });

      if (shipAnyway && overrideReason) {
        newLogs.push({
          status: derivedStatus,
          title: "WhatsApp Payment Override for Shipment",
          description: `Admin Override Reason: ${overrideReason}`,
          updated_by: adminUser,
          timestamp: now,
        });
      }
    } else if (body.shipment_action === "edit_shipment") {
      const shipmentId = String(body.shipment_id || "").trim();
      const carrier = (body.carrier || "").trim();
      const trackingNumber = (body.tracking_number || "").trim();
      const trackingUrl = (body.tracking_url || "").trim() || null;
      const deliveryDate = body.delivery_date ? new Date(body.delivery_date).toISOString() : undefined;
      const deliveryRoute = body.delivery_route !== undefined ? body.delivery_route?.trim() || null : undefined;

      const currentStatus = String(currentOrder.status || "").toLowerCase().trim();
      if (currentStatus === "delivered" || currentStatus === "cancelled") {
        return NextResponse.json(
          { success: false, error: "Tracking cannot be edited on delivered or cancelled orders." },
          { status: 400 }
        );
      }

      if (!shipmentId) {
        return NextResponse.json({ success: false, error: "Shipment ID is required for editing." }, { status: 400 });
      }

      let existingShipments: OrderShipment[] = Array.isArray(currentOrder.shipments)
        ? [...currentOrder.shipments]
        : [];
      const targetIdx = existingShipments.findIndex((s) => s.id === shipmentId);
      if (targetIdx === -1) {
        return NextResponse.json({ success: false, error: "Shipment not found." }, { status: 404 });
      }

      const oldShipment = existingShipments[targetIdx];

      if (trackingNumber) {
        const trkValidation = validateTrackingNumber(trackingNumber);
        if (!trkValidation.valid) {
          return NextResponse.json({ success: false, error: trkValidation.error }, { status: 400 });
        }
      }

      if (
        (carrier && carrier !== oldShipment.carrier) ||
        (trackingNumber && trackingNumber !== oldShipment.tracking_number)
      ) {
        const checkCarrier = carrier || oldShipment.carrier;
        const checkTracking = trackingNumber || oldShipment.tracking_number;
        const duplicateOrderId = await checkDuplicateTrackingFirestore(docRef.id, checkCarrier, checkTracking);
        if (duplicateOrderId) {
          return NextResponse.json(
            {
              success: false,
              error: `Tracking number "${checkTracking}" with carrier "${checkCarrier}" is already assigned to Order #${duplicateOrderId}.`,
            },
            { status: 400 }
          );
        }
      }

      const updatedShipment: OrderShipment = {
        ...oldShipment,
        carrier: carrier || oldShipment.carrier,
        tracking_number: trackingNumber || oldShipment.tracking_number,
        tracking_url: trackingUrl !== undefined ? getCarrierTrackingUrl(carrier || oldShipment.carrier, trackingNumber || oldShipment.tracking_number, trackingUrl) : oldShipment.tracking_url,
      };

      existingShipments[targetIdx] = updatedShipment;
      patch.shipments = existingShipments;
      patch.carrier_name = updatedShipment.carrier;
      patch.tracking_number = updatedShipment.tracking_number;
      patch.tracking_url = updatedShipment.tracking_url;
      if (deliveryDate !== undefined) patch.delivery_date = deliveryDate;
      if (deliveryRoute !== undefined) patch.delivery_route = deliveryRoute;

      newLogs.push({
        status: currentOrder.status,
        title: `Tracking updated: ${updatedShipment.carrier} ${updatedShipment.tracking_number}`,
        description: `Old: ${oldShipment.carrier} ${oldShipment.tracking_number} → New: ${updatedShipment.carrier} ${updatedShipment.tracking_number}.`,
        updated_by: adminUser,
        timestamp: now,
        field: "tracking",
        old_value: `${oldShipment.carrier} ${oldShipment.tracking_number}`,
        new_value: `${updatedShipment.carrier} ${updatedShipment.tracking_number}`,
      });
    } else if (body.shipment_action === "remove_shipment") {
      const shipmentId = String(body.shipment_id || "").trim();
      const currentStatus = String(currentOrder.status || "").toLowerCase().trim();
      if (currentStatus === "delivered" || currentStatus === "cancelled") {
        return NextResponse.json(
          { success: false, error: "Tracking cannot be removed from delivered or cancelled orders." },
          { status: 400 }
        );
      }

      let existingShipments: OrderShipment[] = Array.isArray(currentOrder.shipments)
        ? [...currentOrder.shipments]
        : [];
      const targetShipment = existingShipments.find((s) => s.id === shipmentId);
      if (!targetShipment) {
        return NextResponse.json({ success: false, error: "Shipment not found." }, { status: 404 });
      }

      const filteredShipments = existingShipments.filter((s) => s.id !== shipmentId);
      patch.shipments = filteredShipments;

      const currentItems = Array.isArray(currentOrder.items) ? [...currentOrder.items] : [];
      const updatedItems = currentItems.map((it) => {
        if (it.shipment_id === shipmentId) {
          const copy = { ...it };
          delete copy.shipment_id;
          return copy;
        }
        return it;
      });
      patch.items = updatedItems;

      const derivedStatus = deriveOrderStatusFromItems(updatedItems, currentOrder.status);
      patch.status = derivedStatus;

      if (filteredShipments.length > 0) {
        const lastRemaining = filteredShipments[filteredShipments.length - 1];
        patch.carrier_name = lastRemaining.carrier;
        patch.tracking_number = lastRemaining.tracking_number;
        patch.tracking_url = lastRemaining.tracking_url;
      } else {
        patch.carrier_name = null;
        patch.tracking_number = null;
        patch.tracking_url = null;
      }

      newLogs.push({
        status: derivedStatus,
        title: `Tracking removed: ${targetShipment.carrier} ${targetShipment.tracking_number}`,
        description: `Shipment removed by ${adminUser}. Lines returned to unshipped. Status re-derived to ${derivedStatus}.`,
        updated_by: adminUser,
        timestamp: now,
        field: "tracking",
        old_value: `${targetShipment.carrier} ${targetShipment.tracking_number}`,
        new_value: null,
      });
    } else if (body.shipment_action === "resend_shipping_email") {
      const shipmentId = String(body.shipment_id || "").trim();
      let existingShipments: OrderShipment[] = Array.isArray(currentOrder.shipments)
        ? [...currentOrder.shipments]
        : [];
      const targetIdx = existingShipments.findIndex((s) => s.id === shipmentId);
      if (targetIdx === -1) {
        return NextResponse.json({ success: false, error: "Shipment not found." }, { status: 404 });
      }

      const targetShipment = existingShipments[targetIdx];
      const emailRes = await sendShippingConfirmationEmail({
        order: currentOrder,
        shipment: targetShipment,
        items: currentOrder.items,
      });

      if (emailRes.success) {
        targetShipment.notified_email = true;
        targetShipment.email_sent_at = now;
        targetShipment.email_error = null;
      } else {
        targetShipment.notified_email = false;
        targetShipment.email_error = emailRes.error || "Email failed to send via Resend";
      }

      existingShipments[targetIdx] = targetShipment;
      patch.shipments = existingShipments;

      newLogs.push({
        status: currentOrder.status,
        title: `Shipping Email Resent: ${targetShipment.carrier} ${targetShipment.tracking_number}`,
        description: emailRes.success
          ? `Resend shipping confirmation email sent successfully by ${adminUser}.`
          : `Resend email attempt recorded: ${emailRes.error}`,
        updated_by: adminUser,
        timestamp: now,
      });

      await docRef.update(patch);

      return NextResponse.json({
        success: emailRes.success,
        message: emailRes.success ? "Shipping confirmation email sent via Resend" : emailRes.error,
        shipment: targetShipment,
        order: { id: docRef.id, ...currentOrder, ...patch },
      });
    } else if (body.status !== undefined) {
      if (body.status === currentOrder.status) {
        return NextResponse.json({
          success: true,
          message: `Order is already in status: ${body.status}`,
          order: { id: docRef.id, ...currentOrder },
        });
      }

      const validation = validateStatusTransition(currentOrder, body.status, {
        trackingNumber: body.tracking_number || currentOrder.tracking_number,
        allowWithoutTracking: body.allowWithoutTracking === true,
        cancellationReason: body.cancellation_reason,
        shipAnyway: body.ship_anyway === true,
        overrideReason: body.override_reason,
      });

      if (!validation.valid) {
        return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
      }

      const nextStatus = validation.normalizedNextStatus!;
      patch.status = nextStatus;

      newLogs.push({
        status: nextStatus,
        title: `Status Changed: ${String(currentOrder.status || "").toUpperCase()} → ${nextStatus.toUpperCase()}`,
        description: body.status_note || `Order status updated to ${nextStatus}.`,
        updated_by: adminUser,
        timestamp: now,
        field: "status",
        old_value: currentOrder.status,
        new_value: nextStatus,
      });

      if (nextStatus === "cancelled") {
        patch.cancellation_reason = body.cancellation_reason?.trim() || "Cancelled by Administrator";
        if (currentOrder.payment_status === "paid") {
          patch.payment_status = "refunded";
        } else {
          patch.payment_status = "cancelled";
        }

        const items = Array.isArray(currentOrder.items) ? currentOrder.items : [];
        for (const item of items) {
          const slug = item.slug || item.productId;
          if (slug) {
            const returnQty = Number(item.qty || item.quantity || 1);
            const restoreGrams = Number(
              item.weight_gm || item.grams || parseWeightToGrams(item.weight) * returnQty
            );



            if (adminDb) {
              try {
                const prodQuery = await adminDb
                  .collection("farmer_products")
                  .where("slug", "==", slug)
                  .limit(1)
                  .get();

                if (!prodQuery.empty) {
                  const prodRef = prodQuery.docs[0].ref;
                  const prodData = prodQuery.docs[0].data();
                  const curStockGrams =
                    typeof prodData.stock_grams === "number"
                      ? prodData.stock_grams
                      : Number(prodData.stock ?? 0) * 1000;
                  const newStockGrams = curStockGrams + restoreGrams;

                  await prodRef.update({
                    stock_grams: newStockGrams,
                    stock: Math.floor(newStockGrams / 1000),
                    updated_at: now,
                  });
                }
              } catch (err) {
                console.warn("[Order Cancellation] Firestore restock error for slug:", slug, err);
              }
            }
          }
        }
      }

      if (nextStatus === "shipped") patch.shipped_at = now;
      if (nextStatus === "delivered") {
        patch.delivered_at = now;
        if (body.markCashCollected === true) {
          patch.payment_status = "paid";
          patch.payment_received_at = now;
          patch.payment_collector_name = body.collector_name || "Delivery Agent";
        }
      }
    }

    // Payment actions in Firestore
    if (body.payment_action === "mark_cod_paid") {
      patch.payment_status = "paid";
      patch.payment_received_at = body.payment_date || now;
      patch.payment_collector_name = body.collector_name?.trim() || "Cashier / Admin";
      patch.payment_reference = body.payment_reference?.trim() || "Cash Collected";
    } else if (body.payment_action === "confirm_whatsapp_payment") {
      if (!body.payment_reference?.trim()) {
        return NextResponse.json(
          { success: false, error: "A payment reference, UTR, or verification note is required to confirm WhatsApp payment." },
          { status: 400 }
        );
      }
      patch.payment_status = "paid";
      patch.payment_received_at = body.payment_date || now;
      patch.payment_reference = body.payment_reference.trim();
    } else if (body.payment_action === "reject_whatsapp_payment") {
      patch.payment_status = "unpaid";
      patch.payment_failure_reason = body.rejection_reason?.trim() || "Payment verification failed or timed out.";
    } else if (body.payment_action === "mark_unpaid") {
      patch.payment_status = "unpaid";
    } else if (body.payment_action === "record_refund") {
      const refundAmount = Number(body.refund_amount);
      if (!refundAmount || refundAmount <= 0) {
        return NextResponse.json({ success: false, error: "Please enter a valid refund amount" }, { status: 400 });
      }
      patch.payment_status = "refunded";
      patch.refund_amount = refundAmount;
      patch.refund_reason = body.refund_reason?.trim() || "Refund issued by admin";
      patch.refunded_at = now;
    }

    if (body.shipping_address !== undefined) {
      if (!body.shipping_address?.trim()) {
        return NextResponse.json({ success: false, error: "Shipping address cannot be empty" }, { status: 400 });
      }
      patch.shipping_address = body.shipping_address.trim();
    }
    if (body.shipping_pincode !== undefined) {
      if (!/^\d{6}$/.test(String(body.shipping_pincode).trim())) {
        return NextResponse.json({ success: false, error: "Pincode must be exactly 6 digits" }, { status: 400 });
      }
      patch.shipping_pincode = String(body.shipping_pincode).trim();
    }
    if (body.billing_address !== undefined) {
      patch.billing_address = body.billing_address?.trim() || null;
    }

    if (body.new_internal_note?.trim()) {
      const existingNotes = Array.isArray(currentOrder.internal_notes) ? currentOrder.internal_notes : [];
      patch.internal_notes = [
        ...existingNotes,
        {
          id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          note: body.new_internal_note.trim(),
          created_at: now,
          created_by: adminUser,
        },
      ];
    }

    const existingHistory = Array.isArray(currentOrder.tracking_history) ? currentOrder.tracking_history : [];
    if (newLogs.length > 0) {
      patch.tracking_history = [...existingHistory, ...newLogs];
    }

    await docRef.update(patch);

    if (patch.status && (currentOrder.customer_phone || currentOrder.phone || currentOrder.customerPhone)) {
      try {
        const { sendOrderStatusNotificationToCustomer } = await import("../../../../../backend/lib/whatsapp.server.ts");
        const phone = currentOrder.customer_phone || currentOrder.phone || currentOrder.customerPhone;
        await sendOrderStatusNotificationToCustomer({
          orderNumber: currentOrder.order_id || docRef.id,
          customerPhone: phone,
          customerName: currentOrder.customer_name || currentOrder.name || currentOrder.customerName || "Customer",
          status: patch.status,
          trackingId: patch.tracking_number || currentOrder.tracking_number,
          carrier: patch.carrier_name || currentOrder.carrier_name,
          reason: patch.cancellation_reason,
        });
      } catch (waErr) {
        console.warn("[Firestore Admin Order Status] WhatsApp notification dispatch warning:", waErr);
      }
    }

    const updatedSnap = await docRef.get();
    const updatedData = updatedSnap.data() || {};

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      order: {
        id: updatedSnap.id,
        ...updatedData,
        _source: "firestore",
      },
    });
  } catch (error: any) {
    console.error("[Admin Order Detail PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}
