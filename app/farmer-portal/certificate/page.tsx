"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Eye,
  Printer,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import { PrajnaaCertificate } from "@/components/certificate/prajnaa-certificate";
import type { FarmerCertificate } from "@/lib/types/certificate";
import Link from "next/link";

export default function FarmerCertificatePage() {
  const { data: farmer, isLoading: farmerLoading } = useFarmerProfile();
  const [showModal, setShowModal] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const qc = useQueryClient();

  const farmerId = farmer?.id || farmer?.slug;

  const { data: cert, isLoading: certLoading } = useQuery<FarmerCertificate | null>({
    queryKey: ["farmer-my-certificate", farmerId],
    enabled: !!farmerId,
    queryFn: async () => {
      try {
        const res = await fetch(`/api/farmer/certificate?farmer_id=${farmerId}&slug=${farmer?.slug || ""}`);
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = await res.json().catch(() => null);
          if (json?.data) return json.data;
        }
      } catch (e) {
        console.warn("[FarmerCertificatePage] API error:", e);
      }
      if (!farmerId) return null;
      const { getCertificateByFarmer } = await import("@/lib/certificate/certificate-service");
      return (await getCertificateByFarmer(farmerId)) || null;
    },
  });

  const handleToggleVisibility = async (newVal: boolean) => {
    if (!cert) return;
    setUpdatingVisibility(true);
    try {
      let updatedSuccess = false;
      try {
        const res = await fetch(`/api/farmer/certificate`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            certificate_id: cert.id,
            farmer_user_id: farmer?.user_id,
            show_on_profile: newVal,
          }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            updatedSuccess = true;
          }
        }
      } catch (fetchErr) {
        console.warn("[FarmerCertificatePage] Network error:", fetchErr);
      }

      if (!updatedSuccess) {
        const { updateCertificateVisibility } = await import("@/lib/certificate/certificate-service");
        updatedSuccess = await updateCertificateVisibility(cert.id, farmer?.user_id || "", newVal);
      }

      toast.success(
        newVal
          ? "Certificate badge is now VISIBLE on your public profile."
          : "Certificate badge is now HIDDEN from your public profile."
      );
      qc.invalidateQueries({ queryKey: ["farmer-my-certificate", farmerId] });
    } catch (err: any) {
      toast.error(err.message || "Could not update visibility.");
    } finally {
      setUpdatingVisibility(false);
    }
  };

  if (farmerLoading || certLoading) {
    return (
      <div className="grid min-h-[400px] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isActive = cert?.status === "ACTIVE";
  const isRevoked = cert?.status === "REVOKED";
  const isExpired = cert?.status === "EXPIRED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground">
            Prajnaa Verified Accreditation
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Official Prajnaa Verified accreditation issued by Prajnaa Quality Assurance.
        </p>
      </div>

      {/* Case 1: No Certificate Issued Yet */}
      {!cert && (
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h3 className="font-display mt-4 text-lg font-bold text-foreground">
            Verification Pending
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground leading-relaxed">
            Your farm profile has not yet been issued an official Prajnaa Verified Farmer Certificate.
            Once our verification team completes on-site quality and KYC checks, your official certificate will automatically appear here.
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left">
            <div className="flex items-start gap-2.5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-foreground">How Verification Works:</p>
                <p className="text-muted-foreground">
                  1. Complete your KYC documents in the <strong>KYC Verification</strong> tab.
                </p>
                <p className="text-muted-foreground">
                  2. Admin reviews farm records and issues your tamper-proof certificate.
                </p>
                <p className="text-muted-foreground">
                  3. You receive a unique QR code and verified badge on the public marketplace.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Certificate Issued */}
      {cert && (
        <div className="space-y-6">
          {/* Main Status Hero Card */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F3D2E] text-[#D4AF37] shadow-sm shrink-0">
                  <Award className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold ${
                        isActive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : isRevoked
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {isActive && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {isRevoked && <XCircle className="h-3.5 w-3.5" />}
                      {isExpired && <AlertTriangle className="h-3.5 w-3.5" />}
                      {cert.status === "ACTIVE" ? "✓ PRAJNAA VERIFIED" : `${cert.status}`}
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">
                      {cert.certificate_number}
                    </span>
                  </div>

                  <h3 className="font-display mt-2 text-xl font-bold text-foreground">
                    {cert.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Issued to <strong>{cert.farmer_name}</strong> · {cert.farm_name}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D2E] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0c2b20] transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" /> View Certificate
                </button>
                <Link
                  href={cert.verification_url || `/certificate/verify/${cert.certificate_number}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Verification Link
                </Link>
              </div>
            </div>

            {/* Validity & Details Grid */}
            <div className="mt-6 grid gap-4 border-t border-border/60 pt-6 sm:grid-cols-3">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Issue Date
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {new Date(cert.issued_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Valid Until
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {new Date(cert.valid_until).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Issuing Authority
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {cert.issued_by || "Prajnaa Farm Quality Assurance"}
                </span>
              </div>
            </div>

            {/* Revocation Warning if applicable */}
            {isRevoked && (
              <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                <p className="font-bold flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> This certificate has been revoked.
                </p>
                {cert.revocation_reason && (
                  <p className="mt-1 opacity-90">Reason: {cert.revocation_reason}</p>
                )}
              </div>
            )}
          </div>

          {/* Profile Visibility Control Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-display text-base font-bold text-foreground">
                  Public Profile Visibility
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose whether the <strong>✓ Prajnaa Verified</strong> badge and certificate details appear on your public profile in the Meet Farmers section.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {cert.show_on_profile ? "Visible on Profile" : "Hidden from Profile"}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cert.show_on_profile}
                    disabled={updatingVisibility || !isActive}
                    onChange={(e) => handleToggleVisibility(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F3D2E]"></div>
                </label>
              </div>
            </div>

            {!isActive && (
              <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400">
                Note: Profile visibility is disabled because the certificate is currently {cert.status.toLowerCase()}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* VIEW CERTIFICATE MODAL */}
      {showModal && cert && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="relative my-auto w-full max-w-2xl md:max-w-3xl rounded-2xl sm:rounded-3xl border border-[#E6E0D4] bg-white p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="mb-3 flex items-center justify-between pb-2.5 border-b border-[#E6E0D4] shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 sm:h-5 w-4 sm:w-5 text-[#0F3D2E]" />
                <h3 className="font-display text-sm sm:text-base font-bold text-[#0F3D2E]">
                  Official Prajnaa Verified Certificate
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full border border-[#E6E0D4] p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors cursor-pointer"
                aria-label="Close Modal"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-0.5 flex-1">
              <PrajnaaCertificate certificate={cert} onClose={() => setShowModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
