import { NextRequest, NextResponse } from "next/server.js";
import { getCurrentUser } from "../../../../backend/lib/server-auth.ts";
import { isNeonDataProvider } from "../../../../backend/lib/data-provider.ts";
import { db } from "../../../../backend/db.ts";
import { farmerProfiles } from "../../../../backend/schema/index.ts";
import { eq } from "drizzle-orm";
import { adminDb } from "../../../../frontend/lib/firebase-admin.ts";

export const dynamic = "force-dynamic";

function mapFarmerRow(r: any) {
  return {
    id: r.id,
    user_id: r.userId,
    full_name: r.fullName,
    farm_name: r.farmName,
    phone: r.phone,
    email: r.email,
    slug: r.slug,
    status: r.status,
    state: r.state,
    district: r.district,
    village: r.village,
    pincode: r.pincode,
    crops: r.crops,
    farming_method: r.farmingMethod,
    farm_size_acres: r.farmSizeAcres,
    years_farming: r.yearsFarming,
    story: r.story,
    headline: r.headline,
    portrait_url: r.portraitUrl,
    cover_image_url: r.coverImageUrl,
    pan_number: r.panNumber,
    aadhaar_last4: r.aadhaarLast4,
    upi_id: r.upiId,
    bank_account_name: r.bankAccountName,
    bank_account_number: r.bankAccountNumber,
    bank_name: r.bankName,
    bank_ifsc: r.bankIfsc,
    rejection_reason: r.rejectionReason,
    approved_at: r.approvedAt,
    kishan_pehchan_patra: r.kishanPehchanPatra,
    total_land_area: r.totalLandArea,
    area_unit: r.areaUnit,
    cultivated_area: r.cultivatedArea,
    khasra_numbers: r.khasraNumbers,
    cultivator_type: r.cultivatorType,
    trust_application_status: r.trustApplicationStatus,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

/**
 * GET /api/farmer/profile
 * Returns the farmer profile for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isNeonDataProvider()) {
      const [farmer] = await db
        .select()
        .from(farmerProfiles)
        .where(eq(farmerProfiles.userId, user.id))
        .limit(1);

      if (!farmer) {
        // Try by email fallback
        if (user.email) {
          const [byEmail] = await db
            .select()
            .from(farmerProfiles)
            .where(eq(farmerProfiles.email, user.email))
            .limit(1);
          if (byEmail) {
            // Reconcile userId
            await db
              .update(farmerProfiles)
              .set({ userId: user.id })
              .where(eq(farmerProfiles.id, byEmail.id));
            return NextResponse.json({ success: true, data: mapFarmerRow({ ...byEmail, userId: user.id }) });
          }
        }
        return NextResponse.json({ success: true, data: null });
      }

      return NextResponse.json({ success: true, data: mapFarmerRow(farmer) });
    } else {
      if (!adminDb) return NextResponse.json({ success: true, data: null });
      const snap = await adminDb
        .collection("farmer_profiles")
        .where("user_id", "==", user.id)
        .limit(1)
        .get();
      if (snap.empty) return NextResponse.json({ success: true, data: null });
      const doc = snap.docs[0];
      return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/farmer/profile
 * Updates the farmer profile story, land details, images etc.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (isNeonDataProvider()) {
      const [existing] = await db
        .select({ id: farmerProfiles.id })
        .from(farmerProfiles)
        .where(eq(farmerProfiles.userId, user.id))
        .limit(1);

      if (!existing) {
        return NextResponse.json({ error: "Farmer profile not found" }, { status: 404 });
      }

      const updates: Record<string, any> = { updatedAt: new Date() };

      if (body.headline !== undefined) updates.headline = body.headline?.trim() || null;
      if (body.story !== undefined) updates.story = body.story?.trim() || null;
      if (body.crops !== undefined) {
        updates.crops = Array.isArray(body.crops)
          ? body.crops
          : String(body.crops)
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
      }
      if (body.farming_method !== undefined) updates.farmingMethod = body.farming_method || null;
      if (body.portrait_url !== undefined) updates.portraitUrl = body.portrait_url || null;
      if (body.cover_image_url !== undefined) updates.coverImageUrl = body.cover_image_url || null;
      if (body.kishan_pehchan_patra !== undefined)
        updates.kishanPehchanPatra = body.kishan_pehchan_patra?.trim() || null;
      if (body.total_land_area !== undefined) updates.totalLandArea = body.total_land_area?.trim() || null;
      if (body.area_unit !== undefined) updates.areaUnit = body.area_unit?.trim() || null;
      if (body.cultivated_area !== undefined) updates.cultivatedArea = body.cultivated_area?.trim() || null;
      if (body.khasra_numbers !== undefined) updates.khasraNumbers = body.khasra_numbers?.trim() || null;
      if (body.cultivator_type !== undefined) updates.cultivatorType = body.cultivator_type?.trim() || null;

      const [updated] = await db
        .update(farmerProfiles)
        .set(updates)
        .where(eq(farmerProfiles.id, existing.id))
        .returning();

      return NextResponse.json({ success: true, data: mapFarmerRow(updated) });
    } else {
      if (!adminDb) return NextResponse.json({ error: "Firebase DB unavailable" }, { status: 500 });
      const snap = await adminDb
        .collection("farmer_profiles")
        .where("user_id", "==", user.id)
        .limit(1)
        .get();
      if (snap.empty) return NextResponse.json({ error: "Farmer profile not found" }, { status: 404 });
      const docId = snap.docs[0].id;
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      for (const key of Object.keys(body)) {
        patch[key] = body[key];
      }
      await adminDb.collection("farmer_profiles").doc(docId).set(patch, { merge: true });
      return NextResponse.json({ success: true, data: { id: docId, ...patch } });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
