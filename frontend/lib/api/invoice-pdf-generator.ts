// @ts-ignore
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { SELLER_CONFIG } from "./billing-config";

export interface InvoiceItem {
  productId: string;
  productName: string;
  slug: string;
  hsnCode: string;
  qty: number;
  unitPrice: number;
  gstApplicable: boolean;
  gstRate: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  weight?: string;
  image?: string;
}

export interface InvoiceData {
  orderId: string;
  created_at: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  shippingPincode?: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discountAmount?: number;
  couponCode?: string;
  totalGst: number;
  shippingFee: number;
  gatewayFee: number;
  total: number;
  invoiceNumber: string;
  invoiceDate: string;
  items: InvoiceItem[];
}

function safeDateStr(d: any): string {
  if (!d) return new Date().toLocaleDateString("en-IN");
  const date = new Date(d);
  if (isNaN(date.getTime())) return new Date().toLocaleDateString("en-IN");
  return date.toLocaleDateString("en-IN");
}

function safeDateTimeStr(d: any): string {
  if (!d) return new Date().toLocaleString("en-IN");
  const date = new Date(d);
  if (isNaN(date.getTime())) return new Date().toLocaleString("en-IN");
  return date.toLocaleString("en-IN");
}

function numberToWords(num: number): string {
  const safeNum = isNaN(num) || num < 0 ? 0 : num;
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n: number): string {
    if (n === 0) return '';
    let str = '';
    if (n >= 10000000) {
      str += numToWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += numToWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += numToWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += numToWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      }
    }
    return str;
  }

  const parts = safeNum.toFixed(2).split(".");
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  const rupeeStr = rupees === 0 ? "Zero Rupees" : numToWords(rupees) + "Rupees";
  const paiseStr = paise === 0 ? "" : " and " + numToWords(paise) + "Paise";
  return (rupeeStr + paiseStr + " Only").trim().replace(/\s+/g, " ");
}

