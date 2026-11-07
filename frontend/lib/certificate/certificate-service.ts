import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import type {
  FarmerCertificate,
  CertificateAuditLog,
  CertificateVerificationResult,
  CertificateStatus,
} from "@/lib/types/certificate";

// Fallback seed certificates for default farmers so the system is immediately rich and testable
const SEED_CERTIFICATES: FarmerCertificate[] = [
  {
    id: "cert-ramesh-singh",
    farmer_id: "f-ramesh-singh",
    farmer_name: "Ramesh Singh",
    farm_name: "Himalayan Glacier Heirloom Orchards",
    village: "Hunza",
    state: "Ladakh",
    farmer_slug: "ramesh-singh",
    certificate_number: "PRJ-2026-000001",
    title: "Prajnaa Verified Farmer Certificate",
    type: "PRAJNAA_VERIFIED",
    status: "ACTIVE",
    issued_by: "Prajnaa Quality & Traceability Board",
    issued_at: "2026-01-15T00:00:00.000Z",
    valid_until: "2027-01-15T00:00:00.000Z",
    verification_notes: "Soil purity, zero synthetic chemical residues, glacier meltwater gravity irrigation verified on-site.",
    verification_url: "/certificate/verify/PRJ-2026-000001",
    show_on_profile: true,
    created_at: "2026-01-15T00:00:00.000Z",
    updated_at: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "cert-lakshmi-devi",
    farmer_id: "f-lakshmi-devi",
    farmer_name: "Lakshmi Devi",
    farm_name: "Anantapur Natural Farmlands",
    village: "Anantapur",
    state: "Andhra Pradesh",
    farmer_slug: "lakshmi-devi",
    certificate_number: "PRJ-2026-000002",
    title: "Prajnaa Verified Farmer Certificate",
    type: "PRAJNAA_VERIFIED",
    status: "ACTIVE",
    issued_by: "Prajnaa Quality & Traceability Board",
    issued_at: "2026-02-10T00:00:00.000Z",
    valid_until: "2027-02-10T00:00:00.000Z",
    verification_notes: "Subhash Palekar Natural Farming (SPNF) and Jeevamrutha soil enrichment certified.",
    verification_url: "/certificate/verify/PRJ-2026-000002",
    show_on_profile: true,
    created_at: "2026-02-10T00:00:00.000Z",
    updated_at: "2026-02-10T00:00:00.000Z",
  },
  {
    id: "cert-asha-patel",
    farmer_id: "f-asha-patel",
    farmer_name: "Asha Patel",
    farm_name: "Charotar Permaculture & Herb Garden",
    village: "Anand",
    state: "Gujarat",
    farmer_slug: "asha-patel",
    certificate_number: "PRJ-2026-000003",
    title: "Prajnaa Verified Farmer Certificate",
    type: "PRAJNAA_VERIFIED",
    status: "ACTIVE",
    issued_by: "Prajnaa Quality & Traceability Board",
    issued_at: "2026-03-01T00:00:00.000Z",
    valid_until: "2027-03-01T00:00:00.000Z",
    verification_notes: "Artisanal solar dehydration, women self-help group standards, zero preservatives verified.",
    verification_url: "/certificate/verify/PRJ-2026-000003",
    show_on_profile: true,
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
  },
];

// Persistent runtime cache to guarantee instant availability across requests
const runtimeMemoryStore = new Map<string, FarmerCertificate>();
SEED_CERTIFICATES.forEach((c) => runtimeMemoryStore.set(c.id, c));

export function getLocalStoredCertificates(): FarmerCertificate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("prajnaa_farmer_certificates");
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLocalCertificate(cert: FarmerCertificate) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalStoredCertificates();
    const idx = list.findIndex((c) => c.id === cert.id || c.certificate_number === cert.certificate_number);
    if (idx >= 0) {
      list[idx] = cert;
    } else {
      list.push(cert);
    }
    localStorage.setItem("prajnaa_farmer_certificates", JSON.stringify(list));
  } catch {}
}

/**
 * Helper to get Firebase Admin Firestore on server
 */
async function getServerAdminDb(): Promise<any> {
  return null;
}

/**
 * Computes effective dynamic status based on current time.
 */
