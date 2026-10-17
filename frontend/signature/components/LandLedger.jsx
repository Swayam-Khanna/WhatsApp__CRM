"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { calculatePieSlices } from "../utils/pieMath";
import "./LandLedger.css";

// Crop color palette as requested
// First crop: deep green #0f3d2e, Second crop: rust #8c3a1c, Fallow: grey #cfcfc8
const CROP_PALETTE = [
  "#0f3d2e", // Deep Green
  "#8c3a1c", // Rust
  "#3a5a40", // Earthy Sage
  "#e8a317", // Warm Amber
  "#b85d19", // Terracotta
  "#4a6b5d", // Moss
];
const FALLOW_COLOR = "#cfcfc8";

export default function LandLedger({ farmerId, initialData }) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData && Boolean(farmerId));
  const [error, setError] = useState(null);
  const [selectedSlice, setSelectedSlice] = useState(null);

  // Fetch land ledger data from GET /api/farmers/:id/land-ledger
  const fetchLedger = useCallback(async () => {
    if (!farmerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/farmers/${encodeURIComponent(farmerId)}/land-ledger`);
      if (!res.ok) {
        throw new Error(`Failed to load land ledger (Status ${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("[LandLedger] Error fetching data:", err);
      setError(err.message || "Failed to load land ledger details");
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    if (!initialData && farmerId) {
      fetchLedger();
    }
  }, [farmerId, initialData, fetchLedger]);

  // Handle selection toggling
  const handleToggleSlice = useCallback((sliceKey) => {
    setSelectedSlice((prev) => (prev === sliceKey ? null : sliceKey));
  }, []);

  const handleKeyDown = useCallback(
    (e, sliceKey) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggleSlice(sliceKey);
      }
    },
    [handleToggleSlice]
  );

  // Prepare slices for SVG Donut
  const { slices, totalAcres, fallowAcres, fallowPercentage, crops } = useMemo(() => {
    if (!data) {
      return { slices: [], totalAcres: 0, fallowAcres: 0, fallowPercentage: 0, crops: [] };
    }

    const total = Number(data.totalAcres) || 0;
    const cropList = Array.isArray(data.crops) ? data.crops : [];
    const fallowVal = Number(data.fallowAcres) || 0;
    const fallowPct = Number(data.fallowPercentage) || 0;

    const rawSlices = [
      ...cropList.map((crop, idx) => ({
        id: crop.id || `crop-${idx}`,
        key: crop.name,
        name: crop.name,
        value: Number(crop.acres) || 0,
        percentage: Number(crop.percentage) || 0,
        color: CROP_PALETTE[idx % CROP_PALETTE.length],
        isFallow: false,
        rawCrop: crop,
      })),
    ];

    if (fallowVal > 0) {
      rawSlices.push({
        id: "fallow",
        key: "Fallow",
        name: "Unallocated / Fallow",
        value: fallowVal,
        percentage: fallowPct,
        color: FALLOW_COLOR,
        isFallow: true,
        rawCrop: null,
      });
    }

    const calculated = calculatePieSlices({
      slices: rawSlices,
      cx: 80,
      cy: 80,
      outerRadius: 74,
      innerRadius: 48,
      padAngle: 0.03,
    });

    return {
      slices: calculated,
      totalAcres: total,
      fallowAcres: fallowVal,
      fallowPercentage: fallowPct,
      crops: cropList,
    };
  }, [data]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="land-ledger-container land-ledger-skeleton" aria-busy="true">
        <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-md mb-2" />
        <div className="h-4 w-72 bg-neutral-200 dark:bg-neutral-800 rounded-md mb-6" />
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="w-36 h-36 rounded-full border-8 border-neutral-200 dark:border-neutral-800 shrink-0" />
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            <div className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="land-ledger-container p-6 text-center">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-2">
          Unable to load land ledger details
        </p>
        <p className="text-xs text-neutral-500 mb-4">{error}</p>
        <button
          onClick={fetchLedger}
          className="px-4 py-1.5 text-xs font-bold rounded-full bg-[#0f3d2e] text-white hover:bg-[#0c2e22] transition cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty state: "This farmer hasn't added land details yet."
  if (!data || (!totalAcres && crops.length === 0)) {
    return (
      <div className="land-ledger-container p-6 text-center">
        <div className="w-10 h-10 mx-auto rounded-full bg-[#0f3d2e]/10 flex items-center justify-center mb-3">
          <SproutIcon className="w-5 h-5 text-[#0f3d2e]" />
        </div>
        <h4 className="text-sm font-bold text-[#0f3d2e] dark:text-[#a3d9c9]">Signature Land Ledger</h4>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          This farmer hasn't added land details yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className="land-ledger-container"
      role="region"
      aria-label="Signature Land Ledger"
    >
      {/* 1. Header */}
      <div className="land-ledger-header">
        <div>
          <h3 className="land-ledger-title">Signature Land Ledger</h3>
          <p className="land-ledger-subtitle">
            Share of registered crops vs unallocated fallow land
          </p>
        </div>
        <div className="land-ledger-pill">
          Total Holding: {totalAcres > 0 ? `${totalAcres} Acres` : "Verified Holding"}
        </div>
      </div>

      {/* Main Body */}
      <div className="land-ledger-body">
        {/* 2. Donut Chart + Legend on Left */}
        <div className="land-ledger-visual">
          <div className="donut-svg-wrapper">
            <svg
              viewBox="0 0 160 160"
              className="donut-svg"
              aria-label={`Donut chart showing ${totalAcres} total acres`}
            >
              {slices.map((slice) => {
                const isSelected = selectedSlice === slice.key;
                const isDimmed = selectedSlice !== null && !isSelected;

                return (
                  <path
                    key={slice.id}
                    d={slice.path}
                    fill={slice.color}
                    className={`donut-slice ${isSelected ? "highlighted" : ""} ${
                      isDimmed ? "dimmed" : ""
                    }`}
                    onClick={() => handleToggleSlice(slice.key)}
                    onKeyDown={(e) => handleKeyDown(e, slice.key)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${slice.name}: ${slice.value} acres (${slice.percentage}%)`}
                    aria-pressed={isSelected}
                  >
                    <title>{`${slice.name}: ${slice.value} ac (${slice.percentage}%)`}</title>
                  </path>
                );
              })}
            </svg>

            {/* Total Acres in Center of Donut */}
            <div className="donut-center-label">
              <span className="donut-center-acres">{totalAcres}</span>
              <span className="donut-center-sub">acres total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="land-ledger-legend" role="list" aria-label="Land ledger legend">
            {slices.map((slice) => {
              const isSelected = selectedSlice === slice.key;
              const isDimmed = selectedSlice !== null && !isSelected;

              return (
                <div
                  key={slice.id}
                  role="button"
                  tabIndex={0}
                  className={`legend-item ${isSelected ? "highlighted" : ""} ${
                    isDimmed ? "dimmed" : ""
                  }`}
                  onClick={() => handleToggleSlice(slice.key)}
                  onKeyDown={(e) => handleKeyDown(e, slice.key)}
                  aria-pressed={isSelected}
                >
                  <span
                    className="legend-dot"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span>
                    {slice.isFallow ? "Fallow" : slice.name}{" "}
                    <strong>{slice.value} ac</strong> · {slice.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Active Crop Details Cards Grid on Right */}
        <div className="land-ledger-cards">
          {crops.map((crop, idx) => {
            const cropColor = CROP_PALETTE[idx % CROP_PALETTE.length];
            const isSelected = selectedSlice === crop.name;
            const isDimmed = selectedSlice !== null && !isSelected;
            const cropHarvest = crop.harvestKg
              ? typeof crop.harvestKg === "number"
                ? `${crop.harvestKg.toLocaleString("en-IN")} kg`
                : `${crop.harvestKg}`
              : "Active Season";

            return (
              <CropCard
                key={crop.id || crop.name || idx}
                crop={crop}
                cropColor={cropColor}
                harvestDisplay={cropHarvest}
                isSelected={isSelected}
                isDimmed={isDimmed}
                onToggle={() => handleToggleSlice(crop.name)}
                onKeyDown={(e) => handleKeyDown(e, crop.name)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Single Crop Card Component with graceful image fallback
function CropCard({
  crop,
  cropColor,
  harvestDisplay,
  isSelected,
  isDimmed,
  onToggle,
  onKeyDown,
}) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = crop.image?.url || crop.photoUrl || "";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={onKeyDown}
      aria-pressed={isSelected}
      className={`crop-ledger-card ${isSelected ? "highlighted" : ""} ${
        isDimmed ? "dimmed" : ""
      }`}
    >
      {/* Thumbnail Box */}
      <div className="crop-thumb-box">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={crop.name}
            className="crop-thumb-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <SproutIcon className="sprout-fallback" />
        )}
      </div>

      {/* Crop Details */}
      <div className="crop-details-content">
        <div className="crop-card-top-row">
          <h5 className="crop-card-name" title={crop.name}>
            {crop.name}
          </h5>
          <span className="crop-card-acres-pct">
            {crop.acres} ac · {crop.percentage || 0}%
          </span>
        </div>

        <p className="crop-card-meta">
          {crop.season || "Seasonal"} · {crop.method || "Natural Farming"}
        </p>

        {/* Progress Share Bar */}
        <div className="crop-progress-bar-bg">
          <div
            className="crop-progress-bar-fill"
            style={{
              width: `${Math.min(100, Math.max(0, crop.percentage || 0))}%`,
              backgroundColor: cropColor,
            }}
          />
        </div>

        <p className="crop-card-harvest">
          Harvest <strong>{harvestDisplay}</strong>
        </p>
      </div>
    </div>
  );
}

// Clean SVG Sprout Fallback Icon
function SproutIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4-.1 5.5.8z" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
    </svg>
  );
}
