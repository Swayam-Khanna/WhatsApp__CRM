// Backend Farmer Model & Land Ledger Schema Definition
// Compatible with both TypeScript / Mongoose / Drizzle architecture

import { farmers as mockFarmers } from "../../frontend/lib/mock/farmers";
import { db } from "../db";
import { farmerProfiles } from "../schema";
import { eq, or } from "drizzle-orm";
import { supabase } from "../../frontend/integrations/supabase/client";
import { v2 as cloudinary } from "cloudinary";

export interface LandLedgerCropImage {
  url: string;
  public_id: string;
}

export interface LandLedgerCropInput {
  id?: string;
  name: string;
  acres: number;
  season: string;
  method: string;
  harvestKg: number;
  image: LandLedgerCropImage;
}

export interface LandLedgerCropWithPercentage extends LandLedgerCropInput {
  percentage: number;
}

export interface LandLedger {
  totalAcres: number;
  crops: LandLedgerCropInput[];
}

export interface CalculatedLandLedger {
  farmerId?: string;
  totalAcres: number;
  fallowAcres: number;
  fallowPercentage: number;
  crops: LandLedgerCropWithPercentage[];
  message?: string;
}

// Seed data as defined in requirement:
// Mamra Almonds (3.2 acres, Aug-Oct, Glacier Rainfed Natural, 1,450 kg)
// Raktsey Karpo Apricots (2.1 acres, Jul-Sep, Traditional High-Altitude Orchard, 980 kg), total 6.5 acres.
export const SEED_LAND_LEDGER: LandLedger = {
  totalAcres: 6.5,
  crops: [
    {
      id: "c-1",
      name: "Mamra Almonds",
      acres: 3.2,
      season: "Aug-Oct",
      method: "Glacier Rainfed Natural",
      harvestKg: 1450,
      image: {
        url: "/assets/prod-almonds.jpg",
        public_id: "prajnaa/crops/mamra_almonds",
      },
    },
    {
      id: "c-2",
      name: "Raktsey Karpo Apricots",
      acres: 2.1,
      season: "Jul-Sep",
      method: "Traditional High-Altitude Orchard",
      harvestKg: 980,
      image: {
        url: "/assets/cat-dryfruits.jpg",
        public_id: "prajnaa/crops/raktsey_apricots",
      },
    },
  ],
};

// Largest Remainder Method (Hare-Niemeyer method)
// Guarantees all rounded percentages strictly sum to 100%
export function calculateLandLedger(data: LandLedger): CalculatedLandLedger {
  const totalAcres = Number(data.totalAcres) || 0;
  const crops = data.crops || [];

  const cropAcresSum = crops.reduce((sum, c) => sum + (Number(c.acres) || 0), 0);
  const fallowAcres = Math.max(0, Number((totalAcres - cropAcresSum).toFixed(2)));
  const effectiveTotal = Math.max(totalAcres, cropAcresSum + fallowAcres);

  if (effectiveTotal <= 0) {
    return {
      totalAcres: 0,
      fallowAcres: 0,
      fallowPercentage: 0,
      crops: crops.map((c) => ({ ...c, percentage: 0 })),
    };
  }

  // Calculate raw percentages
  const rawCropPercentages = crops.map((c) => (Number(c.acres) / effectiveTotal) * 100);
  const rawFallowPercentage = (fallowAcres / effectiveTotal) * 100;

  const allRaw = [...rawCropPercentages, rawFallowPercentage];
  const allFloors = allRaw.map((val) => Math.floor(val));
  const floorSum = allFloors.reduce((a, b) => a + b, 0);
  let remainderCount = 100 - floorSum;

  const remainderIndices = allRaw
    .map((val, idx) => ({ idx, rem: val - allFloors[idx] }))
    .sort((a, b) => b.rem - a.rem);

  const rounded = [...allFloors];
  for (let i = 0; i < remainderCount && i < remainderIndices.length; i++) {
    rounded[remainderIndices[i].idx] += 1;
  }

  const cropPercentages = rounded.slice(0, crops.length);
  const fallowPercentage = rounded[rounded.length - 1];

  return {
    totalAcres,
    fallowAcres,
    fallowPercentage,
    crops: crops.map((crop, idx) => ({
      ...crop,
      percentage: cropPercentages[idx],
    })),
  };
}

