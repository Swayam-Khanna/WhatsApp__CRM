"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Printer,
  ExternalLink,
  MapPin,
  Calendar,
  Building,
  ArrowRight,
  Eye,
  Loader2,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { PrajnaaCertificate } from "@/components/certificate/prajnaa-certificate";
import type { CertificateVerificationResult } from "@/lib/types/certificate";

export default function CertificateVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const rawNumber = typeof params?.certificateNumber === "string" ? params.certificateNumber : "";
  const certificateNumber = decodeURIComponent(rawNumber).trim().toUpperCase();

  const [searchInput, setSearchInput] = useState(certificateNumber);
  const [showCertModal, setShowCertModal] = useState(false);

  const { data: verification, isLoading } = useQuery<CertificateVerificationResult>({
    queryKey: ["public-certificate-verify", certificateNumber],
    enabled: !!certificateNumber,
    queryFn: async () => {
      const res = await fetch(`/api/certificates/verify/${certificateNumber}`);
      const json = await res.json();
      return json.data ?? { valid: false, status: "NOT_FOUND", message: "Certificate not found." };
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/certificate/verify/${encodeURIComponent(searchInput.trim().toUpperCase())}`);
    }
  };

  const cert = verification?.certificate;
  const status = verification?.status || "NOT_FOUND";
  const isActive = status === "ACTIVE";
  const isRevoked = status === "REVOKED";
  const isExpired = status === "EXPIRED";
  const isNotFound = status === "NOT_FOUND";

  return (
    <MarketingLayout>
      <div className="bg-[#F9F7F2] min-h-screen py-6 md:py-10 text-foreground font-sans">
        <div className="container-prj max-w-2xl space-y-6">
          {/* Header & Search Bar */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#0F3D2E] text-[#D4AF37] shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="font-subhead text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E3226]">
              Prajnaa Farm Authenticity Registry
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F3D2E]">
              Certificate Verification Portal
            </h1>
            <p className="mx-auto max-w-lg text-xs text-neutral-600">
              Verify the real-time authenticity, origin credentials, and quality accreditation of any Prajnaa Verified Farmer.
            </p>

            {/* Quick Certificate Search */}
            <form onSubmit={handleSearch} className="mx-auto mt-4 flex max-w-md gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Enter Certificate No. (e.g. PRJ-2026-000001)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 w-full rounded-full border border-border bg-white pl-9 pr-3 font-mono text-xs outline-none focus:border-[#0F3D2E] shadow-xs"
                />
              </div>
              <button
                type="submit"
                className="h-9 rounded-full bg-[#0F3D2E] px-5 text-xs font-semibold text-white shadow-sm hover:bg-[#0c2b20] transition-colors cursor-pointer"
              >
                Verify
              </button>
            </form>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-xs">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#0F3D2E]" />
              <p className="mt-2 text-xs font-semibold text-neutral-600">
                Checking tamper-proof cryptographic registry for {certificateNumber}...
              </p>
            </div>
          )}

          {/* Result: Found & Evaluated */}
          {!isLoading && (
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              {/* Status Header Banner */}
              <div
                className={`p-3.5 sm:p-4 text-center ${
                  isActive
                    ? "bg-[#0F3D2E]"
                    : isRevoked
                    ? "bg-rose-900"
                    : isExpired
                    ? "bg-amber-900"
                    : "bg-neutral-800"
                }`}
                style={{ color: "#ffffff" }}
              >
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-md mb-1.5">
                  {isActive && <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />}
                  {isRevoked && <XCircle className="h-4 w-4 text-rose-200" />}
                  {isExpired && <AlertTriangle className="h-4 w-4 text-amber-200" />}
                  {isNotFound && <XCircle className="h-4 w-4 text-neutral-300" />}
                </div>

                <span
                  className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider backdrop-blur-md"
                  style={{ color: "#ffffff" }}
                >
                  {certificateNumber}
                </span>

                <h2
                  className="mt-1 text-xs sm:text-sm font-bold tracking-wide"
                  style={{ color: "#ffffff" }}
                >
                  {isActive && "✓ Official Certificate Authenticated & Active"}
                  {isRevoked && "⚠ Certificate Revoked"}
                  {isExpired && "⚠ Certificate Expired"}
                  {isNotFound && "✕ Certificate Record Not Found"}
                </h2>

                <p
                  className="mx-auto mt-0.5 max-w-md text-[11px] leading-relaxed"
                  style={{ color: "#ffffff", opacity: 0.95 }}
                >
                  {verification?.message}
                </p>
              </div>

              {/* Certificate Verification Details */}
              {cert && (
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Farmer & Farm Overview */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                    <div>
                      <p className="font-subhead text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                        Accredited Farmer
                      </p>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0F3D2E] mt-0.5">
                        {cert.farmer_name}
                      </h3>
                      <p className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
                        <Building className="h-3 w-3 text-neutral-400 shrink-0" />
                        <strong>{cert.farm_name}</strong> · {cert.village}, {cert.state}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setShowCertModal(true)}
                        className="inline-flex items-center gap-1 rounded-full bg-[#0F3D2E] px-4 py-2 text-[11px] font-semibold text-white shadow-xs hover:bg-[#0c2b20] transition-colors cursor-pointer"
                      >
                        <Eye className="h-3 w-3" /> View Full Certificate
                      </button>
                      {cert.farmer_slug && (
                        <Link
                          href={`/farmer/${cert.farmer_slug}`}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3.5 py-2 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                        >
                          Farmer Profile <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Verification Credentials Grid */}
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-xl border border-neutral-200 bg-[#FCFBF7] p-3 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Accreditation Type
                      </span>
                      <p className="font-semibold text-xs text-[#0F3D2E]">{cert.title}</p>
                      <p className="text-[10px] text-neutral-500">100% Soil-to-Table Chemical-Free Verified</p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-[#FCFBF7] p-3 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Issuing Authority
                      </span>
                      <p className="font-semibold text-xs text-[#0F3D2E]">{cert.issued_by}</p>
                      <p className="text-[10px] text-neutral-500">Prajnaa Direct Farmer Sourcing Trust</p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-[#FCFBF7] p-3 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Issue Date
                      </span>
                      <p className="font-semibold text-xs text-neutral-800">
                        {new Date(cert.issued_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-[#FCFBF7] p-3 space-y-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Validity Expiration
                      </span>
                      <p className="font-semibold text-xs text-neutral-800">
                        {new Date(cert.valid_until).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Verification Notes */}
                  {cert.verification_notes && (
                    <div className="rounded-xl border border-emerald-600/20 bg-emerald-50/50 p-3 text-xs">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-900 block mb-0.5">
                        Verified Standards Met:
                      </span>
                      <p className="text-xs text-emerald-950 leading-relaxed">{cert.verification_notes}</p>
                    </div>
                  )}

                  {/* Security Guarantee */}
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[10px] text-neutral-600 flex items-start gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-800 font-semibold">Prajnaa Origin Guarantee:</strong> This verification record is cryptographically tied to the physical farmer harvesting on verified soil.
                    </div>
                  </div>
                </div>
              )}

              {/* If Not Found */}
              {isNotFound && (
                <div className="p-6 text-center space-y-3">
                  <p className="text-xs text-neutral-600 max-w-md mx-auto">
                    We could not find any active or historical Prajnaa certificate matching{" "}
                    <strong className="font-mono">{certificateNumber}</strong>.
                  </p>
                  <Link
                    href="/farmers"
                    className="inline-flex items-center gap-1 rounded-full bg-[#0F3D2E] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0c2b20] transition-colors"
                  >
                    Browse All Verified Farmers <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FULL OFFICIAL CERTIFICATE MODAL */}
        {showCertModal && cert && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCertModal(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
          >
            <div className="relative my-auto w-full max-w-2xl md:max-w-3xl rounded-2xl sm:rounded-3xl border border-[#E6E0D4] bg-white p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
              <div className="mb-3 flex items-center justify-between pb-2.5 border-b border-[#E6E0D4] shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 sm:h-5 w-4 sm:w-5 text-[#0F3D2E]" />
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#0F3D2E]">
                    Official Prajnaa Verified Accreditation Certificate
                  </h3>
                </div>
                <button
                  onClick={() => setShowCertModal(false)}
                  className="rounded-full border border-[#E6E0D4] p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors cursor-pointer"
                  aria-label="Close Modal"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto pr-0.5 flex-1">
                <PrajnaaCertificate certificate={cert} onClose={() => setShowCertModal(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </MarketingLayout>
  );
}
