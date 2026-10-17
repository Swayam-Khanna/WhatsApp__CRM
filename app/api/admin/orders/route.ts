import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { desc, asc, eq, and, or, gte, lte, ilike, count, sql } from "drizzle-orm";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";
import { isOrderPendingReview } from "@/lib/orders/order-constants";
import { calculateOrderTotals } from "@/lib/orders/order-pricing";
import { generateUniqueOrderId } from "@/lib/orders/order-id-generator.server";
import { db } from "../../../../backend/db.ts";
import { orders, orderItems, orderStatusLogs, farmerProducts, productInventory, profiles } from "../../../../backend/schema/index.ts";
import { adminDb } from "../../../../frontend/lib/firebase-admin.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseDateRange(
  range?: string,
  from?: string,
  to?: string
): { start: Date; end: Date; prevStart: Date; prevEnd: Date } | null {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);

  if (range === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start);
    return { start, end, prevStart, prevEnd };
  } else if (range === "last_7_days") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start);
    return { start, end, prevStart, prevEnd };
  } else if (range === "last_30_days") {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start);
    return { start, end, prevStart, prevEnd };
  } else if (range === "last_90_days") {
    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(start.getTime() - 90 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start);
    return { start, end, prevStart, prevEnd };
  } else if (range === "this_year") {
    start = new Date(now.getFullYear(), 0, 1);
    const prevStart = new Date(now.getFullYear() - 1, 0, 1);
    const prevEnd = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
    );
    return { start, end, prevStart, prevEnd };
  } else if (from) {
    start = new Date(from);
    end = to ? new Date(to) : now;
    const duration = Math.max(1000, end.getTime() - start.getTime());
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start);
    return { start, end, prevStart, prevEnd };
  }
  return null;
}

