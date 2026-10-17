"use client";

import React from "react";
import { toast } from "sonner";
import { compressImage, optimizeBase64Image } from "@/lib/image-compress";
import { fileToBase64 } from "@/lib/file-to-base64";

export type ProductBadge = {
  type: "lab_tested" | "trust" | "promo";
  label: string;
  reportUrl?: string;
  verifiedOn?: string;
  expiresOn?: string | null;
};

export type LabTestedState = {
  enabled: boolean;
  label: string;
  reportUrl: string;
  reportName?: string;
  verifiedOn: string;
};

export type PromoBadgesState = {
  selectedPresets: string[];
  discountBadge: string;
  customBadge: string;
  expiresOn: string;
};

export const getTodayString = () => new Date().toISOString().split("T")[0];

export const PROMO_PRESET_CHIPS = ["Best Seller", "New", "Featured", "Limited Stock"];

export const TRUST_BADGE_OPTIONS = [
  { value: "None", label: "None" },
  { value: "Trusted Product", label: "Trusted Product" },
  { value: "Quality Assured", label: "Quality Assured" },
  { value: "Verified Quality", label: "Verified Quality" },
];

export async function compileProductBadges(
  labTested: LabTestedState,
  trustBadge: string,
  promoBadges: PromoBadgesState
): Promise<ProductBadge[]> {
  const list: ProductBadge[] = [];

  if (labTested.enabled) {
    let rUrl = labTested.reportUrl;
    if (rUrl && rUrl.length > 20000) {
      rUrl = await optimizeBase64Image(rUrl);
    }
    const labBadge: ProductBadge = {
      type: "lab_tested",
      label: labTested.label || "100% Lab Tested",
      verifiedOn: labTested.verifiedOn || getTodayString(),
    };
    if (rUrl) labBadge.reportUrl = rUrl;
    list.push(labBadge);
  }

  if (trustBadge && trustBadge !== "None") {
    list.push({
      type: "trust",
      label: trustBadge,
    });
  }

  promoBadges.selectedPresets.forEach((p) => {
    list.push({
      type: "promo",
      label: p,
      expiresOn: promoBadges.expiresOn || null,
    });
  });

  if (promoBadges.discountBadge.trim()) {
    list.push({
      type: "promo",
      label: promoBadges.discountBadge.trim(),
      expiresOn: promoBadges.expiresOn || null,
    });
  }

  if (promoBadges.customBadge.trim()) {
    list.push({
      type: "promo",
      label: promoBadges.customBadge.trim(),
      expiresOn: promoBadges.expiresOn || null,
    });
  }

  return list;
}

export function parseExistingProductBadges(rawBadges: any): {
  labTested: LabTestedState;
  trustBadge: string;
  promoBadges: PromoBadgesState;
} {
  const existingBadges: ProductBadge[] = Array.isArray(rawBadges) ? rawBadges : [];

  // 1. Lab Tested
  const labBadge = existingBadges.find((b) => b.type === "lab_tested");
  const labTested: LabTestedState = labBadge
    ? {
        enabled: true,
        label: labBadge.label || "100% Lab Tested",
        reportUrl: labBadge.reportUrl || "",
        reportName: labBadge.reportUrl ? "Attached Report" : "",
        verifiedOn: labBadge.verifiedOn || getTodayString(),
      }
    : {
        enabled: false,
        label: "100% Lab Tested",
        reportUrl: "",
        reportName: "",
        verifiedOn: getTodayString(),
      };

  // 2. Trust Badge
  const trustBadgeObj = existingBadges.find((b) => b.type === "trust");
  const trustBadge = trustBadgeObj?.label || "None";

  // 3. Promo Badges
  const promoBadgesList = existingBadges.filter((b) => b.type === "promo");
  const selectedPresets = promoBadgesList
    .filter((b) => PROMO_PRESET_CHIPS.includes(b.label))
    .map((b) => b.label);
  const discountBadge = promoBadgesList.find((b) => b.label.includes("% OFF"))?.label || "";
  const customBadge =
    promoBadgesList.find((b) => !PROMO_PRESET_CHIPS.includes(b.label) && !b.label.includes("% OFF"))
      ?.label || "";
  const expiresOn = promoBadgesList[0]?.expiresOn || "";

  const promoBadges: PromoBadgesState = {
    selectedPresets,
    discountBadge,
    customBadge,
    expiresOn,
  };

  return { labTested, trustBadge, promoBadges };
}

interface ProductBadgesSectionProps {
  labTestedState: LabTestedState;
  setLabTestedState: React.Dispatch<React.SetStateAction<LabTestedState>>;
  trustBadgeState: string;
  setTrustBadgeState: React.Dispatch<React.SetStateAction<string>>;
  promoBadgesState: PromoBadgesState;
  setPromoBadgesState: React.Dispatch<React.SetStateAction<PromoBadgesState>>;
  showHeading?: boolean;
}

