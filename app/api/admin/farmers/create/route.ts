import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/api/admin-auth.server";
import { db } from "../../../../../backend/db.ts";
import { farmerProfiles, profiles, userRoles } from "../../../../../backend/schema/index.ts";
import { encryptPan } from "../../../../../backend/lib/crypto.ts";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Verify admin privileges
  const auth = await verifyAdminRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error || "Forbidden. Admin privileges required." },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      userId,
      fullName,
      farmName,
      phone,
      email,
      aadhaar,
      pan,
      kishanId,
      village,
      district,
      state,
      pincode,
      totalLandArea,
      landUnit,
      cultivatedArea,
      khasraNumbers,
      cultivatorType,
      yearsFarming,
      farmingMethod,
      crops,
      portraitUrl,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: "Farmer full name is required." },
        { status: 400 }
      );
    }

    if (!farmName || !farmName.trim()) {
      return NextResponse.json(
        { success: false, error: "Farm name is required." },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { success: false, error: "Phone number is required." },
        { status: 400 }
      );
    }

    if (!village || !village.trim() || !state || !state.trim()) {
      return NextResponse.json(
        { success: false, error: "Village and State are required." },
        { status: 400 }
      );
    }

    let targetUserId = userId && typeof userId === "string" && userId.trim() !== "" ? userId.trim() : null;

    // 2. If no existing user selected (unregistered / offline farmer), resolve or auto-provision managed user profile
    if (!targetUserId) {
      const cleanPhone = phone.replace(/\D/g, "");
      const safeEmail = email && email.trim() !== ""
        ? email.trim()
        : `farmer_${cleanPhone || Date.now()}@prajnaafarm.internal`;

      // Check if a profile with this phone or email already exists
      try {
        if (cleanPhone) {
          const [foundProfile] = await db
            .select({ id: profiles.id })
            .from(profiles)
            .where(eq(profiles.phone, phone.trim()))
            .limit(1);

          if (foundProfile) {
            targetUserId = foundProfile.id;
          }
        }
      } catch (findErr) {
        console.warn("[Admin Farmer Create] Existing profile lookup warning:", findErr);
      }

      if (!targetUserId) {
        targetUserId = `usr_farmer_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      }

      // Upsert profile and ensure farmer role
      await db
        .insert(profiles)
        .values({
          id: targetUserId,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email && email.trim() !== "" ? email.trim() : safeEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            updatedAt: new Date(),
          },
        });

      await db
        .insert(userRoles)
        .values({
          id: `role_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          userId: targetUserId,
          role: "farmer",
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    } else {
      // User ID explicitly passed, ensure role exists
      await db
        .insert(userRoles)
        .values({
          id: `role_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
          userId: targetUserId,
          role: "farmer",
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    }

    // 3. Generate unique slug and assemble farmer profile
    const cleanFarmName = farmName.trim();
    const baseSlug = cleanFarmName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${baseSlug || "farmer"}-${Math.random().toString(36).slice(2, 6)}`;
    const newFarmerId = crypto.randomUUID();

    const parsedCrops = Array.isArray(crops)
      ? crops.map((c) => String(c).trim()).filter(Boolean)
      : typeof crops === "string"
      ? crops.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const now = new Date();
    const encryptedPan = pan && pan.trim() !== "" ? encryptPan(pan.trim()) : null;

    const farmerRecord = {
      id: newFarmerId,
      userId: targetUserId,
      fullName: fullName.trim(),
      farmName: cleanFarmName,
      slug,
      phone: phone.trim(),
      email: email && email.trim() !== "" ? email.trim() : null,
      status: "approved" as const,
      village: village.trim(),
      district: district && district.trim() !== "" ? district.trim() : null,
      state: state.trim(),
      pincode: pincode && pincode.trim() !== "" ? pincode.trim() : null,
      panNumber: encryptedPan,
      aadhaarLast4: aadhaar && aadhaar.trim() !== "" ? aadhaar.trim() : null,
      portraitUrl: portraitUrl || null,
      story: null,
      kishanPehchanPatra: kishanId && kishanId.trim() !== "" ? kishanId.trim() : null,
      totalLandArea: totalLandArea ? String(totalLandArea) : null,
      farmSizeAcres: totalLandArea ? parseFloat(totalLandArea) : null,
      areaUnit: landUnit || null,
      cultivatedArea: cultivatedArea ? String(cultivatedArea) : null,
      khasraNumbers: khasraNumbers && khasraNumbers.trim() !== "" ? khasraNumbers.trim() : null,
      cultivatorType: cultivatorType || null,
      yearsFarming: yearsFarming ? parseInt(yearsFarming, 10) : null,
      farmingMethod: farmingMethod || "natural",
      crops: parsedCrops,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // 4. Insert into Neon farmerProfiles
    const [inserted] = await db
      .insert(farmerProfiles)
      .values(farmerRecord)
      .returning();

    return NextResponse.json({
      success: true,
      farmer: inserted || farmerRecord,
      message: "Farmer registered and approved successfully.",
    });
  } catch (err: any) {
    console.error("[Admin Farmer Create] Unexpected exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