// -------------------------------------------------------------
// NEON / POSTGRES IMPLEMENTATION
// -------------------------------------------------------------
async function handleNeonGet(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") || "all";
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const paymentMethod = (searchParams.get("payment_method") || "").trim().toLowerCase();
  const paymentStatus = (searchParams.get("payment_status") || "").trim().toLowerCase();
  const dateRange = searchParams.get("date_range") || "last_30_days";
  const fromDate = searchParams.get("from_date") || undefined;
  const toDate = searchParams.get("to_date") || undefined;
  const minAmount = searchParams.get("min_amount") ? parseFloat(searchParams.get("min_amount")!) : undefined;
  const maxAmount = searchParams.get("max_amount") ? parseFloat(searchParams.get("max_amount")!) : undefined;

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = (searchParams.get("sort_order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const conditions: any[] = [];

  if (statusParam && statusParam !== "all") {
    if (statusParam === "pending") {
      conditions.push(eq(orders.status, "pending"));
    } else if (statusParam === "shipped") {
      conditions.push(or(eq(orders.status, "shipped"), eq(orders.status, "partially_shipped")));
    } else if (statusParam === "cancelled") {
      conditions.push(eq(orders.status, "cancelled"));
    } else {
      conditions.push(eq(orders.status, statusParam as any));
    }
  }

  if (paymentMethod) {
    conditions.push(eq(orders.paymentMethod, paymentMethod as any));
  }

  if (paymentStatus) {
    const ps = paymentStatus === "paid" ? "collected" : paymentStatus;
    conditions.push(eq(orders.paymentStatus, ps as any));
  }

  const parsedRange = parseDateRange(dateRange, fromDate, toDate);
  if (parsedRange) {
    conditions.push(gte(orders.createdAt, parsedRange.start));
    conditions.push(lte(orders.createdAt, parsedRange.end));
  }

  if (minAmount !== undefined) {
    conditions.push(gte(orders.totalPaise, Math.round(minAmount * 100)));
  }
  if (maxAmount !== undefined) {
    conditions.push(lte(orders.totalPaise, Math.round(maxAmount * 100)));
  }

  if (search) {
    conditions.push(
      or(
        ilike(orders.orderNumber, `%${search}%`),
        ilike(orders.customerName, `%${search}%`),
        ilike(orders.customerPhone, `%${search}%`),
        ilike(orders.customerEmail, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderColumn: any = orders.createdAt;
  if (sortBy === "total" || sortBy === "total_amount") {
    orderColumn = orders.totalPaise;
  } else if (sortBy === "customer_name") {
    orderColumn = orders.customerName;
  }

  const [countResult] = await db
    .select({ total: count() })
    .from(orders)
    .where(whereClause);

  const totalFiltered = Number(countResult?.total || 0);

  const paginatedOrders = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn))
    .limit(limit)
    .offset((page - 1) * limit);

  const allOrders = await db.select().from(orders);

  const tabCounts = {
    all: allOrders.length,
    pending: allOrders.filter((o) => o.status === "pending").length,
    confirmed: allOrders.filter((o) => o.status === "confirmed").length,
    packed: allOrders.filter((o) => o.status === "packed").length,
    shipped: allOrders.filter((o) => o.status === "shipped" || o.status === "partially_shipped").length,
    delivered: allOrders.filter((o) => o.status === "delivered").length,
    cancelled: allOrders.filter((o) => o.status === "cancelled").length,
  };

  let currentPeriodSales = 0;
  let currentPeriodOrdersCount = 0;
  let prevPeriodSales = 0;
  let prevPeriodOrdersCount = 0;

  allOrders.forEach((o) => {
    const oDate = new Date(o.createdAt);
    const isCancelled = o.status === "cancelled";
    const totalInr = o.totalPaise / 100;

    if (parsedRange) {
      if (oDate >= parsedRange.start && oDate <= parsedRange.end) {
        if (!isCancelled) currentPeriodSales += totalInr;
        currentPeriodOrdersCount++;
      } else if (oDate >= parsedRange.prevStart && oDate < parsedRange.prevEnd) {
        if (!isCancelled) prevPeriodSales += totalInr;
        prevPeriodOrdersCount++;
      }
    }
  });

  const currentAov = currentPeriodOrdersCount > 0 ? currentPeriodSales / currentPeriodOrdersCount : 0;
  const prevAov = prevPeriodOrdersCount > 0 ? prevPeriodSales / prevPeriodOrdersCount : 0;

  const calcPct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const stats = {
    sales: Math.round(currentPeriodSales * 100) / 100,
    salesChangePct: calcPct(currentPeriodSales, prevPeriodSales),
    ordersCount: currentPeriodOrdersCount,
    ordersCountChangePct: calcPct(currentPeriodOrdersCount, prevPeriodOrdersCount),
    avgOrderValue: Math.round(currentAov * 100) / 100,
    aovChangePct: calcPct(currentAov, prevAov),
    totalOrders: allOrders.length,
    pendingReview: tabCounts.pending,
    dateRange,
  };

  const serialized = paginatedOrders.map((o) => ({
    ...o,
    subtotal: o.subtotalPaise / 100,
    total: o.totalPaise / 100,
    total_amount: o.totalPaise / 100,
    shipping_cost: o.shippingPaise / 100,
    discount_amount: o.discountPaise / 100,
    tax: o.taxPaise / 100,
    order_id: o.orderNumber,
    customer_name: o.customerName,
    customer_email: o.customerEmail,
    customer_phone: o.customerPhone,
    payment_method: o.paymentMethod,
    payment_status: o.paymentStatus === "collected" ? "paid" : o.paymentStatus,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    _source: "neon",
  }));

  const totalPages = Math.ceil(totalFiltered / limit) || 1;

  return NextResponse.json({
    success: true,
    orders: serialized,
    pagination: {
      page,
      limit,
      total: totalFiltered,
      totalPages,
    },
    stats,
    tabCounts,
  });
}

// -------------------------------------------------------------
// FIRESTORE IMPLEMENTATION (Default)
// -------------------------------------------------------------
async function handleFirestoreGet(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") || "all";
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const paymentMethod = (searchParams.get("payment_method") || "").trim().toLowerCase();
  const paymentStatus = (searchParams.get("payment_status") || "").trim().toLowerCase();
  const dateRange = searchParams.get("date_range") || "last_30_days";
  const fromDate = searchParams.get("from_date") || undefined;
  const toDate = searchParams.get("to_date") || undefined;
  const minAmount = searchParams.get("min_amount") ? parseFloat(searchParams.get("min_amount")!) : undefined;
  const maxAmount = searchParams.get("max_amount") ? parseFloat(searchParams.get("max_amount")!) : undefined;

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = (searchParams.get("sort_order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const snap = await adminDb.collection("orders").get();
  let allOrders: any[] = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  allOrders = allOrders.filter((o: any) => o.id && !String(o.id).startsWith("mock_"));

  const tabCounts = {
    all: allOrders.length,
    pending: allOrders.filter((o) => ["pending", "cod_pending", "pending_payment", "pending_manual_payment"].includes(String(o.status || "").toLowerCase())).length,
    confirmed: allOrders.filter((o) => String(o.status || "").toLowerCase() === "confirmed").length,
    packed: allOrders.filter((o) => String(o.status || "").toLowerCase() === "packed").length,
    shipped: allOrders.filter((o) => ["shipped", "partially_shipped"].includes(String(o.status || "").toLowerCase())).length,
    delivered: allOrders.filter((o) => String(o.status || "").toLowerCase() === "delivered").length,
    cancelled: allOrders.filter((o) => ["cancelled", "canceled"].includes(String(o.status || "").toLowerCase())).length,
  };

  const parsedRange = parseDateRange(dateRange, fromDate, toDate);
  let currentPeriodSales = 0;
  let currentPeriodOrdersCount = 0;
  let prevPeriodSales = 0;
  let prevPeriodOrdersCount = 0;

  allOrders.forEach((o: any) => {
    const orderDate = new Date(o.created_at || o.createdAt || 0);
    const isCancelled = ["cancelled", "canceled"].includes(String(o.status || "").toLowerCase());
    const totalVal = Number(o.total ?? o.total_amount ?? 0);

    if (parsedRange) {
      if (orderDate >= parsedRange.start && orderDate <= parsedRange.end) {
        if (!isCancelled) currentPeriodSales += totalVal;
        currentPeriodOrdersCount++;
      } else if (orderDate >= parsedRange.prevStart && orderDate < parsedRange.prevEnd) {
        if (!isCancelled) prevPeriodSales += totalVal;
        prevPeriodOrdersCount++;
      }
    }
  });

  const currentAov = currentPeriodOrdersCount > 0 ? currentPeriodSales / currentPeriodOrdersCount : 0;
  const prevAov = prevPeriodOrdersCount > 0 ? prevPeriodSales / prevPeriodOrdersCount : 0;

  const calcPct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const stats = {
    sales: Math.round(currentPeriodSales * 100) / 100,
    salesChangePct: calcPct(currentPeriodSales, prevPeriodSales),
    ordersCount: currentPeriodOrdersCount,
    ordersCountChangePct: calcPct(currentPeriodOrdersCount, prevPeriodOrdersCount),
    avgOrderValue: Math.round(currentAov * 100) / 100,
    aovChangePct: calcPct(currentAov, prevAov),
    totalOrders: allOrders.length,
    pendingReview: tabCounts.pending,
    dateRange,
  };

  const filtered = allOrders.filter((order: any) => {
    const oStatus = String(order.status || "").toLowerCase();
    const oPaymentStatus = String(order.payment_status || "").toLowerCase();
    const oPaymentMethod = String(order.payment_method || "").toLowerCase();
    const oTotal = Number(order.total ?? order.total_amount ?? 0);
    const orderDate = new Date(order.created_at || order.createdAt || 0);

    if (statusParam && statusParam !== "all") {
      if (statusParam === "pending" && !["pending", "cod_pending", "pending_payment", "pending_manual_payment"].includes(oStatus)) return false;
      if (statusParam === "confirmed" && oStatus !== "confirmed") return false;
      if (statusParam === "packed" && oStatus !== "packed") return false;
      if (statusParam === "shipped" && !["shipped", "partially_shipped"].includes(oStatus)) return false;
      if (statusParam === "delivered" && oStatus !== "delivered") return false;
      if (statusParam === "cancelled" && !["cancelled", "canceled"].includes(oStatus)) return false;
    }

    if (paymentMethod && oPaymentMethod !== paymentMethod) return false;
    if (paymentStatus && oPaymentStatus !== paymentStatus) return false;

    if (parsedRange) {
      if (orderDate < parsedRange.start || orderDate > parsedRange.end) return false;
    }

    if (minAmount !== undefined && oTotal < minAmount) return false;
    if (maxAmount !== undefined && oTotal > maxAmount) return false;

    if (search) {
      const idMatch = String(order.id || "").toLowerCase().includes(search) || String(order.order_id || "").toLowerCase().includes(search);
      const nameMatch = String(order.customer_name || "").toLowerCase().includes(search);
      const phoneMatch = String(order.customer_phone || "").toLowerCase().includes(search);
      const emailMatch = String(order.customer_email || "").toLowerCase().includes(search);
      if (!idMatch && !nameMatch && !phoneMatch && !emailMatch) return false;
    }

    return true;
  });

  filtered.sort((a: any, b: any) => {
    let valA = a[sortBy] ?? a.created_at ?? "";
    let valB = b[sortBy] ?? b.created_at ?? "";
    if (sortBy === "total" || sortBy === "total_amount") {
      valA = Number(a.total ?? a.total_amount ?? 0);
      valB = Number(b.total ?? b.total_amount ?? 0);
    }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.ceil(totalFiltered / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedOrders = filtered.slice(startIndex, startIndex + limit).map((o) => ({
    ...o,
    _source: "firestore",
  }));

  return NextResponse.json({
    success: true,
    orders: paginatedOrders,
    pagination: {
      page,
      limit,
      total: totalFiltered,
      totalPages,
    },
    stats,
    tabCounts,
  });
}

export async function GET(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    if (isNeonDataProvider()) {
      return await handleNeonGet(req);
    }
    return await handleFirestoreGet(req);
  } catch (error: any) {
    console.error("[Admin Orders API] Error fetching orders:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load orders: " + (error?.message || "Internal error"),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingPincode,
      billingAddress,
      items,
      shippingCost = 0,
      discountAmount = 0,
      paymentMethod,
      orderNote,
      tags = [],
    } = body;

    if (!customerName?.trim()) {
      return NextResponse.json({ success: false, error: "Customer name is required" }, { status: 400 });
    }
    if (!customerPhone?.trim()) {
      return NextResponse.json({ success: false, error: "Customer phone number is required" }, { status: 400 });
    }
    if (!shippingAddress?.trim()) {
      return NextResponse.json({ success: false, error: "Shipping address is required" }, { status: 400 });
    }
    if (!shippingPincode || !/^\d{6}$/.test(String(shippingPincode).trim())) {
      return NextResponse.json({ success: false, error: "A valid 6-digit PIN code is required" }, { status: 400 });
    }

    const cleanMethod = String(paymentMethod || "").toLowerCase().trim();
    if (cleanMethod !== "cod" && cleanMethod !== "whatsapp") {
      return NextResponse.json(
        { success: false, error: "Payment method must be either 'cod' (Cash on Delivery) or 'whatsapp' (Manual WhatsApp)" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item must be added to the order" }, { status: 400 });
    }

    // ==========================================
    // PATH 1: NEON DATA PROVIDER
    // ==========================================
    if (isNeonDataProvider()) {
      const validatedItems: any[] = [];
      for (const line of items) {
        const slug = line.slug || line.productId;
        const [prod] = await db
          .select()
          .from(farmerProducts)
          .where(or(eq(farmerProducts.id, slug), eq(farmerProducts.slug, slug)))
          .limit(1);

        if (!prod) {
          return NextResponse.json({ success: false, error: `Product "${slug}" was not found in live catalog.` }, { status: 400 });
        }

        const requestedQty = Math.max(1, parseInt(String(line.qty || 1), 10));
        if (prod.stock < requestedQty) {
          return NextResponse.json(
            { success: false, error: `Insufficient stock for "${prod.name}". Available: ${prod.stock}, Requested: ${requestedQty}.` },
            { status: 400 }
          );
        }

        const unitPricePaise = Math.round(Number(line.unitPrice || prod.price || 0) * 100);
        const weightGrams = prod.stockGrams > 0 ? Math.round(prod.stockGrams / Math.max(1, prod.stock)) : 500;

        validatedItems.push({
          productId: prod.id,
          farmerId: prod.farmerId,
          productName: prod.name,
          productSlug: prod.slug,
          productImage: prod.images?.[0] || null,
          quantity: requestedQty,
          unitPricePaise,
          totalPaise: unitPricePaise * requestedQty,
          weightGrams: weightGrams * requestedQty,
          gstRate: prod.gstRate ?? 5,
          gstPaise: Math.round((unitPricePaise * requestedQty * (prod.gstRate ?? 5)) / 100),
        });
      }

      const subtotalPaise = validatedItems.reduce((acc, it) => acc + it.totalPaise, 0);
      const shippingPaise = Math.round(Number(shippingCost) * 100);
      const discountPaise = Math.round(Number(discountAmount) * 100);
      const taxPaise = validatedItems.reduce((acc, it) => acc + it.gstPaise, 0);
      const totalPaise = Math.max(0, subtotalPaise + shippingPaise + taxPaise - discountPaise);

      const uniqueOrderId = await generateUniqueOrderId();
      const orderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const now = new Date();
      const guestUserId = `admin_manual_${customerPhone.replace(/\D/g, "")}`;

      await db.transaction(async (tx) => {
        // Ensure profile
        const [existingProfile] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, guestUserId)).limit(1);
        if (!existingProfile) {
          await tx.insert(profiles).values({
            id: guestUserId,
            fullName: customerName.trim(),
            email: customerEmail ? customerEmail.trim().toLowerCase() : null,
            phone: customerPhone.trim(),
          }).onConflictDoNothing();
        }

        // Decrement stock
        for (const it of validatedItems) {
          await tx
            .update(farmerProducts)
            .set({
              stock: sql`GREATEST(0, ${farmerProducts.stock} - ${it.quantity})`,
              stockGrams: sql`GREATEST(0, ${farmerProducts.stockGrams} - ${it.weightGrams})`,
              updatedAt: now,
            })
            .where(eq(farmerProducts.id, it.productId));

          await tx
            .update(productInventory)
            .set({
              stockGrams: sql`GREATEST(0, ${productInventory.stockGrams} - ${it.weightGrams})`,
              soldCount: sql`${productInventory.soldCount} + ${it.weightGrams}`,
              updatedAt: now,
            })
            .where(eq(productInventory.productId, it.productId));
        }

        // Insert order
        await tx.insert(orders).values({
          id: orderId,
          orderNumber: uniqueOrderId,
          userId: guestUserId,
          customerName: customerName.trim(),
          customerEmail: customerEmail ? customerEmail.trim().toLowerCase() : "guest@prajnaafarm.com",
          customerPhone: customerPhone.trim(),
          status: "confirmed",
          paymentStatus: "pending",
          paymentMethod: cleanMethod,
          subtotalPaise,
          taxPaise,
          shippingPaise,
          discountPaise,
          totalPaise,
          shippingAddressSnapshot: {
            fullName: customerName.trim(),
            line1: shippingAddress.trim(),
            postalCode: shippingPincode.trim(),
            phone: customerPhone.trim(),
          },
          billingAddressSnapshot: billingAddress ? { line1: billingAddress.trim() } : null,
          customerNotes: orderNote?.trim() || null,
          createdAt: now,
          updatedAt: now,
        });

        for (const it of validatedItems) {
          await tx.insert(orderItems).values({
            id: `item_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
            orderId,
            productId: it.productId,
            farmerId: it.farmerId,
            productName: it.productName,
            productSlug: it.productSlug,
            productImage: it.productImage,
            quantity: it.quantity,
            unitPricePaise: it.unitPricePaise,
            totalPaise: it.totalPaise,
            weightGrams: it.weightGrams,
            gstRate: it.gstRate,
            gstPaise: it.gstPaise,
            status: "pending",
            createdAt: now,
          });
        }

        await tx.insert(orderStatusLogs).values({
          id: `osl_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
          orderId,
          fromStatus: null,
          toStatus: "confirmed",
          actorId: "Admin",
          actorRole: "admin",
          notes: `Manual Order #${uniqueOrderId} created by Admin. Method: ${cleanMethod.toUpperCase()}`,
          createdAt: now,
        });
      });

      return NextResponse.json({
        success: true,
        message: `Order #${uniqueOrderId} created successfully`,
        order: {
          id: orderId,
          order_id: uniqueOrderId,
          customer_name: customerName.trim(),
          status: "confirmed",
          payment_status: "pending",
          payment_method: cleanMethod,
          total: totalPaise / 100,
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

    const validatedItems: any[] = [];
    for (const line of items) {
      const slug = line.slug || line.productId;
      if (!slug) {
        return NextResponse.json({ success: false, error: "Each product item must have a valid slug or ID" }, { status: 400 });
      }

      const prodQuery = await adminDb
        .collection("farmer_products")
        .where("slug", "==", slug)
        .limit(1)
        .get();

      if (prodQuery.empty) {
        return NextResponse.json({ success: false, error: `Product "${slug}" was not found in the live catalog.` }, { status: 400 });
      }

      const prodDoc = prodQuery.docs[0];
      const prodData = prodDoc.data();
      const requestedQty = Math.max(1, parseInt(String(line.qty || 1), 10));
      const liveStock = Number(prodData.stock ?? 0);

      if (liveStock < requestedQty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for "${prodData.name}". Available: ${liveStock}, Requested: ${requestedQty}.`,
          },
          { status: 400 }
        );
      }

      const unitPrice = Number(prodData.price || line.unitPrice || 0);

      validatedItems.push({
        productId: prodData.id || prodDoc.id,
        name: prodData.name,
        productName: prodData.name,
        slug: prodData.slug,
        unitPrice,
        price: unitPrice,
        qty: requestedQty,
        quantity: requestedQty,
        weight: line.weight || prodData.unit || "unit",
        image: Array.isArray(prodData.images) && prodData.images.length > 0 ? prodData.images[0] : null,
        hsnCode: prodData.hsn_code || "00000000",
        gstApplicable: prodData.gst_applicable !== false,
        gstRate: Number(prodData.gst_rate ?? 5),
        farmer_id: prodData.farmer_id || null,
        farmer_slug: null,
      });
    }

    const pricing = calculateOrderTotals({
      items: validatedItems,
      shippingCost: Number(shippingCost) || 0,
      discountAmount: Number(discountAmount) || 0,
      paymentMethod: cleanMethod,
    });

    const uniqueOrderId = await generateUniqueOrderId();
    const now = new Date().toISOString();

    const initialStatus = cleanMethod === "whatsapp" ? "pending_manual_payment" : "cod_pending";
    const initialPaymentStatus = "pending";

    const auditEntry = {
      status: initialStatus,
      title: "Manual Order Created by Admin",
      description: `Created via Admin Portal. Payment Method: ${cleanMethod.toUpperCase()}. Total: ₹${pricing.total}.`,
      updated_by: "Admin",
      timestamp: now,
    };

    const newOrderPayload = {
      id: uniqueOrderId,
      order_id: uniqueOrderId,
      customer_name: customerName.trim(),
      customer_email: customerEmail ? customerEmail.trim().toLowerCase() : null,
      customer_phone: customerPhone.trim(),
      shipping_address: shippingAddress.trim(),
      shipping_pincode: shippingPincode.trim(),
      billing_address: billingAddress?.trim() || null,
      items: pricing.items,
      subtotal: pricing.subtotal,
      total_gst: pricing.totalGst,
      shipping_cost: pricing.shippingCost,
      shipping_fee: pricing.shippingCost,
      discount_amount: pricing.discountAmount,
      total: pricing.total,
      total_amount: pricing.total,
      payment_method: cleanMethod,
      status: initialStatus,
      payment_status: initialPaymentStatus,
      customer_note: orderNote?.trim() || null,
      tags: Array.isArray(tags) ? tags : [],
      internal_notes: [],
      tracking_history: [auditEntry],
      source: "admin_manual",
      created_at: now,
      updated_at: now,
      _source: "firestore",
    };

    await adminDb.collection("orders").doc(uniqueOrderId).set(newOrderPayload);

    for (const item of validatedItems) {
      try {
        const prodQuery = await adminDb
          .collection("farmer_products")
          .where("slug", "==", item.slug)
          .limit(1)
          .get();

        if (!prodQuery.empty) {
          const docRef = prodQuery.docs[0].ref;
          const currentStock = Number(prodQuery.docs[0].data().stock ?? 0);
          await docRef.update({
            stock: Math.max(0, currentStock - item.qty),
            updated_at: now,
          });
        }
      } catch (stockErr) {
        console.warn("[Admin Create Order] Error updating stock for item:", item.slug, stockErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order #${uniqueOrderId} created successfully`,
      order: newOrderPayload,
    });
  } catch (error: any) {
    console.error("[Admin Orders API] Error creating order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create order: " + (error?.message || "Internal error") },
      { status: 500 }
    );
  }
}