// Fetch land ledger for any farmer (seed, mock, database, supabase)
export async function fetchFarmerLandLedger(farmerId: string): Promise<CalculatedLandLedger> {
  const cleanedId = farmerId.trim().toLowerCase();

  // 1. Direct seed lookup
  if (
    cleanedId === "seed" ||
    cleanedId === "ramesh-singh" ||
    cleanedId === "f-ramesh-singh"
  ) {
    const calculated = calculateLandLedger(SEED_LAND_LEDGER);
    return {
      farmerId: "ramesh-singh",
      ...calculated,
    };
  }

  // 2. Mock farmers
  const mock = mockFarmers.find(
    (f) =>
      f.slug.toLowerCase() === cleanedId ||
      (f.id && f.id.toLowerCase() === cleanedId)
  );

  if (mock) {
    if (mock.landLedger && mock.landLedger.crops && mock.landLedger.crops.length > 0) {
      const calculated = calculateLandLedger(mock.landLedger);
      return {
        farmerId: mock.slug,
        ...calculated,
      };
    }

    if (mock.crops && mock.crops.length > 0) {
      const total = Number(mock.totalLandAcres) || 0;
      const synthLedger: LandLedger = {
        totalAcres: total,
        crops: mock.crops.map((c) => ({
          id: c.id,
          name: c.name,
          acres: Number(c.landAcres) || 0,
          season: c.season || "Current Cycle",
          method: c.method || mock.method || "Natural Farming",
          harvestKg:
            typeof c.lastYieldKg === "number"
              ? c.lastYieldKg
              : parseInt(String(c.lastYieldKg).replace(/[^0-9]/g, ""), 10) || 1000,
          image: {
            url: c.photoUrl || "",
            public_id: c.id || "crop-img",
          },
        })),
      };
      const calculated = calculateLandLedger(synthLedger);
      return {
        farmerId: mock.slug,
        ...calculated,
      };
    }
  }

  // 3. Postgres DB
  try {
    const dbFarmer = await db.query.farmerProfiles.findFirst({
      where: or(
        eq(farmerProfiles.slug, cleanedId),
        eq(farmerProfiles.id, cleanedId)
      ),
    });

    if (dbFarmer) {
      if (dbFarmer.landLedger && typeof dbFarmer.landLedger === "object") {
        const calculated = calculateLandLedger(dbFarmer.landLedger as LandLedger);
        return {
          farmerId: dbFarmer.slug || dbFarmer.id,
          ...calculated,
        };
      }

      const dbCrops = Array.isArray(dbFarmer.crops)
        ? dbFarmer.crops
        : typeof dbFarmer.crops === "string"
        ? (dbFarmer.crops as string).split(",").map((s) => s.trim())
        : [];

      if (dbCrops.length > 0) {
        const totalLand =
          Number(dbFarmer.farmSizeAcres) ||
          Number(dbFarmer.totalLandArea) ||
          dbCrops.length * 2.0;
        const allocatedPerCrop = Number((totalLand / (dbCrops.length + 0.3)).toFixed(1));

        const synthLedger: LandLedger = {
          totalAcres: totalLand,
          crops: dbCrops.map((cName: string, idx: number) => ({
            id: `db-crop-${idx}`,
            name: cName,
            acres: allocatedPerCrop,
            season: "Annual Cycle",
            method: dbFarmer.farmingMethod || "Natural Cultivation",
            harvestKg: 1000 + idx * 250,
            image: {
              url: "/assets/prod-almonds.jpg",
              public_id: `db-crop-${idx}`,
            },
          })),
        };
        const calculated = calculateLandLedger(synthLedger);
        return {
          farmerId: dbFarmer.slug || dbFarmer.id,
          ...calculated,
        };
      }
    }
  } catch (e) {
    console.warn("[Backend Farmer] DB lookup error:", e);
  }

  // 4. Supabase fallback
  if (supabase) {
    try {
      const { data: supaFarmer } = await supabase
        .from("farmer_profiles")
        .select("id, slug, farm_size_acres, crops, farming_method")
        .or(`id.eq.${cleanedId},slug.eq.${cleanedId}`)
        .maybeSingle();

      if (supaFarmer) {
        const cropsList = Array.isArray(supaFarmer.crops)
          ? supaFarmer.crops
          : typeof supaFarmer.crops === "string"
          ? (supaFarmer.crops as string).split(",")
          : [];

        if (cropsList.length > 0) {
          const total = Number(supaFarmer.farm_size_acres) || cropsList.length * 2.5;
          const synthLedger: LandLedger = {
            totalAcres: total,
            crops: cropsList.map((cName: any, idx: number) => ({
              id: `supa-c-${idx}`,
              name: String(cName).trim(),
              acres: Number((total / (cropsList.length + 0.4)).toFixed(1)),
              season: "Seasonal Cycle",
              method: supaFarmer.farming_method || "Natural Farming",
              harvestKg: 1200,
              image: {
                url: "/assets/prod-almonds.jpg",
                public_id: `supa-crop-${idx}`,
              },
            })),
          };
          const calculated = calculateLandLedger(synthLedger);
          return {
            farmerId: supaFarmer.slug || supaFarmer.id,
            ...calculated,
          };
        }
      }
    } catch (e) {
      console.warn("[Backend Farmer] Supabase lookup error:", e);
    }
  }

  // Empty state fallback
  return {
    farmerId: cleanedId,
    totalAcres: 0,
    fallowAcres: 0,
    fallowPercentage: 0,
    crops: [],
    message: "This farmer hasn't added land details yet.",
  };
}

