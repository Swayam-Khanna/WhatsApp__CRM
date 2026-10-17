"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export default function VerificationQueue() {
  const [pendingCerts, setPendingCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmerId, setSelectedFarmerId] = useState("ramesh-singh");
  const [farmerTrust, setFarmerTrust] = useState(null);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [rejectModalCert, setRejectModalCert] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionInProgress, setActionInProgress] = useState(null);

  // Fetch pending certificates from GET /api/admin/certificates?status=pending
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/certificates?status=pending");
      const json = await res.json();
      if (json.success) {
        setPendingCerts(json.data || []);
      } else {
        toast.error(json.error || "Failed to load verification queue");
      }
    } catch (err) {
      console.error("[VerificationQueue] Fetch error:", err);
      toast.error("Failed to fetch pending certificates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Fetch selected farmer's trust checks
  const fetchFarmerChecks = useCallback(async (fid) => {
    if (!fid) return;
    setLoadingChecks(true);
    try {
      const res = await fetch(`/api/farmers/${encodeURIComponent(fid)}/trust`);
      const json = await res.json();
      if (json.success) {
        setFarmerTrust(json.data);
      }
    } catch (err) {
      console.error("[VerificationQueue] Farmer checks fetch error:", err);
    } finally {
      setLoadingChecks(false);
    }
  }, []);

  useEffect(() => {
    fetchFarmerChecks(selectedFarmerId);
  }, [selectedFarmerId, fetchFarmerChecks]);

  // Verify Certificate Handler
  const handleVerify = async (certId) => {
    setActionInProgress(certId);
    try {
      const res = await fetch(`/api/admin/certificates/${encodeURIComponent(certId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Certificate verified and approved successfully!");
        setPendingCerts((prev) => prev.filter((c) => c.id !== certId));
        fetchFarmerChecks(selectedFarmerId);
      } else {
        toast.error(json.error || "Verification failed");
      }
    } catch (err) {
      toast.error("Network error during verification");
    } finally {
      setActionInProgress(null);
    }
  };

  // Reject Certificate Handler
  const handleRejectConfirm = async () => {
    if (!rejectModalCert || !rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setActionInProgress(rejectModalCert.id);
    try {
      const res = await fetch(`/api/admin/certificates/${encodeURIComponent(rejectModalCert.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          reason: rejectReason.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Certificate has been rejected.");
        setPendingCerts((prev) => prev.filter((c) => c.id !== rejectModalCert.id));
        setRejectModalCert(null);
        setRejectReason("");
        fetchFarmerChecks(selectedFarmerId);
      } else {
        toast.error(json.error || "Rejection failed");
      }
    } catch (err) {
      toast.error("Network error during rejection");
    } finally {
      setActionInProgress(null);
    }
  };

  // Toggle Farmer Trust Check
  const handleToggleCheck = async (checkKey, currentDone, currentDate) => {
    const nextDone = !currentDone;
    const nextDate = nextDone ? currentDate || new Date().toISOString().split("T")[0] : undefined;

    try {
      const res = await fetch(`/api/admin/farmers/${encodeURIComponent(selectedFarmerId)}/checks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check: checkKey,
          done: nextDone,
          date: nextDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Check '${checkKey}' updated to ${nextDone ? "verified" : "pending"}.`);
        setFarmerTrust((prev) => ({
          ...prev,
          checks: json.checks,
        }));
      } else {
        toast.error(json.error || "Failed to update check");
      }
    } catch (err) {
      toast.error("Failed to update check");
    }
  };

  // Update check date
  const handleUpdateCheckDate = async (checkKey, newDate) => {
    try {
      const res = await fetch(`/api/admin/farmers/${encodeURIComponent(selectedFarmerId)}/checks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check: checkKey,
          done: true,
          date: newDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Verification date updated for ${checkKey}.`);
        setFarmerTrust((prev) => ({
          ...prev,
          checks: json.checks,
        }));
      }
    } catch (err) {
      toast.error("Failed to update verification date");
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto px-4 sm:px-6 py-6 text-foreground">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e6e2d9] dark:border-neutral-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c3a1c]">
            Admin Trust & Compliance
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0f3d2e] dark:text-[#a3d9c9] mt-1 flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-[#0f3d2e] dark:text-[#8ce3b9]" /> Farmer Verification Queue
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Approve farmer-submitted certification documents and manage Prajnaa on-site verification checks.
          </p>
        </div>
        <button
          onClick={() => {
            fetchQueue();
            fetchFarmerChecks(selectedFarmerId);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#e6e2d9] dark:border-neutral-700 bg-background text-xs font-bold text-[#0f3d2e] dark:text-[#8ce3b9] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Queue
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Pending Certificates Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0f3d2e] dark:text-[#a3d9c9] flex items-center gap-2">
              Pending Certificate Approvals
              <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {pendingCerts.length} Pending
              </span>
            </h2>
          </div>

          <div className="rounded-2xl border border-[#e6e2d9] dark:border-neutral-800 bg-white dark:bg-[#141d18] shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[#0f3d2e]" />
                <p className="text-xs">Loading pending approvals...</p>
              </div>
            ) : pendingCerts.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2 opacity-80" />
                <h3 className="font-bold text-foreground text-sm">All caught up!</h3>
                <p className="text-xs mt-1 max-w-sm mx-auto">
                  No pending certificates awaiting verification. Newly submitted farmer certificates will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f6f2] dark:bg-[#1a251e] border-b border-[#e6e2d9] dark:border-neutral-800 text-[#0f3d2e] dark:text-[#a3d9c9] font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5 pl-4">Farmer</th>
                      <th className="p-3.5">Certificate</th>
                      <th className="p-3.5">Issued By / No.</th>
                      <th className="p-3.5">Valid Till</th>
                      <th className="p-3.5">Document</th>
                      <th className="p-3.5 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6e2d9] dark:divide-neutral-800">
                    {pendingCerts.map((cert) => {
                      const isProcessing = actionInProgress === cert.id;
                      return (
                        <tr key={cert.id} className="hover:bg-[#f8f6f2]/50 dark:hover:bg-neutral-800/30 transition">
                          <td className="p-3.5 pl-4">
                            <span className="font-bold text-foreground block">{cert.farmerName || cert.farmerId}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: {cert.farmerId}</span>
                          </td>
                          <td className="p-3.5 font-medium text-foreground">
                            {cert.name}
                            {cert.submittedAt && (
                              <span className="block text-[10px] text-muted-foreground mt-0.5">
                                Submitted {new Date(cert.submittedAt).toLocaleDateString("en-IN")}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-muted-foreground">
                            <span className="font-semibold text-foreground/80 block">{cert.issuedBy}</span>
                            <span className="text-[10px]">No: {cert.certNumber}</span>
                          </td>
                          <td className="p-3.5 font-medium text-foreground whitespace-nowrap">
                            {new Date(cert.validTill).toLocaleDateString("en-IN")}
                          </td>
                          <td className="p-3.5">
                            {cert.document?.url ? (
                              <a
                                href={cert.document.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[#0f3d2e] dark:text-[#8ce3b9] font-bold hover:underline"
                              >
                                View doc <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-neutral-400">No file</span>
                            )}
                          </td>
                          <td className="p-3.5 pr-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleVerify(cert.id)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 rounded-full bg-[#1f7a4d] hover:bg-[#165a39] text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              >
                                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                              </button>
                              <button
                                onClick={() => {
                                  setRejectModalCert(cert);
                                  setRejectReason("");
                                }}
                                disabled={isProcessing}
                                className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Farmer Checks Detail Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0f3d2e] dark:text-[#a3d9c9]">
              Farmer Verification Checks
            </h2>
          </div>

          <div className="rounded-2xl border border-[#e6e2d9] dark:border-neutral-800 bg-white dark:bg-[#141d18] p-5 shadow-sm space-y-5">
            {/* Farmer Selector */}
            <div>
              <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">
                Select Farmer Record
              </label>
              <select
                value={selectedFarmerId}
                onChange={(e) => setSelectedFarmerId(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-[#e6e2d9] dark:border-neutral-700 bg-[#f8f6f2] dark:bg-[#1a251e] text-foreground outline-none focus:border-[#0f3d2e]"
              >
                <option value="ramesh-singh">Ramesh Singh (Ladakh)</option>
                <option value="lakshmi-devi">Lakshmi Devi (Andhra Pradesh)</option>
                <option value="asha-patel">Asha Patel (Gujarat)</option>
                <option value="devraj-chauhan">Devraj Chauhan (Himachal)</option>
              </select>
            </div>

            {loadingChecks ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#0f3d2e]" />
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <p className="text-[11px] text-muted-foreground">
                  Toggle on-site inspection criteria for this farmer. When toggled on, checks immediately show on the public farmer profile.
                </p>

                {/* 4 Toggles */}
                {[
                  { key: "identity", label: "Identity Verified", desc: "Aadhaar / KYC & photo verification" },
                  { key: "land", label: "Land Ownership Verified", desc: "Patta / Revenue record inspection" },
                  { key: "farmVisit", label: "Farm Visited by Team", desc: "Prajnaa field officer physical inspection" },
                  { key: "quality", label: "Produce Quality-Tested", desc: "Zero chemical residue lab report" },
                ].map(({ key, label, desc }) => {
                  const checkObj = farmerTrust?.checks?.[key] || { done: false };
                  const isDone = Boolean(checkObj.done);

                  return (
                    <div
                      key={key}
                      className={`p-3.5 rounded-xl border transition ${
                        isDone
                          ? "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40"
                          : "bg-[#f8f6f2]/80 border-[#e6e2d9] dark:bg-[#1a251e]/40 dark:border-neutral-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                            {isDone ? (
                              <CheckCircle2 className="h-4 w-4 text-[#1f7a4d] shrink-0" />
                            ) : (
                              <span className="h-4 w-4 rounded-full border border-neutral-400 shrink-0" />
                            )}
                            {label}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                        </div>

                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleCheck(key, isDone, checkObj.date)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isDone ? "bg-[#1f7a4d]" : "bg-neutral-300 dark:bg-neutral-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isDone ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Date selector when checked */}
                      {isDone && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/30 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Date:
                          </span>
                          <input
                            type="date"
                            value={checkObj.date ? checkObj.date.split("T")[0] : ""}
                            onChange={(e) => handleUpdateCheckDate(key, e.target.value)}
                            className="bg-transparent text-xs font-semibold text-foreground outline-none border border-emerald-300 dark:border-emerald-700 rounded px-1.5 py-0.5"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141d18] rounded-2xl border border-[#e6e2d9] dark:border-neutral-800 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5" /> Reject Certificate Submission
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Rejecting certificate &ldquo;{rejectModalCert.name}&rdquo; for {rejectModalCert.farmerName}.
              Please state why this certificate is being rejected so the farmer can re-apply.
            </p>

            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Certificate number does not match official registry, or document scan is blurry."
              className="w-full p-3 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-background text-foreground outline-none focus:border-rose-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2 text-xs font-bold">
              <button
                onClick={() => setRejectModalCert(null)}
                className="px-4 py-2 rounded-full border border-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
