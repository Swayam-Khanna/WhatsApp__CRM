
import { LeadsService } from "../../../../../backend/lib/leads.server.ts";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/:id/quotes
 * Creates a versioned quotation for the lead.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return Response.json(
        { success: false, error: "Quote requires at least one product item" },
        { status: 400 }
      );
    }

    const quote = await LeadsService.createQuote(id, {
      items: body.items,
      paymentTerms: body.paymentTerms,
      deliveryTerms: body.deliveryTerms,
      validDays: body.validDays,
      discountPaise: body.discountPaise,
      notes: body.notes,
      createdBy: body.createdBy || "Sales Agent",
    });

    return Response.json(
      {
        success: true,
        quote,
        message: `Quotation #${quote.quoteNumber} (v${quote.version}) generated`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to generate quotation" },
      { status: 400 }
    );
  }
}

/**
 * PATCH /api/leads/:id/quotes
 * Modifies an existing quotation.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body || !body.quoteId) {
      return Response.json(
        { success: false, error: "Quote ID is required for editing" },
        { status: 400 }
      );
    }

    const quote = await LeadsService.updateQuote(id, body.quoteId, {
      items: body.items,
      paymentTerms: body.paymentTerms,
      deliveryTerms: body.deliveryTerms,
      validDays: body.validDays,
      discountPaise: body.discountPaise,
      notes: body.notes,
      updatedBy: body.updatedBy || "Sales Agent",
    });

    return Response.json(
      {
        success: true,
        quote,
        message: `Quotation #${quote.quoteNumber} (v${quote.version}) updated successfully`,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message || "Failed to update quotation" },
      { status: 400 }
    );
  }
}