// Mongoose-style Schema Definition for MongoDB / Express environments
export const LandLedgerCropMongooseSchema = {
  name: { type: String, required: true },
  acres: { type: Number, required: true },
  season: { type: String, required: true },
  method: { type: String, required: true },
  harvestKg: { type: Number, required: true },
  image: {
    url: { type: String, default: "" },
    public_id: { type: String, default: "" },
  },
};

export const LandLedgerMongooseSchema = {
  totalAcres: { type: Number, required: true, default: 0 },
  crops: [LandLedgerCropMongooseSchema],
};

// Trust Certifications & Checks Interfaces & Schemas
export interface FarmerTrustCertificate {
  id: string;
  farmerId: string;
  farmerName?: string;
  name: string;
  issuedBy: string;
  certNumber: string;
  validTill: string; // ISO date string
  document: {
    url: string;
    public_id: string;
  };
  status: "pending" | "verified" | "rejected";
  verifiedBy?: string;
  verifiedOn?: string;
  rejectReason?: string;
  submittedAt: string;
}

export interface FarmerTrustChecks {
  identity: { done: boolean; date?: string };
  land: { done: boolean; date?: string };
  farmVisit: { done: boolean; date?: string };
  quality: { done: boolean; date?: string };
}

export type ApplicationStatus = "none" | "in_review";

export interface FarmerTrustData {
  farmerId: string;
  applicationStatus: ApplicationStatus;
  certificates: Array<{
    id: string;
    name: string;
    issuedBy: string;
    certNumber: string;
    validTill: string;
    status?: "pending" | "verified" | "rejected";
    rejectReason?: string;
    documentUrl?: string; // only for admin or owner
  }>;
  checks: FarmerTrustChecks;
  isOwner?: boolean;
}