export function generateInvoicePDF(order: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: any) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: any) => reject(err));

      // Colors
      const primaryColor = "#000000";
      const greyColor = "#666666";

      // 1. Title Header
      doc
        .fillColor(primaryColor)
        .font("Helvetica-Bold")
        .fontSize(14)
        .text("TAX INVOICE / BILL OF SUPPLY / CASH MEMO", { align: "right" });
      
      doc
        .font("Helvetica")
        .fontSize(9)
        .text("Original for Recipient", { align: "right" });

      doc.moveDown(1.5);

      // Grid Coordinates
      const col1X = 40;
      const col2X = 320;
      let currentY = doc.y;

      // 2. Seller Info (Left Column)
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Sold By:", col1X, currentY);
      
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(SELLER_CONFIG.soldBy, col1X, doc.y + 2)
        .text(`${SELLER_CONFIG.addressLine1},`, col1X)
        .text(`${SELLER_CONFIG.addressLine2},`, col1X)
        .text(`${SELLER_CONFIG.city}, ${SELLER_CONFIG.state}, ${SELLER_CONFIG.pinCode}`, col1X)
        .text(SELLER_CONFIG.country, col1X);

      doc.moveDown(0.5);
      doc
        .font("Helvetica-Bold")
        .text(`PAN No: `, col1X, doc.y, { continued: true })
        .font("Helvetica")
        .text(SELLER_CONFIG.panNo)
        .font("Helvetica-Bold")
        .text(`GST Registration No: `, col1X, doc.y, { continued: true })
        .font("Helvetica")
        .text(SELLER_CONFIG.gstin);

      // 3. Customer Info (Right Column)
      const customerName = order.customerName || "Customer";
      const shippingAddress = order.shippingAddress || "Address not specified";

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Billing Address:", col2X, currentY);
      
      doc
        .font("Helvetica")
        .text(customerName, col2X, doc.y + 2)
        .text(shippingAddress, col2X, doc.y, { width: 235 })
        .text(`India`, col2X)
        .moveDown(0.3);

      doc
        .font("Helvetica-Bold")
        .text("State/UT Code: ", col2X, doc.y, { continued: true })
        .font("Helvetica")
        .text(SELLER_CONFIG.stateUtCode);

      doc.moveDown(0.5);
      const shippingY = doc.y;

      doc
        .font("Helvetica-Bold")
        .text("Shipping Address:", col2X, shippingY);
      
      doc
        .font("Helvetica")
        .text(customerName, col2X, doc.y + 2)
        .text(shippingAddress, col2X, doc.y, { width: 235 })
        .text(`India`, col2X)
        .moveDown(0.3);

      doc
        .font("Helvetica-Bold")
        .text("State/UT Code: ", col2X, doc.y, { continued: true })
        .font("Helvetica")
        .text(SELLER_CONFIG.stateUtCode)
        .font("Helvetica-Bold")
        .text("Place of Supply: ", col2X, doc.y, { continued: true })
        .font("Helvetica")
        .text(SELLER_CONFIG.placeOfSupply)
        .font("Helvetica-Bold")
        .text("Place of Delivery: ", col2X, doc.y, { continued: true })
        .font("Helvetica")
        .text(SELLER_CONFIG.placeOfSupply);

      doc.moveDown(1.5);
      currentY = Math.max(doc.y, 210);

      // 4. Order & Invoice Meta Panel
      doc
        .font("Helvetica-Bold")
        .text("Order Number: ", col1X, currentY, { continued: true })
        .font("Helvetica")
        .text(order.orderId || "ORDER-1001")
        .font("Helvetica-Bold")
        .text("Order Date: ", col1X, doc.y, { continued: true })
        .font("Helvetica")
        .text(safeDateStr(order.created_at));

      doc
        .font("Helvetica-Bold")
        .text("Invoice Number: ", col2X, currentY, { continued: true })
        .font("Helvetica")
        .text(order.invoiceNumber || "INV-2026-0001")
        .font("Helvetica-Bold")
        .text("Invoice Details: ", col2X, doc.y, { continued: true })
        .font("Helvetica")
        .text(`State Code: ${SELLER_CONFIG.stateUtCode}`)
        .font("Helvetica-Bold")
        .text("Invoice Date: ", col2X, doc.y, { continued: true })
        .font("Helvetica")
        .text(safeDateStr(order.invoiceDate));

      doc.moveDown(1.5);
      currentY = doc.y;

      // 5. Product Table
      const tableHeaderY = currentY;
      const tableHeaders = [
        { label: "Sl.\nNo", x: col1X, w: 25, align: "left" },
        { label: "Description", x: 75, w: 180, align: "left" },
        { label: "Unit\nPrice", x: 260, w: 45, align: "right" },
        { label: "Qty", x: 310, w: 25, align: "center" },
        { label: "Net\nAmount", x: 340, w: 45, align: "right" },
        { label: "Tax\nRate", x: 390, w: 30, align: "center" },
        { label: "Tax\nType", x: 425, w: 45, align: "center" },
        { label: "Tax\nAmount", x: 475, w: 40, align: "right" },
        { label: "Total\nAmount", x: 520, w: 50, align: "right" }
      ];

      doc.lineJoin("miter").lineWidth(0.5);
      doc.rect(col1X, tableHeaderY, 515, 25).stroke();

      doc.font("Helvetica-Bold").fontSize(7.5);
      tableHeaders.forEach(h => {
        doc.text(h.label, h.x, tableHeaderY + 4, { width: h.w, align: h.align as any });
      });

      let itemY = tableHeaderY + 25;

      const itemsList = order.items && order.items.length > 0 ? order.items : [
        {
          productId: "p1",
          productName: "Organic Harvest Produce",
          slug: "harvest",
          hsnCode: "00000000",
          qty: 1,
          unitPrice: Number(order.total || 0),
          gstApplicable: true,
          gstRate: 5,
          taxableAmount: Number(order.subtotal || order.total || 0),
          gstAmount: Number(order.totalGst || 0),
          totalAmount: Number(order.total || 0),
        }
      ];

      // Render Rows
      itemsList.forEach((item, idx) => {
        const isUttarakhand = true;
        const taxType = item.gstApplicable 
          ? (isUttarakhand ? "CGST+SGST" : "IGST") 
          : "GST Exempt";

        const taxRateLabel = item.gstApplicable 
          ? (isUttarakhand ? `${item.gstRate/2}% + ${item.gstRate/2}%` : `${item.gstRate}%`)
          : "0%";

        const rowHeight = 35;
        doc.rect(col1X, itemY, 515, rowHeight).stroke();

        doc.font("Helvetica").fontSize(8);
        doc.text(String(idx + 1), tableHeaders[0].x, itemY + 8, { width: tableHeaders[0].w, align: "left" });
        doc.font("Helvetica-Bold").text(item.productName || "Organic Item", tableHeaders[1].x, itemY + 6, { width: tableHeaders[1].w });
        doc.font("Helvetica").fontSize(7.5).text(`HSN: ${item.hsnCode || "00000000"}`, tableHeaders[1].x, doc.y + 1);
        
        doc.fontSize(8);
        doc.text(inr(item.unitPrice || 0), tableHeaders[2].x, itemY + 8, { width: tableHeaders[2].w, align: "right" });
        doc.text(String(item.qty || 1), tableHeaders[3].x, itemY + 8, { width: tableHeaders[3].w, align: "center" });
        doc.text(inr(item.taxableAmount || item.unitPrice || 0), tableHeaders[4].x, itemY + 8, { width: tableHeaders[4].w, align: "right" });
        doc.text(taxRateLabel, tableHeaders[5].x, itemY + 8, { width: tableHeaders[5].w, align: "center" });
        doc.fontSize(7).text(taxType, tableHeaders[6].x, itemY + 8, { width: tableHeaders[6].w, align: "center" });
        doc.fontSize(8).text(inr(item.gstAmount || 0), tableHeaders[7].x, itemY + 8, { width: tableHeaders[7].w, align: "right" });
        doc.text(inr(item.totalAmount || item.unitPrice || 0), tableHeaders[8].x, itemY + 8, { width: tableHeaders[8].w, align: "right" });

        itemY += rowHeight;
      });

      // 6. Table Total Footer Rows
      doc.rect(col1X, itemY, 515, 18).stroke();
      doc.font("Helvetica-Bold").text("TOTAL:", 75, itemY + 5);

      const totalTaxable = order.subtotal || order.total || 0;
      const totalTax = order.totalGst || 0;
      const totalValue = order.total || 0;

      doc.text(inr(totalTaxable), tableHeaders[4].x, itemY + 5, { width: tableHeaders[4].w, align: "right" });
      doc.text(inr(totalTax), tableHeaders[7].x, itemY + 5, { width: tableHeaders[7].w, align: "right" });
      doc.text(inr(totalValue - (order.shippingFee || 0) - (order.gatewayFee || 0)), tableHeaders[8].x, itemY + 5, { width: tableHeaders[8].w, align: "right" });

      itemY += 18;

      if (order.discountAmount && order.discountAmount > 0) {
        doc.rect(col1X, itemY, 515, 15).stroke();
        doc.font("Helvetica").text(`Promotional Coupon Discount ${order.couponCode ? `(${order.couponCode})` : ""}`, 75, itemY + 4);
        doc.text(`-${inr(order.discountAmount)}`, tableHeaders[8].x, itemY + 4, { width: tableHeaders[8].w, align: "right" });
        itemY += 15;
      }

      if (order.shippingFee && order.shippingFee > 0) {
        doc.rect(col1X, itemY, 515, 15).stroke();
        doc.font("Helvetica").text("Shipping / Delivery Charges", 75, itemY + 4);
        doc.text(inr(order.shippingFee), tableHeaders[8].x, itemY + 4, { width: tableHeaders[8].w, align: "right" });
        itemY += 15;
      }

      if (order.gatewayFee && order.gatewayFee > 0) {
        doc.rect(col1X, itemY, 515, 15).stroke();
        doc.font("Helvetica").text("Payment Gateway Transaction Fee", 75, itemY + 4);
        doc.text(inr(order.gatewayFee), tableHeaders[8].x, itemY + 4, { width: tableHeaders[8].w, align: "right" });
        itemY += 15;
      }

      // Grand Total Row
      doc.rect(col1X, itemY, 515, 20).stroke();
      doc.font("Helvetica-Bold").fontSize(9).text("GRAND TOTAL:", 75, itemY + 5);
      doc.text(inr(totalValue), tableHeaders[8].x, itemY + 5, { width: tableHeaders[8].w, align: "right" });

      itemY += 25;

      // 7. Amount in Words & Signatory Layout
      const detailsBoxY = itemY;
      const boxHeight = 65;
      doc.rect(col1X, detailsBoxY, 257.5, boxHeight).stroke();
      doc.rect(col1X + 257.5, detailsBoxY, 257.5, boxHeight).stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .text("Amount in Words:", col1X + 10, detailsBoxY + 8);
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .text(numberToWords(totalValue), col1X + 10, detailsBoxY + 22, { width: 235 });

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(`For ${SELLER_CONFIG.soldBy.toUpperCase()}:`, col1X + 257.5 + 10, detailsBoxY + 8, { align: "right", width: 235 });
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .text("Authorized Signatory", col1X + 257.5 + 10, detailsBoxY + boxHeight - 16, { align: "right", width: 235 });

      itemY += boxHeight + 10;

      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text("Whether tax is payable under reverse charge: ", col1X, itemY, { continued: true })
        .font("Helvetica")
        .text("No");

      itemY += 15;

      // 8. Payment Transaction Metadata Panel
      const payPanelHeight = 35;
      doc.rect(col1X, itemY, 515, payPanelHeight).stroke();

      doc.lineCap("butt");
      doc.moveTo(180, itemY).lineTo(180, itemY + payPanelHeight).stroke();
      doc.moveTo(330, itemY).lineTo(330, itemY + payPanelHeight).stroke();
      doc.moveTo(430, itemY).lineTo(430, itemY + payPanelHeight).stroke();

      doc.font("Helvetica-Bold").fontSize(7.5);
      doc.text("Payment Transaction ID:", col1X + 8, itemY + 6);
      doc.font("Helvetica").text(order.paymentMethod === "RAZORPAY" ? (order.orderId ? order.orderId.replace("PRJ-", "pay_") : "pay_live") : (order.paymentMethod || "COD"), col1X + 8, itemY + 18);

      doc.font("Helvetica-Bold").text("Date & Time:", 188, itemY + 6);
      doc.font("Helvetica").text(safeDateTimeStr(order.created_at), 188, itemY + 18);

      doc.font("Helvetica-Bold").text("Invoice Value:", 338, itemY + 6);
      doc.font("Helvetica").text(inr(totalValue), 338, itemY + 18);

      doc.font("Helvetica-Bold").text("Mode of Payment:", 438, itemY + 6);
      doc.font("Helvetica").text((order.paymentMethod || "COD").toUpperCase(), 438, itemY + 18);

      itemY += payPanelHeight + 15;

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(greyColor)
        .text("This is a system-generated invoice for PRAJNAA MARKET. Verified authentic farm origin produce.", col1X, itemY, { align: "center", width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function inr(v: number): string {
  const safeV = isNaN(v) ? 0 : v;
  return "Rs. " + safeV.toFixed(2);
}
