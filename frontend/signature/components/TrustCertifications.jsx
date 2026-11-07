"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Award, ShieldCheck, CheckCircle2, AlertCircle, Upload, X, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import "./TrustCertifications.css";

const CHECK_LABELS = {
  identity: "Identity verified",
  land: "Land ownership verified",
  farmVisit: "Farm visited by Prajnaa team",
  quality: "Produce quality-tested",
};

export default function TrustCertifications({ farmerId }) {
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(Boolean(farmerId));
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Fetch verified trust data from GET /api/farmers/:id/trust
  const fetchTrust = useCallback(async () => {
    if (!farmerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/farmers/${encodeURIComponent(farmerId)}/trust`);
      if (!res.ok) {
        throw new Error(`Failed to load trust data (Status ${res.status})`);
      }
      const json = await res.json();
      setTrustData(json.data || null);
    } catch (err) {
      console.error("[TrustCertifications] Fetch error:", err);
      setError(err.message || "Failed to load certifications");
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    fetchTrust();
  }, [fetchTrust]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="trust-cert-card" aria-busy="true">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-8 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
          <div className="h-8 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="trust-cert-card text-center p-6" role="alert">
        <AlertCircle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
        <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
          Unable to load certifications
        </p>
        <p className="text-[11px] text-neutral-500 mb-3">{error}</p>
        <button
          onClick={fetchTrust}
          className="px-3.5 py-1 text-xs font-bold rounded-full bg-[#0f3d2e] text-white hover:bg-[#0c2b20] transition cursor-pointer mx-auto"
        >
          Try Again
        </button>
      </div>
    );
  }

  const certificates = trustData?.certificates || [];
  const checks = trustData?.checks || {
    identity: { done: false },
    land: { done: false },
    farmVisit: { done: false },
    quality: { done: false },
  };
  const applicationStatus = trustData?.applicationStatus || "none";
  const isOwner = Boolean(trustData?.isOwner);

  // Filter completed checks
  const completedChecks = Object.entries(checks).filter(([_, val]) => val?.done);
  const hasVerifiedCerts = certificates.some((c) => c.status === "verified");
  const hasAnyChecksDone = completedChecks.length > 0;
  const isInReview = applicationStatus === "in_review";

  // Determine which state to render
  let currentState = 3; // default: State 3 (Nothing verified)
  if (isInReview && (!hasVerifiedCerts || isOwner)) {
    currentState = 4; // State 4 (In Review)
  } else if (hasVerifiedCerts) {
    currentState = 1; // State 1 (Has Verified Certificate)
  } else if (hasAnyChecksDone) {
    currentState = 2; // State 2 (Checks only)
  }

  return (
    <div
      className="trust-cert-card"
      role="region"
      aria-label="Verified Certifications and Trust Information"
      aria-live="polite"
    >
      <div>
        {/* Header */}
        <div className="trust-card-header">
          <h4 className="trust-header-title">
            <Award className="h-5 w-5 text-[#b45309] shrink-0" /> Verified Certifications
          </h4>

          {/* Status Pill according to state */}
          {currentState === 1 && (
            <span className="trust-pill verified">
              <CheckCircle2 className="w-3.5 h-3.5" /> Prajnaa Verified
            </span>
          )}
          {currentState === 2 && (
            <span className="trust-pill verified">
              <CheckCircle2 className="w-3.5 h-3.5" /> Prajnaa checked
            </span>
          )}
          {currentState === 4 && (
            <span className="trust-pill review">
              <Clock className="w-3.5 h-3.5" /> In review
            </span>
          )}
        </div>

        {/* STATE 1: HAS VERIFIED CERTIFICATES */}
        {currentState === 1 && (
          <div>
            <div className="cert-chips-container">
              {certificates
                .filter((c) => c.status === "verified")
                .map((cert) => (
                  <span key={cert.id} className="cert-chip-amber" title={`Valid till ${cert.validTill}`}>
                    📜 {cert.name} · No. {cert.certNumber}
                  </span>
                ))}
            </div>

            {/* Checked by Prajnaa items if any done */}
            {hasAnyChecksDone && (
              <div className="mt-3">
                <span className="checks-subhead">
                  <ShieldCheck className="w-3.5 h-3.5" /> Checked by Prajnaa
                </span>
                <div className="checks-grid">
                  {completedChecks.map(([key, val]) => (
                    <div key={key} className="check-tile">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1f7a4d] shrink-0" />
                      <div>
                        <p className="check-tile-label">{CHECK_LABELS[key] || key}</p>
                        {val.date && <p className="check-tile-date">{formatCheckDate(val.date)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATE 2: CHECKS ONLY */}
        {currentState === 2 && (
          <div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 mb-3 italic">
              This farmer has no certificate yet. Prajnaa has verified these details itself.
            </p>
            <div className="checks-grid">
              {completedChecks.map(([key, val]) => (
                <div key={key} className="check-tile">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1f7a4d] shrink-0" />
                  <div>
                    <p className="check-tile-label">{CHECK_LABELS[key] || key}</p>
                    {val.date && <p className="check-tile-date">{formatCheckDate(val.date)}</p>}
                  </div>
                </div>
              ))}

              {/* Owner sees pending checks as faded dashed tiles */}
              {isOwner &&
                Object.entries(checks)
                  .filter(([_, val]) => !val?.done)
                  .map(([key]) => (
                    <div key={key} className="check-tile pending">
                      <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <div>
                        <p className="check-tile-label text-neutral-400">{CHECK_LABELS[key] || key}</p>
                        <p className="check-tile-date">Pending verification</p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}

        {/* STATE 3: NOTHING VERIFIED */}
        {currentState === 3 && (
          <div className="trust-empty-box">
            <ShieldCheck className="trust-empty-icon" />
            <h5 className="trust-empty-title">No verified certificates yet</h5>
            <p className="trust-empty-desc">
              Prajnaa only lists documents our team has checked and verified.
            </p>
          </div>
        )}

        {/* STATE 4: IN REVIEW */}
        {currentState === 4 && (
          <div>
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mb-2">
              Verification application is under review by Prajnaa verification board.
            </p>

            {/* 3-Step Tracker */}
            <div className="review-tracker-container">
              <div className="tracker-steps">
                <div className="tracker-step">
                  <div className="tracker-circle done">✓</div>
                  <span className="tracker-step-title">Documents submitted</span>
                </div>
                <div className="tracker-step">
                  <div className="tracker-circle current">2</div>
                  <span className="tracker-step-title">Field visit</span>
                </div>
                <div className="tracker-step">
                  <div className="tracker-circle">3</div>
                  <span className="tracker-step-title">Admin approval</span>
                </div>
              </div>
            </div>

            {/* If Owner: show pending/rejected certificate status */}
            {isOwner && (
              <div className="mt-2 space-y-1.5">
                {certificates
                  .filter((c) => c.status === "pending" || c.status === "rejected")
                  .map((cert) => (
                    <div
                      key={cert.id}
                      className={`text-xs p-2 rounded-lg border ${
                        cert.status === "rejected"
                          ? "bg-rose-50 border-rose-200 text-rose-800"
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{cert.name}</span>
                        <span className="uppercase text-[10px]">
                          {cert.status === "rejected" ? "Rejected" : "Under Review"}
                        </span>
                      </div>
                      {cert.rejectReason && (
                        <p className="text-[11px] mt-1 text-rose-600">Reason: {cert.rejectReason}</p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logged-in Farmer Actions */}
      {isOwner && (
        <div className="pt-3 border-t border-[#e6e2d9] dark:border-neutral-800 mt-3">
          {(currentState === 2 || currentState === 4) && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="trust-action-btn"
              aria-label="Upload a certificate for verification"
            >
              <Upload className="w-3.5 h-3.5" /> Upload a certificate
            </button>
          )}

          {currentState === 3 && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="trust-action-btn"
              aria-label="Apply for Prajnaa verification"
            >
              <Upload className="w-3.5 h-3.5" /> Apply for verification
            </button>
          )}
        </div>
      )}

      {/* Upload Certificate Modal */}
      {isUploadModalOpen && (
        <UploadCertificateModal
          farmerId={farmerId}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            setIsUploadModalOpen(false);
            fetchTrust();
          }}
        />
      )}
    </div>
  );
}