export const FarmerCertificateMongooseSchema = {
  name: { type: String, required: true },
  issuedBy: { type: String, required: true },
  certNumber: { type: String, required: true },
  validTill: { type: Date, required: true },
  document: {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  status: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  verifiedBy: { type: String }, // ObjectId (admin)
  verifiedOn: { type: Date },
  rejectReason: { type: String },
  submittedAt: { type: Date, default: Date.now },
};

export const FarmerChecksMongooseSchema = {
  identity: { done: { type: Boolean, default: false }, date: Date },
  land: { done: { type: Boolean, default: false }, date: Date },
  farmVisit: { done: { type: Boolean, default: false }, date: Date },
  quality: { done: { type: Boolean, default: false }, date: Date },
};

export const FarmerModelDefinition = {
  landLedger: LandLedgerMongooseSchema,
  certificates: [FarmerCertificateMongooseSchema],
  checks: FarmerChecksMongooseSchema,
  applicationStatus: {
    type: String,
    enum: ["none", "in_review"],
    default: "none",
  },
};

// Global Store for live Trust & Certification records across serverless lifecycle
interface FarmerTrustRecord {
  farmerId: string;
  farmerName: string;
  certificates: FarmerTrustCertificate[];
  checks: FarmerTrustChecks;
  applicationStatus: ApplicationStatus;
}

declare global {
  var globalTrustStore: Map<string, FarmerTrustRecord> | undefined;
}

function initTrustStore(): Map<string, FarmerTrustRecord> {
  const store = new Map<string, FarmerTrustRecord>();

  // Ramesh Singh - 3 Approved Verified Certifications matching design
  store.set("ramesh-singh", {
    farmerId: "ramesh-singh",
    farmerName: "Ramesh Singh",
    applicationStatus: "none",
    certificates: [
      {
        id: "cert-rs-1",
        farmerId: "ramesh-singh",
        farmerName: "Ramesh Singh",
        name: "Ladakh Organic Certified (PGS-India)",
        issuedBy: "PGS-India (Govt of India Organic Registry)",
        certNumber: "LDK-ORG-2024-882",
        validTill: "2027-12-31",
        document: {
          url: "https://res.cloudinary.com/demo/image/upload/v1/prajnaa/certificates/ladakh_cert.pdf",
          public_id: "prajnaa/certificates/ladakh_cert",
        },
        status: "verified",
        verifiedBy: "admin-verify-lead",
        verifiedOn: "2024-03-20T10:00:00.000Z",
        submittedAt: "2024-03-10T08:00:00.000Z",
      },
      {
        id: "cert-rs-2",
        farmerId: "ramesh-singh",
        farmerName: "Ramesh Singh",
        name: "GI Tag — Raktsey Karpo Apricots",
        issuedBy: "Geographical Indications Registry, Government of India",
        certNumber: "GI-AP-541",
        validTill: "2028-06-30",
        document: {
          url: "https://res.cloudinary.com/demo/image/upload/v1/prajnaa/certificates/gi_apricot.pdf",
          public_id: "prajnaa/certificates/gi_apricot",
        },
        status: "verified",
        verifiedBy: "admin-verify-lead",
        verifiedOn: "2024-03-22T14:30:00.000Z",
        submittedAt: "2024-03-11T09:15:00.000Z",
      },
      {
        id: "cert-rs-3",
        farmerId: "ramesh-singh",
        farmerName: "Ramesh Singh",
        name: "Fair Trade Smallholder Cooperative",
        issuedBy: "Fair Trade India Forum",
        certNumber: "FT-IN-9021",
        validTill: "2027-09-15",
        document: {
          url: "https://res.cloudinary.com/demo/image/upload/v1/prajnaa/certificates/fair_trade.pdf",
          public_id: "prajnaa/certificates/fair_trade",
        },
        status: "verified",
        verifiedBy: "admin-verify-lead",
        verifiedOn: "2024-03-25T11:00:00.000Z",
        submittedAt: "2024-03-12T10:00:00.000Z",
      },
    ],
    checks: {
      identity: { done: true, date: "2024-03-12" },
      land: { done: true, date: "2024-03-15" },
      farmVisit: { done: true, date: "2024-04-02" },
      quality: { done: true, date: "2024-04-10" },
    },
  });

  // Lakshmi Devi - State 2 (Checks only: no certificates, but checks verified)
  store.set("lakshmi-devi", {
    farmerId: "lakshmi-devi",
    farmerName: "Lakshmi Devi",
    applicationStatus: "none",
    certificates: [],
    checks: {
      identity: { done: true, date: "2024-02-18" },
      land: { done: true, date: "2024-02-20" },
      farmVisit: { done: true, date: "2024-03-01" },
      quality: { done: true, date: "2024-03-05" },
    },
  });

  // Asha Patel - State 4 (In Review with a pending certificate submitted)
  store.set("asha-patel", {
    farmerId: "asha-patel",
    farmerName: "Asha Patel",
    applicationStatus: "in_review",
    certificates: [
      {
        id: "cert-ap-1",
        farmerId: "asha-patel",
        farmerName: "Asha Patel",
        name: "Gujarat Organic Farming Cell Registration",
        issuedBy: "Gujarat Organic Farming Cell (GOFC)",
        certNumber: "GOFC-2026-904",
        validTill: "2027-10-30",
        document: {
          url: "https://res.cloudinary.com/demo/image/upload/v1/prajnaa/certificates/asha_cert.pdf",
          public_id: "prajnaa/certificates/asha_cert",
        },
        status: "pending",
        submittedAt: "2026-09-28T09:00:00.000Z",
      },
    ],
    checks: {
      identity: { done: true, date: "2026-09-25" },
      land: { done: false },
      farmVisit: { done: false },
      quality: { done: false },
    },
  });

  return store;
}

export const trustStore = globalThis.globalTrustStore ?? initTrustStore();
if (process.env.NODE_ENV !== "production") {
  globalThis.globalTrustStore = trustStore;
}

/**
 * Public & Owner Trust Data Getter
 * Rule: Public callers NEVER receive unverified certs, expired certs, or private document URLs.
 */
export async function getFarmerTrustData(
  farmerId: string,
  isOwnerOrAdmin: boolean = false
): Promise<FarmerTrustData> {
  const cleanedId = farmerId.trim().toLowerCase();
  let record = trustStore.get(cleanedId);

  if (!record) {
    // Try matching by id or slug across mock farmers
    const mock = mockFarmers.find(
      (f) =>
        f.slug.toLowerCase() === cleanedId ||
        (f.id && f.id.toLowerCase() === cleanedId)
    );
    if (mock) {
      record = trustStore.get(mock.slug.toLowerCase());
      if (!record) {
        // Initialize an empty record for this farmer
        record = {
          farmerId: mock.slug,
          farmerName: mock.name,
          certificates: [],
          checks: {
            identity: { done: false },
            land: { done: false },
            farmVisit: { done: false },
            quality: { done: false },
          },
          applicationStatus: "none",
        };
        trustStore.set(mock.slug.toLowerCase(), record);
      }
    }
  }

  if (!record) {
    return {
      farmerId: cleanedId,
      applicationStatus: "none",
      certificates: [],
      checks: {
        identity: { done: false },
        land: { done: false },
        farmVisit: { done: false },
        quality: { done: false },
      },
      isOwner: isOwnerOrAdmin,
    };
  }

  const now = new Date();

  // Filter certificates
  let visibleCertificates: any[] = [];

  if (isOwnerOrAdmin) {
    // Owner / Admin sees all certificates without private document URL
    visibleCertificates = record.certificates.map((c) => ({
      id: c.id,
      name: c.name,
      issuedBy: c.issuedBy,
      certNumber: c.certNumber,
      validTill: c.validTill,
      status: c.status,
      rejectReason: c.rejectReason,
    }));
  } else {
    // Public callers see ONLY verified certificates that are NOT expired
    // NEVER the document URL!
    visibleCertificates = record.certificates
      .filter((c) => {
        if (c.status !== "verified") return false;
        const expiry = new Date(c.validTill);
        return !isNaN(expiry.getTime()) && expiry >= now;
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        issuedBy: c.issuedBy,
        certNumber: c.certNumber,
        validTill: c.validTill,
        status: "verified" as const,
      }));
  }

  // Filter checks
  const resultChecks: FarmerTrustChecks = {
    identity: isOwnerOrAdmin || record.checks.identity?.done ? record.checks.identity : { done: false },
    land: isOwnerOrAdmin || record.checks.land?.done ? record.checks.land : { done: false },
    farmVisit: isOwnerOrAdmin || record.checks.farmVisit?.done ? record.checks.farmVisit : { done: false },
    quality: isOwnerOrAdmin || record.checks.quality?.done ? record.checks.quality : { done: false },
  };

  return {
    farmerId: record.farmerId,
    applicationStatus: record.applicationStatus,
    certificates: visibleCertificates,
    checks: resultChecks,
    isOwner: isOwnerOrAdmin,
  };
}

