import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";
import PDFDocument from "pdfkit";
import { requireAdminAuth } from "@/lib/api/admin-auth.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdminAuth(req);
  if (authErr) return authErr;

  try {
    const { id } = await params;

    // Fetch settlement record with details
    const { data: s, error } = await supabase
      .from("settlements")
      .select("*, farmer:farmer_profiles(*), bank_account:bank_accounts(*)")
      .eq("id", id)
      .single();

    if (error || !s) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    const { data: lineItems } = await supabase
      .from("settlement_line_items")
      .select("*")
      .eq("settlement_id", id);

    // Create PDFkit document
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Uint8Array[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    // Header
    doc.fillColor("#0F3D2E").fontSize(20).text("Prajnaa Market - Farmer Payout Statement", { align: "center" });
    doc.moveDown(0.5);
    doc.fillColor("#666666").fontSize(10).text(`Statement Reference ID: ${s.id}`, { align: "center" });
    doc.moveDown(1.5);

    // Farmer & Period Info Box
    doc.fillColor("#000000").fontSize(11).text(`Farmer Name: ${s.farmer?.full_name || s.farmer?.farm_name || "N/A"}`);
    doc.text(`Payout Cycle Period: ${s.period_start} to ${s.period_end}`);
    doc.text(`Settlement Status: ${String(s.status).toUpperCase()}`);
    doc.text(`UTR / Bank Reference: ${s.utr_reference || s.payout_provider_ref || "N/A"}`);
    doc.moveDown(1.5);

    // Financial Breakdown Table
    doc.fillColor("#0F3D2E").fontSize(13).text("Financial Summary Breakdown", { underline: true });
    doc.moveDown(0.5);
    doc.fillColor("#000000").fontSize(10);
    doc.text(`Total Gross Sales (${s.order_count || lineItems?.length || 0} Orders): INR ${Number(s.gross_sales || s.gross_amount || 0).toLocaleString("en-IN")}`);
    doc.text(`Platform Fee / Commission Deducted: - INR ${Number(s.commission_amount || s.fee_amount || 0).toLocaleString("en-IN")}`);
    doc.text(`TDS Amount Deducted: - INR ${Number(s.tds_amount || 0).toLocaleString("en-IN")}`);
    doc.text(`Adjustments / Reimbursements: + INR ${Number(s.adjustments_amount || 0).toLocaleString("en-IN")}`);
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#0F3D2E").font("Helvetica-Bold").text(`Net Amount Disbursed: INR ${Number(s.net_payout || s.net_amount || 0).toLocaleString("en-IN")}`).font("Helvetica");
    doc.moveDown(1.5);

    // Line Items Details
    if (lineItems && lineItems.length > 0) {
      doc.fillColor("#0F3D2E").fontSize(13).text("Included Order Line Items", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor("#333333");
      lineItems.forEach((li: any, index: number) => {
        doc.text(`${index + 1}. Order ID: ${li.order_id} | Gross: INR ${li.order_amount} | Commission: INR ${li.commission_amount || 0} | Net: INR ${li.net_amount || li.order_amount}`);
      });
    }

    doc.moveDown(2);
    doc.fontSize(8).fillColor("#888888").text("This is a computer-generated tax payout statement issued by Prajnaa Market.", { align: "center" });

    doc.end();

    await new Promise((resolve) => doc.on("end", resolve));

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="settlement_${id.substring(0, 8)}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("[API Statement PDF Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to generate statement PDF" }, { status: 500 });
  }
}