// Upload Modal Component with validation (jpg, png, pdf, max 5MB)
function UploadCertificateModal({ farmerId, isOpen, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [validTill, setValidTill] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setFileError("");
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Allowed extensions & types
    const validExtensions = ["jpg", "jpeg", "png", "pdf"];
    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setFileError("Invalid file type. Only JPG, PNG, and PDF documents are allowed.");
      setFile(null);
      return;
    }

    // Max 5MB size limit
    if (selected.size > 5 * 1024 * 1024) {
      setFileError(
        `File is too large (${(selected.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is 5MB.`
      );
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !issuedBy || !certNumber || !validTill || !file) {
      toast.error("Please fill in all required fields and choose a document.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("issuedBy", issuedBy);
      formData.append("certNumber", certNumber);
      formData.append("validTill", validTill);
      formData.append("file", file);

      const res = await fetch("/api/farmers/me/certificates", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload certificate");
      }

      toast.success("Certificate submitted successfully for admin review!");
      onSuccess();
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="trust-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-cert-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="trust-modal-box">
        <div className="flex items-center justify-between pb-3 border-b border-[#e6e2d9] dark:border-neutral-800 mb-4">
          <h3 id="upload-cert-modal-title" className="text-base font-bold text-[#0f3d2e] dark:text-[#a3d9c9] flex items-center gap-2">
            <FileText className="w-4 h-4" /> Submit Certificate for Verification
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-sans">
          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Certificate Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PGS-India Organic Certificate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#e6e2d9] dark:border-neutral-700 bg-transparent text-foreground outline-none focus:border-[#0f3d2e]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Issued By *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Department of Agriculture"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#e6e2d9] dark:border-neutral-700 bg-transparent text-foreground outline-none focus:border-[#0f3d2e]"
              />
            </div>
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Certificate Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. LDK-ORG-2024"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#e6e2d9] dark:border-neutral-700 bg-transparent text-foreground outline-none focus:border-[#0f3d2e]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Valid Till *
            </label>
            <input
              type="date"
              required
              value={validTill}
              onChange={(e) => setValidTill(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#e6e2d9] dark:border-neutral-700 bg-transparent text-foreground outline-none focus:border-[#0f3d2e]"
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Document File (JPG, PNG, PDF · Max 5MB) *
            </label>
            <input
              type="file"
              required
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              className="w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0f3d2e]/10 file:text-[#0f3d2e] hover:file:bg-[#0f3d2e]/20 cursor-pointer"
            />
            {fileError && <p className="text-rose-600 text-[11px] mt-1 font-medium">{fileError}</p>}
            {file && !fileError && (
              <p className="text-emerald-700 text-[11px] mt-1 font-medium">
                ✓ {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#e6e2d9] dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#e6e2d9] text-neutral-600 hover:bg-neutral-100 transition cursor-pointer font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="px-5 py-2 rounded-full bg-[#0f3d2e] text-white hover:bg-[#0c2b20] disabled:opacity-50 transition cursor-pointer font-bold"
            >
              {isSubmitting ? "Uploading..." : "Submit for Verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatCheckDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}
