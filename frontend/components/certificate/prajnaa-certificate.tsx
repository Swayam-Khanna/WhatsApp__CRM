"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Printer,
  ExternalLink,
  QrCode,
  Calendar,
  MapPin,
  Building,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import type { FarmerCertificate } from "@/lib/types/certificate";

interface PrajnaaCertificateProps {
  certificate: FarmerCertificate;
  showActions?: boolean;
  onClose?: () => void;
}

export function PrajnaaCertificate({
  certificate,
  showActions = true,
  onClose,
}: PrajnaaCertificateProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isRevoked = certificate.status === "REVOKED";
  const isExpired = certificate.status === "EXPIRED";
  const isActive = certificate.status === "ACTIVE";

  const formattedIssueDate = new Date(certificate.issued_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedExpiryDate = new Date(certificate.valid_until).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar (hidden in print) */}
      {showActions && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D4] px-2.5 py-1.5 print:hidden">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-subhead text-[10px] font-bold ${
                isActive
                  ? "bg-emerald-100 text-emerald-800"
                  : isRevoked
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isActive && <CheckCircle2 className="h-3 w-3" />}
              {isRevoked && <XCircle className="h-3 w-3" />}
              {isExpired && <AlertTriangle className="h-3 w-3" />}
              {certificate.status}
            </span>
            <span className="font-subhead text-[10px] font-bold text-muted-foreground">
              {certificate.certificate_number}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 rounded-full bg-[#0F3D2E] px-2.5 py-1 font-subhead text-[11px] font-bold text-white shadow-2xs hover:bg-[#0c2b20] transition-colors cursor-pointer"
            >
              <Printer className="h-3 w-3" /> Print / PDF
            </button>
            <Link
              href={certificate.verification_url || `/certificate/verify/${certificate.certificate_number}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D4] bg-white px-2.5 py-1 font-subhead text-[11px] font-bold text-[#0F3D2E] hover:bg-secondary transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> Verify
            </Link>
          </div>
        </div>
      )}

      {/* Revoked / Expired Banner if applicable */}
      {isRevoked && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-destructive print:hidden">
          <div className="flex items-center gap-1.5 font-subhead font-bold text-xs">
            <XCircle className="h-3.5 w-3.5" /> Certificate Revoked by Prajnaa Administration
          </div>
          {certificate.revocation_reason && (
            <p className="mt-0.5 text-[11px] opacity-90 font-sans">Reason: {certificate.revocation_reason}</p>
          )}
        </div>
      )}

      {isExpired && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300 print:hidden">
          <div className="flex items-center gap-1.5 font-subhead font-bold text-xs">
            <AlertTriangle className="h-3.5 w-3.5" /> Certificate Expired on {formattedExpiryDate}
          </div>
          <p className="mt-0.5 text-[11px] opacity-90 font-sans">Please contact Prajnaa Quality Assurance for renewal verification.</p>
        </div>
      )}

      {/* PRINTABLE OFFICIAL CERTIFICATE CANVAS */}
      <div
        ref={printRef}
        id="prajnaa-official-certificate"
        className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border-4 border-[#0F3D2E] bg-[#FCFBF7] p-3.5 sm:p-5 text-[#0F3D2E] shadow-lg print:m-0 print:max-w-none print:rounded-none print:border-4 print:border-[#0F3D2E] print:p-5 print:shadow-none"
        style={{
          boxShadow: "0 8px 24px -8px rgba(15, 61, 46, 0.16)",
        }}
      >
        {/* Inner Gold / Ornamental Border */}
        <div className="pointer-events-none absolute inset-1 sm:inset-1.5 rounded-xl border border-[#D4AF37]/50" />
        <div className="pointer-events-none absolute inset-2 sm:inset-2.5 rounded-lg border border-[#0F3D2E]/15" />

        {/* Watermark Emblem in Background */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
          <ShieldCheck className="h-48 w-48 sm:h-64 sm:w-64 text-[#0F3D2E]" />
        </div>

        {/* Certificate Header */}
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#0F3D2E] text-[#FCFBF7] shadow-2xs">
            <Award className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-[#D4AF37]" />
          </div>

          <p className="font-subhead text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
            Official Quality & Origin Accreditation
          </p>
          <h1 className="font-display mt-0.5 text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wider text-[#0F3D2E]">
            Prajnaa Farm
          </h1>
          <p className="font-display italic text-[11px] sm:text-xs text-[#0F3D2E]/80">
            Verified Natural Farmer Accreditation
          </p>
          <div className="mx-auto mt-1.5 h-0.5 w-20 sm:w-24 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>

        {/* Certificate Core Text */}
        <div className="relative z-10 my-2.5 sm:my-3 text-center space-y-1.5">
          <p className="font-display italic text-[11px] sm:text-xs text-neutral-600">
            This official certificate is proudly presented to
          </p>

          <div className="py-0.5">
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[#0F3D2E]">
              {certificate.farmer_name}
            </h2>
            <div className="mx-auto mt-1 h-0.5 w-24 sm:w-32 rounded-full bg-[#0F3D2E]/25" />
          </div>

          <p className="font-sans text-xs sm:text-[13px] text-neutral-700 max-w-md mx-auto leading-snug">
            of <strong className="font-subhead font-bold text-[#0F3D2E]">{certificate.farm_name}</strong>
            {certificate.village && certificate.state ? (
              <span>, located in <strong>{certificate.village}, {certificate.state}</strong></span>
            ) : null}
          </p>

          <p className="font-sans text-[10px] sm:text-[11px] leading-snug text-neutral-600 max-w-md mx-auto pt-0.5">
            Having successfully satisfied all verification benchmarks established by Prajnaa Farm, including 100% soil-to-table traceability, chemical-free traditional farming practices, and ethical smallholder harvesting.
          </p>
        </div>

        {/* Certificate Metadata & QR Code Section */}
        <div className="relative z-10 mt-3 sm:mt-3.5 border-t border-[#0F3D2E]/15 pt-2.5 grid gap-3 grid-cols-12 items-center">
          {/* Left Metadata */}
          <div className="col-span-8 space-y-1.5">
            <div className="grid grid-cols-2 gap-2 text-left">
              <div>
                <span className="block font-subhead text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  Certificate Number
                </span>
                <span className="font-subhead text-[11px] sm:text-xs font-bold text-[#0F3D2E]">
                  {certificate.certificate_number}
                </span>
              </div>
              <div>
                <span className="block font-subhead text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  Current Status
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-subhead text-[10px] sm:text-[11px] font-bold ${
                    isActive
                      ? "text-emerald-700"
                      : isRevoked
                      ? "text-rose-700"
                      : "text-amber-700"
                  }`}
                >
                  {isActive && "✓ ACTIVE"}
                  {isRevoked && "✕ REVOKED"}
                  {isExpired && "⚠ EXPIRED"}
                </span>
              </div>
              <div>
                <span className="block font-subhead text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  Issued Date
                </span>
                <span className="font-sans text-[10px] sm:text-[11px] text-neutral-800">
                  {formattedIssueDate}
                </span>
              </div>
              <div>
                <span className="block font-subhead text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  Valid Until
                </span>
                <span className="font-sans text-[10px] sm:text-[11px] text-neutral-800">
                  {formattedExpiryDate}
                </span>
              </div>
            </div>

            <div className="pt-0.5 text-[8px] sm:text-[9px] text-neutral-500 flex items-center gap-1 font-sans">
              <ShieldCheck className="h-2.5 w-2.5 text-emerald-700 shrink-0" />
              <span>Issued by: {certificate.issued_by || "Prajnaa Farm Quality Assurance Authority"}</span>
            </div>
          </div>

          {/* Right QR Code Box */}
          <div className="col-span-4 flex flex-col items-center sm:items-end text-center sm:text-right">
            <div className="rounded-lg border border-[#0F3D2E]/20 bg-white p-1 shadow-2xs">
              {certificate.qr_code_data_url ? (
                <img
                  src={certificate.qr_code_data_url}
                  alt={`QR Verification for ${certificate.certificate_number}`}
                  className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
                />
              ) : (
                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-neutral-100 flex items-center justify-center text-xs text-neutral-400">
                  <QrCode className="h-7 w-7 text-neutral-400" />
                </div>
              )}
            </div>
            <p className="font-subhead text-[8px] uppercase tracking-wider text-neutral-400 mt-0.5">
              Scan to verify origin
            </p>
          </div>
        </div>

        {/* Signatures Row */}
        <div className="relative z-10 mt-3 pt-2 border-t border-[#0F3D2E]/10 grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="font-display italic text-xs sm:text-[13px] text-[#0F3D2E] select-none font-semibold">
              Dr. Harshavardhan Rao
            </div>
            <div className="mx-auto mt-0.5 h-0.5 w-20 sm:w-24 bg-[#0F3D2E]/30" />
            <p className="font-subhead text-[8px] uppercase tracking-wider text-neutral-500 mt-0.5">
              Quality Assurance Lead
            </p>
          </div>

          <div>
            <div className="font-display italic text-xs sm:text-[13px] text-[#0F3D2E] select-none font-semibold">
              Prajnaa Founders Council
            </div>
            <div className="mx-auto mt-0.5 h-0.5 w-20 sm:w-24 bg-[#0F3D2E]/30" />
            <p className="font-subhead text-[8px] uppercase tracking-wider text-neutral-500 mt-0.5">
              Prajnaa Farm Trust
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