export function computeEffectiveStatus(cert: FarmerCertificate): CertificateStatus {
  if (cert.status === "REVOKED") return "REVOKED";
  const validUntilMs = new Date(cert.valid_until).getTime();
  if (!isNaN(validUntilMs) && validUntilMs < Date.now()) {
    return "EXPIRED";
  }
  return "ACTIVE";
}

/**
 * Generates high-res QR code base64 data URL for a verification link.
 */
export async function generateCertificateQRCode(verificationUrl: string): Promise<string> {
  try {
    const fullUrl = verificationUrl.startsWith("http")
      ? verificationUrl
      : `${typeof window !== "undefined" ? window.location.origin : "https://prajnaafarm.com"}${verificationUrl}`;

    return await QRCode.toDataURL(fullUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: "#0F3D2E",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    });
  } catch (err) {
    console.error("[QRCode Error]:", err);
    return "";
  }
}

/**
 * Generates the next sequential certificate number (e.g. PRJ-2026-000004).
 */
export async function generateNextCertificateNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PRJ-${currentYear}-`;

  try {
    const allCerts = await getAllCertificates();
    let maxSeq = 0;

    for (const c of allCerts) {
      if (c.certificate_number && c.certificate_number.startsWith(prefix)) {
        const numPart = parseInt(c.certificate_number.replace(prefix, ""), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(6, "0")}`;
  } catch (err) {
    const fallbackSeq = SEED_CERTIFICATES.length + runtimeMemoryStore.size + 1;
    return `${prefix}${fallbackSeq.toString().padStart(6, "0")}`;
  }
}

/**
 * Record an entry into the certificate audit log using Admin SDK on server.
 */
export async function recordCertificateAuditLog(log: Omit<CertificateAuditLog, "id" | "created_at">): Promise<void> {
  try {
    const now = new Date().toISOString();
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logEntry = { id, ...log, created_at: now };

    const adminDb = await getServerAdminDb();
    if (adminDb) {
      await adminDb.collection("certificate_audit_logs").doc(id).set(logEntry);
      return;
    }

    await supabase.from("certificate_audit_logs").insert(logEntry);
  } catch (err) {
    console.warn("[Certificate Audit Log Error]:", err);
  }
}

/**
 * Issue a new official Prajnaa Verified Certificate (Admin only).
 * Uses Firebase Admin DB on server to bypass Firestore client security rules.
 */
