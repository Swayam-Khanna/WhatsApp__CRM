"use client";

import { useState, useEffect } from "react";
import { X, Award, ShieldCheck, Loader2, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-auth.client";
import { generateNextCertificateNumber } from "@/lib/certificate/certificate-service";
import type { FarmerCertificate } from "@/lib/types/certificate";

interface IssueCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cert: FarmerCertificate) => void;
  farmer: {
    id: string;
    full_name: string;
    farm_name: string;
    village?: string;
    state?: string;
    slug?: string;
  };
}

export function IssueCertificateModal({
  isOpen,
  onClose,
  onSuccess,
  farmer,
}: IssueCertificateModalProps) {
  const [loading, setLoading] = useState(false);
  const [certNumber, setCertNumber] = useState("");
  const [title, setTitle] = useState("Prajnaa Verified Farmer Certificate");
  const [issuedBy, setIssuedBy] = useState("Prajnaa Quality & Traceability Authority");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split("T")[0];
  });
  const [verificationNotes, setVerificationNotes] = useState(
    "Verified 100% natural, chemical-free traditional farming practices with direct smallholder traceability."
  );
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateNextCertificateNumber().then((num) => setCertNumber(num));
      setShowConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    let issuedCert: FarmerCertificate | null = null;

    try {
      const payload = {
        farmer_id: farmer.id,
        farmer_name: farmer.full_name,
        farm_name: farmer.farm_name,
        village: farmer.village,
        state: farmer.state,
        farmer_slug: farmer.slug,
        certificate_number: certNumber,
        title,
        issued_by: issuedBy,
        valid_until: new Date(validUntil).toISOString(),
        verification_notes: verificationNotes,
        admin_id: "admin-lead",
        admin_name: "Prajnaa Verification Board",
      };

      // 1. Try server endpoint /api/admin/certificates
      try {
        const res = await adminFetch("/api/admin/certificates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          if (res.ok && data?.success && data?.data) {
            issuedCert = data.data;
          }
        }
      } catch (postErr) {
        console.warn("[IssueCertModal] /api/admin/certificates call warning:", postErr);
      }

      // 2. Try secondary farmer endpoint /api/admin/farmers/:farmerId/certificate if needed
      if (!issuedCert && farmer.id) {
        try {
          const res = await adminFetch(`/api/admin/farmers/${encodeURIComponent(farmer.id)}/certificate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json().catch(() => null);
            if (res.ok && data?.success && data?.data) {
              issuedCert = data.data;
            }
          }
        } catch (postErr) {
          console.warn("[IssueCertModal] /api/admin/farmers/... call warning:", postErr);
        }
      }

      // 3. Resilient direct service fallback (works offline, in browser, and in dev)
      if (!issuedCert) {
        const { issueFarmerCertificate } = await import("@/lib/certificate/certificate-service");
        issuedCert = await issueFarmerCertificate(payload);
      }

      if (!issuedCert) {
        throw new Error("Unable to complete certificate issuance. Please try again.");
      }

      toast.success(`Official Certificate ${issuedCert.certificate_number} issued for ${farmer.full_name}!`);
      onSuccess(issuedCert);
      onClose();
    } catch (err: any) {
      console.error("[IssueCertificateModal Submit Error]:", err);
      toast.error(err.message || "Failed to issue certificate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Issue Prajnaa Verified Certificate
              </h3>
              <p className="text-xs text-muted-foreground">
                Official accreditation for {farmer.full_name} ({farmer.farm_name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Certificate Type Banner */}
          <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-foreground">Accreditation Level</p>
                <p className="text-[11px] text-muted-foreground">Prajnaa Verified Natural Smallholder Farmer</p>
              </div>
            </div>
            <span className="rounded-full bg-primary px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary-foreground">
              {certNumber || "PRJ-2026-..."}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Certificate Number *
              </label>
              <input
                type="text"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-background px-3 font-mono text-xs font-semibold text-foreground outline-none focus:border-primary"
              />
              <span className="text-[10px] text-muted-foreground">Auto-generated format PRJ-YYYY-NNNNNN</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Issuing Authority *
              </label>
              <input
                type="text"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Valid Until * (1 Year Standard)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Verification Notes & Standards Met
            </label>
            <textarea
              rows={2}
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-primary"
              placeholder="e.g. On-site soil test clean, zero chemical pesticides, ethical compensation confirmed."
            />
          </div>

          {/* Confirmation Prompt */}
          {showConfirm && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                Confirm official certificate issuance
              </div>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-400">
                This will generate an official tamper-proof Prajnaa Verified certificate and scannable QR code for <strong>{farmer.full_name}</strong>.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-6 py-2 text-xs font-semibold text-white hover:bg-[#0b2b20] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {showConfirm ? "Confirm & Issue Certificate" : "Proceed to Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
