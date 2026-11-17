import { NextRequest, NextResponse } from "next/server.js";
import {
  getDeletedContacts,
  recordDeletedContact,
  resurrectContact,
  getStoredCustomerMeta,
  saveStoredCustomerMeta,
} from "../../../../backend/lib/crm-store.server.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const deleted = getDeletedContacts();
    const customerMeta = getStoredCustomerMeta();

    return NextResponse.json({
      success: true,
      deletedPhones: deleted.phones,
      deletedCustomerIds: deleted.customerIds,
      customerMeta,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, phone, customerId, notes, tags, name, isVip } = body;

    if (action === "delete_contact") {
      recordDeletedContact(phone, customerId);
      return NextResponse.json({
        success: true,
        action: "deleted",
        deleted: getDeletedContacts(),
      });
    }

    if (action === "resurrect_contact") {
      resurrectContact(phone, customerId);
      return NextResponse.json({
        success: true,
        action: "resurrected",
        deleted: getDeletedContacts(),
      });
    }

    // Save customer metadata (notes, tags, customName, isVip)
    const targetKey = (phone || "").replace(/\D/g, "").slice(-10) || customerId;
    if (targetKey) {
      const metaToSave: Record<string, any> = {};
      if (notes !== undefined) metaToSave.notes = notes;
      if (tags !== undefined) metaToSave.tags = tags;
      if (name !== undefined) metaToSave.name = name;
      if (isVip !== undefined) metaToSave.isVip = isVip;

      saveStoredCustomerMeta(targetKey, metaToSave);
      return NextResponse.json({
        success: true,
        action: "saved_meta",
        customerMeta: getStoredCustomerMeta(),
      });
    }

    return NextResponse.json({ error: "No recognized sync action or target key provided" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process sync" }, { status: 500 });
  }
}