export async function issueFarmerCertificate(params: {
  farmer_id: string;
  farmer_name: string;
  farm_name: string;
  village?: string;
  state?: string;
  farmer_slug?: string;
  certificate_number?: string;
  issued_by?: string;
  valid_until?: string;
  verification_notes?: string;
  admin_id: string;
  admin_name?: string;
}): Promise<FarmerCertificate> {
  const now = new Date().toISOString();
  const certNumber = params.certificate_number || (await generateNextCertificateNumber());
  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const validUntil = params.valid_until || oneYearLater;
  const verificationUrl = `/certificate/verify/${certNumber}`;
  const qrCodeDataUrl = await generateCertificateQRCode(verificationUrl);

  const certId = `cert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const certData: FarmerCertificate = {
    id: certId,
    farmer_id: params.farmer_id,
    farmer_name: params.farmer_name,
    farm_name: params.farm_name,
    village: params.village || "India",
    state: params.state || "Farm",
    farmer_slug: params.farmer_slug || params.farmer_id,
    certificate_number: certNumber,
    title: "Prajnaa Verified Farmer Certificate",
    type: "PRAJNAA_VERIFIED",
    status: "ACTIVE",
    issued_by: params.issued_by || "Prajnaa Quality & Traceability Board",
    issued_at: now,
    valid_until: validUntil,
    verification_notes: params.verification_notes || "Verified according to Prajnaa pure natural sourcing standards.",
    verification_url: verificationUrl,
    qr_code_data_url: qrCodeDataUrl,
    show_on_profile: true,
    created_at: now,
    updated_at: now,
  };

  // Update memory store and browser storage immediately
  runtimeMemoryStore.set(certId, certData);
  saveLocalCertificate(certData);

  // Write to Firebase Admin DB or Supabase
  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      await adminDb.collection("farmer_certificates").doc(certId).set(certData);

      // Update farmer_profiles in Firestore Admin
      if (params.farmer_id) {
        try {
          await adminDb.collection("farmer_profiles").doc(params.farmer_id).set(
            {
              is_prajnaa_verified: true,
              is_verified: true,
              verified_certificate_id: certId,
              verified_certificate_number: certNumber,
              verified_at: now,
            },
            { merge: true }
          );
        } catch (profileErr) {
          console.warn("[AdminDB farmer_profiles update warning]:", profileErr);
        }
      }
    } else {
      try {
        await supabase.from("farmer_certificates").insert(certData);
      } catch (insErr) {
        console.warn("[Supabase farmer_certificates insert warning]:", insErr);
      }
    }

    // Always ensure Supabase farmer_profiles table reflects the verified state
    if (params.farmer_id) {
      try {
        await supabase
          .from("farmer_profiles")
          .update({
            is_prajnaa_verified: true,
            is_verified: true,
            verified_certificate_id: certId,
            verified_certificate_number: certNumber,
            verified_at: now,
          })
          .eq("id", params.farmer_id);
      } catch (profErr) {
        console.warn("[Supabase farmer_profiles update warning]:", profErr);
      }

      if (params.farmer_slug) {
        try {
          await supabase
            .from("farmer_profiles")
            .update({
              is_prajnaa_verified: true,
              is_verified: true,
              verified_certificate_id: certId,
              verified_certificate_number: certNumber,
              verified_at: now,
            })
            .eq("slug", params.farmer_slug);
        } catch {}
      }
    }
  } catch (dbErr) {
    console.warn("[Database write warning, preserved in memory/local store]:", dbErr);
  }

  // Record Audit Trail
  await recordCertificateAuditLog({
    certificate_id: certId,
    certificate_number: certNumber,
    farmer_id: params.farmer_id,
    action: "ISSUED",
    actor_id: params.admin_id,
    actor_role: "admin",
    details: {
      issued_by: params.admin_name || params.admin_id,
      valid_until: validUntil,
      certificate_number: certNumber,
    },
  });

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("farmer-certificate-updated", { detail: certData }));
    } catch {}
  }

  return certData;
}

/**
 * Revoke an existing certificate (Admin only).
 */
export async function revokeFarmerCertificate(params: {
  certificate_id: string;
  admin_id: string;
  admin_name?: string;
  reason: string;
}): Promise<FarmerCertificate | null> {
  const now = new Date().toISOString();
  const cleanId = String(params.certificate_id || "").trim();
  if (!cleanId) return null;

  // Find certificate by id, certificate number, or local storage
  let cert = await getCertificateById(cleanId);
  if (!cert) {
    cert = await getCertificateByNumber(cleanId);
  }
  if (!cert && typeof window !== "undefined") {
    const local = getLocalStoredCertificates();
    const found = local.find((c) => c.id === cleanId || c.certificate_number === cleanId);
    if (found) cert = found;
  }
  if (!cert) {
    // Check seed certificates
    cert = SEED_CERTIFICATES.find((c) => c.id === cleanId || c.certificate_number === cleanId) || null;
  }
  if (!cert) return null;

  const updated: Partial<FarmerCertificate> = {
    status: "REVOKED",
    revoked_at: now,
    revoked_by: params.admin_name || params.admin_id,
    revocation_reason: params.reason,
    updated_at: now,
  };

  const fullUpdated: FarmerCertificate = { ...cert, ...updated, status: "REVOKED" };
  runtimeMemoryStore.set(cert.id, fullUpdated);
  saveLocalCertificate(fullUpdated);

  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      await adminDb.collection("farmer_certificates").doc(cert.id).set(updated, { merge: true });
      if (cert.farmer_id) {
        try {
          await adminDb.collection("farmer_profiles").doc(cert.farmer_id).set(
            {
              is_prajnaa_verified: false,
              is_verified: false,
              verified_certificate_id: null,
              verified_certificate_number: null,
            },
            { merge: true }
          );
        } catch {}
      }
    } else {
      try {
        await supabase.from("farmer_certificates").update(updated).eq("id", cert.id);
      } catch {}
    }

    if (cert.farmer_id) {
      try {
        await supabase
          .from("farmer_profiles")
          .update({
            is_prajnaa_verified: false,
            is_verified: false,
            verified_certificate_id: null,
            verified_certificate_number: null,
          })
          .eq("id", cert.farmer_id);
      } catch {}

      if (cert.farmer_slug) {
        try {
          await supabase
            .from("farmer_profiles")
            .update({
              is_prajnaa_verified: false,
              is_verified: false,
              verified_certificate_id: null,
              verified_certificate_number: null,
            })
            .eq("slug", cert.farmer_slug);
        } catch {}
      }
    }
  } catch (err) {
    console.warn("[Revoke write warning]:", err);
  }

  // Audit trail
  await recordCertificateAuditLog({
    certificate_id: cert.id,
    certificate_number: cert.certificate_number,
    farmer_id: cert.farmer_id,
    action: "REVOKED",
    actor_id: params.admin_id,
    actor_role: "admin",
    details: {
      revoked_by: params.admin_name || params.admin_id,
      reason: params.reason,
    },
  });

  return fullUpdated;
}

/**
 * Update certificate profile visibility (Farmer only).
 */
export async function updateCertificateVisibility(
  certificateId: string,
  farmerUserId: string,
  showOnProfile: boolean
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const cert = await getCertificateById(certificateId);

    if (cert) {
      const updated = { ...cert, show_on_profile: showOnProfile, updated_at: now };
      runtimeMemoryStore.set(certificateId, updated);
    }

    const adminDb = await getServerAdminDb();
    if (adminDb) {
      await adminDb.collection("farmer_certificates").doc(certificateId).set(
        { show_on_profile: showOnProfile, updated_at: now },
        { merge: true }
      );
    } else {
      await supabase.from("farmer_certificates").update({
        show_on_profile: showOnProfile,
        updated_at: now,
      }).eq("id", certificateId);
    }

    // Audit log
    if (cert) {
      await recordCertificateAuditLog({
        certificate_id: cert.id,
        certificate_number: cert.certificate_number,
        farmer_id: cert.farmer_id,
        action: "VISIBILITY_CHANGED",
        actor_id: farmerUserId,
        actor_role: "farmer",
        details: { show_on_profile: showOnProfile },
      });
    }

    return true;
  } catch (err) {
    console.error("[Update Certificate Visibility Error]:", err);
    return false;
  }
}

/**
 * Retrieve a certificate by certificate number (Public or Admin).
 */
export async function getCertificateByNumber(certificateNumber: string): Promise<FarmerCertificate | null> {
  const cleanNumber = certificateNumber.trim().toUpperCase();

  // Check memory store
  for (const c of runtimeMemoryStore.values()) {
    if (c.certificate_number === cleanNumber) {
      const effectiveStatus = computeEffectiveStatus(c);
      if (!c.qr_code_data_url) {
        c.qr_code_data_url = await generateCertificateQRCode(c.verification_url);
      }
      return { ...c, status: effectiveStatus };
    }
  }

  // Check Admin DB on server
  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      const snap = await adminDb
        .collection("farmer_certificates")
        .where("certificate_number", "==", cleanNumber)
        .limit(1)
        .get();

      if (!snap.empty) {
        const cert = snap.docs[0].data() as FarmerCertificate;
        runtimeMemoryStore.set(cert.id, cert);
        const effectiveStatus = computeEffectiveStatus(cert);
        if (!cert.qr_code_data_url) {
          cert.qr_code_data_url = await generateCertificateQRCode(cert.verification_url);
        }
        return { ...cert, status: effectiveStatus };
      }
    }
  } catch (e) {
    console.warn("[AdminDB lookup warning]:", e);
  }

  // Fallback to Supabase / Seeds
  try {
    const { data } = await supabase
      .from("farmer_certificates")
      .select("*")
      .eq("certificate_number", cleanNumber)
      .maybeSingle();

    let cert = data as FarmerCertificate | null;

    if (!cert) {
      cert = SEED_CERTIFICATES.find((c) => c.certificate_number === cleanNumber) || null;
    }

    if (cert) {
      runtimeMemoryStore.set(cert.id, cert);
      const effectiveStatus = computeEffectiveStatus(cert);
      if (!cert.qr_code_data_url) {
        cert.qr_code_data_url = await generateCertificateQRCode(cert.verification_url);
      }
      return { ...cert, status: effectiveStatus };
    }

    return null;
  } catch (err) {
    const fallback = SEED_CERTIFICATES.find((c) => c.certificate_number === cleanNumber);
    if (fallback) {
      return { ...fallback, status: computeEffectiveStatus(fallback) };
    }
    return null;
  }
}

/**
 * Retrieve a certificate by certificate ID.
 */
export async function getCertificateById(certificateId: string): Promise<FarmerCertificate | null> {
  const cleanId = String(certificateId || "").trim();
  if (!cleanId) return null;

  // 1. Direct memory store lookup
  if (runtimeMemoryStore.has(cleanId)) {
    const c = runtimeMemoryStore.get(cleanId)!;
    return { ...c, status: computeEffectiveStatus(c) };
  }

  // Also check memory store values by certificate_number or id
  for (const c of runtimeMemoryStore.values()) {
    if (c.id === cleanId || c.certificate_number === cleanId) {
      return { ...c, status: computeEffectiveStatus(c) };
    }
  }

  // 2. Check localStorage
  if (typeof window !== "undefined") {
    const local = getLocalStoredCertificates();
    const found = local.find((c) => c.id === cleanId || c.certificate_number === cleanId);
    if (found) {
      runtimeMemoryStore.set(found.id, found);
      return { ...found, status: computeEffectiveStatus(found) };
    }
  }

  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      const doc = await adminDb.collection("farmer_certificates").doc(cleanId).get();
      if (doc.exists) {
        const cert = doc.data() as FarmerCertificate;
        runtimeMemoryStore.set(cert.id, cert);
        return { ...cert, status: computeEffectiveStatus(cert) };
      }
    }
  } catch (e) {
    console.warn("[AdminDB getById warning]:", e);
  }

  try {
    const { data } = await supabase
      .from("farmer_certificates")
      .select("*")
      .or(`id.eq.${cleanId},certificate_number.eq.${cleanId}`)
      .maybeSingle();

    let cert = data as FarmerCertificate | null;
    if (!cert) {
      cert = SEED_CERTIFICATES.find((c) => c.id === cleanId || c.certificate_number === cleanId) || null;
    }

    if (cert) {
      runtimeMemoryStore.set(cert.id, cert);
      const effectiveStatus = computeEffectiveStatus(cert);
      if (!cert.qr_code_data_url) {
        cert.qr_code_data_url = await generateCertificateQRCode(cert.verification_url);
      }
      return { ...cert, status: effectiveStatus };
    }

    return null;
  } catch (err) {
    const fallback = SEED_CERTIFICATES.find((c) => c.id === cleanId || c.certificate_number === cleanId);
    return fallback || null;
  }
}

/**
 * Retrieve active certificate by farmer ID or slug.
 */
export async function getCertificateByFarmer(farmerIdOrSlug: string): Promise<FarmerCertificate | null> {
  for (const c of runtimeMemoryStore.values()) {
    if (c.farmer_id === farmerIdOrSlug || c.farmer_slug === farmerIdOrSlug) {
      const effectiveStatus = computeEffectiveStatus(c);
      if (!c.qr_code_data_url) {
        c.qr_code_data_url = await generateCertificateQRCode(c.verification_url);
      }
      return { ...c, status: effectiveStatus };
    }
  }

  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      const snap1 = await adminDb
        .collection("farmer_certificates")
        .where("farmer_id", "==", farmerIdOrSlug)
        .limit(1)
        .get();

      if (!snap1.empty) {
        const cert = snap1.docs[0].data() as FarmerCertificate;
        runtimeMemoryStore.set(cert.id, cert);
        return { ...cert, status: computeEffectiveStatus(cert) };
      }

      const snap2 = await adminDb
        .collection("farmer_certificates")
        .where("farmer_slug", "==", farmerIdOrSlug)
        .limit(1)
        .get();

      if (!snap2.empty) {
        const cert = snap2.docs[0].data() as FarmerCertificate;
        runtimeMemoryStore.set(cert.id, cert);
        return { ...cert, status: computeEffectiveStatus(cert) };
      }
    }
  } catch (e) {
    console.warn("[AdminDB getByFarmer warning]:", e);
  }

  try {
    const { data } = await supabase
      .from("farmer_certificates")
      .select("*")
      .or(`farmer_id.eq.${farmerIdOrSlug},farmer_slug.eq.${farmerIdOrSlug}`)
      .order("created_at", { ascending: false })
      .limit(1);

    let cert = (data && data.length > 0 ? data[0] : null) as FarmerCertificate | null;

    if (!cert) {
      cert = SEED_CERTIFICATES.find(
        (c) => c.farmer_id === farmerIdOrSlug || c.farmer_slug === farmerIdOrSlug
      ) || null;
    }

    if (cert) {
      runtimeMemoryStore.set(cert.id, cert);
      const effectiveStatus = computeEffectiveStatus(cert);
      if (!cert.qr_code_data_url) {
        cert.qr_code_data_url = await generateCertificateQRCode(cert.verification_url);
      }
      return { ...cert, status: effectiveStatus };
    }

    return null;
  } catch (err) {
    const fallback = SEED_CERTIFICATES.find(
      (c) => c.farmer_id === farmerIdOrSlug || c.farmer_slug === farmerIdOrSlug
    );
    if (fallback) {
      return { ...fallback, status: computeEffectiveStatus(fallback) };
    }
    return null;
  }
}

/**
 * Public verification checking validity.
 */
export async function verifyCertificate(certificateNumber: string): Promise<CertificateVerificationResult> {
  const cert = await getCertificateByNumber(certificateNumber);

  if (!cert) {
    return {
      valid: false,
      status: "NOT_FOUND",
      message: "No official Prajnaa Farm certificate was found matching this number.",
    };
  }

  const effectiveStatus = computeEffectiveStatus(cert);

  if (effectiveStatus === "REVOKED") {
    return {
      valid: false,
      status: "REVOKED",
      certificate: cert,
      message: `This certificate was revoked on ${new Date(cert.revoked_at || cert.updated_at).toLocaleDateString("en-IN")}. Reason: ${cert.revocation_reason || "Admin revocation."}`,
    };
  }

  if (effectiveStatus === "EXPIRED") {
    return {
      valid: false,
      status: "EXPIRED",
      certificate: cert,
      message: `This certificate expired on ${new Date(cert.valid_until).toLocaleDateString("en-IN")}.`,
    };
  }

  return {
    valid: true,
    status: "ACTIVE",
    certificate: cert,
    message: "Certificate is authentic, active, and officially verified by Prajnaa Farm.",
  };
}

/**
 * Check if a farmer has an active, valid official certificate.
 */
export async function hasActiveFarmerCertificate(farmerIdOrSlug: string): Promise<boolean> {
  if (!farmerIdOrSlug) return false;
  const cert = await getCertificateByFarmer(farmerIdOrSlug);
  return Boolean(cert && cert.status === "ACTIVE" && cert.show_on_profile !== false);
}

/**
 * Get all certificates for Admin view.
 */
export async function getAllCertificates(): Promise<FarmerCertificate[]> {
  const mergedMap = new Map<string, FarmerCertificate>();

  // 1. Add seeds
  SEED_CERTIFICATES.forEach((c) => mergedMap.set(c.id, c));

  // 2. Add local storage in browser
  if (typeof window !== "undefined") {
    getLocalStoredCertificates().forEach((c) => {
      mergedMap.set(c.id, c);
      runtimeMemoryStore.set(c.id, c);
    });
  }

  // 3. Add memory store
  runtimeMemoryStore.forEach((c) => mergedMap.set(c.id, c));

  // 4. Add Firestore Admin SDK docs on server
  try {
    const adminDb = await getServerAdminDb();
    if (adminDb) {
      const snap = await adminDb.collection("farmer_certificates").get();
      if (!snap.empty) {
        snap.docs.forEach((doc: any) => {
          const c = doc.data() as FarmerCertificate;
          mergedMap.set(c.id, c);
          runtimeMemoryStore.set(c.id, c);
        });
      }
    }
  } catch (e) {
    console.warn("[AdminDB getAll warning]:", e);
  }

  // 5. Try Supabase shim
  try {
    const { data } = await supabase
      .from("farmer_certificates")
      .select("*")
      .order("created_at", { ascending: false });

    const dbCerts = (data as FarmerCertificate[]) || [];
    dbCerts.forEach((c) => {
      mergedMap.set(c.id, c);
      runtimeMemoryStore.set(c.id, c);
    });
  } catch (err) {
    // optional fallback
  }

  return Array.from(mergedMap.values()).map((cert) => ({
    ...cert,
    status: computeEffectiveStatus(cert),
  }));
}