/**
 * Farmer Submits a Certificate (saved with status "pending", applicationStatus set to "in_review")
 */
export async function submitFarmerCertificate(
  farmerId: string,
  certData: {
    name: string;
    issuedBy: string;
    certNumber: string;
    validTill: string;
    document: { url: string; public_id: string };
  }
): Promise<FarmerTrustCertificate> {
  const cleanedId = farmerId.trim().toLowerCase();
  let record = trustStore.get(cleanedId);

  if (!record) {
    const mock = mockFarmers.find(
      (f) =>
        f.slug.toLowerCase() === cleanedId ||
        (f.id && f.id.toLowerCase() === cleanedId)
    );
    record = {
      farmerId: mock?.slug || cleanedId,
      farmerName: mock?.name || "Farmer",
      certificates: [],
      checks: {
        identity: { done: false },
        land: { done: false },
        farmVisit: { done: false },
        quality: { done: false },
      },
      applicationStatus: "none",
    };
    trustStore.set(cleanedId, record);
  }

  const newCert: FarmerTrustCertificate = {
    id: `cert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    farmerId: record.farmerId,
    farmerName: record.farmerName,
    name: certData.name,
    issuedBy: certData.issuedBy,
    certNumber: certData.certNumber,
    validTill: certData.validTill,
    document: certData.document,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };

  record.certificates.push(newCert);
  record.applicationStatus = "in_review";

  return newCert;
}

/**
 * Generates a temporary signed delivery URL for admin viewing of private certificates
 */
export function getTemporarySignedDocumentUrl(doc: { url: string; public_id?: string }): string {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "xk8miuvg";
    const apiKey = process.env.CLOUDINARY_API_KEY || "113957647121338";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "iX4ZV5zpTcItUqM5kgoU4uDcxqs";

    if (cloudName && doc.public_id && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });

      // 1-hour temporary signed link
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const signed = cloudinary.utils.private_download_url(doc.public_id, "pdf", {
        expires_at: expiresAt,
        attachment: false,
      });
      if (signed) return signed;
    }
  } catch (err) {
    console.warn("Could not generate signed Cloudinary url:", err);
  }
  return doc.url;
}

/**
 * Admin Lists Certificates (e.g. status=pending) with temporary signed link to document
 */
export async function getAdminCertificates(statusFilter?: string) {
  const all: (FarmerTrustCertificate & { signedUrl?: string })[] = [];

  for (const record of trustStore.values()) {
    for (const cert of record.certificates) {
      if (!statusFilter || statusFilter === "ALL" || cert.status === statusFilter) {
        all.push({
          ...cert,
          farmerName: record.farmerName,
          signedUrl: getTemporarySignedDocumentUrl(cert.document),
        });
      }
    }
  }

  // Sort newest first
  return all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

/**
 * Deletes a farmer certificate and removes its file from Cloudinary
 */
export async function deleteFarmerCertificate(farmerId: string, certId: string): Promise<boolean> {
  const cleanedId = farmerId.trim().toLowerCase();
  const record = trustStore.get(cleanedId);
  if (!record) return false;

  const idx = record.certificates.findIndex((c) => c.id === certId);
  if (idx === -1) return false;

  const [removed] = record.certificates.splice(idx, 1);
  if (removed?.document?.public_id) {
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "xk8miuvg";
      if (cloudName) {
        cloudinary.uploader.destroy(removed.document.public_id);
      }
    } catch (e) {
      console.warn("Failed to delete certificate file from Cloudinary:", e);
    }
  }
  return true;
}

/**
 * Admin Verifies or Rejects a Certificate
 */
export async function verifyOrRejectCertificate(
  certId: string,
  action: "verify" | "reject",
  reason?: string,
  adminUserId = "admin-lead"
): Promise<{ success: boolean; certificate?: FarmerTrustCertificate; message: string }> {
  for (const record of trustStore.values()) {
    const cert = record.certificates.find((c) => c.id === certId);
    if (cert) {
      if (action === "verify") {
        cert.status = "verified";
        cert.verifiedBy = adminUserId;
        cert.verifiedOn = new Date().toISOString();
        delete cert.rejectReason;
      } else {
        cert.status = "rejected";
        cert.rejectReason = reason || "Document verification rejected by admin.";
        cert.verifiedBy = adminUserId;
        cert.verifiedOn = new Date().toISOString();
      }

      // Check if there are still any pending certificates
      const hasPending = record.certificates.some((c) => c.status === "pending");
      if (!hasPending) {
        record.applicationStatus = "none";
      }

      return {
        success: true,
        certificate: cert,
        message: `Certificate has been ${action === "verify" ? "approved & verified" : "rejected"}.`,
      };
    }
  }

  return {
    success: false,
    message: "Certificate not found.",
  };
}

/**
 * Admin Updates a Farmer Verification Check
 */
export async function updateFarmerCheck(
  farmerId: string,
  checkKey: "identity" | "land" | "farmVisit" | "quality",
  done: boolean,
  date?: string
): Promise<{ success: boolean; checks: FarmerTrustChecks }> {
  const cleanedId = farmerId.trim().toLowerCase();
  let record = trustStore.get(cleanedId);

  if (!record) {
    const mock = mockFarmers.find(
      (f) =>
        f.slug.toLowerCase() === cleanedId ||
        (f.id && f.id.toLowerCase() === cleanedId)
    );
    record = {
      farmerId: mock?.slug || cleanedId,
      farmerName: mock?.name || "Farmer",
      certificates: [],
      checks: {
        identity: { done: false },
        land: { done: false },
        farmVisit: { done: false },
        quality: { done: false },
      },
      applicationStatus: "none",
    };
    trustStore.set(cleanedId, record);
  }

  const checkDate = date || (done ? new Date().toISOString().split("T")[0] : undefined);
  record.checks[checkKey] = {
    done,
    date: checkDate,
  };

  return {
    success: true,
    checks: record.checks,
  };
}