export function ProductBadgesSection({
  labTestedState,
  setLabTestedState,
  trustBadgeState,
  setTrustBadgeState,
  promoBadgesState,
  setPromoBadgesState,
  showHeading = true,
}: ProductBadgesSectionProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      {showHeading && (
        <div className="border-b border-border/60 pb-3">
          <h4 className="font-display text-base font-semibold text-foreground">
            Product Badges & Trust Accreditations
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add trust, lab-testing proof, and promotional ribbons displayed directly on the customer storefront.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* 1. Lab Tested Toggle & COA Report */}
        <div className="border border-border/80 rounded-2xl p-4 bg-[#fbfbf9]/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🧪</span>
              <div>
                <span className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground block">
                  Lab Tested Certification
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Highlight verified chemical-free purity with immediate live activation.
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={labTestedState.enabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setLabTestedState((prev) => ({ ...prev, enabled: checked }));
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1b3c29]"></div>
            </label>
          </div>

          {labTestedState.enabled && (
            <div className="space-y-3 pt-3 border-t border-border/40 animate-in fade-in duration-200">
              <label className="block">
                <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  BADGE TEXT
                </span>
                <select
                  value={labTestedState.label}
                  onChange={(e) => setLabTestedState((prev) => ({ ...prev, label: e.target.value }))}
                  className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-xs outline-none focus:border-primary"
                >
                  <option value="100% Lab Tested">100% Lab Tested</option>
                  <option value="Lab Tested">Lab Tested</option>
                  <option value="Certified Lab Tested">Certified Lab Tested</option>
                </select>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    VERIFIED ON DATE
                  </span>
                  <input
                    type="date"
                    value={labTestedState.verifiedOn}
                    onChange={(e) =>
                      setLabTestedState((prev) => ({ ...prev, verifiedOn: e.target.value }))
                    }
                    className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-xs outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    UPLOAD TEST REPORT (COA / LAB PDF)
                  </span>
                  <div className="mt-1.5">
                    <label className="flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-border bg-background px-3 hover:bg-secondary/20 cursor-pointer transition text-xs font-semibold text-muted-foreground truncate">
                      {labTestedState.reportName ? (
                        <span className="truncate text-foreground font-medium flex items-center gap-1.5">
                          📄 {labTestedState.reportName}
                        </span>
                      ) : (
                        <span>Upload PDF / Image Report</span>
                      )}
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error("Test report file must be under 2 MB");
                            return;
                          }
                          try {
                            if (file.type.startsWith("image/")) {
                              const compressed = await compressImage(file, 400, 0.4);
                              const url = await fileToBase64(compressed);
                              setLabTestedState((prev) => ({
                                ...prev,
                                reportUrl: url,
                                reportName: file.name,
                              }));
                            } else {
                              const url = await fileToBase64(file);
                              if (url.length > 400000) {
                                toast.error("PDF is too large (max 300KB). Please select a smaller PDF or image.");
                                return;
                              }
                              setLabTestedState((prev) => ({
                                ...prev,
                                reportUrl: url,
                                reportName: file.name,
                              }));
                            }
                            toast.success("Lab report attached successfully");
                          } catch (err: any) {
                            toast.error(err?.message ?? "Report upload failed");
                          }
                        }}
                      />
                    </label>
                  </div>
                </label>
              </div>

              {!labTestedState.reportUrl && (
                <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded-lg p-2.5 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>Badge takes effect immediately upon publishing. Uploading test report document is optional.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Trust Badge Selector */}
        <div className="border border-border/80 rounded-2xl p-4 bg-[#fbfbf9]/70 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <div>
              <span className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground block">
                Trust Badge
              </span>
              <span className="text-[11px] text-muted-foreground">
                Display an authoritative quality assurance banner on the listing.
              </span>
            </div>
          </div>
          <select
            value={trustBadgeState}
            onChange={(e) => setTrustBadgeState(e.target.value)}
            className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-xs outline-none focus:border-primary"
          >
            {TRUST_BADGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Promotional Badges & Ribbons */}
        <div className="border border-border/80 rounded-2xl p-4 bg-[#fbfbf9]/70 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🏷️</span>
            <div>
              <span className="font-subhead text-xs font-bold uppercase tracking-wider text-foreground block">
                Promotional Badges & Ribbons
              </span>
              <span className="text-[11px] text-muted-foreground">
                Highlight product popularity, discounts, or custom attributes.
              </span>
            </div>
          </div>

          <div>
            <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground block mb-2">
              PRESET CHIPS
            </span>
            <div className="flex flex-wrap gap-2">
              {PROMO_PRESET_CHIPS.map((chip) => {
                const selected = promoBadgesState.selectedPresets.includes(chip);
                return (
                  <button
                    type="button"
                    key={chip}
                    onClick={() => {
                      setPromoBadgesState((prev) => ({
                        ...prev,
                        selectedPresets: selected
                          ? prev.selectedPresets.filter((p) => p !== chip)
                          : [...prev.selectedPresets, chip],
                      }));
                    }}
                    className={`font-subhead text-xs font-semibold px-3 py-1.5 rounded-full border transition cursor-pointer ${
                      selected
                        ? "bg-[#1b3c29] text-white border-[#1b3c29]"
                        : "bg-background text-muted-foreground border-border hover:border-primary"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="block">
              <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                DISCOUNT BADGE (% OFF)
              </span>
              <input
                type="text"
                value={promoBadgesState.discountBadge}
                onChange={(e) =>
                  setPromoBadgesState((prev) => ({ ...prev, discountBadge: e.target.value }))
                }
                placeholder="e.g. 15% OFF"
                className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-xs outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                CUSTOM BADGE (MAX 20 CHARS)
              </span>
              <input
                type="text"
                maxLength={20}
                value={promoBadgesState.customBadge}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[a-zA-Z0-9%\s]*$/.test(val)) {
                    setPromoBadgesState((prev) => ({ ...prev, customBadge: val }));
                  }
                }}
                placeholder="e.g. Handmade / Single Origin"
                className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-xs outline-none focus:border-primary"
              />
            </label>
          </div>

          <label className="block pt-1">
            <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              EXPIRES ON (OPTIONAL DATE)
            </span>
            <input
              type="date"
              value={promoBadgesState.expiresOn}
              onChange={(e) =>
                setPromoBadgesState((prev) => ({ ...prev, expiresOn: e.target.value }))
              }
              className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-xs outline-none focus:border-primary"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
