export type CertificateStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
export type CertificateType = "PRAJNAA_VERIFIED";

export interface FarmerCertificate {
  id: string;
  farmer_id: string; // references farmer_profiles.id or mock slug/id
  farmer_name: string;
  farm_name: string;
  village?: string;
  state?: string;
  farmer_slug?: string;
  certificate_number: string; // e.g. PRJ-2026-000001
  title: string; // "Prajnaa Verified Farmer Certificate"
  type: CertificateType;
  status: CertificateStatus;
  issued_by: string; // e.g. "Prajnaa Quality Assurance Authority"
  issued_at: string; // ISO date string
  valid_until: string; // ISO date string
  verification_notes?: string;
  certificate_url?: string;
  verification_url: string; // e.g. "/certificate/verify/PRJ-2026-000001"
  qr_code_data_url?: string; // Base64 data URL of the scannable QR code
  show_on_profile: boolean; // Controlled by the farmer (default true)
  revoked_at?: string | null;
  revoked_by?: string | null;
  revocation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateAuditLog {
  id: string;
  certificate_id: string;
  certificate_number: string;
  farmer_id: string;
  action: "ISSUED" | "REVOKED" | "VISIBILITY_CHANGED" | "DOWNLOADED" | "VERIFIED";
  actor_id: string;
  actor_role: "admin" | "farmer" | "public";
  details?: Record<string, any>;
  created_at: string;
}

export interface CertificateVerificationResult {
  valid: boolean;
  status: CertificateStatus | "NOT_FOUND";
  certificate?: FarmerCertificate;
  message: string;
}
