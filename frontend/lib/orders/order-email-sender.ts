import { inr } from "../format.ts";
import { getCarrierTrackingUrl } from "./order-carriers.ts";
import type { OrderShipment } from "./order-constants.ts";

export interface SendEmailParams {
  order: any;
  shipment: OrderShipment;
  items?: any[];
}

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Builds HTML template for Prajnaa Market Shipping Confirmation Email
 */
export function buildShippingEmailHtml(params: SendEmailParams): { html: string; text: string } {
  const { order, shipment, items = [] } = params;

  const orderCode = order.order_id || order.id || "PRJ-ORDER";
  const customerName =
    order.customer_name ||
    order.shipping_address?.full_name ||
    order.customerName ||
    "Valued Customer";
  const carrier = shipment.carrier || "Standard Courier";
  const trackingNumber = shipment.tracking_number;
  const trackingUrl =
    shipment.tracking_url || getCarrierTrackingUrl(carrier, trackingNumber, null);

  const shipmentItems = items.filter((it, idx) => {
    if (!shipment.item_ids || shipment.item_ids.length === 0) return true;
    const idKey = String(it.id || idx);
    return shipment.item_ids.includes(idKey) || it.shipment_id === shipment.id;
  });

  const address = order.shipping_address?.address || order.shipping_address || "—";
  const pincode = order.shipping_address?.pincode || order.shipping_pincode || "";

  // Plain Text Version
  const text = `
Namaste ${customerName},

Great news! Your Prajnaa Farm order #${orderCode} has been shipped.

Shipment Details:
- Carrier: ${carrier}
- Tracking Number: ${trackingNumber}
${trackingUrl ? `- Tracking Link: ${trackingUrl}` : ""}

Items in this shipment:
${shipmentItems
  .map(
    (it) =>
      `• ${it.name || it.productName || "Product"} (${it.weight || "Standard"}) x ${
        it.qty || it.quantity || 1
      }`
  )
  .join("\n")}

Delivery Address:
${address} ${pincode ? `- ${pincode}` : ""}

Thank you for choosing Prajnaa Market.
Pure, organic, direct from our farms.
  `.trim();

  // HTML Version styled with Prajnaa's natural forest-green & cream palette
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your order #${orderCode} has been shipped</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f0; margin: 0; padding: 0; color: #1c2e24; }
    .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e8e6dc; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background-color: #1b382b; padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; color: #d6e2db; font-size: 14px; }
    .content { padding: 32px 28px; }
    .card { background-color: #fbfbf8; border: 1px solid #edebe1; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #5f7065; margin-bottom: 12px; }
    .tracking-number { font-family: monospace; font-size: 18px; font-weight: 700; color: #1b382b; letter-spacing: 0.5px; }
    .btn { display: inline-block; background-color: #1b382b; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 14px; font-weight: 600; border-radius: 10px; margin-top: 16px; text-align: center; }
    .btn:hover { background-color: #142b21; }
    .item-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0ede1; font-size: 13px; }
    .item-row:last-child { border-bottom: none; }
    .footer { background-color: #f3f1e9; padding: 24px; text-align: center; font-size: 12px; color: #727f76; border-top: 1px solid #e6e3d5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 28px; margin-bottom: 8px;">🌱</div>
      <h1>Your Order is on the Way!</h1>
      <p>Order #${orderCode} has been shipped</p>
    </div>

    <div class="content">
      <p style="font-size: 15px; margin-top: 0;">Namaste <strong>${customerName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #405347;">
        Good news! Your package is packed with care and dispatched via <strong>${carrier}</strong>. Here are the tracking details to follow its journey:
      </p>

      <div class="card">
        <div class="card-title">Shipping & Tracking Information</div>
        <div style="margin-bottom: 8px;">
          <span style="font-size: 12px; color: #6d7d73;">Courier Partner:</span>
          <strong style="font-size: 13px; color: #1b382b; margin-left: 6px;">${carrier}</strong>
        </div>
        <div style="margin-bottom: 8px;">
          <span style="font-size: 12px; color: #6d7d73;">Tracking Number:</span>
          <div class="tracking-number" style="margin-top: 4px;">${trackingNumber}</div>
        </div>

        ${
          trackingUrl
            ? `<div style="text-align: center; margin-top: 16px;">
                <a href="${trackingUrl}" target="_blank" class="btn">Track Your Package Online &rarr;</a>
              </div>`
            : ""
        }
      </div>

      <div class="card">
        <div class="card-title">Items in this Package (${shipmentItems.length})</div>
        ${shipmentItems
          .map(
            (it) => `
          <div class="item-row">
            <div>
              <strong style="color: #1b382b;">${it.name || it.productName || "Product"}</strong>
              <div style="font-size: 11px; color: #728076;">Variant: ${it.weight || "Standard"} · Qty: ${
              it.qty || it.quantity || 1
            }</div>
            </div>
            <div style="font-weight: 600; color: #1b382b;">
              ${inr(Number(it.price || it.unitPrice || 0) * Number(it.qty || it.quantity || 1))}
            </div>
          </div>
        `
          )
          .join("")}
      </div>

      <div class="card">
        <div class="card-title">Delivery Address</div>
        <p style="font-size: 13px; margin: 0; line-height: 1.5; color: #2e4034;">
          ${address} ${pincode ? `<br><strong>PIN Code:</strong> ${pincode}` : ""}
        </p>
      </div>

      <p style="font-size: 12px; color: #7a8a80; line-height: 1.5; margin-bottom: 0;">
        If you have any questions or need assistance, feel free to reply directly to this email or reach us on WhatsApp.
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px;"><strong>Prajnaa Market & Farm</strong></p>
      <p style="margin: 0;">Authentic, Chemical-Free Farm Produce Delivered Directly to You</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { html, text };
}

/**
 * Sends Shipping Confirmation Email via Resend REST API
 */
export async function sendShippingConfirmationEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const { order, shipment } = params;

  const recipientEmail =
    order.customer_email ||
    order.shipping_address?.email ||
    order.email;

  if (!recipientEmail || !recipientEmail.includes("@")) {
    return {
      success: false,
      error: "No valid customer email address found on order.",
    };
  }

  const orderCode = order.order_id || order.id || "PRJ-ORDER";

  // Staging safety flag: EMAIL_DISABLED=true (default false) stops all outgoing notifications and logs instead
  if (process.env.EMAIL_DISABLED === "true") {
    console.log(
      `[EMAIL_DISABLED] Outgoing shipping email suppressed for ${recipientEmail} on order #${orderCode}. Logging notification instead.`
    );
    return {
      success: true,
      emailId: `simulated_disabled_${Date.now()}`,
      simulated: true,
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();

  // If Resend API Key is not yet configured (e.g. user will add tomorrow)
  if (!apiKey) {
    console.warn(
      `[Shipping Email Notice] RESEND_API_KEY is not configured in process.env. Email notification was prepared for ${recipientEmail} and will send automatically once RESEND_API_KEY is added.`
    );
    return {
      success: false,
      error: "RESEND_API_KEY not configured yet. Set RESEND_API_KEY in environment variables.",
      simulated: true,
    };
  }

  const { html, text } = buildShippingEmailHtml(params);

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "Prajnaa Market <orders@market.prajnaa.in>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: `Your order #${orderCode} has been shipped! (${shipment.carrier} #${shipment.tracking_number})`,
        html,
        text,
      }),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = resData.message || `Resend HTTP error ${res.status}`;
      console.error("[Resend API Error]:", errMsg);
      return {
        success: false,
        error: errMsg,
      };
    }

    return {
      success: true,
      emailId: resData.id,
    };
  } catch (err: any) {
    console.error("[Resend Network Error]:", err);
    return {
      success: false,
      error: err.message || "Network error while calling Resend API",
    };
  }
}

/**
 * Builds HTML and plain text for Prajnaa Market Order Confirmation Email
 */
export function buildOrderConfirmationEmailHtml(params: {
  order: any;
  items?: any[];
}): { html: string; text: string } {
  const { order, items = [] } = params;
  const orderCode = order.orderNumber || order.order_id || order.id || "PRJ-ORDER";
  const customerName = order.customerName || order.customer_name || "Valued Customer";
  const totalAmount = order.totalPaise ? inr(order.totalPaise / 100) : inr(order.total || order.total_amount || 0);
  const paymentMethod = (order.paymentMethod || order.payment_method || "COD").toUpperCase();

  const orderItems = items.length > 0 ? items : order.items || [];
  const address = order.shippingAddressSnapshot
    ? `${order.shippingAddressSnapshot.addressLine1 || ""}, ${order.shippingAddressSnapshot.city || ""}, ${order.shippingAddressSnapshot.state || ""} ${order.shippingAddressSnapshot.postalCode || ""}`
    : typeof order.shipping_address === "string"
    ? order.shipping_address
    : "—";

  const text = `
Namaste ${customerName},

Thank you for your order with Prajnaa Farm!
Order ID: #${orderCode}
Payment Method: ${paymentMethod}
Total Amount: ${totalAmount}

Items:
${orderItems.map((it: any) => `• ${it.productName || it.name || "Product"} x ${it.quantity || it.qty || 1} — ${it.totalPaise ? inr(it.totalPaise / 100) : inr(it.totalAmount || it.price * (it.qty || 1))}`).join("\n")}

Delivery Address:
${address}

We are preparing your fresh farm products with care.
Pure, organic, direct from our farmers.
  `.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Order Confirmation #${orderCode}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f6f0; margin: 0; padding: 0; color: #1c2e24; }
    .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e8e6dc; }
    .header { background-color: #1b382b; padding: 32px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 28px; }
    .card { background-color: #fbfbf8; border: 1px solid #edebe1; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .item-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0ede1; font-size: 13px; }
    .footer { background-color: #f3f1e9; padding: 24px; text-align: center; font-size: 12px; color: #727f76; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 28px; margin-bottom: 8px;">🌾</div>
      <h1 style="margin: 0; font-size: 24px;">Order Confirmed!</h1>
      <p style="margin: 8px 0 0; color: #d6e2db;">Thank you for supporting natural farming</p>
    </div>
    <div class="content">
      <p>Namaste <strong>${customerName}</strong>,</p>
      <p>We have received your order <strong>#${orderCode}</strong> (${paymentMethod}).</p>
      <div class="card">
        <div style="font-weight: 700; margin-bottom: 12px; font-size: 12px; text-transform: uppercase; color: #5f7065;">Order Summary</div>
        ${orderItems.map((it: any) => `
          <div class="item-row">
            <div><strong>${it.productName || it.name}</strong> x ${it.quantity || it.qty || 1}</div>
            <div>${it.totalPaise ? inr(it.totalPaise / 100) : inr(it.totalAmount || (it.price * (it.qty || 1)))}</div>
          </div>
        `).join("")}
        <div style="margin-top: 14px; text-align: right; font-size: 16px; font-weight: 700; color: #1b382b;">
          Total: ${totalAmount}
        </div>
      </div>
      <div class="card">
        <div style="font-weight: 700; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; color: #5f7065;">Delivery Address</div>
        <p style="margin: 0; font-size: 13px; line-height: 1.5;">${address}</p>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px;"><strong>Prajnaa Market & Farm</strong></p>
      <p style="margin: 0;">Pure, Organic, Direct from Farms</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { html, text };
}

/**
 * Sends Order Confirmation Email via Resend REST API
 * Staging safety flag: EMAIL_DISABLED=true stops all outgoing notifications and logs instead.
 */
export async function sendOrderConfirmationEmail(params: {
  order: any;
  items?: any[];
}): Promise<SendEmailResult> {
  const { order, items } = params;
  const recipientEmail =
    order.customerEmail ||
    order.customer_email ||
    order.shippingAddressSnapshot?.email ||
    order.email;

  if (!recipientEmail || !recipientEmail.includes("@")) {
    return {
      success: false,
      error: "No valid customer email address found on order.",
    };
  }

  const orderCode = order.orderNumber || order.order_id || order.id || "PRJ-ORDER";

  // Staging safety flag: EMAIL_DISABLED=true (default false) stops all outgoing notifications and logs instead
  if (process.env.EMAIL_DISABLED === "true") {
    console.log(
      `[EMAIL_DISABLED] Outgoing order confirmation email suppressed for ${recipientEmail} on order #${orderCode}. Logging notification instead.`
    );
    return {
      success: true,
      emailId: `simulated_disabled_${Date.now()}`,
      simulated: true,
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      `[Order Email Notice] RESEND_API_KEY is not configured in process.env. Order confirmation was prepared for ${recipientEmail}.`
    );
    return {
      success: false,
      error: "RESEND_API_KEY not configured yet.",
      simulated: true,
    };
  }

  const { html, text } = buildOrderConfirmationEmailHtml({ order, items });
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "Prajnaa Market <orders@market.prajnaa.in>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: `Order Confirmation #${orderCode} - Prajnaa Market`,
        html,
        text,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = resData.message || `Resend HTTP error ${res.status}`;
      console.error("[Resend API Error]:", errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, emailId: resData.id };
  } catch (err: any) {
    console.error("[Resend Network Error]:", err);
    return {
      success: false,
      error: err.message || "Network error while calling Resend API",
    };
  }
}

